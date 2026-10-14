import test from 'node:test';
import assert from 'node:assert/strict';
import { parseShaderGeneration, gatewayChatUrl } from './aiGatewayValidation.ts';

test('une réponse IA complète et applicable est admise', () => {
  const item = parseShaderGeneration(JSON.stringify({
    title: 'Vagues',
    explanation: 'Animation de mer',
    glslCode: 'precision mediump float; void main(){ gl_FragColor = vec4(1.0); }'
  }));
  assert.equal(item.title, 'Vagues');
  assert.match(item.glslCode, /gl_FragColor/);
});
test('un JSON non valide ou un faux shader ne donne jamais de succès', () => {
  assert.throws(() => parseShaderGeneration('Voici ton shader !'), /JSON/);
  assert.throws(() => parseShaderGeneration(JSON.stringify({ title: 'Vide', glslCode: 'const x = 1' })), /non applicable/);
});
test('une passerelle OmniRoute compatible OpenAI est routée sans fuite HTTP', () => {
  assert.equal(gatewayChatUrl('http://127.0.0.1:8317/v1'), 'http://127.0.0.1:8317/v1/chat/completions');
  assert.equal(gatewayChatUrl('https://example.org'), 'https://example.org/v1/chat/completions');
  assert.throws(() => gatewayChatUrl('http://example.org'), /HTTPS requis/);
});
