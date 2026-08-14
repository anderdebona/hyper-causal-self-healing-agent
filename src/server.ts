import express from 'express';
import path from 'path';
import { fileURLToPath } from 'url';
import { CausalInferenceEngine } from './causal/graph.js';
import { ASTMutationEngine } from './agent/mutation-engine.js';
import { SanitySandboxRunner } from './sandbox/runner.js';
import { LiveRuntimeHotSwapper } from './hotswap/swapper.js';
import { BayesianInterventionEngine, CausalVariable } from './causal/bayesian-intervention.js';
import { AutomatedRollbackStrategist } from './agent/rollback-strategist.js';

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

const app = express();
const PORT = process.env.PORT || 3004;

app.use(express.json());
app.use(express.static(path.join(__dirname, '../public')));

const causalEngine = new CausalInferenceEngine();
causalEngine.addNode('DenominatorCheck', 'Denominator Verification', [], 0.1);
causalEngine.addNode('ZeroDivisionFault', 'Division By Zero Exception', ['DenominatorCheck'], 0.95);

const rollbackStrategist = new AutomatedRollbackStrategist(3);
rollbackStrategist.takeSnapshot('function calculateRatio(a, b) { return a / b; }', { version: 'v1.0.0' });

let currentHandler = (a: number, b: number) => {
  if (b === 0) throw new Error('DivisionByZeroException: Cannot divide by zero');
  return a / b;
};
const swapper = new LiveRuntimeHotSwapper(currentHandler);

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
  const causalIntervention = causalEngine.doIntervention('DenominatorCheck', 'ZeroDivisionFault');
  const faultySourceCode = `function calculateRatio(a: number, b: number) { return a / b; }`;
  const patch = ASTMutationEngine.generateSelfHealingPatch(faultySourceCode, 'DivisionByZeroException');
  const sandboxResult = SanitySandboxRunner.verifyPatch(patch);

  let hotSwapResult = null;
  if (sandboxResult.passed) {
    rollbackStrategist.takeSnapshot(patch.mutatedCode, { version: `v${swapper.getVersion() + 1}` });
    // Healed handler
    currentHandler = (a: number, b: number) => (b === 0 ? 0 : a / b);
    hotSwapResult = swapper.hotSwap(currentHandler as any);
  }

  res.json({
    causalIntervention,
    patch,
    sandboxResult,
    hotSwapResult,
    currentVersion: swapper.getVersion(),
  });
});

app.post('/api/causal/bayesian', (req, res) => {
  const bayesianEngine = new BayesianInterventionEngine();
  
  const highConcurrency: CausalVariable = {
    name: 'HighConcurrency',
    priorProbability: 0.4,
    conditionalProbability: () => 0.4,
  };
  const connectionPoolExhausted: CausalVariable = {
    name: 'ConnectionPoolExhausted',
    priorProbability: 0.1,
    conditionalProbability: (p) => (p.get('HighConcurrency') ? 0.85 : 0.05),
  };
  const serviceCrash: CausalVariable = {
    name: 'ServiceCrash',
    priorProbability: 0.05,
    conditionalProbability: (p) => (p.get('ConnectionPoolExhausted') ? 0.95 : 0.01),
  };

  bayesianEngine.addVariable(highConcurrency, []);
  bayesianEngine.addVariable(connectionPoolExhausted, ['HighConcurrency']);
  bayesianEngine.addVariable(serviceCrash, ['ConnectionPoolExhausted']);

  const interventionResult = bayesianEngine.evaluateIntervention('ConnectionPoolExhausted', false, 'ServiceCrash', 1000);
  res.json(interventionResult);
});

app.post('/api/agent/rollback', (req, res) => {
  const decision = rollbackStrategist.recordHealthStatus(false);
  res.json({ decision, snapshots: rollbackStrategist.getSnapshots() });
});

app.listen(PORT, () => {
  console.log(`🚀 Hyper-Causal Self-Healing AI Engine Turbocharged on http://localhost:${PORT}`);
});
