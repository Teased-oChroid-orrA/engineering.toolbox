#!/usr/bin/env node
/**
 * TestEvaluator - Agentic-eval framework for test quality assessment
 * 
 * Implements continuous learning from test execution results with:
 * - Multi-dimensional scoring (completeness, precision, recall, efficiency)
 * - Pattern detection (ResizeObserver, hydration, network, timing)
 * - Knowledge base updates (patterns, selectors, thresholds)
 * - Optimization suggestions
 */

import fs from "node:fs";
import path from "node:path";

/**
 * Evaluation weights for scoring dimensions
 */
const WEIGHTS = {
  completeness: 0.30,
  precision: 0.25,
  recall: 0.25,
  efficiency: 0.20,
};

/**
 * Known patterns that the evaluator learns to recognize
 */
const PATTERN_LIBRARY = {
  resizeObserverLoop: /ResizeObserver loop/i,
  hydrationError: /hydrat(ion|e)/i,
  networkTimeout: /timeout|ETIMEDOUT|ECONNREFUSED/i,
  timingIssue: /racing|timing|async/i,
  platformSpecific: /webkit|chromium|blink|safari|chrome/i,
};

class TestEvaluator {
  /**
   * @param {string} knowledgeBasePath - Path to knowledge base JSON file
   */
  constructor(knowledgeBasePath = "./test-knowledge.json") {
    this.knowledgeBasePath = knowledgeBasePath;
    this.knowledgeBase = this.loadKnowledgeBase();
  }

  /**
   * Load knowledge base from disk, or create default if missing
   */
  loadKnowledgeBase() {
    if (fs.existsSync(this.knowledgeBasePath)) {
      try {
        return JSON.parse(fs.readFileSync(this.knowledgeBasePath, "utf8"));
      } catch (e) {
        console.warn(`Failed to parse knowledge base: ${e.message}, using defaults`);
        return this.defaultKnowledgeBase();
      }
    }
    return this.defaultKnowledgeBase();
  }

  /**
   * Default knowledge base structure
   */
  defaultKnowledgeBase() {
    return {
      version: "1.0",
      learned_patterns: [],
      optimized_selectors: {
        interactive_elements: "button, a, [role='button'], summary",
        confidence: 0.70,
      },
      threshold_calibration: {
        smoke_test: {
          baseline_score: 0.85,
          confidence_threshold: 0.80,
          adjusted_from: [],
        },
      },
      failure_clusters: [],
    };
  }

  /**
   * Persist knowledge base to disk
   */
  saveKnowledgeBase() {
    try {
      fs.writeFileSync(
        this.knowledgeBasePath,
        JSON.stringify(this.knowledgeBase, null, 2),
        "utf8"
      );
      return true;
    } catch (e) {
      console.error(`Failed to save knowledge base: ${e.message}`);
      return false;
    }
  }

  /**
   * Main evaluation entry point
   * @param {string} testRunPath - Path to test run artifacts directory
   * @returns {object} Evaluation result with scores, patterns, and optimizations
   */
  evaluate(testRunPath) {
    // Load artifacts
    const summary = this.loadArtifact(testRunPath, "summary.json");
    const console = this.loadArtifact(testRunPath, "console.json");
    const network = this.loadArtifact(testRunPath, "network_failures.json");

    if (!summary) {
      throw new Error(`No summary.json found at ${testRunPath}`);
    }

    // Score each dimension
    const completeness = this.scoreCompleteness(summary);
    const precision = this.scorePrecision(console, network);
    const recall = this.scoreRecall(summary, console);
    const efficiency = this.scoreEfficiency(summary);

    // Calculate weighted overall score
    const overallScore =
      completeness * WEIGHTS.completeness +
      precision * WEIGHTS.precision +
      recall * WEIGHTS.recall +
      efficiency * WEIGHTS.efficiency;

    // Detect patterns
    const patterns = this.detectPatterns(console, network);

    // Generate optimizations
    const optimizations = this.suggestOptimizations(summary, patterns);

    // Update knowledge base
    const patternsLearned = this.updateKnowledgeBase(patterns, optimizations);

    // Calculate confidence in this evaluation
    const confidence = this.calculateConfidence({
      completeness,
      precision,
      recall,
      efficiency,
    });

    // Generate actionable feedback
    const feedback = this.generateFeedback(
      { completeness, precision, recall, efficiency },
      patterns
    );

    return {
      test_run_id: path.basename(testRunPath),
      overall_score: overallScore,
      dimensions: {
        completeness,
        precision,
        recall,
        efficiency,
      },
      confidence,
      feedback,
      optimizations,
      patterns_detected: patterns.length,
      patterns_learned: patternsLearned,
      knowledge_base_updated: patternsLearned > 0,
    };
  }

