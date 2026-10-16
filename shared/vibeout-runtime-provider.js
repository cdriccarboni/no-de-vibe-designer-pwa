/**
 * Le Vibe Out ne peut pas considérer les anciennes valeurs par défaut
 * Ollama/Qwen comme une IA disponible. Sélection explicite d'un modèle requis.
 */
const OLD_BASE = 'http://127.0.0.1:11434';
const OLD_MODEL = 'qwen2.5-coder:7b';

function localEndpoint(base) {
  const u = new URL(base);
  if (u.pathname.endsWith('/chat/completions')) return u.toString();
  const pathname = u.pathname.replace(/\/+$/, '');
  u.pathname = (pathname.endsWith('/v1') ? pathname : pathname + '/v1') + '/chat/completions';
  return u.toString();
}

export function vibeOutProviderPlan(cfg = {}, routed = null, provider = 'auto') {
  const baseUrl = String(routed?.baseUrl || cfg.localBaseUrl || '').replace(/\/+$/, '');
  const model = String(routed?.model || cfg.localModel || '');
  const defaultLegacy = !routed && baseUrl === OLD_BASE && model === OLD_MODEL;
  const localConfigured = cfg.localEnabled !== false && !!baseUrl && !!model && !defaultLegacy;
  const local = localConfigured
    ? ((/\/v1(?:\/|$)|\/chat\/completions\b/.test(baseUrl))
      ? { protocol: 'openai', endpoint: localEndpoint(baseUrl), model, apiKey: '', provider: 'local', agent: routed?.id || '' }
      : { protocol: 'ollama', baseUrl, model, apiKey: '', provider: 'local', agent: routed?.id || '' })
    : null;
  const remote = cfg.enabled === true && cfg.endpoint
    ? { protocol: 'openai', endpoint: cfg.endpoint, model: cfg.model || 'gpt-4o-mini',
        apiKey: cfg.apiKey || '', provider: 'external', agent: '' }
    : null;
  if (provider === 'local' && !local) throw new Error('Aucun moteur local configuré : les anciens réglages Ollama/Qwen ne sont pas opérationnels.');
  if (provider === 'external' && !remote) throw new Error('Aucune passerelle externe activée dans les préférences IA.');
  const planned = provider === 'local' ? [local] : provider === 'external' ? [remote] : [local, remote].filter(Boolean);
  if (!planned.length) throw new Error('Aucun moteur IA configuré. Indique un modèle Hermes/OmniRoute local ou active une passerelle autorisée.');
  return planned;
}
