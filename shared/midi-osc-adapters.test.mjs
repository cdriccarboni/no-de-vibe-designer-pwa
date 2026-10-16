// Web MIDI et OSC-over-WebSocket avec mocks (aucun matériel ni réseau) : on vérifie les octets et les événements.
import test from "node:test";
import assert from "node:assert/strict";
import { MidiAdapter } from "./adapters/midi.js";
import { OscWebSocket } from "./adapters/osc-websocket.js";
import { decodeOscMessage, encodeOscMessage } from "./protocols/osc.js";

function mockMidiAccess() {
  const sent = [];
  const input = { id: "in1", name: "Mock Keys", manufacturer: "Test", state: "connected", onmidimessage: null };
  const output = { id: "out1", name: "Mock Synth", manufacturer: "Test", state: "connected", send: d => sent.push([...d]) };
  return { sent, input, access: { inputs: new Map([["in1", input]]), outputs: new Map([["out1", output]]), onstatechange: null } };
}

test("Web MIDI : NOTE ON / CC / NOTE OFF décodés depuis un accès simulé", async () => {
  const m = mockMidiAccess(), events = [];
  const midi = new MidiAdapter(e => events.push(e), { requestAccess: async opts => { assert.equal(opts.sysex, false); return m.access; } });
  assert.equal(midi.supported(), true);
  const ports = await midi.connect();
  assert.equal(ports.inputs.length, 1);
  m.input.onmidimessage({ data: new Uint8Array([0x91, 60, 100]) });
  m.input.onmidimessage({ data: new Uint8Array([0xB0, 7, 64]) });
  m.input.onmidimessage({ data: new Uint8Array([0x91, 60, 0]) });
  const msgs = events.filter(e => e.type === "midi-in").map(e => e.message);
  assert.deepEqual(msgs.map(x => [x.type, x.channel, x.number, x.value]), [["NOTE ON", 2, 60, 100], ["CC", 1, 7, 64], ["NOTE OFF", 2, 60, 0]]);
});

test("Web MIDI : envoi vers la sortie simulée, erreur honnête sans accès", async () => {
  const m = mockMidiAccess();
  const midi = new MidiAdapter(() => {}, { requestAccess: async () => m.access });
  assert.throws(() => midi.send("out1", [0x90, 1, 1]), /non connecté/);
  await midi.connect();
  midi.send("out1", [0x90, 64, 127]);
  assert.deepEqual(m.sent, [[0x90, 64, 127]]);
  const none = new MidiAdapter(() => {});
  if (typeof navigator === "undefined" || typeof navigator.requestMIDIAccess !== "function") await assert.rejects(none.connect(), /indisponible/);
});

class MockWS {
  static instances = [];
  constructor(url) { this.url = url; this.readyState = 0; this.out = []; MockWS.instances.push(this); setTimeout(() => { this.readyState = 1; this.onopen?.(); }, 1); }
  send(d) { this.out.push(d); }
  close() { this.readyState = 3; this.onclose?.(); }
}

test("OSC/WebSocket : paquet binaire OSC 1.0 envoyé et reçu", async () => {
  const got = [], states = [];
  const osc = new OscWebSocket({ url: "ws://127.0.0.1:8081", WebSocketImpl: MockWS, onMessage: m => got.push(m), onState: s => states.push(s) });
  await osc.connect();
  const ws = MockWS.instances.at(-1);
  assert.equal(ws.binaryType, "arraybuffer");
  osc.send("/nvd/fader/1", [0.75]);
  const pkt = ws.out[0];
  assert.ok(pkt instanceof Uint8Array);
  assert.deepEqual(decodeOscMessage(pkt), { address: "/nvd/fader/1", args: [0.75] });
  const inbound = encodeOscMessage("/scene/go", ["intro", 2.5]);
  ws.onmessage({ data: inbound.buffer.slice(inbound.byteOffset, inbound.byteOffset + inbound.byteLength) });
  ws.onmessage({ data: "texte ignoré" });
  ws.onmessage({ data: new Uint8Array([1, 2, 3]).buffer });
  assert.deepEqual(got, [{ address: "/scene/go", args: ["intro", 2.5] }]);
  assert.ok(states.includes("online") && states.some(s => /invalide/.test(s)));
  osc.close();
  assert.throws(() => osc.send("/x", [1]), /non connecté/);
});

test("OSC/WebSocket : pas de WebSocket = refus explicite", async () => {
  await assert.rejects(new OscWebSocket({ url: "ws://x", WebSocketImpl: null }).connect(), /indisponible/);
});
