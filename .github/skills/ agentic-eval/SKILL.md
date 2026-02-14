---
name: agentic-eval
description: |
  Enterprise-grade evaluation and refinement framework for improving AI agent outputs.
  Use this skill when:
  - Implementing iterative refinement loops
  - Building evaluator-optimizer architectures
  - Designing rubric-based or LLM-as-judge systems
  - Creating benchmark-driven quality pipelines
  - Improving reliability across any prompt/project type
  - Adding confidence, consensus, or adversarial review layers
---

# Agentic Evaluation Framework (AEF)

A modular quality-control architecture for AI systems.

This framework transforms one-shot generation into a controlled evaluation lifecycle:

Generate → Evaluate → Adversarial Review → Optimize → Confidence Check → Converge → Output

---

# Core Architecture

## 1. Generator

Responsible only for producing candidate outputs.

```python
def generate(task: str) -> str:
    return llm(f"Complete the task:\n{task}")
```

---

## 2. Evaluator

Scores output using structured criteria.

```python
import json

def evaluate(task: str, output: str) -> dict:
    return json.loads(llm(f"""
    Evaluate the output for the given task.

    Task: {task}
    Output: {output}

    Return JSON:
    {{
        "overall_score": 0-1,
        "dimensions": {{
            "accuracy": 0-1,
            "clarity": 0-1,
            "completeness": 0-1
        }},
        "confidence": 0-1,
        "feedback": "actionable critique"
    }}
    """))
```

---

## 3. Adversarial Reviewer (Optional but Recommended)

For robustness and edge-case detection.

```python
def adversarial_review(task: str, output: str) -> str:
    return llm(f"""
    You are a critical reviewer.

    Find hidden flaws, missing assumptions,
    edge cases, logical gaps, or failure risks.

    Task: {task}
    Output: {output}
    """)
```

---

## 4. Optimizer

Refines output based on structured feedback.

```python
def optimize(task: str, output: str, feedback: str) -> str:
    return llm(f"""
    Improve the output based on the following critique.

    Task: {task}
    Feedback: {feedback}
    Original Output: {output}
    """)
```

---

## 5. Controller (Refinement Loop)

Coordinates lifecycle and convergence logic.

```python
def run_agent(task: str, max_iterations: int = 4, threshold: float = 0.85):
    history = []
    output = generate(task)

    previous_score = 0.0

    for i in range(max_iterations):
        evaluation = evaluate(task, output)
        score = evaluation["overall_score"]

        history.append({
            "iteration": i,
            "output": output,
            "score": score,
            "confidence": evaluation["confidence"],
            "feedback": evaluation["feedback"]
        })

        # Success threshold
        if score >= threshold and evaluation["confidence"] >= 0.8:
            break

        # Convergence detection (plateau)
        if abs(score - previous_score) < 0.01:
            break

        previous_score = score

        output = optimize(task, output, evaluation["feedback"])

    return {
        "final_output": output,
        "history": history
    }
```

---

# Advanced Patterns

---

## Multi-Judge Consensus

Reduces evaluator bias and increases reliability.

```python
import statistics

def ensemble_score(task: str, output: str, n: int = 3):
    scores = []
    for _ in range(n):
        scores.append(evaluate(task, output)["overall_score"])

    return {
        "mean": sum(scores) / len(scores),
        "variance": statistics.variance(scores) if len(scores) > 1 else 0
    }
```

Interpretation:
- Low variance → stable evaluation
- High variance → unreliable scoring, consider adversarial review

---

## Rubric-Based Evaluation

```python
RUBRIC = {
    "accuracy": 0.4,
    "clarity": 0.3,
    "completeness": 0.3
}
```

Weighted scoring can be computed by multiplying each dimension by its weight.

---

## Tournament Generation (Alternative to Iteration)

Generate multiple candidates and select best.

```python
def tournament(task: str, k: int = 3):
    candidates = [generate(task) for _ in range(k)]
    best = candidates[0]

    for candidate in candidates[1:]:
        decision = llm(f"""
        Compare Output A and Output B.
        Which better completes the task and why?

        Task: {task}
        Output A: {best}
        Output B: {candidate}
        Respond with: A or B
        """)

        if "B" in decision:
            best = candidate

    return best
```

---

# Benchmarking Mode (Project-Wide Quality Control)

Use dataset-driven regression testing.

```python
def benchmark(agent, test_set):
    scores = []

    for example in test_set:
        result = agent(example["task"])
        evaluation = evaluate(example["task"], result["final_output"])
        scores.append(evaluation["overall_score"])

    return sum(scores) / len(scores) if scores else 0
```

Use to:
- Detect regressions
- Compare model versions
- Track improvement over time

---

# Failure Modes & Mitigations

| Failure Mode | Mitigation |
|--------------|------------|
| Self-affirming bias | Use separate evaluator model |
| Score inflation drift | Benchmark against fixed dataset |
| Reward hacking | Randomize rubric phrasing |
| Mode collapse | Add diversity sampling |
| Evaluator hallucination | Require justification text |

---

# Cost-Aware Routing

Reflection increases token cost 2–5×.

Optimization strategies:
- Skip evaluation for trivial outputs
- Use smaller model as evaluator
- Early-stop when high confidence
- Cache repeated evaluations

Example:

```python
if len(output) < 50:
    return {"final_output": output, "history": []}
```

---

# Confidence-Based Routing Logic

Recommended decision flow:

- High score + high confidence → Accept
- High score + low confidence → Adversarial review
- Low score + high variance → Regenerate
- Low score + low confidence → Optimize

---

# Logging & Trace Structure

Always store evaluation trajectory for observability.

```python
trajectory = {
    "task": task,
    "iterations": [
        {
            "output": "...",
            "score": 0.82,
            "confidence": 0.74,
            "feedback": "..."
        }
    ]
}
```

Enables:
- Debugging
- Drift detection
- Failure clustering
- Evaluator monitoring
- Auditability

---

# Maturity Levels

Level 1 — Basic Reflection  
Level 2 — Evaluator Separation  
Level 3 — Adversarial & Ensemble  
Level 4 — Benchmark-Driven  
Level 5 — Confidence-Calibrated & Cost-Aware  

---

# When To Use This Skill

Use for:
- Code generation
- Reports
- Business analysis
- Research synthesis
- Data interpretation
- Any quality-critical output

Avoid for:
- Casual chat
- Ultra-low-latency use cases
- Low-stakes responses

---

# Design Philosophy

This framework treats generation as stochastic and evaluation as control.

It assumes:
- Outputs can improve
- Scores can be quantified
- Quality can be systematized
- Evaluation must be auditable

The goal is measurable, iterative improvement — not perfection.