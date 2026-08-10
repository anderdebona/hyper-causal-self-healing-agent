import { describe, it, expect } from 'vitest';
import { CausalInferenceEngine } from '../src/causal/graph.js';
import { ASTMutationEngine } from '../src/agent/mutation-engine.js';
import { SanitySandboxRunner } from '../src/sandbox/runner.js';
import { CounterfactualEngine } from '../src/causal/counterfactual.js';
import { HealingPolicyEngine } from '../src/agent/policy-engine.js';

describe('Causal Inference', () => {
  it('should identify root cause via causal graph traversal', () => {
    const engine = new CausalInferenceEngine();
    engine.addNode('A', 'Root', [], 0.9);
    engine.addNode('B', 'Effect', ['A'], 0.7);
    const roots = engine.identifyRootCause('B');
    expect(roots).toContain('A');
  });
});

describe('AST Mutation & Sandbox', () => {
  it('should generate self-healing patch for division by zero', () => {
    const code = 'function calc(a, b) { return a / b; }';
    const patch = ASTMutationEngine.generateSelfHealingPatch(code, 'division by zero');
    expect(patch.success).toBe(true);
    const result = SanitySandboxRunner.verifyPatch(patch);
    expect(result.passed).toBe(true);
  });
});

describe('Counterfactual Engine', () => {
  it('should compute counterfactual causal effect', () => {
    const cf = new CounterfactualEngine();
    cf.addEquation('Y', (p) => (p.get('X') || 0) * 2 + 1);
    const factual = new Map([['X', 5]]);
    const result = cf.queryCounterfactual(factual, 'X', 0, 'Y');
    expect(result.originalOutcome).toBe(11);
    expect(result.counterfactualOutcome).toBe(1);
    expect(result.causalEffect).toBe(-10);
    expect(result.isSignificant).toBe(true);
  });

  it('should detect non-significant effects', () => {
    const cf = new CounterfactualEngine();
    cf.addEquation('Y', () => 5); // constant → no causal effect
    const factual = new Map([['X', 10]]);
    const result = cf.queryCounterfactual(factual, 'X', 0, 'Y');
    expect(result.causalEffect).toBe(0);
    expect(result.isSignificant).toBe(false);
  });
});

describe('Healing Policy Engine', () => {
  it('should decide PATCH for critical high-frequency failures', () => {
    const engine = new HealingPolicyEngine();
    const decision = engine.decide(0.9, 5);
    expect(decision.action).toBe('PATCH');
  });

  it('should decide ESCALATE for medium severity', () => {
    const engine = new HealingPolicyEngine();
    const decision = engine.decide(0.5, 1);
    expect(decision.action).toBe('ESCALATE');
  });

  it('should decide IGNORE for low severity', () => {
    const engine = new HealingPolicyEngine();
    const decision = engine.decide(0.1, 1);
    expect(decision.action).toBe('IGNORE');
  });

  it('should support custom rules', () => {
    const engine = new HealingPolicyEngine();
    engine.addRule('CUSTOM_ALERT', (s) => s > 0.95, 'ROLLBACK', 0);
    const decision = engine.decide(0.99, 10);
    expect(decision.action).toBe('ROLLBACK');
    expect(decision.ruleName).toBe('CUSTOM_ALERT');
  });
});
