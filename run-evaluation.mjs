#!/usr/bin/env node
import RefactorEvaluator from './.github/skills/refactor/evaluator.js';
import fs from 'fs';

// Create evaluator
const evaluator = new RefactorEvaluator('./.github/skills/refactor/refactor-knowledge.json');

// Evaluate refactoring (pass file paths)
const result = evaluator.evaluate(
  'src/lib/components/inspector/InspectorOrchestrator.svelte.original',
  'src/lib/components/inspector/InspectorOrchestrator.svelte',
  {
    mode: 'structural',
    refactoringId: 'InspectorOrchestrator'
  }
);

// Output results
console.log('\n=== Refactoring Evaluation Results ===\n');
console.log(`Overall Score: ${(result.overall_score * 100).toFixed(1)}%`);
console.log(`Confidence: ${(result.confidence * 100).toFixed(1)}%\n`);

console.log('Dimension Scores:');
for (const [dim, score] of Object.entries(result.dimensions)) {
  const pct = (score * 100).toFixed(1);
  const indicator = score >= 0.8 ? '✅' : score >= 0.6 ? '⚠️' : '❌';
  console.log(`  ${indicator} ${dim}: ${pct}%`);
}

console.log(`\nCode Smells Removed: ${result.smells_removed}`);
console.log(`Improvements Applied: ${result.improvements_applied}`);
console.log(`Patterns Learned: ${result.patterns_learned}`);
console.log(`Knowledge Base Updated: ${result.knowledge_base_updated}`);

if (result.feedback && result.feedback.length > 0) {
  console.log('\nFeedback:');
  for (const item of result.feedback) {
    console.log(`  [${item.severity}] ${item.message}`);
    console.log(`    → ${item.action}`);
  }
}

if (result.recommendations && result.recommendations.length > 0) {
  console.log('\nRecommendations:');
  for (const rec of result.recommendations) {
    console.log(`  [${rec.priority}] ${rec.category}: ${rec.suggestion}`);
    if (rec.rationale) console.log(`    Rationale: ${rec.rationale}`);
  }
}

// Save full results to JSON
fs.writeFileSync('evaluation-result.json', JSON.stringify(result, null, 2));
console.log('\n✅ Full evaluation saved to evaluation-result.json\n');
