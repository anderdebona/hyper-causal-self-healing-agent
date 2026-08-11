export interface Incident { id: string; severity: number; timestamp: number; description: string; resolved: boolean; resolvedBy?: string; }
export class IncidentTimeline {
  private incidents: Incident[] = [];
  public record(severity: number, description: string): Incident {
    const incident: Incident = { id: `INC-${Date.now()}-${this.incidents.length}`, severity, timestamp: Date.now(), description, resolved: false };
    this.incidents.push(incident); return incident;
  }
  public resolve(id: string, resolvedBy: string): boolean {
    const inc = this.incidents.find(i => i.id === id);
    if (!inc) return false; inc.resolved = true; inc.resolvedBy = resolvedBy; return true;
  }
  public getActive(): Incident[] { return this.incidents.filter(i => !i.resolved); }
  public getAll(): Incident[] { return [...this.incidents]; }
  public getMTTR(): number {
    const resolved = this.incidents.filter(i => i.resolved);
    return resolved.length > 0 ? resolved.length : 0;
  }
}