  /**
   * Load artifact JSON file
   */
  loadArtifact(basePath, filename) {
    const fullPath = path.join(basePath, filename);
    if (!fs.existsSync(fullPath)) {
      return null;
    }
    try {
      return JSON.parse(fs.readFileSync(fullPath, "utf8"));
    } catch (e) {
      console.warn(`Failed to parse ${filename}: ${e.message}`);
      return null;
    }
  }

  /**
   * Score completeness: Did we capture all necessary evidence?
   * @param {object} summary - Test summary object
   * @returns {number} Score 0-1
   */
  scoreCompleteness(summary) {
    let score = 0.0;
    const checks = [
      // Basic artifacts present
      summary.files?.baselineScreenshot ? 0.15 : 0,
      summary.files?.console ? 0.15 : 0,
      summary.files?.networkFailures ? 0.15 : 0,
      summary.files?.summary ? 0.10 : 0,

      // Command-specific artifacts
      summary.command === "smoke" && summary.files?.postInteractionScreenshot ? 0.15 : 0,
      summary.command === "smoke" && summary.files?.postSnapshot ? 0.10 : 0,
      summary.command === "golden" && summary.files?.goldenEndScreenshot ? 0.15 : 0,
      summary.command === "perf" && summary.files?.trace ? 0.25 : 0,

      // Interaction data
      summary.command === "smoke" && Array.isArray(summary.interactions) ? 0.10 : 0,
      
      // Ready signal captured
      summary.ready ? 0.10 : 0,
    ];

    score = checks.reduce((sum, val) => sum + val, 0);
    
    // Normalize to max 1.0
    return Math.min(1.0, score);
  }

  /**
   * Score precision: Low false positive rate?
   * @param {array} console - Console messages
   * @param {array} network - Network failures
   * @returns {number} Score 0-1
   */
  scorePrecision(console, network) {
    if (!console || !network) return 0.5; // Neutral if missing data

    // Start at 1.0, deduct for known false positives
    let score = 1.0;

    const consoleMessages = console || [];
    const networkFailures = network || [];

    // ResizeObserver loops are common false positives (minor deduction)
    const resizeObserverCount = consoleMessages.filter(m =>
      PATTERN_LIBRARY.resizeObserverLoop.test(m.text)
    ).length;
    score -= resizeObserverCount * 0.02;

    // Excessive warnings might indicate noise
    const warningCount = consoleMessages.filter(m => m.type === "warning").length;
    if (warningCount > 20) {
      score -= 0.1;
    }

    // Network failures to known dev assets (less critical)
    const devAssetFailures = networkFailures.filter(f =>
      f.url.includes("localhost") || f.url.includes("127.0.0.1")
    ).length;
    score -= devAssetFailures * 0.05;

    return Math.max(0.0, Math.min(1.0, score));
  }

  /**
   * Score recall: Did we catch critical failures?
   * @param {object} summary - Test summary
   * @param {array} console - Console messages
   * @returns {number} Score 0-1
   */
  scoreRecall(summary, console) {
    if (!summary || !console) return 0.5;

    let score = 1.0;

    // Critical failures should be detected
    const hasPageErrors = console.some(m => m.type === "pageerror");
    const hasConsoleErrors = console.some(m => m.type === "error");
    const hasNetworkFailures = summary.summary?.network?.failedRequests > 0;

    // If test passed but there were errors, recall is poor
    if (summary.ok && (hasPageErrors || hasConsoleErrors || hasNetworkFailures)) {
      score -= 0.3;
    }

    // Check for hydration issues (critical in Svelte)
    const hydrationErrors = console.filter(m =>
      PATTERN_LIBRARY.hydrationError.test(m.text)
    );
    if (hydrationErrors.length > 0 && summary.ok) {
      score -= 0.2;
    }

    return Math.max(0.0, Math.min(1.0, score));
  }

