#!/usr/bin/env node
/**
 * RefactorEvaluator - Agentic-eval framework for refactoring quality assessment
 * 
 * Implements continuous learning from refactoring results with:
 * - Multi-dimensional scoring (completeness, correctness, maintainability, safety)
 * - Pattern detection (code smells, anti-patterns, improvements)
 * - Knowledge base updates (successful patterns, smell clusters)
 * - Quality recommendations
 */

import fs from "node:fs";
import path from "node:path";

/**
 * Evaluation weights for scoring dimensions
 */
const WEIGHTS = {
  completeness: 0.25,    // All intended refactorings applied?
  correctness: 0.35,     // Behavior preserved correctly?
  maintainability: 0.25, // Code more maintainable?
  safety: 0.15,          // No risky changes introduced?
};

/**
 * Code smell patterns that the evaluator learns to recognize
 */
const SMELL_LIBRARY = {
  longMethod: {
    pattern: /function\s+\w+\s*\([^)]*\)\s*\{[\s\S]{500,}\}/g,
    severity: "medium",
    description: "Long method (>50 lines estimated)",
  },
  magicNumber: {
    pattern: /(?<!['"]\s*)(?<!\w)\b(?:0[xX][0-9a-fA-F]+|\d{3,})\b(?!\s*['"])/g,
    severity: "low",
    description: "Magic number (not in quotes, 3+ digits or hex)",
  },
  deepNesting: {
    pattern: /\{\s*(?:[^{}]*\{){4,}/g,
    severity: "high",
    description: "Deep nesting (4+ levels)",
  },
  duplicatedCode: {
    pattern: /(.{30,})\n(?:.*\n){0,5}\1/g,
    severity: "high",
    description: "Potential duplicated code (30+ char sequences repeated)",
  },
  largeClass: {
    pattern: /class\s+\w+[\s\S]{2000,}?\n\}/g,
    severity: "medium",
    description: "Large class (>300 lines estimated)",
  },
  longParameterList: {
    pattern: /function\s+\w+\s*\([^)]{80,}\)/g,
    severity: "medium",
    description: "Long parameter list (>80 chars)",
  },
};

/**
 * Improvement patterns to detect
 */
const IMPROVEMENT_PATTERNS = {
  extractedMethod: /(?:function|const)\s+\w+\s*=/g,
  introducedConstant: /const\s+[A-Z_][A-Z0-9_]*\s*=/g,
  addedType: /:\s*(?:string|number|boolean|object|any|\w+\[\]|\{\s*\w+)/g,
  reducedNesting: /if\s*\([^)]+\)\s*return/g, // Early returns
  improvedNaming: /(?:is|has|get|set|create|update|delete|fetch|calculate)\w+/g,
};

class RefactorEvaluator {
  /**
   * @param {string} knowledgeBasePath - Path to knowledge base JSON file
   */
  constructor(knowledgeBasePath = "./refactor-knowledge.json") {
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
      learned_smells: [],
      successful_refactorings: [],
      refactoring_patterns: {
        extract_method: { success_count: 0, confidence: 0.70 },
        introduce_constant: { success_count: 0, confidence: 0.75 },
        improve_naming: { success_count: 0, confidence: 0.80 },
        reduce_nesting: { success_count: 0, confidence: 0.70 },
        add_types: { success_count: 0, confidence: 0.65 },
      },
      threshold_calibration: {
        minimal_mode: {
          baseline_score: 0.80,
          confidence_threshold: 0.75,
          adjusted_from: [],
        },
        structural_mode: {
          baseline_score: 0.75,
          confidence_threshold: 0.70,
          adjusted_from: [],
        },
      },
      smell_clusters: [],
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
   * @param {string} beforePath - Path to original file
   * @param {string} afterPath - Path to refactored file
   * @param {object} metadata - Refactoring metadata (mode, intents, etc.)
   * @returns {object} Evaluation result with scores, patterns, and recommendations
   */
  evaluate(beforePath, afterPath, metadata = {}) {
    // Load files
    const beforeCode = this.loadFile(beforePath);
    const afterCode = this.loadFile(afterPath);

    if (!beforeCode || !afterCode) {
      throw new Error(`Cannot load files: before=${beforePath}, after=${afterPath}`);
    }

    // Score each dimension
    const completeness = this.scoreCompleteness(beforeCode, afterCode, metadata);
    const correctness = this.scoreCorrectness(beforeCode, afterCode, metadata);
    const maintainability = this.scoreMaintainability(beforeCode, afterCode);
    const safety = this.scoreSafety(beforeCode, afterCode);

    // Calculate weighted overall score
    const overallScore =
      completeness * WEIGHTS.completeness +
      correctness * WEIGHTS.correctness +
      maintainability * WEIGHTS.maintainability +
      safety * WEIGHTS.safety;

    // Detect patterns
    const smellsBefore = this.detectSmells(beforeCode);
    const smellsAfter = this.detectSmells(afterCode);
    const improvements = this.detectImprovements(beforeCode, afterCode);

    // Generate recommendations
    const recommendations = this.generateRecommendations(
      { completeness, correctness, maintainability, safety },
      smellsBefore,
      smellsAfter,
      improvements
    );

    // Update knowledge base
    const patternsLearned = this.updateKnowledgeBase(
      smellsBefore,
      smellsAfter,
      improvements,
      metadata
    );

    // Calculate confidence in this evaluation
    const confidence = this.calculateConfidence({
      completeness,
      correctness,
      maintainability,
      safety,
    });

    // Generate actionable feedback
    const feedback = this.generateFeedback(
      { completeness, correctness, maintainability, safety },
      smellsBefore,
      smellsAfter
    );

    return {
      refactoring_id: path.basename(afterPath, path.extname(afterPath)),
      overall_score: overallScore,
      dimensions: {
        completeness,
        correctness,
        maintainability,
        safety,
      },
      confidence,
      feedback,
      recommendations,
      smells_removed: smellsBefore.length - smellsAfter.length,
      improvements_applied: improvements.length,
      patterns_learned: patternsLearned,
      knowledge_base_updated: patternsLearned > 0,
    };
  }

  /**
   * Load file content
   */
  loadFile(filePath) {
    if (!fs.existsSync(filePath)) {
      return null;
    }
    try {
      return fs.readFileSync(filePath, "utf8");
    } catch (e) {
      console.warn(`Failed to read file ${filePath}: ${e.message}`);
      return null;
    }
  }

  /**
   * Score completeness: Were all intended refactorings applied?
   * @param {string} beforeCode - Original code
   * @param {string} afterCode - Refactored code
   * @param {object} metadata - Metadata with intended refactorings
   * @returns {number} Score 0-1
   */
  scoreCompleteness(beforeCode, afterCode, metadata) {
    let score = 0.8; // Base score

    // Check if code changed
    if (beforeCode === afterCode) {
      return 0.3; // No changes made
    }

    // Check for improvements based on mode
    const mode = metadata.mode || "minimal";
    const improvements = this.detectImprovements(beforeCode, afterCode);

    if (mode === "minimal") {
      // Expect at least some basic improvements
      if (improvements.length > 0) score += 0.1;
      if (improvements.length > 3) score += 0.1;
    } else if (mode === "structural") {
      // Expect significant structural changes
      const structuralChanges =
        improvements.filter((i) => i.type === "extractedMethod").length;
      if (structuralChanges > 0) score += 0.1;
      if (structuralChanges > 2) score += 0.1;
    } else if (mode === "type-safety") {
      // Expect type additions
      const typeImprovements = improvements.filter((i) => i.type === "addedType")
        .length;
      if (typeImprovements > 0) score += 0.1;
      if (typeImprovements > 5) score += 0.1;
    }

    return Math.min(1.0, score);
  }

  /**
   * Score correctness: Was behavior preserved?
   * @param {string} beforeCode - Original code
   * @param {string} afterCode - Refactored code
   * @param {object} metadata - Metadata
   * @returns {number} Score 0-1
   */
  scoreCorrectness(beforeCode, afterCode, metadata) {
    let score = 1.0; // Assume correct unless evidence of issues

    // Check for risky patterns
    const riskyPatterns = [
      // Changed function signatures
      { pattern: /export\s+(?:function|class|const|let|var)\s+\w+/g, penalty: 0.2 },
      // Changed async/sync
      { pattern: /async\s+function/g, penalty: 0.15 },
      // Changed side effects order (hard to detect, use heuristic)
      { pattern: /(?:console|fetch|localStorage|sessionStorage)\./g, penalty: 0.05 },
    ];

    for (const { pattern, penalty } of riskyPatterns) {
      const beforeMatches = (beforeCode.match(pattern) || []).length;
      const afterMatches = (afterCode.match(pattern) || []).length;

      if (beforeMatches !== afterMatches) {
        score -= penalty;
      }
    }

    // Check if error handling changed
    const beforeTryCatch = (beforeCode.match(/try\s*\{/g) || []).length;
    const afterTryCatch = (afterCode.match(/try\s*\{/g) || []).length;
    if (beforeTryCatch !== afterTryCatch) {
      score -= 0.1;
    }

    return Math.max(0.0, Math.min(1.0, score));
  }

  /**
   * Score maintainability: Is code more maintainable?
   * @param {string} beforeCode - Original code
   * @param {string} afterCode - Refactored code
   * @returns {number} Score 0-1
   */
  scoreMaintainability(beforeCode, afterCode) {
    let score = 0.5; // Neutral starting point

    const smellsBefore = this.detectSmells(beforeCode);
    const smellsAfter = this.detectSmells(afterCode);

    // Smell reduction is good
    const smellReduction = smellsBefore.length - smellsAfter.length;
    if (smellReduction > 0) {
      score += Math.min(0.3, smellReduction * 0.1);
    } else if (smellReduction < 0) {
      score -= Math.min(0.2, Math.abs(smellReduction) * 0.1);
    }

    // Check code length (shorter is often better after refactoring)
    const beforeLines = beforeCode.split("\n").length;
    const afterLines = afterCode.split("\n").length;
    const lineReduction = (beforeLines - afterLines) / beforeLines;

    if (lineReduction > 0.1 && lineReduction < 0.5) {
      // Significant but not excessive reduction
      score += 0.1;
    } else if (afterLines > beforeLines * 1.2) {
      // Code got significantly longer (might be worse)
      score -= 0.1;
    }

    // Check for improved naming patterns
    const improvedNaming = (afterCode.match(IMPROVEMENT_PATTERNS.improvedNaming) || [])
      .length;
    const originalNaming = (beforeCode.match(IMPROVEMENT_PATTERNS.improvedNaming) || [])
      .length;
    if (improvedNaming > originalNaming) {
      score += 0.1;
    }

    return Math.max(0.0, Math.min(1.0, score));
  }

  /**
   * Score safety: Were risky changes avoided?
   * @param {string} beforeCode - Original code
   * @param {string} afterCode - Refactored code
   * @returns {number} Score 0-1
   */
  scoreSafety(beforeCode, afterCode) {
    let score = 1.0; // Start with perfect safety

    // Check for new dependencies
    const beforeImports = (beforeCode.match(/import\s+.*from/g) || []).length;
    const afterImports = (afterCode.match(/import\s+.*from/g) || []).length;
    if (afterImports > beforeImports) {
      score -= 0.2; // New dependencies are risky
    }

    // Check for new any types (reduces type safety)
    const beforeAny = (beforeCode.match(/:\s*any\b/g) || []).length;
    const afterAny = (afterCode.match(/:\s*any\b/g) || []).length;
    if (afterAny > beforeAny) {
      score -= 0.15;
    }

    // Check for removed error handling
    const beforeCatch = (beforeCode.match(/catch\s*\(/g) || []).length;
    const afterCatch = (afterCode.match(/catch\s*\(/g) || []).length;
    if (afterCatch < beforeCatch) {
      score -= 0.15;
    }

    // Check for new eval or dangerous patterns
    const dangerousPatterns = [
      /eval\s*\(/g,
      /Function\s*\(/g,
      /innerHTML\s*=/g,
      /document\.write/g,
    ];

    for (const pattern of dangerousPatterns) {
      const beforeMatches = (beforeCode.match(pattern) || []).length;
      const afterMatches = (afterCode.match(pattern) || []).length;
      if (afterMatches > beforeMatches) {
        score -= 0.2;
      }
    }

    return Math.max(0.0, Math.min(1.0, score));
  }

  /**
   * Detect code smells in code
   * @param {string} code - Code to analyze
   * @returns {array} Detected smells
   */
  detectSmells(code) {
    const smells = [];

    for (const [smellName, smellDef] of Object.entries(SMELL_LIBRARY)) {
      const matches = code.match(smellDef.pattern);
      if (matches && matches.length > 0) {
        smells.push({
          type: smellName,
          count: matches.length,
          severity: smellDef.severity,
          description: smellDef.description,
        });
      }
    }

    return smells;
  }

  /**
   * Detect improvements made
   * @param {string} beforeCode - Original code
   * @param {string} afterCode - Refactored code
   * @returns {array} Detected improvements
   */
  detectImprovements(beforeCode, afterCode) {
    const improvements = [];

    for (const [improvementName, pattern] of Object.entries(
      IMPROVEMENT_PATTERNS
    )) {
      const beforeMatches = (beforeCode.match(pattern) || []).length;
      const afterMatches = (afterCode.match(pattern) || []).length;

      if (afterMatches > beforeMatches) {
        improvements.push({
          type: improvementName,
          count: afterMatches - beforeMatches,
          description: `Added ${afterMatches - beforeMatches} ${improvementName}`,
        });
      }
    }

    return improvements;
  }

  /**
   * Generate recommendations based on analysis
   * @param {object} scores - Individual dimension scores
   * @param {array} smellsBefore - Smells in original code
   * @param {array} smellsAfter - Smells in refactored code
   * @param {array} improvements - Detected improvements
   * @returns {array} Recommendations
   */
  generateRecommendations(scores, smellsBefore, smellsAfter, improvements) {
    const recommendations = [];

    // Score-based recommendations
    if (scores.completeness < 0.7) {
      recommendations.push({
        category: "completeness",
        priority: "high",
        suggestion: "Consider applying additional refactorings to address remaining issues",
        rationale: `Completeness score is ${scores.completeness.toFixed(2)}`,
      });
    }

    if (scores.correctness < 0.9) {
      recommendations.push({
        category: "correctness",
        priority: "high",
        suggestion: "Review changes carefully - potential behavior changes detected",
        rationale: `Correctness score is ${scores.correctness.toFixed(2)}`,
      });
    }

    if (scores.maintainability < 0.6) {
      recommendations.push({
        category: "maintainability",
        priority: "medium",
        suggestion: "Refactoring did not significantly improve maintainability",
        rationale: "Consider more aggressive structural improvements",
      });
    }

    if (scores.safety < 0.8) {
      recommendations.push({
        category: "safety",
        priority: "high",
        suggestion: "Risky changes detected - review carefully",
        rationale: `Safety score is ${scores.safety.toFixed(2)}`,
      });
    }

    // Smell-based recommendations
    const remainingHighSeverity = smellsAfter.filter((s) => s.severity === "high");
    if (remainingHighSeverity.length > 0) {
      recommendations.push({
        category: "code-quality",
        priority: "high",
        suggestion: `Address ${remainingHighSeverity.length} remaining high-severity code smell(s)`,
        rationale: remainingHighSeverity.map((s) => s.type).join(", "),
      });
    }

    // Improvement-based recommendations
    if (improvements.length === 0) {
      recommendations.push({
        category: "effectiveness",
        priority: "medium",
        suggestion: "No clear improvements detected",
        rationale: "Consider more targeted refactoring approaches",
      });
    }

    return recommendations;
  }

  /**
   * Update knowledge base with learned patterns
   * @param {array} smellsBefore - Smells before refactoring
   * @param {array} smellsAfter - Smells after refactoring
   * @param {array} improvements - Detected improvements
   * @param {object} metadata - Refactoring metadata
   * @returns {number} Number of patterns learned
   */
  updateKnowledgeBase(smellsBefore, smellsAfter, improvements, metadata) {
    let newPatterns = 0;

    // Track smells
    for (const smell of smellsBefore) {
      const existing = this.knowledgeBase.learned_smells.find(
        (s) => s.type === smell.type
      );

      if (existing) {
        existing.occurrences = (existing.occurrences || 0) + 1;
        existing.last_seen = new Date().toISOString();
      } else {
        this.knowledgeBase.learned_smells.push({
          type: smell.type,
          severity: smell.severity,
          description: smell.description,
          occurrences: 1,
          first_seen: new Date().toISOString(),
          last_seen: new Date().toISOString(),
        });
        newPatterns++;
      }
    }

    // Track successful refactorings
    const smellsRemoved = smellsBefore.length - smellsAfter.length;
    if (smellsRemoved > 0) {
      for (const improvement of improvements) {
        const pattern = this.knowledgeBase.refactoring_patterns[improvement.type];
        if (pattern) {
          pattern.success_count = (pattern.success_count || 0) + 1;
          pattern.confidence = Math.min(
            0.95,
            pattern.confidence + 0.02
          );
        }
      }

      this.knowledgeBase.successful_refactorings.push({
        mode: metadata.mode || "unknown",
        smells_removed: smellsRemoved,
        improvements: improvements.map((i) => i.type),
        timestamp: new Date().toISOString(),
      });
      newPatterns++;
    }

    // Cluster smells
    if (smellsBefore.length > 0) {
      const clusterKey = smellsBefore
        .map((s) => s.type)
        .sort()
        .join("+");
      const existingCluster = this.knowledgeBase.smell_clusters.find(
        (c) => c.smell_signature === clusterKey
      );

      if (existingCluster) {
        existingCluster.occurrences = (existingCluster.occurrences || 0) + 1;
        existingCluster.last_seen = new Date().toISOString();
      } else {
        this.knowledgeBase.smell_clusters.push({
          smell_signature: clusterKey,
          smells: smellsBefore.map((s) => s.type),
          occurrences: 1,
          first_seen: new Date().toISOString(),
          last_seen: new Date().toISOString(),
        });
      }
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

    // Adjust based on score levels
    if (values.some((v) => v < 0.5)) {
      confidence *= 0.9; // Low scores reduce confidence
    }

    return Math.max(0.0, Math.min(1.0, confidence));
  }

  /**
   * Generate actionable feedback
   * @param {object} scores - Individual dimension scores
   * @param {array} smellsBefore - Smells before refactoring
   * @param {array} smellsAfter - Smells after refactoring
   * @returns {array} Feedback items
   */
  generateFeedback(scores, smellsBefore, smellsAfter) {
    const feedback = [];

    // Dimension-specific feedback
    if (scores.completeness < 0.7) {
      feedback.push({
        dimension: "completeness",
        severity: "medium",
        message: "Refactoring appears incomplete",
        action: "Review intended changes and ensure all were applied",
      });
    }

    if (scores.correctness < 0.9) {
      feedback.push({
        dimension: "correctness",
        severity: "high",
        message: "Potential behavior changes detected",
        action: "Run tests to verify behavior preservation",
      });
    }

    if (scores.maintainability < 0.6) {
      feedback.push({
        dimension: "maintainability",
        severity: "medium",
        message: "Maintainability did not improve significantly",
        action: "Consider more aggressive refactoring or different approach",
      });
    }

    if (scores.safety < 0.8) {
      feedback.push({
        dimension: "safety",
        severity: "high",
        message: "Risky changes detected",
        action: "Review for new dependencies, removed error handling, or dangerous patterns",
      });
    }

    // Smell-specific feedback
    const smellsRemoved = smellsBefore.length - smellsAfter.length;
    if (smellsRemoved > 0) {
      feedback.push({
        dimension: "quality",
        severity: "low",
        message: `Successfully removed ${smellsRemoved} code smell(s)`,
        action: "Good progress, continue refactoring remaining issues",
      });
    } else if (smellsRemoved < 0) {
      feedback.push({
        dimension: "quality",
        severity: "medium",
        message: `Introduced ${Math.abs(smellsRemoved)} new code smell(s)`,
        action: "Review refactoring approach - may need different strategy",
      });
    }

    return feedback;
  }
}

export default RefactorEvaluator;
