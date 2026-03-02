#!/usr/bin/env node
/**
 * Reporte de complejidad ciclomática (ESLint rule complexity).
 * npm run complexity
 */

const path = require("path");
const { ESLint } = require("eslint");

const ROOT = path.join(__dirname, "..");
const GLOB = ["modules/*.js", "lib/*.js", "background.js"];

async function main() {
  const eslint = new ESLint({
    cwd: ROOT,
    overrideConfig: {
      env: { es2020: true },
      parserOptions: { ecmaVersion: 2020 },
      rules: { complexity: ["warn", { max: 10 }] }
    },
    useEslintrc: true
  });

  const results = await eslint.lintFiles(GLOB);
  const entries = [];

  for (const r of results) {
    for (const m of r.messages) {
      if (m.ruleId === "complexity") {
        const match = m.message.match(/complexity of (\d+)/i) || m.message.match(/(\d+)/);
        const value = match ? parseInt(match[1], 10) : 0;
        entries.push({
          file: path.relative(ROOT, r.filePath),
          line: m.line,
          complexity: value,
          message: m.message
        });
      }
    }
  }

  console.log("--- Complejidad ciclomática ---\n");
  if (entries.length === 0) {
    console.log("Ninguna función supera el límite (max 10).\n");
    return;
  }
  entries.sort((a, b) => b.complexity - a.complexity);
  entries.forEach(({ file, line, complexity, message }) => {
    const level = complexity > 15 ? "ALTO" : complexity > 10 ? "MEDIO" : "OK";
    console.log(`  ${file}:${line}  ${complexity} (${level})  ${message.slice(0, 50)}...`);
  });
  const max = Math.max(...entries.map((e) => e.complexity));
  console.log(`\nMáximo: ${max}. Límite: 10.\n`);
}

main().catch((err) => {
  console.error(err);
  process.exit(1);
});
