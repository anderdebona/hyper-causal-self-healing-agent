import { describe, it, expect } from 'vitest';
import { CausalInferenceEngine } from '../src/causal/graph.js';
import { ASTMutationEngine } from '../src/agent/mutation-engine.js';
import { SanitySandboxRunner } from '../src/sandbox/runner.js';
import { LiveRuntimeHotSwapper } from '../src/hotswap/swapper.js';

describe('Hyper-Causal Self-Healing AI Engine Tests', () => {
  it('should compute Judea Pearl Causal Intervention Do-Calculus', () => {
    const engine = new CausalInferenceEngine();
    engine.addNode('RootCheck', 'Root Check', []);
    engine.addNode('FaultNode', 'Fault Node', ['RootCheck']);

    const result = engine.doIntervention('RootCheck', 'FaultNode');
    expect(result.isTrueCause).toBe(true);
    expect(result.causalImpactScore).toBeGreaterThan(0.9);
  });

  it('should mutate AST code and hot-swap live execution handler without restart', () => {
    const sourceCode = `function div(a: number, b: number) { return a / b; }`;
    const patch = ASTMutationEngine.generateSelfHealingPatch(sourceCode, 'DivisionByZeroException');

    expect(patch.success).toBe(true);

    const sandbox = SanitySandboxRunner.verifyPatch(patch);
    expect(sandbox.passed).toBe(true);

    const buggyHandler = (a: number, b: number) => {
      if (b === 0) throw new Error('Zero');
      return a / b;
    };

    const swapper = new LiveRuntimeHotSwapper(buggyHandler);
    expect(() => swapper.execute(10, 0)).toThrow();

    // Hot-Swap with mutated self-healed handler
    swapper.hotSwap(patch.mutatedCode);
    const healedResult = swapper.execute(10, 0);

    expect(healedResult).toBe(0); // Defensive fallback applied live!
    expect(swapper.getVersion()).toBe(2);
  });
});