  /**
   * Score efficiency: Good cost vs value ratio?
   * @param {object} summary - Test summary
   * @returns {number} Score 0-1
   */
  scoreEfficiency(summary) {
    if (!summary) return 0.5;

    let score = 1.0;

    // Smoke test interaction count
    if (summary.command === "smoke" && Array.isArray(summary.interactions)) {
      const interactionCount = summary.interactions.length;
      // Optimal range: 10-30 interactions
      if (interactionCount < 5) {
        score -= 0.2; // Too few, low coverage
      } else if (interactionCount > 50) {
        score -= 0.3; // Too many, diminishing returns
      }
    }

    // Error rate indicates wasted effort
    if (summary.summary) {
      const errorRate = summary.summary.console?.errors || 0;
      if (errorRate > 10) {
        score -= 0.2;
      }
    }

    return Math.max(0.0, Math.min(1.0, score));
  }

  /**
   * Detect patterns in test results
   * @param {array} console - Console messages
   * @param {array} network - Network failures
   * @returns {array} Detected patterns
   */
  detectPatterns(console, network) {
    const patterns = [];
    const consoleMessages = console || [];
    const networkFailures = network || [];

    // ResizeObserver loops
    const resizeObserverMatches = consoleMessages.filter(m =>
      PATTERN_LIBRARY.resizeObserverLoop.test(m.text)
    );
    if (resizeObserverMatches.length > 0) {
      patterns.push({
        type: "resizeObserverLoop",
        count: resizeObserverMatches.length,
        severity: "low",
        description: "ResizeObserver loop detected (common false positive)",
      });
    }

    // Hydration errors
    const hydrationMatches = consoleMessages.filter(m =>
      PATTERN_LIBRARY.hydrationError.test(m.text)
    );
    if (hydrationMatches.length > 0) {
      patterns.push({
        type: "hydrationError",
        count: hydrationMatches.length,
        severity: "high",
        description: "Hydration mismatch detected (critical for Svelte)",
      });
    }

    // Network timeouts
    const timeoutMatches = networkFailures.filter(f =>
      PATTERN_LIBRARY.networkTimeout.test(f.failure?.errorText || "")
    );
    if (timeoutMatches.length > 0) {
      patterns.push({
        type: "networkTimeout",
        count: timeoutMatches.length,
        severity: "medium",
        description: "Network timeout detected",
      });
    }

    // Timing issues
    const timingMatches = consoleMessages.filter(m =>
      PATTERN_LIBRARY.timingIssue.test(m.text)
    );
    if (timingMatches.length > 0) {
      patterns.push({
        type: "timingIssue",
        count: timingMatches.length,
        severity: "medium",
        description: "Timing/async issue detected",
      });
    }

    return patterns;
  }

  /**
   * Suggest optimizations based on patterns and summary
   * @param {object} summary - Test summary
   * @param {array} patterns - Detected patterns
   * @returns {array} Optimization suggestions
   */
  suggestOptimizations(summary, patterns) {
    const optimizations = [];

    // Pattern-based optimizations
    for (const pattern of patterns) {
      if (pattern.type === "resizeObserverLoop" && pattern.count > 3) {
        optimizations.push({
          category: "filtering",
          priority: "low",
          suggestion: "Add ResizeObserver loop filtering to reduce noise",
          rationale: `${pattern.count} occurrences detected`,
        });
      }

      if (pattern.type === "hydrationError") {
        optimizations.push({
          category: "code-quality",
          priority: "high",
          suggestion: "Fix Svelte hydration mismatch (SSR/CSR content differs)",
          rationale: "Hydration errors can cause UI inconsistencies",
        });
      }

      if (pattern.type === "networkTimeout") {
        optimizations.push({
          category: "reliability",
          priority: "medium",
          suggestion: "Increase network timeout or add retry logic",
          rationale: `${pattern.count} timeout(s) detected`,
        });
      }
    }

    // Interaction count optimizations
    if (summary.command === "smoke" && Array.isArray(summary.interactions)) {
      const interactionCount = summary.interactions.length;
      if (interactionCount > 40) {
        optimizations.push({
          category: "efficiency",
          priority: "medium",
          suggestion: "Reduce maxClicks or refine sweepSelector to focus on critical interactions",
          rationale: `${interactionCount} interactions is high; diminishing returns`,
        });
      }

      // Check failed interactions
      const failedInteractions = summary.interactions.filter(i => !i.ok);
      if (failedInteractions.length > 5) {
        optimizations.push({
          category: "selector",
          priority: "medium",
          suggestion: "Update selector to exclude non-interactive elements",
          rationale: `${failedInteractions.length} failed interactions indicate selector noise`,
        });
      }
    }

    return optimizations;
  }

