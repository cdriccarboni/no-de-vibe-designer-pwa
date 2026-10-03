export interface MappingRule {
  id: string;
  sourceSignal: string;
  targetParamKey: string;
  minIn: number;
  maxIn: number;
  minOut: number;
  maxOut: number;
  smoothFactor: number;
  lastFilteredValue?: number;
}

export class IOMatrix {
  private rules: Map<string, MappingRule> = new Map();
  private isLearning: boolean = false;
  private learnTargetKey: string | null = null;
  private setParamCallback: (key: string, val: number) => void;

  constructor(setParam: (key: string, val: number) => void) {
    this.setParamCallback = setParam;
  }

  public enableAutoLearn(targetParamKey: string): void {
    this.isLearning = true;
    this.learnTargetKey = targetParamKey;
  }

  public processIncomingSignal(sourceSignal: string, rawValue: number): void {
    if (this.isLearning && this.learnTargetKey) {
      this.rules.set(sourceSignal, {
        id: crypto.randomUUID(),
        sourceSignal,
        targetParamKey: this.learnTargetKey,
        minIn: 0,
        maxIn: 127,
        minOut: 0,
        maxOut: 1,
        smoothFactor: 0.1
      });
      this.isLearning = false;
      this.learnTargetKey = null;
      return;
    }

    const rule = this.rules.get(sourceSignal);
    if (!rule) return;

    const normalized = (rawValue - rule.minIn) / (rule.maxIn - rule.minIn);
    const scaled = rule.minOut + normalized * (rule.maxOut - rule.minOut);
    const clamped = Math.max(rule.minOut, Math.min(rule.maxOut, scaled));

    const lastVal = rule.lastFilteredValue ?? clamped;
    const filtered = lastVal + rule.smoothFactor * (clamped - lastVal);
    rule.lastFilteredValue = filtered;

    this.setParamCallback(rule.targetParamKey, filtered);
  }
}
