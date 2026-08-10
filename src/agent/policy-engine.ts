export type HealingAction = 'PATCH' | 'ROLLBACK' | 'ESCALATE' | 'IGNORE';
export interface PolicyRule { condition: (severity: number, frequency: number) => boolean; action: HealingAction; priority: number; }
export interface PolicyDecision { action: HealingAction; ruleName: string; confidence: number; }

/**
 * Healing Policy Engine — Configurable decision engine for automated self-healing.
 * Determines whether to apply patches, rollback, escalate to humans, or ignore.
 */
export class HealingPolicyEngine {
  private rules: Array<PolicyRule & { name: string }> = [];

  constructor() {
    this.rules = [
      { name: 'CRITICAL_PATCH', condition: (s, f) => s > 0.8 && f > 3, action: 'PATCH', priority: 1 },
      { name: 'HIGH_ROLLBACK', condition: (s, f) => s > 0.6 && f > 5, action: 'ROLLBACK', priority: 2 },
      { name: 'MEDIUM_ESCALATE', condition: (s, f) => s > 0.4, action: 'ESCALATE', priority: 3 },
      { name: 'LOW_IGNORE', condition: () => true, action: 'IGNORE', priority: 4 },
    ];
  }

  public addRule(name: string, condition: (severity: number, frequency: number) => boolean, action: HealingAction, priority: number): void {
    this.rules.push({ name, condition, action, priority });
    this.rules.sort((a, b) => a.priority - b.priority);
  }

  public decide(severity: number, frequency: number): PolicyDecision {
    for (const rule of this.rules) {
      if (rule.condition(severity, frequency)) {
        return { action: rule.action, ruleName: rule.name, confidence: 1 - (rule.priority / 10) };
      }
    }
    return { action: 'IGNORE', ruleName: 'DEFAULT', confidence: 0.1 };
  }

  public getRules(): string[] { return this.rules.map((r) => r.name); }
}
