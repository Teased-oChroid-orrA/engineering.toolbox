#!/usr/bin/env node
/**
 * default-browser-devtools runner
 * Cross-engine testing for self-contained Svelte apps using Playwright.
 *
 * Commands:
 *   smoke   - baseline load + conservative click sweep + artifacts + evaluation
 *   triage  - console + request failures + screenshot + evaluation
 *   golden  - deterministic steps (edit steps array) + evaluation
 *   perf    - tracing around load + small window
 *   eval    - evaluate existing test artifacts (no test execution)
 *
 * Examples:
 *   node .github/skills/default-browser-devtools/runner.js smoke --url http://localhost:5173 --engines webkit,chromium
 *   node .github/skills/default-browser-devtools/runner.js triage --url http://localhost:5173 --engine webkit
 *   node .github/skills/default-browser-devtools/runner.js eval --artifacts ./artifacts/... --learn true
 */

import fs from "node:fs";
import path from "node:path";
import process from "node:process";
import { chromium, webkit } from "playwright";
import TestEvaluator from "./evaluator.js";

function parseArgs(argv) {
  const out = { _: [] };
  for (let i = 0; i < argv.length; i++) {
    const a = argv[i];
    if (a.startsWith("--")) {
      const k = a.slice(2);
      const v = (i + 1 < argv.length && !argv[i + 1].startsWith("--")) ? argv[++i] : "true";
      out[k] = v;
    } else {
      out._.push(a);
    }
  }
  return out;
}

function nowStamp() {
  const d = new Date();
  const pad = (n) => String(n).padStart(2, "0");
  return `${d.getFullYear()}${pad(d.getMonth() + 1)}${pad(d.getDate())}_${pad(d.getHours())}${pad(d.getMinutes())}${pad(d.getSeconds())}`;
}

function ensureDir(p) {
  fs.mkdirSync(p, { recursive: true });
}

function splitCsv(v) {
  return String(v).split(",").map(s => s.trim()).filter(Boolean);
}

function pickEngine(name) {
  if (name === "webkit") return { name, engine: webkit };
  if (name === "chromium") return { name, engine: chromium };
  throw new Error(`Unsupported engine "${name}". Use "webkit" or "chromium".`);
}

async function makeContext(browser, opts) {
  const viewport = { width: Number(opts.viewportWidth || 1280), height: Number(opts.viewportHeight || 720) };
  return await browser.newContext({ viewport });
}

async function waitForReady(page, opts) {
  const timeoutMs = Number(opts.timeoutMs || 30_000);
  if (opts.readySelector) {
    await page.waitForSelector(String(opts.readySelector), { timeout: timeoutMs });
    return { type: "selector", value: String(opts.readySelector) };
  }
  if (opts.readyText) {
    await page.getByText(String(opts.readyText), { exact: false }).first().waitFor({ timeout: timeoutMs });
    return { type: "text", value: String(opts.readyText) };
  }
  // Default: networkidle + short settle
  await page.waitForTimeout(250);
  return { type: "default", value: "networkidle+250ms" };
}

function installCollectors(page) {
  const consoleMessages = [];
  const requestFailures = [];

  page.on("console", (msg) => {
    consoleMessages.push({
      type: msg.type(),
      text: msg.text(),
      location: msg.location(),
      time: Date.now(),
    });
  });

  page.on("pageerror", (err) => {
    consoleMessages.push({
      type: "pageerror",
      text: err?.message || String(err),
      location: null,
      time: Date.now(),
    });
  });

  page.on("requestfailed", (req) => {
    requestFailures.push({
      url: req.url(),
      method: req.method(),
      failure: req.failure(),
      time: Date.now(),
    });
  });

  return { consoleMessages, requestFailures };
}

async function takeSnapshot(page) {
  return await page.accessibility.snapshot();
}

