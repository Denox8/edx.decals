#!/usr/bin/env node
/** Syntax-checks every .ts/.tsx file with the TypeScript compiler (no type information needed). */
import fs from "node:fs";
import path from "node:path";
import { createRequire } from "node:module";

const require = createRequire(import.meta.url);
const ts = require("typescript");
const ROOT = path.resolve(path.dirname(new URL(import.meta.url).pathname.replace(/^\/([A-Za-z]:)/, "$1")), "..");
const files = [];
(function walk(dir) {
  for (const name of fs.readdirSync(dir)) {
    if (["node_modules", ".next", "legacy"].includes(name)) continue;
    const full = path.join(dir, name);
    if (fs.statSync(full).isDirectory()) walk(full);
    else if (/\.(ts|tsx)$/.test(name) && !name.endsWith(".d.ts")) files.push(full);
  }
})(ROOT);

let failed = 0;
for (const file of files) {
  const out = ts.transpileModule(fs.readFileSync(file, "utf8"), {
    fileName: file,
    reportDiagnostics: true,
    compilerOptions: { jsx: ts.JsxEmit.Preserve, target: ts.ScriptTarget.ES2020, module: ts.ModuleKind.ESNext }
  });
  const diags = out.diagnostics ?? [];
  if (diags.length) {
    failed++;
    for (const d of diags) {
      const pos = d.file && d.start !== undefined ? d.file.getLineAndCharacterOfPosition(d.start) : { line: 0, character: 0 };
      console.log(`FAIL ${path.relative(ROOT, file)}:${pos.line + 1}:${pos.character + 1} ${ts.flattenDiagnosticMessageText(d.messageText, " ")}`);
    }
  }
}
console.log(`ts-syntax: ${files.length - failed} pass, ${failed} fail (${files.length} files)`);
process.exit(failed ? 1 : 0);
