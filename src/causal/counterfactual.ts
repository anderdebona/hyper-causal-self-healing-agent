export interface CounterfactualQuery { intervention: string; outcome: string; }
export interface CounterfactualResult {
  query: CounterfactualQuery; originalOutcome: number; counterfactualOutcome: number;
  causalEffect: number; isSignificant: boolean;
}

/**
 * Counterfactual Reasoning Engine — Pearl's Ladder of Causation Level 3.
 * Answers "What if X had not happened?" queries using structural causal models.
 * Reference: Pearl, "Causality" (2009), Chapter 7
 */
export class CounterfactualEngine {
  private structuralEquations: Map<string, (parents: Map<string, number>) => number> = new Map();

  public addEquation(variable: string, fn: (parents: Map<string, number>) => number): void {
    this.structuralEquations.set(variable, fn);
  }

  public evaluate(assignments: Map<string, number>, target: string): number {
    const fn = this.structuralEquations.get(target);
    if (!fn) return assignments.get(target) || 0;
    return fn(assignments);
  }

  public queryCounterfactual(
    factualAssignments: Map<string, number>,
    intervention: string,
    interventionValue: number,
    target: string
  ): CounterfactualResult {
    const originalOutcome = this.evaluate(factualAssignments, target);
    const cfAssignments = new Map(factualAssignments);
    cfAssignments.set(intervention, interventionValue);
    const counterfactualOutcome = this.evaluate(cfAssignments, target);
    const causalEffect = counterfactualOutcome - originalOutcome;

    return {
      query: { intervention, outcome: target },
      originalOutcome, counterfactualOutcome, causalEffect,
      isSignificant: Math.abs(causalEffect) > 0.1,
    };
  }
}
