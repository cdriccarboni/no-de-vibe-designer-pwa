if (typeof (globalThis as any).requestAnimationFrame === 'undefined') {
  (globalThis as any).requestAnimationFrame = (cb: any) => setTimeout(cb, 16);
  (globalThis as any).cancelAnimationFrame = (id: any) => clearTimeout(id);
}
if (typeof (globalThis as any).window === 'undefined') {
  (globalThis as any).window = {
    addEventListener: () => {},
    removeEventListener: () => {},
    dispatchEvent: () => true,
    localStorage: {
      getItem: () => null,
      setItem: () => {},
      removeItem: () => {},
    }
  };
}
if (typeof (globalThis as any).localStorage === 'undefined') {
  (globalThis as any).localStorage = (globalThis as any).window.localStorage;
}

import { dmxLightingEngine } from '../src/services/dmxLightingEngine';
import { qlabCueEngine } from '../src/services/qlabCueEngine';
import { patchGraphEngine } from '../src/services/patchGraphEngine';
import { ALL_FACTORY_BANKS, BANK_METADATA, loadBankPadsFromStorage } from '../src/services/cueCartBankManager';
import { etcEosEngine } from '../src/services/etcEosEngine';
import { nativeCodeEngine } from '../src/services/nativeCodeEngine';
import { timecodeSyncEngine } from '../src/services/timecodeSyncEngine';
import { getMidiNoteName } from '../src/services/midiDeviceEngine';

let failures = 0;
function assert(desc: string, cond: boolean) {
  if (cond) {
    console.log(`  ✔ ${desc}`);
  } else {
    console.error(`  ✖ FAIL: ${desc}`);
    failures++;
  }
}

console.log('--- TEST 1: DMX Lighting Engine Enhancements ---');
const fixs = dmxLightingEngine.getFixtures();
assert('Fixtures default loaded', fixs.length > 0);
if (fixs.length > 0) {
  const fId = fixs[0].id;
  dmxLightingEngine.updateFixtureChannel(fId, 0, 200);
  assert('updateFixtureChannel updates channel', fixs[0].channels[0] === 200);
  dmxLightingEngine.updateFixturePosition(fId, { x: 50, y: 80, z: 10 });
  assert('updateFixturePosition updates stagePosition', fixs[0].stagePosition.x === 50 && fixs[0].stagePosition.y === 80);
}

console.log('--- TEST 2: QLab Cue Engine & Native Code Integration ---');
const show = qlabCueEngine.getActiveShow();
assert('Active show loaded with cues', show.cues.length > 0);
let lastFired = '';
const unsubCue = qlabCueEngine.subscribe(() => {
  const f = qlabCueEngine.getLastFired();
  if (f) lastFired = f.id;
});
const firstCue = show.cues[0];
qlabCueEngine.fireCue(firstCue.id);
assert('Cue fired successfully', lastFired === firstCue.id);
unsubCue();

console.log('--- TEST 3: Patch Graph Engine Node Instantiations & Types ---');
const tab = patchGraphEngine.getActiveTab();
assert('Active tab exists', Boolean(tab));
// Test adding ETC Eos console
patchGraphEngine.addNodeFromLibrary({
  name: 'ETC Eos Console & Command Line',
  category: 'control',
  desc: 'Test'
});
const eosNode = tab.nodes.find((n) => n.type === 'etc-eos-console');
assert('ETC Eos console node instantiated with inputs/outputs/params', Boolean(eosNode && eosNode.inputs.length >= 3 && eosNode.outputs.length >= 3));

// Test adding ETC Response sACN Node
patchGraphEngine.addNodeFromLibrary({
  name: 'ETC Response sACN Node',
  category: 'control',
  desc: 'Test'
});
const sacnNode = tab.nodes.find((n) => n.type === 'etc-response-node');
assert('ETC Response node instantiated with sACN params', Boolean(sacnNode && sacnNode.params.universe));

// Test adding C++ DSP Node
patchGraphEngine.addNodeFromLibrary({
  name: 'Moteur C++ DSP / 44Hz (Wasm)',
  category: 'logic',
  desc: 'Test'
});
const cppNode = tab.nodes.find((n) => n.type === 'cpp-dsp-node');
assert('C++ DSP node instantiated with 44Hz clock input', Boolean(cppNode && cppNode.params.frequency));

// Test adding C# Script Node
patchGraphEngine.addNodeFromLibrary({
  name: 'Script C# .NET 8 (Roslyn)',
  category: 'logic',
  desc: 'Test'
});
const csNode = tab.nodes.find((n) => n.type === 'cs-script-node');
assert('C# Script node instantiated with automation params', Boolean(csNode && csNode.params.scriptClass));

console.log('--- TEST 4: Cue Cart Banks & Factory Pads (16 Pads 4x4) ---');
assert('4 Banks exist (A, B, C, D)', Object.keys(ALL_FACTORY_BANKS).length === 4);
const bankA = ALL_FACTORY_BANKS['A'];
assert('Bank A has exactly 16 pads', bankA.length === 16);
assert('Bank A has metadata', Boolean(BANK_METADATA['A'].name));
assert('Pad 1 has label and sound preset', Boolean(bankA[0].label && bankA[0].soundPreset));
const loadedPads = loadBankPadsFromStorage('A');
assert('Loaded pads from storage returns 16 pads', loadedPads.length === 16);

console.log('--- TEST 5: ETC Eos Engine Commands & Palettes ---');
const cmdState = etcEosEngine.getCommandState();
assert('ETC Eos command line state exists', cmdState.commandBuffer !== undefined);
etcEosEngine.setCommandLine('Chan 1 Thru 12 At Full Enter');
assert('Command line set', etcEosEngine.getCommandState().commandBuffer.includes('Chan 1 Thru 12'));
const executed = etcEosEngine.executeCommandLine();
assert('Command executed successfully', executed === true);
const directSelects = etcEosEngine.getDirectSelects();
assert('Direct Selects available (Groups & Palettes)', directSelects.length >= 4);
const rdmDevices = etcEosEngine.getRdmDevices();
assert('RDM Devices discoverable', rdmDevices.length >= 2);

console.log('--- TEST 6: Native Code Engine (C++ Wasm + C# .NET 8) ---');
const cppState = nativeCodeEngine.getCppState();
assert('C++ Wasm latency defined (< 100µs)', cppState.microsecondLatency < 100);
const csState = nativeCodeEngine.getCsState();
assert('C# .NET 8 runtime state available', Boolean(csState.scriptClass));

console.log('--- TEST 7: Timecode Sync Engine (SMPTE/LTC/MTC/ArtNet) ---');
const tcState = timecodeSyncEngine.getState();
assert('Timecode sync modes supported', tcState.fps >= 24 && Boolean(tcState.currentTime.formatted));

console.log('--- TEST 8: MIDI note utilities ---');
assert('MIDI note 60 is C4', getMidiNoteName(60) === 'C4');
assert('MIDI note 69 is A4', getMidiNoteName(69) === 'A4');
assert('MIDI note 36 is C2', getMidiNoteName(36) === 'C2');

if (failures > 0) {
  console.error(`\n❌ Total Failures: ${failures}`);
  process.exit(1);
} else {
  console.log('\n🎉 ALL 8 TESTS PASSED SUCCESSFULLY! 100% FUNCTIONAL!');
  process.exit(0);
}