async function safeInnerText(locator) {
  try {
    return await locator.innerText({ timeout: 500 });
  } catch {
    try {
      return await locator.textContent({ timeout: 500 }) || "";
    } catch {
      return "";
    }
  }
}

async function conservativeClickSweep(page, opts, knowledgeBase) {
  // Use learned selector if available and confident
  let selector = opts.sweepSelector || "button, a, [role='button'], summary";
  if (knowledgeBase?.optimized_selectors?.interactive_elements && 
      knowledgeBase.optimized_selectors.confidence >= 0.75) {
    selector = knowledgeBase.optimized_selectors.interactive_elements;
  }
  
  const maxClicks = Number(opts.maxClicks || 30);
  const postClickWaitMs = Number(opts.postClickWaitMs || 120);

  const locs = await page.locator(selector).all();
  const seen = new Set();
  const interactions = [];

  for (const loc of locs) {
    if (interactions.length >= maxClicks) break;

    const label = (await safeInnerText(loc)).trim().slice(0, 120) || (await loc.getAttribute("aria-label")) || "";
    const tag = await loc.evaluate(el => el.tagName).catch(() => "");
    const key = `${label}::${tag}`;
    if (seen.has(key)) continue;
    seen.add(key);

    try {
      await loc.scrollIntoViewIfNeeded().catch(() => {});
      const box = await loc.boundingBox().catch(() => null);
      if (!box || box.width < 2 || box.height < 2) continue;

      await loc.click({ timeout: 1000 });
      await page.waitForTimeout(postClickWaitMs);
      interactions.push({ label, tag, ok: true });
    } catch (e) {
      interactions.push({ label, tag, ok: false, error: String(e?.message || e) });
    }
  }

  return interactions;
}

function summarizeFindings(consoleMessages, requestFailures) {
  const errors = consoleMessages.filter(m => m.type === "error" || m.type === "pageerror");
  const warnings = consoleMessages.filter(m => m.type === "warning");
  return {
    console: {
      total: consoleMessages.length,
      errors: errors.length,
      warnings: warnings.length,
    },
    network: {
      failedRequests: requestFailures.length,
    },
  };
}

