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

import { IncidentTimeline } from '../src/agent/incident-timeline.js';

describe('Incident Timeline', () => {
  it('should record and track incidents', () => {
    const tl = new IncidentTimeline();
    const inc = tl.record(0.8, 'CPU spike detected');
    expect(inc.severity).toBe(0.8);
    expect(tl.getActive().length).toBe(1);
  });
  it('should resolve incidents', () => {
    const tl = new IncidentTimeline();
    const inc = tl.record(0.5, 'Memory leak');
    tl.resolve(inc.id, 'auto-patch');
    expect(tl.getActive().length).toBe(0);
    expect(tl.getAll().length).toBe(1);
  });
});

describe('BayesianInterventionEngine (v4.0.0)', () => {
  it('should evaluate do(X) risk reduction on failure node', async () => {
    const { BayesianInterventionEngine } = await import('../src/causal/bayesian-intervention.js');
    const engine = new BayesianInterventionEngine();

    engine.addVariable({
      name: 'NullPointerBug',
      priorProbability: 0.8,
      conditionalProbability: () => 0.8,
    });

    engine.addVariable({
      name: 'AppCrash',
      priorProbability: 0.1,
      conditionalProbability: (parents) => parents.get('NullPointerBug') ? 0.95 : 0.05,
    }, ['NullPointerBug']);

    const result = engine.evaluateIntervention('NullPointerBug', false, 'AppCrash', 500);
    expect(result.priorRisk).toBeGreaterThan(0.5);
    expect(result.posteriorRisk).toBeLessThan(0.2);
    expect(result.riskReduction).toBeGreaterThan(0.3);
    expect(result.recommendation).toBe('EXECUTE_PATCH');
  });
});

describe('AutomatedRollbackStrategist (v4.0.0)', () => {
  it('should trigger rollback when failure threshold is reached', async () => {
    const { AutomatedRollbackStrategist } = await import('../src/agent/rollback-strategist.js');
    const strategist = new AutomatedRollbackStrategist(2);

    const snap = strategist.takeSnapshot('const healthy = true;');
    expect(snap.snapshotId).toBeTruthy();

    const d1 = strategist.recordHealthStatus(false);
    expect(d1.shouldRollback).toBe(false);

    const d2 = strategist.recordHealthStatus(false);
    expect(d2.shouldRollback).toBe(true);
    expect(d2.targetSnapshotId).toBe(snap.snapshotId);
  });
});

describe('StructuralCounterfactualTwinEngine (v5.0.0)', () => {
  it('should perform Pearl 3-step abduction-action-deduction counterfactual inference', async () => {
    const { StructuralCounterfactualTwinEngine } = await import('../src/causal/structural-counterfactual-twin.js');
    const engine = new StructuralCounterfactualTwinEngine();

    const factualState = {
      cpu_utilization: 90,
      db_connections: 150,
      memory_pressure: 80,
      latency_ms: 220,
      error_rate_pct: 45
    };

    const res = engine.evaluateCounterfactual(
      factualState,
      { variable: 'cpu_utilization', forcedValue: 20 },
      'latency_ms'
    );

    expect(res.factualValue).toBe(220);
    expect(res.counterfactualValue).toBeLessThan(res.factualValue);
    expect(res.deltaImpact).toBeGreaterThan(50);
    expect(res.percentageImprovement).toBeGreaterThan(20);
  });
});

describe('ActiveInferenceHomeostasisEngine (v5.0.0)', () => {
  it('should compute variational free energy and recommend corrective policy', async () => {
    const { ActiveInferenceHomeostasisEngine } = await import('../src/agent/active-inference-homeostasis.js');
    const engine = new ActiveInferenceHomeostasisEngine();

    const stressedState = {
      cpuUsage: 95,
      memoryUsage: 92,
      requestLatency: 450,
      errorRate: 0.12
    };

    const fe = engine.computeVariationalFreeEnergy(stressedState);
    expect(fe).toBeGreaterThan(10);

    const decision = engine.selectOptimalAction(stressedState);
    expect(decision.recommendedAction.expectedFreeEnergy).toBeLessThan(fe);
    expect(decision.candidateRankings.length).toBe(4);
  });
});


