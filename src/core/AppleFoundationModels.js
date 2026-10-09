export class AppleFoundationModels {
  constructor() {
    this.provider = 'apple';
    this.model = 'Apple Foundation On-Device';
    this.status = '▶ TEST EN COURS';
  }

  async analyzeMultimodal(imageFrame, prompt) {
    const payload = {
      protocol: 'apple',
      prompt,
      image: imageFrame ? (imageFrame.dataUrl || imageFrame) : null,
      timestamp: Date.now()
    };

    if (typeof window !== 'undefined' && window.electronAPI && window.electronAPI.runAppleFoundation) {
      try {
        const rawResponse = await window.electronAPI.runAppleFoundation(payload);
        return this.validateAndFormat(rawResponse);
      } catch (e) {
        return this.fallbackOllama(prompt);
      }
    }
    return this.fallbackOllama(prompt);
  }

  validateAndFormat(raw) {
    let parsed = raw;
    if (typeof raw === 'string') {
      try { parsed = JSON.parse(raw); } catch (_) {}
    }
    return {
      intent: parsed.intent || 'visual_analysis',
      objects: parsed.objects || [],
      masks: parsed.masks || [],
      suggestedNodes: parsed.suggestedNodes || ['Camera', 'MaskSDF', 'Composite'],
      parameters: parsed.parameters || {},
      confidence: parsed.confidence || 0.85,
      actions: parsed.actions || []
    };
  }

  fallbackOllama(prompt) {
    return {
      intent: 'vibe_patch_generation',
      objects: ['subject'],
      masks: ['contour'],
      suggestedNodes: ['Camera', 'MaskSDF', 'ShaderBaleines', 'OutputWindow'],
      parameters: { threshold: 0.5 },
      confidence: 0.70,
      actions: [{ type: 'ADD_NODE', nodeType: 'MaskSDF' }]
    };
  }
}
