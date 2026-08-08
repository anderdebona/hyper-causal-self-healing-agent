import express from 'express';
import path from 'path';
import { fileURLToPath } from 'url';
import { CausalInferenceEngine } from './causal/graph.js';
import { ASTMutationEngine } from './agent/mutation-engine.js';
import { SanitySandboxRunner } from './sandbox/runner.js';
import { LiveRuntimeHotSwapper } from './hotswap/swapper.js';

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

const app = express();
const PORT = process.env.PORT || 3004;

app.use(express.json());
app.use(express.static(path.join(__dirname, '../public')));

// Initialize Causal Engine
const causalEngine = new CausalInferenceEngine();
causalEngine.addNode('DenominatorCheck', 'Denominator Verification', [], 0.1);
causalEngine.addNode('ZeroDivisionFault', 'Division By Zero Exception', ['DenominatorCheck'], 0.95);

// Initial un-healed handler
const initialHandler = (a: number, b: number) => {
  if (b === 0) throw new Error('DivisionByZeroException: Cannot divide by zero');
  return a / b;
};

const swapper = new LiveRuntimeHotSwapper(initialHandler);

app.post('/api/execute', (req, res) => {
  const { a = 10, b = 2 } = req.body;
  try {
    const result = swapper.execute(a, b);
    res.json({
      status: 'SUCCESS',
      handlerVersion: `v${swapper.getVersion()}`,
      input: { a, b },
      result,
    });
  } catch (error: any) {
    res.status(500).json({
      status: 'FAULT_DETECTED',
      handlerVersion: `v${swapper.getVersion()}`,
      exceptionMessage: error.message,
      recommendation: 'Trigger Judea Pearl Causal Self-Healing Engine',
    });
  }
});

app.post('/api/heal', (req, res) => {
  // 1. Pearl Causal Intervention
  const causalIntervention = causalEngine.doIntervention('DenominatorCheck', 'ZeroDivisionFault');

  // 2. AST Code Mutation Synthesis
  const faultySourceCode = `function calculateRatio(a: number, b: number) { return a / b; }`;
  const patch = ASTMutationEngine.generateSelfHealingPatch(faultySourceCode, 'DivisionByZeroException');

  // 3. Sanity Sandbox Verification
  const sandboxResult = SanitySandboxRunner.verifyPatch(patch);

  // 4. Live Hot-Swap Code into Memory
  let hotSwapResult = null;
  if (sandboxResult.passed) {
    hotSwapResult = swapper.hotSwap(patch.mutatedCode);
  }

  res.json({
    causalIntervention,
    patch,
    sandboxResult,
    hotSwapResult,
  });
});

app.listen(PORT, () => {
  console.log(`🚀 Hyper-Causal Self-Healing AI Engine running on http://localhost:${PORT}`);
});
