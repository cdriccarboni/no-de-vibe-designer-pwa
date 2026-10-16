// QA protocoles : octets OSC 1.0, Art-Net ArtDmx et sACN (E1.31) conformes aux spécifications.
// Ne teste PAS l'émission réseau (UDP natif = application desktop ou relais) : uniquement l'encodage.
import assert from "node:assert/strict";
import { encodeOscMessage, decodeOscMessage } from "../shared/protocols/osc.js";
import { encodeArtNetDmx, encodeArtNetChannel } from "../shared/protocols/artnet.js";
import { encodeSacnDmx, sacnMulticastAddress } from "../shared/protocols/sacn.js";

let pass = 0;
const ok = (c, m) => { assert.ok(c, m); pass++; console.log("✓", m); };
const bytes = b => b instanceof Uint8Array ? b : new Uint8Array(b.buffer ? b.buffer.slice(b.byteOffset, b.byteOffset + b.byteLength) : b);

// OSC : "/a/b" padded to 8, ",f" padded to 4, float32 big-endian
const osc = bytes(encodeOscMessage("/a/b", [0.5]));
ok(osc.length === 16, `OSC : taille 16 octets (adresse 8 + tags 4 + float 4), reçu ${osc.length}`);
ok(String.fromCharCode(...osc.slice(0, 4)) === "/a/b" && osc[4] === 0 && osc[7] === 0, "OSC : adresse terminée par NUL et alignée sur 4");
ok(String.fromCharCode(...osc.slice(8, 10)) === ",f" && osc[10] === 0 && osc[11] === 0, "OSC : type tag « ,f » aligné");
ok(new DataView(osc.buffer, osc.byteOffset).getFloat32(12, false) === 0.5, "OSC : float32 big-endian");
const mixed = bytes(encodeOscMessage("/x", [1, "hi", 2.25]));
const dec = decodeOscMessage(mixed);
ok(dec.address === "/x" && dec.args.length === 3 && dec.args[1] === "hi" && Math.abs(dec.args[2] - 2.25) < 1e-6, `OSC : aller-retour encode/decode multi-arguments ${JSON.stringify(dec.args)}`);
ok(mixed.length % 4 === 0, "OSC : longueur totale multiple de 4");

// Art-Net ArtDmx
const data = new Uint8Array(512); data[0] = 255; data[511] = 7;
const an = bytes(encodeArtNetDmx({ universe: 0x0123, data, sequence: 9, physical: 1 }));
ok(String.fromCharCode(...an.slice(0, 7)) === "Art-Net" && an[7] === 0, "Art-Net : identifiant « Art-Net\\0 »");
ok(an[8] === 0x00 && an[9] === 0x50, "Art-Net : OpCode ArtDmx 0x5000 en little-endian");
ok(an[10] === 0 && an[11] === 14, "Art-Net : version protocole 14 (big-endian)");
ok(an[12] === 9 && an[13] === 1, "Art-Net : séquence et physical");
ok(an[14] === 0x23 && an[15] === 0x01, "Art-Net : SubUni/Net (univers 0x0123, little-endian)");
ok(an[16] === 0x02 && an[17] === 0x00, "Art-Net : longueur 512 en big-endian");
ok(an.length === 18 + 512 && an[18] === 255 && an[18 + 511] === 7, "Art-Net : 512 canaux, canal 1 et 512 aux bons offsets");
const one = bytes(encodeArtNetChannel({ universe: 0, channel: 3, value: 128 }));
ok(one[18 + 2] === 128, "Art-Net : canal 3 → offset 20");
ok(((one[16] << 8) | one[17]) % 2 === 0, "Art-Net : longueur de données paire");

// sACN E1.31
const sa = bytes(encodeSacnDmx({ universe: 1, data: new Uint8Array([10, 20, 30]) }));
ok(sa[0] === 0x00 && sa[1] === 0x10, "sACN : preamble size 0x0010");
ok(String.fromCharCode(...sa.slice(4, 13)) === "ASC-E1.17", "sACN : identifiant ACN « ASC-E1.17 »");
ok(((sa[113] << 8) | sa[114]) === 1, "sACN : univers 1 à l'offset 113 (big-endian)");
ok(sa[125] === 0x00 && sa[126] === 10 && sa[128] === 30, "sACN : start code 0 puis données DMX à l'offset 126");
ok(sacnMulticastAddress(1) === "239.255.0.1" && sacnMulticastAddress(258) === "239.255.1.2", "sACN : adresse multicast par univers");
console.log(`\n✓ QA protocoles : ${pass} vérifications (encodage seulement, pas d'émission réseau)`);
