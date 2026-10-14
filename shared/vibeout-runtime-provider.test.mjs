import test from 'node:test';
import assert from 'node:assert/strict';
import { vibeOutProviderPlan } from './vibeout-runtime-provider.js';
import { normalizeLocalAiConfig } from './local-ai-core.js';

test('aucun vieux serveur Qwen/Ollama n’est tenté au premier lancement', () => {
  assert.equal(normalizeLocalAiConfig({}).enabled, false);
  assert.equal(normalizeLocalAiConfig({localEnabled:false}).enabled, false);
  assert.equal(normalizeLocalAiConfig({localEnabled:true}).enabled, true);
});

test('anciennes valeurs Ollama/Qwen ne deviennent pas une IA active', () => {
  const legacy = { localEnabled: true, localBaseUrl: 'http://127.0.0.1:11434', localModel: 'qwen2.5-coder:7b', enabled: false };
  assert.throws(() => vibeOutProviderPlan(legacy), /Aucun moteur IA configuré/);
  assert.throws(() => vibeOutProviderPlan(legacy, null, 'local'), /Aucun moteur local/);
});
test('Hermes MLX OpenAI-compatible local est sélectionné sans passer par Ollama', () => {
  const result = vibeOutProviderPlan({ localEnabled: true,
    localBaseUrl: 'http://127.0.0.1:18437/v1',
    localModel: 'mlx-community/Hermes-3-Llama-3.1-8B-4bit' });
  assert.equal(result[0].protocol, 'openai');
  assert.equal(result[0].endpoint, 'http://127.0.0.1:18437/v1/chat/completions');
  assert.equal(result[0].apiKey, '');
  assert.match(result[0].model, /Hermes-3/);
});
test('une passerelle externe non activée ne sert jamais de secours', () => {
  const cfg = { enabled:false, endpoint:'https://example.org/v1/chat/completions' };
  assert.throws(() => vibeOutProviderPlan(cfg, null, 'external'), /Aucune passerelle/);
});
test('le plan AUTO respecte les moteurs explicitement autorisés', () => {
  const cfg = { enabled:true, endpoint:'https://example.org/v1/chat/completions', model:'consented-model',
    localEnabled:true, localBaseUrl:'http://127.0.0.1:18437/v1', localModel:'hermes-local' };
  const plan = vibeOutProviderPlan(cfg);
  assert.deepEqual(plan.map(p=>p.provider), ['local','external']);
  assert.equal(plan[1].model, 'consented-model');
});
