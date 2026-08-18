export interface StructuralEquation {
  variable: string;
  parents: string[];
  compute: (parentsValues: Record<string, number>, exogenousU: number) => number;
  noiseDistribution: 'NORMAL' | 'UNIFORM';
}

export interface CounterfactualTwinResult {
  targetVariable: string;
  factualValue: number;
  counterfactualValue: number;
  deltaImpact: number;
  abducedExogenousNoise: Record<string, number>;
  twinWorldValues: Record<string, number>;
  percentageImprovement: number;
}

export class StructuralCounterfactualTwinEngine {
  private equations: Map<string, StructuralEquation> = new Map();

  constructor() {
    this.setupDefaultMicroserviceModel();
  }

  private setupDefaultMicroserviceModel(): void {
    // Latency = 50 + 0.8 * DB_Connections + U_lat
    this.registerEquation({
      variable: 'latency_ms',
      parents: ['db_connections', 'cpu_utilization'],
      compute: (p, u) => 40 + 0.4 * (p.db_connections || 0) + 1.2 * (p.cpu_utilization || 0) + u,
      noiseDistribution: 'NORMAL'
    });

    // Error_Rate = 0.05 * Latency + 0.02 * Memory_Pressure + U_err
    this.registerEquation({
      variable: 'error_rate_pct',
      parents: ['latency_ms', 'memory_pressure'],
      compute: (p, u) => Math.max(0, 0.02 * (p.latency_ms || 0) + 0.5 * (p.memory_pressure || 0) + u),
      noiseDistribution: 'NORMAL'
    });
  }

  public registerEquation(eq: StructuralEquation): void {
    this.equations.set(eq.variable, eq);
  }

  /**
   * Runs Pearl's 3-Step SCM Counterfactual Algorithm:
   * 1. Abduction: Infer exogenous background variables U from factual observation
   * 2. Action: Perform graph surgery do(Intervention)
   * 3. Deduction: Predict counterfactual outcomes in the twin world
   */
  public evaluateCounterfactual(
    factualState: Record<string, number>,
    intervention: { variable: string; forcedValue: number },
    targetVariable: string
  ): CounterfactualTwinResult {
    // 1. Abduction: Calculate exogenous error u_i for target and parent equations
    const abducedNoise: Record<string, number> = {};

    this.equations.forEach((eq, varName) => {
      const observedVal = factualState[varName] || 0;
      const expectedFromParents = eq.compute(factualState, 0);
      abducedNoise[varName] = Math.round((observedVal - expectedFromParents) * 100) / 100;
    });

    // 2. Action & 3. Deduction in Twin World
    const twinWorld: Record<string, number> = { ...factualState };
    twinWorld[intervention.variable] = intervention.forcedValue;

    // Recalculate dependent variables in topological order
    this.equations.forEach((eq, varName) => {
      if (varName === intervention.variable) return; // intercepted by do()
      const u = abducedNoise[varName] || 0;
      twinWorld[varName] = Math.round(eq.compute(twinWorld, u) * 100) / 100;
    });

    const factualVal = factualState[targetVariable] || 0;
    const counterfactualVal = twinWorld[targetVariable] || 0;
    const delta = Math.round((factualVal - counterfactualVal) * 100) / 100;
    const pct = factualVal !== 0 ? Math.round(((factualVal - counterfactualVal) / factualVal) * 10000) / 100 : 0;

    return {
      targetVariable,
      factualValue: factualVal,
      counterfactualValue: counterfactualVal,
      deltaImpact: delta,
      abducedExogenousNoise: abducedNoise,
      twinWorldValues: twinWorld,
      percentageImprovement: pct
    };
  }
}
