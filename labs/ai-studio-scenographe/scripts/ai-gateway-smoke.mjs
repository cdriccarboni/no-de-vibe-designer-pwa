import http from 'node:http';
import net from 'node:net';
import assert from 'node:assert/strict';
import { spawn } from 'node:child_process';
import { setTimeout as sleep } from 'node:timers/promises';

async function freePort() {
  const server = net.createServer();
  await new Promise(resolve => server.listen(0, '127.0.0.1', resolve));
  const port = server.address().port;
  await new Promise(resolve => server.close(resolve));
  return port;
}
const mock = http.createServer((req, res) => {
  let body = '';
  req.on('data', chunk => { body += chunk.toString(); });
  req.on('end', () => {
    assert.equal(req.url, '/v1/chat/completions');
    const data = JSON.parse(body);
    assert.equal(data.model, 'mock-no-code-model');
    assert.ok(data.messages.at(-1).content.includes('vagues'));
    res.setHeader('content-type', 'application/json');
    const content = JSON.stringify({
      title: 'Vagues générées', explanation: 'Réponse simulée pour tester le transport',
      glslCode: 'precision mediump float; void main(){ gl_FragColor = vec4(0.5); }'
    });
    res.end(JSON.stringify({ model: 'mock-no-code-model', choices: [{ message: { content } }] }));
  });
});
await new Promise(resolve => mock.listen(0, '127.0.0.1', resolve));
const mockPort = mock.address().port;
const appPort = await freePort();
const child = spawn('./node_modules/.bin/tsx', ['server.ts'], {
  cwd: process.cwd(),
  env: { ...process.env, PORT: String(appPort), NODE_ENV: 'production',
    NOCODE_AI_BASE_URL: `http://127.0.0.1:${mockPort}/v1`, NOCODE_AI_MODEL: 'mock-no-code-model' },
  stdio: ['ignore', 'pipe', 'pipe']
});
let log = '';
child.stdout.on('data', b => { log += String(b); });
child.stderr.on('data', b => { log += String(b); });
const base = `http://127.0.0.1:${appPort}`;
try {
  let ready = false;
  for (let i = 0; i < 80; i++) {
    try {
      const r = await fetch(base + '/api/ai/status');
      if (r.ok) { ready = true; break; }
    } catch { /* startup */ }
    if (child.exitCode !== null) break;
    await sleep(100);
  }
  assert.ok(ready, 'le serveur doit démarrer : ' + log.slice(-1000));
  const status = await (await fetch(base + '/api/ai/status')).json();
  assert.equal(status.connected, false, 'une configuration seule ne prouve pas la disponibilité');
  assert.equal(status.configured, true);
  const response = await fetch(base + '/api/ai/generate', {
    method: 'POST', headers: {'content-type':'application/json'},
    body: JSON.stringify({ prompt: 'Crée des vagues dynamiques' })
  });
  assert.equal(response.status, 200);
  const result = await response.json();
  assert.equal(result.origin, 'ai');
  assert.equal(result.model, 'mock-no-code-model');
  assert.match(result.glslCode, /gl_FragColor/);
  const invalid = await fetch(base + '/api/ai/generate', { method:'POST',
    headers:{'content-type':'application/json'},body: JSON.stringify({ prompt:'' }) });
  assert.equal(invalid.status, 400);
  console.log('OK : statut non trompeur, requête modèle, validation du code, erreur sur prompt vide');
} finally {
  child.kill('SIGTERM');
  mock.close();
}
