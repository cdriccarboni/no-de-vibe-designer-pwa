// Garde-fou : les binaires vendor ne doivent jamais être vides/corrompus (régression 3.3.8 : libpd.wasm = 0 octet).
import fs from "node:fs";
import assert from "node:assert/strict";
const wasm = fs.readFileSync(new URL("../shared/vendor/libpd/libpd.wasm", import.meta.url));
assert.ok(wasm.length > 500_000, `libpd.wasm trop petit (${wasm.length} octets)`);
assert.deepEqual([...wasm.subarray(0, 4)], [0x00, 0x61, 0x73, 0x6d], "libpd.wasm n'a pas la signature WebAssembly");
assert.ok(WebAssembly.validate(wasm), "libpd.wasm n'est pas un module WebAssembly valide");
console.log(`VENDOR INTEGRITY OK · libpd.wasm ${wasm.length} octets`);