async function runOneEngine(command, url, engineName, opts, outRoot, knowledgeBase) {
  const { engine } = pickEngine(engineName);
  const browser = await engine.launch({ headless: String(opts.headless || "true") !== "false" });
  const context = await makeContext(browser, opts);
  const page = await context.newPage();

  const collectors = installCollectors(page);

  const engineOut = path.join(outRoot, engineName);
  ensureDir(engineOut);

  const result = {
    command,
    engine: engineName,
    url,
    ready: null,
    summary: null,
    interactions: [],
    files: {},
    ok: true,
  };

  try {
    await page.goto(url, { waitUntil: "networkidle" });
    result.ready = await waitForReady(page, opts);

    // Optional probes
    if (opts.eval) {
      const expr = String(opts.eval);
      const value = await page.evaluate(expr);
      const p = path.join(engineOut, "evaluate.json");
      fs.writeFileSync(p, JSON.stringify({ expr, value }, null, 2));
      result.files.evaluate = p;
    }

    // Baseline artifacts
    const baselinePng = path.join(engineOut, "baseline.png");
    await page.screenshot({ path: baselinePng, fullPage: true });
    result.files.baselineScreenshot = baselinePng;

    const baselineSnap = await takeSnapshot(page);
    const baselineSnapPath = path.join(engineOut, "snapshot_baseline.json");
    fs.writeFileSync(baselineSnapPath, JSON.stringify(baselineSnap, null, 2));
    result.files.baselineSnapshot = baselineSnapPath;

    if (command === "triage") {
      // no additional steps
    } else if (command === "smoke") {
      result.interactions = await conservativeClickSweep(page, opts, knowledgeBase);

      const postPng = path.join(engineOut, "post_interaction.png");
      await page.screenshot({ path: postPng, fullPage: true });
      result.files.postInteractionScreenshot = postPng;

      const postSnap = await takeSnapshot(page);
      const postSnapPath = path.join(engineOut, "snapshot_post.json");
      fs.writeFileSync(postSnapPath, JSON.stringify(postSnap, null, 2));
      result.files.postSnapshot = postSnapPath;
    } else if (command === "golden") {
      // Deterministic “golden path” steps.
      // Edit these steps to match your app’s intended invariants.
      const steps = [
        // Examples (edit to your app):
        // { type: "clickText", value: "Surface" },
        // { type: "waitText", value: "Surface Toolbox" },
      ];

      for (const step of steps) {
        if (step.type === "clickText") {
          await page.getByText(step.value, { exact: false }).first().click();
        } else if (step.type === "clickSelector") {
          await page.locator(step.value).first().click();
        } else if (step.type === "waitText") {
          await page.getByText(step.value, { exact: false }).first().waitFor({ timeout: Number(opts.timeoutMs || 30_000) });
        } else if (step.type === "waitSelector") {
          await page.waitForSelector(step.value, { timeout: Number(opts.timeoutMs || 30_000) });
        } else if (step.type === "fillSelector") {
          await page.locator(step.selector).fill(String(step.value ?? ""));
        } else if (step.type === "press") {
          await page.keyboard.press(step.value);
        }
      }

      const goldenPng = path.join(engineOut, "golden_end.png");
      await page.screenshot({ path: goldenPng, fullPage: true });
      result.files.goldenEndScreenshot = goldenPng;

      const goldenSnap = await takeSnapshot(page);
      const goldenSnapPath = path.join(engineOut, "snapshot_golden_end.json");
      fs.writeFileSync(goldenSnapPath, JSON.stringify(goldenSnap, null, 2));
      result.files.goldenEndSnapshot = goldenSnapPath;
    } else if (command === "perf") {
      await context.tracing.start({ screenshots: true, snapshots: true });
      await page.reload({ waitUntil: "networkidle" });
      await waitForReady(page, opts);
      await page.waitForTimeout(Number(opts.perfWindowMs || 1500));
      const tracePath = path.join(engineOut, "trace.zip");
      await context.tracing.stop({ path: tracePath });
      result.files.trace = tracePath;
    } else {
      throw new Error(`Unknown command "${command}"`);
    }

    // Logs
    const consolePath = path.join(engineOut, "console.json");
    fs.writeFileSync(consolePath, JSON.stringify(collectors.consoleMessages, null, 2));
    result.files.console = consolePath;

    const networkPath = path.join(engineOut, "network_failures.json");
    fs.writeFileSync(networkPath, JSON.stringify(collectors.requestFailures, null, 2));
    result.files.networkFailures = networkPath;

    result.summary = summarizeFindings(collectors.consoleMessages, collectors.requestFailures);

    // Pass/fail heuristic
    const hardErrors = collectors.consoleMessages.some(m => m.type === "pageerror");
    const consoleErrorCount = collectors.consoleMessages.filter(m => m.type === "error").length;
    const failedReqs = collectors.requestFailures.length;

    if (hardErrors || failedReqs > 0 || consoleErrorCount > 0) {
      result.ok = false;
    }

    const summaryPath = path.join(engineOut, "summary.json");
    fs.writeFileSync(summaryPath, JSON.stringify(result, null, 2));
    result.files.summary = summaryPath;

  } catch (e) {
    result.ok = false;
    result.error = String(e?.stack || e?.message || e);
    const summaryPath = path.join(engineOut, "summary.json");
    fs.writeFileSync(summaryPath, JSON.stringify(result, null, 2));
    result.files.summary = summaryPath;
  } finally {
    await browser.close().catch(() => {});
  }

  return result;
}

