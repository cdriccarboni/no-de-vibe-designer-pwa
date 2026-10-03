export interface Cue {
  id: string;
  label: string;
  fadeDuration: number;
  easing: 'linear' | 'easeInOut';
  deltaParams: Record<string, number>;
}

export class CueManager {
  private cues: Cue[] = [];
  private activeCueIndex: number = -1;
  private activeInterpolations: Array<{
    paramKey: string;
    startValue: number;
    targetValue: number;
    startTime: number;
    duration: number;
  }> = [];

  private getParamValueCallback: (key: string) => number;
  private setParamValueCallback: (key: string, val: number) => void;

  constructor(
    getParam: (key: string) => number,
    setParam: (key: string, val: number) => void
  ) {
    this.getParamValueCallback = getParam;
    this.setParamValueCallback = setParam;
  }

  public addCue(cue: Cue): void {
    this.cues.push(cue);
  }

  public triggerGO(): void {
    if (this.activeCueIndex + 1 >= this.cues.length) return;
    
    this.activeCueIndex++;
    const targetCue = this.cues[this.activeCueIndex];
    const now = performance.now();

    for (const [paramKey, targetVal] of Object.entries(targetCue.deltaParams)) {
      const currentVal = this.getParamValueCallback(paramKey);
      this.activeInterpolations.push({
        paramKey,
        startValue: currentVal,
        targetValue: targetVal,
        startTime: now,
        duration: targetCue.fadeDuration
      });
    }
  }

  public update(now: number = performance.now()): void {
    this.activeInterpolations = this.activeInterpolations.filter(interp => {
      const elapsed = now - interp.startTime;
      const progress = Math.min(1, elapsed / interp.duration);
      
      const easeProgress = progress < 0.5 
        ? 2 * progress * progress 
        : -1 + (4 - 2 * progress) * progress;

      const currentValue = interp.startValue + (interp.targetValue - interp.startValue) * easeProgress;
      this.setParamValueCallback(interp.paramKey, currentValue);

      return progress < 1;
    });
  }
}
