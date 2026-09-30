import { NODE_GROUPS } from "../shared/node-specs.js";
import { EXECUTABLE_TYPES } from "../shared/ports.js";
import { createNodeProcessors } from "../shared/node-processors.js";

const allowedExperimental = new Set(["p5","td","isadora","sketch","showimport","dream"]);
const library = new Map();
for (const [group, items] of NODE_GROUPS) {
  for (const [label, type] of items) library.set(type, { group, label });
}

const processors = createNodeProcessors();
const executableLibrary = [...library.keys()].filter(type => EXECUTABLE_TYPES.has(type));
const experimental = [...library.keys()].filter(type => !EXECUTABLE_TYPES.has(type));
const missingProcessors = executableLibrary.filter(type => !processors.has(type));
const unexpectedExperimental = experimental.filter(type => !allowedExperimental.has(type));

const report = {
  library: library.size,
  executable: executableLibrary.length,
  experimental: experimental.length,
  experimentalTypes: experimental,
  missingProcessors,
  unexpectedExperimental
};

console.log("No-de production audit");
console.log(JSON.stringify(report, null, 2));

if (missingProcessors.length) {
  console.error("FAIL · executable nodes without processor:", missingProcessors.join(", "));
  process.exit(1);
}
if (unexpectedExperimental.length) {
  console.error("FAIL · new experimental nodes must be explicitly reviewed:", unexpectedExperimental.join(", "));
  process.exit(1);
}
if (executableLibrary.length < 75) {
  console.error("FAIL · production node coverage regressed below 75");
  process.exit(1);
}
console.log("OK · production Library is internally consistent");