async function main() {
  const argv = process.argv.slice(2);
  const args = parseArgs(argv);

  const command = args._[0];
  if (!command || !["smoke", "triage", "golden", "perf", "eval"].includes(command)) {
    console.error("Usage: runner.js <smoke|triage|golden|perf|eval> --url <http://...> [options]");
    console.error("\nCommands:");
    console.error("  smoke   - Load + click sweep + artifacts + evaluation");
    console.error("  triage  - Console + network + screenshot + evaluation");
    console.error("  golden  - Deterministic feature sequence + evaluation");
    console.error("  perf    - Performance trace + analysis");
    console.error("  eval    - Evaluate existing test artifacts");
    console.error("\nOptions:");
    console.error("  --url <url>                   Target URL (default: http://localhost:5173)");
    console.error("  --engine <webkit|chromium>    Single engine");
    console.error("  --engines <list>              Comma-separated engines (default: webkit,chromium)");
    console.error("  --learn <true|false>          Enable evaluation & learning (default: true)");
    console.error("  --knowledge-base <path>       Path to knowledge base (default: ./test-knowledge.json)");
    console.error("  --eval-only <true|false>      Only evaluate, don't run tests");
    console.error("  --eval-consensus <n>          Number of evaluation passes for consensus (default: 1)");
    console.error("  --artifacts <path>            Path to artifacts for eval-only mode");
    console.error("  --headless <true|false>       Run in headless mode (default: true)");
    process.exit(2);
  }

  // Load knowledge base if learning is enabled
  let knowledgeBase = null;
  const knowledgeBasePath = args.knowledgeBase || path.join(path.dirname(new URL(import.meta.url).pathname), "test-knowledge.json");
  if (args.learn !== "false" && fs.existsSync(knowledgeBasePath)) {
    try {
      knowledgeBase = JSON.parse(fs.readFileSync(knowledgeBasePath, "utf8"));
    } catch (e) {
      console.warn(`Failed to load knowledge base: ${e.message}`);
    }
  }

  // Handle eval-only mode
  if (args.evalOnly === "true" || command === "eval") {
    const artifactsPath = args.artifacts || args.url;
    if (!artifactsPath) {
      console.error("Error: --artifacts path is required for eval-only mode");
      process.exit(2);
    }
    
    if (!fs.existsSync(artifactsPath)) {
      console.error(`Error: Artifacts path does not exist: ${artifactsPath}`);
      process.exit(2);
    }

    console.log("\n--- Evaluation-Only Mode ---\n");
    const evaluator = new TestEvaluator(knowledgeBasePath);
    
    // Find engine directories
    const engineDirs = fs.readdirSync(artifactsPath).filter(d => {
      const fullPath = path.join(artifactsPath, d);
      return fs.statSync(fullPath).isDirectory();
    });
    
    if (engineDirs.length === 0) {
      console.error("No engine directories found in artifacts path");
      process.exit(2);
    }

    const evaluations = [];
    for (const engineDir of engineDirs) {
      const enginePath = path.join(artifactsPath, engineDir);
      console.log(`Evaluating ${engineDir}...`);
      
      try {
        const evaluation = evaluator.evaluate(enginePath);
        evaluations.push(evaluation);
        
        console.log(JSON.stringify(evaluation, null, 2));
        console.log();
      } catch (e) {
        console.error(`  Evaluation failed: ${e.message}`);
      }
    }

    // Write combined evaluation
    const combinedEvalPath = path.join(artifactsPath, "combined_evaluation.json");
    fs.writeFileSync(combinedEvalPath, JSON.stringify({
      timestamp: new Date().toISOString(),
      knowledge_base: knowledgeBasePath,
      evaluations,
    }, null, 2));
    
    console.log(`\n✓ Evaluation complete. Results written to ${combinedEvalPath}\n`);
    process.exit(0);
  }

  const url = String(args.url || "http://localhost:5173");
  const engines = args.engines ? splitCsv(args.engines) : (args.engine ? [String(args.engine)] : ["webkit", "chromium"]);

  const outRoot = path.resolve(process.cwd(), "artifacts", "default-browser-devtools", nowStamp());
  ensureDir(outRoot);

  const results = [];
  for (const eng of engines) {
    results.push(await runOneEngine(command, url, eng, args, outRoot, knowledgeBase));
  }

  const combined = {
    command,
    url,
    engines,
    outRoot,
    ok: results.every(r => r.ok),
    results,
  };

  const combinedPath = path.join(outRoot, "combined_summary.json");
  fs.writeFileSync(combinedPath, JSON.stringify(combined, null, 2));

  console.log(JSON.stringify({
    ok: combined.ok,
    outRoot: combined.outRoot,
    engines: combined.engines,
    results: results.map(r => ({
      engine: r.engine,
      ok: r.ok,
      consoleErrors: r.summary?.console?.errors ?? null,
      consoleWarnings: r.summary?.console?.warnings ?? null,
      failedRequests: r.summary?.network?.failedRequests ?? null,
      summaryFile: r.files?.summary ?? null,
    }))
  }, null, 2));

  // Evaluation & Learning Phase
  if (args.learn !== "false" && command !== "perf") {
    console.log("\n--- Evaluation & Learning Phase ---\n");
    
    const evaluator = new TestEvaluator(knowledgeBasePath);
    const consensus = Number(args.evalConsensus || 1);
    
    for (const result of results) {
      const engineOut = path.join(outRoot, result.engine);
      console.log(`Evaluating ${result.engine} test run...`);
      
      try {
        const evaluations = [];
        
        // Run evaluation multiple times if consensus requested
        for (let i = 0; i < consensus; i++) {
          evaluations.push(evaluator.evaluate(engineOut));
        }
        
        // Use first evaluation (or average for consensus)
        const evaluation = evaluations[0];
        
        // If consensus > 1, compute average scores
        if (consensus > 1) {
          const avgScore = evaluations.reduce((sum, e) => sum + e.overall_score, 0) / evaluations.length;
          const avgConfidence = evaluations.reduce((sum, e) => sum + e.confidence, 0) / evaluations.length;
          
          console.log(`  Score: ${avgScore.toFixed(2)} (consensus of ${consensus})`);
          console.log(`  Confidence: ${avgConfidence.toFixed(2)}`);
          
          evaluation.consensus = {
            runs: consensus,
            average_score: avgScore,
            average_confidence: avgConfidence,
            variance: evaluations.reduce((sum, e) => sum + Math.pow(e.overall_score - avgScore, 2), 0) / evaluations.length,
          };
        } else {
          console.log(`  Score: ${evaluation.overall_score.toFixed(2)}`);
          console.log(`  Confidence: ${evaluation.confidence.toFixed(2)}`);
        }
        
        console.log(`  Patterns detected: ${evaluation.patterns_detected}`);
        console.log(`  Patterns learned: ${evaluation.patterns_learned}`);
        
        if (evaluation.optimizations.length > 0) {
          console.log(`  Optimizations suggested: ${evaluation.optimizations.length}`);
          evaluation.optimizations.slice(0, 3).forEach(opt => {
            console.log(`    - [${opt.priority}] ${opt.suggestion}`);
          });
        }
        
        if (evaluation.feedback.length > 0) {
          console.log(`  Feedback:`);
          evaluation.feedback.forEach(fb => {
            console.log(`    - [${fb.severity}] ${fb.message}`);
          });
        }
        
        // Write evaluation to file
        const evalPath = path.join(engineOut, "evaluation.json");
        fs.writeFileSync(evalPath, JSON.stringify(evaluation, null, 2));
        
      } catch (e) {
        console.error(`  Evaluation failed: ${e.message}`);
      }
    }
    
    console.log("\n✓ Knowledge base updated\n");
  }
}

main().catch((e) => {
  console.error(e);
  process.exit(1);
});
