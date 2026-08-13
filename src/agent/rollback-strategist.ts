export interface SystemSnapshot {
  snapshotId: string;
  timestamp: number;
  codeState: string;
  healthy: boolean;
  metadata: Record<string, unknown>;
}

export interface RollbackDecision {
  shouldRollback: boolean;
  targetSnapshotId?: string;
  reason: string;
  consecutiveFailures: number;
}

export class AutomatedRollbackStrategist {
  private snapshots: SystemSnapshot[] = [];
  private consecutiveFailures: number = 0;
  private maxAllowedFailures: number;

  constructor(maxAllowedFailures: number = 3) {
    this.maxAllowedFailures = maxAllowedFailures;
  }

  public takeSnapshot(codeState: string, metadata: Record<string, unknown> = {}): SystemSnapshot {
    const snapshot: SystemSnapshot = {
      snapshotId: `snap-${Date.now()}-${this.snapshots.length}`,
      timestamp: Date.now(),
      codeState,
      healthy: true,
      metadata,
    };
    this.snapshots.push(snapshot);
    return snapshot;
  }

  public recordHealthStatus(healthy: boolean): RollbackDecision {
    if (healthy) {
      this.consecutiveFailures = 0;
      return {
        shouldRollback: false,
        reason: 'System healthy',
        consecutiveFailures: 0,
      };
    }

    this.consecutiveFailures++;

    if (this.consecutiveFailures >= this.maxAllowedFailures) {
      const lastHealthy = [...this.snapshots].reverse().find(s => s.healthy);
      return {
        shouldRollback: true,
        targetSnapshotId: lastHealthy?.snapshotId,
        reason: `Failure threshold breached (${this.consecutiveFailures}/${this.maxAllowedFailures}). Initiating automatic rollback.`,
        consecutiveFailures: this.consecutiveFailures,
      };
    }

    return {
      shouldRollback: false,
      reason: `Degraded state observed (${this.consecutiveFailures}/${this.maxAllowedFailures}). Under failure budget.`,
      consecutiveFailures: this.consecutiveFailures,
    };
  }

  public getSnapshots(): SystemSnapshot[] {
    return [...this.snapshots];
  }
}
