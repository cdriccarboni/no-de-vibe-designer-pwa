/**
 * Validation stricte du seul type de code que Vibe peut appliquer : GLSL WebGL1.
 * Le code renvoyé par le modèle ne devient pas du JavaScript exécutable.
 */
export function parseShaderGeneration(raw: string) {
  const cleaned = raw.trim().replace(/^\`\`\`(?:json)?\s*/i, '').replace(/\s*\`\`\`$/, '');
  let data: unknown;
  try {
    data = JSON.parse(cleaned);
  } catch {
    throw new Error('Réponse IA invalide : JSON absent ou illisible');
  }
  if (!data || typeof data !== 'object') {
    throw new Error('Réponse IA invalide : objet attendu');
  }
  const result = data as Record<string, unknown>;
  const glslCode = typeof result.glslCode === 'string' ? result.glslCode.trim() : '';
  const title = typeof result.title === 'string' ? result.title.trim().slice(0, 100) : '';
  const explanation = typeof result.explanation === 'string' ? result.explanation.trim().slice(0, 600) : '';
  if (!title || !glslCode || glslCode.length > 16000 ||
      !/void\s+main\s*\(\s*(?:void\s*)?\)/.test(glslCode) ||
      !/gl_FragColor\s*=/.test(glslCode) ||
      /#\s*(?:include|version)|\b(?:samplerExternalOES|imageStore)\b/.test(glslCode)) {
    throw new Error('Réponse IA non applicable : shader GLSL ES 1.00 invalide');
  }
  return { title, explanation, glslCode };
}

export function gatewayChatUrl(base: string): string {
  const url = new URL(base);
  if (!['https:', 'http:'].includes(url.protocol)) throw new Error('Protocole de passerelle invalide');
  // Éviter l'envoi accidentel d'un jeton sur HTTP non local.
  if (url.protocol === 'http:' && !['localhost', '127.0.0.1', '::1'].includes(url.hostname)) {
    throw new Error('Passerelle non locale : HTTPS requis');
  }
  const path = url.pathname.replace(/\/+$/, '');
  if (path.endsWith('/chat/completions')) return url.toString();
  url.pathname = path.endsWith('/v1') ? path + '/chat/completions' : path + '/v1/chat/completions';
  return url.toString();
}
