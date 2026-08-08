export interface SelfHealingTelemetry {
  totalFaultsDetected: number;
  totalMutaionsApplied: number;
  sandboxPassedRate: number;
  activeHandlerVersion: number;
}

export class TelemetryCollector {
  private faults = 0;
  private mutations = 0;

  public recordFault(): void {
    this.faults++;
  }

  public recordMutation(): void {
    this.mutations++;
  }

  public getTelemetry(version: number): SelfHealingTelemetry {
    return {
      totalFaultsDetected: this.faults,
      totalMutaionsApplied: this.mutations,
      sandboxPassedRate: this.mutations > 0 ? (this.mutations / this.faults) * 100 : 100,
      activeHandlerVersion: version,
    };
  }
}