  /**
   * Update knowledge base with new patterns and optimizations
   * @param {array} patterns - Detected patterns
   * @param {array} optimizations - Suggested optimizations
   * @returns {number} Number of new patterns learned
   */
  updateKnowledgeBase(patterns, optimizations) {
    let newPatterns = 0;

    // Track pattern occurrences
    for (const pattern of patterns) {
      const existing = this.knowledgeBase.learned_patterns.find(
        p => p.type === pattern.type
      );

      if (existing) {
        existing.occurrences = (existing.occurrences || 0) + 1;
        existing.last_seen = new Date().toISOString();
      } else {
        this.knowledgeBase.learned_patterns.push({
          type: pattern.type,
          severity: pattern.severity,
          description: pattern.description,
          occurrences: 1,
          first_seen: new Date().toISOString(),
          last_seen: new Date().toISOString(),
        });
        newPatterns++;
      }
    }

    // Cluster similar failures
    if (patterns.length > 0) {
      const clusterKey = patterns.map(p => p.type).sort().join("+");
      const existingCluster = this.knowledgeBase.failure_clusters.find(
        c => c.pattern_signature === clusterKey
      );

      if (existingCluster) {
        existingCluster.occurrences = (existingCluster.occurrences || 0) + 1;
        existingCluster.last_seen = new Date().toISOString();
      } else {
        this.knowledgeBase.failure_clusters.push({
          pattern_signature: clusterKey,
          patterns: patterns.map(p => p.type),
          occurrences: 1,
          first_seen: new Date().toISOString(),
          last_seen: new Date().toISOString(),
        });
      }
    }

    // Update selector confidence based on failed interactions
    const selectorOptimizations = optimizations.filter(
      o => o.category === "selector"
    );
    if (selectorOptimizations.length > 0) {
      this.knowledgeBase.optimized_selectors.confidence = Math.max(
        0.5,
        this.knowledgeBase.optimized_selectors.confidence - 0.05
      );
    } else if (patterns.length === 0) {
      // No issues, increase confidence
      this.knowledgeBase.optimized_selectors.confidence = Math.min(
        0.95,
        this.knowledgeBase.optimized_selectors.confidence + 0.02
      );
    }

    // Save updated knowledge base
    this.saveKnowledgeBase();

    return newPatterns;
  }

  /**
   * Calculate confidence in the evaluation
   * @param {object} scores - Individual dimension scores
   * @returns {number} Confidence score 0-1
   */
  calculateConfidence(scores) {
    // High variance in scores indicates uncertainty
    const values = Object.values(scores);
    const mean = values.reduce((sum, v) => sum + v, 0) / values.length;
    const variance =
      values.reduce((sum, v) => sum + Math.pow(v - mean, 2), 0) / values.length;
    const stdDev = Math.sqrt(variance);

    // Lower variance = higher confidence
    let confidence = 1.0 - stdDev;

    // Adjust based on data availability
    if (values.some(v => v === 0.5)) {
      confidence *= 0.9; // Some dimensions had missing data
    }

    return Math.max(0.0, Math.min(1.0, confidence));
  }

  /**
   * Generate actionable feedback
   * @param {object} scores - Individual dimension scores
   * @param {array} patterns - Detected patterns
   * @returns {array} Feedback items
   */
  generateFeedback(scores, patterns) {
    const feedback = [];

    // Dimension-specific feedback
    if (scores.completeness < 0.7) {
      feedback.push({
        dimension: "completeness",
        severity: "medium",
        message: "Some expected artifacts are missing",
        action: "Check that all test steps completed successfully",
      });
    }

    if (scores.precision < 0.7) {
      feedback.push({
        dimension: "precision",
        severity: "low",
        message: "High false positive rate detected",
        action: "Consider filtering known benign issues (e.g., ResizeObserver loops)",
      });
    }

    if (scores.recall < 0.7) {
      feedback.push({
        dimension: "recall",
        severity: "high",
        message: "Critical errors may not be caught properly",
        action: "Review error detection logic and thresholds",
      });
    }

    if (scores.efficiency < 0.6) {
      feedback.push({
        dimension: "efficiency",
        severity: "medium",
        message: "Test efficiency could be improved",
        action: "Optimize interaction count or reduce redundant checks",
      });
    }

    // Pattern-specific feedback
    const highSeverityPatterns = patterns.filter(p => p.severity === "high");
    if (highSeverityPatterns.length > 0) {
      feedback.push({
        dimension: "quality",
        severity: "high",
        message: `${highSeverityPatterns.length} high-severity issue(s) detected`,
        action: "Address critical patterns before proceeding",
      });
    }

    return feedback;
  }
}

export default TestEvaluator;
