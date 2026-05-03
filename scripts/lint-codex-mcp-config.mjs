#!/usr/bin/env node
// Validates .mcp.json (the bundled-into-plugin MCP server config) against
// the same schema Codex/Cursor/Claude Code all share. Source-tree presence
// only — the dist/ build artifact is gitignored and produced separately.

import { readFile, stat } from 'node:fs/promises';

const CONFIG = '.mcp.json';

let raw;
try { raw = await readFile(CONFIG, 'utf8'); }
catch { console.error(`✗ ${CONFIG}: not found`); process.exit(1); }

let config;
try { config = JSON.parse(raw); }
catch (e) { console.error(`✗ ${CONFIG}: invalid JSON: ${e.message}`); process.exit(1); }

const servers = config?.mcpServers ?? {};
const names = Object.keys(servers);
if (names.length === 0) {
  console.error(`✗ ${CONFIG}: no servers declared`);
  process.exit(1);
}

let failed = false;
for (const [name, server] of Object.entries(servers)) {
  if (!server.command) {
    console.error(`✗ ${CONFIG}: server "${name}" missing \`command\``);
    failed = true;
    continue;
  }
  if (!Array.isArray(server.args) || server.args.length === 0) continue;
  const entry = server.args[0];
  if (entry.startsWith('${') || entry.startsWith('/')) continue;
  const m = entry.match(/^\.\/mcp\/([^/]+)\//);
  if (!m) {
    console.error(`✗ ${CONFIG}: server "${name}" has unfamiliar args path "${entry}"`);
    failed = true;
    continue;
  }
  const dir = `mcp/${m[1]}`;
  try { await stat(dir); } catch {
    console.error(`✗ ${CONFIG}: ${dir}/ doesn't exist (no source tree)`);
    failed = true;
    continue;
  }
  let pkg;
  try { pkg = JSON.parse(await readFile(`${dir}/package.json`, 'utf8')); } catch {
    console.error(`✗ ${CONFIG}: ${dir}/package.json missing`);
    failed = true;
    continue;
  }
  if (/\/(dist|build)\//.test(entry) && !pkg.scripts?.build) {
    console.error(`✗ ${CONFIG}: server "${name}" references built artifact ${entry}, but ${dir}/package.json has no \`build\` script`);
    failed = true;
  }
}

if (failed) process.exit(1);
console.log(`✓ .mcp.json: all ${names.length} server(s) resolve to real, buildable source trees.`);
