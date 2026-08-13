export interface CausalVariable {
  name: string;
  priorProbability: number; // P(V = true)
  conditionalProbability: (parents: Map<string, boolean>) => number; // P(V | parents)
}

export interface InterventionResult {
  targetVariable: string;
  forcedValue: boolean;
  priorRisk: number;
  posteriorRisk: number;
  riskReduction: number;
  recommendation: 'EXECUTE_PATCH' | 'MAINTAIN_STATE' | 'FURTHER_INVESTIGATION';
}

export class BayesianInterventionEngine {
  private variables: Map<string, CausalVariable> = new Map();
  private parentGraph: Map<string, string[]> = new Map();

  public addVariable(variable: CausalVariable, parents: string[] = []): void {
    this.variables.set(variable.name, variable);
    this.parentGraph.set(variable.name, parents);
  }

  /**
   * Evaluates do(X = forcedValue) intervention effect on target outcome variable
   */
  public evaluateIntervention(
    interventionVar: string,
    forcedValue: boolean,
    outcomeVar: string,
    sampleCount: number = 1000
  ): InterventionResult {
    const priorRisk = this.estimateProbability(outcomeVar, null, null, sampleCount);
    const posteriorRisk = this.estimateProbability(outcomeVar, interventionVar, forcedValue, sampleCount);

    const riskReduction = parseFloat((priorRisk - posteriorRisk).toFixed(4));
    let recommendation: 'EXECUTE_PATCH' | 'MAINTAIN_STATE' | 'FURTHER_INVESTIGATION' = 'FURTHER_INVESTIGATION';

    if (riskReduction > 0.3) {
      recommendation = 'EXECUTE_PATCH';
    } else if (riskReduction <= 0) {
      recommendation = 'MAINTAIN_STATE';
    }

    return {
      targetVariable: interventionVar,
      forcedValue,
      priorRisk: parseFloat(priorRisk.toFixed(4)),
      posteriorRisk: parseFloat(posteriorRisk.toFixed(4)),
      riskReduction,
      recommendation,
    };
  }

  private estimateProbability(
    outcomeVar: string,
    forcedVar: string | null,
    forcedVal: boolean | null,
    sampleCount: number
  ): number {
    let outcomeTrueCount = 0;

    for (let s = 0; s < sampleCount; s++) {
      const state = new Map<string, boolean>();

      for (const [name, variable] of this.variables.entries()) {
        if (name === forcedVar && forcedVal !== null) {
          state.set(name, forcedVal);
        } else {
          const parents = this.parentGraph.get(name) || [];
          const parentState = new Map<string, boolean>();
          for (const p of parents) {
            parentState.set(p, state.get(p) ?? false);
          }

          const prob = parents.length > 0 ? variable.conditionalProbability(parentState) : variable.priorProbability;
          state.set(name, Math.random() < prob);
        }
      }

      if (state.get(outcomeVar) === true) {
        outcomeTrueCount++;
      }
    }

    return outcomeTrueCount / sampleCount;
  }
}
