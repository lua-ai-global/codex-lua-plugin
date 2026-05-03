# codex-lua-plugin

A [Codex CLI](https://developers.openai.com/codex) plugin for building, testing, and deploying [Lua AI agents](https://heylua.ai) directly from inside your Codex session.

This is the Codex port of [`claude-code-lua-plugin`](https://github.com/lua-ai-global/claude-code-lua-plugin) and [`cursor-lua-agent-builder`](https://github.com/lua-ai-global/cursor-lua-agent-builder), with the same architecture, the same MCP-first integration model, the same §3.3 deploy-safety gates, and the same 14-verb workflow — adapted to Codex CLI's plugin format (`.codex-plugin/plugin.json`, marketplace-based install).

## Install

```bash
# 1. Clone (path is your dev location; install command tells Codex about it)
git clone https://github.com/lua-ai-global/codex-lua-plugin ~/codex-lua-plugin
cd ~/codex-lua-plugin

# 2. Build the bundled MCP server (gitignored — must exist before install)
cd mcp/lua-platform && npm ci && npm run build && cd ../..

# 3. Install — registers as a marketplace and triggers `codex plugin install`
node scripts/install.mjs
```

The script:
- Pre-flights that `codex` CLI is on your PATH (install with `npm install -g @openai/codex` if not)
- Pre-flights that the MCP server bundle was built
- Runs `codex plugin marketplace add ./` to register this repo as a Codex marketplace
- Runs `codex plugin install lua-agent-builder` to install the plugin from it
- Codex caches the plugin at `~/.codex/plugins/cache/lua-ai-marketplace/lua-agent-builder/<version>/`

To uninstall: `node scripts/install.mjs --uninstall` (removes the plugin AND the marketplace registration).

To update: `cd ~/codex-lua-plugin && git pull && node scripts/install.mjs` — idempotent; Codex re-reads the manifest and updates components.

In Codex, type `/` to see the `lua-*` skills appear in autocomplete. Run `/lua-doctor` first to verify the environment, then `/lua-auth` to authenticate.

## What's inside

| Component | Count | Role |
|---|---|---|
| Skills (`/lua-*`) | 14 | One per verb: architect, init, new, test, push, deploy, sync, logs, chat, qa, doctor, auth, docs, update |
| Subagents | 5 | `lua-architect`, `lua-skill-builder`, `lua-debug`, `lua-deploy-pilot`, `lua-qa` (Codex TOML format) |
| Hooks | 10 | SessionStart × 3, UserPromptSubmit × 1, PreToolUse × 4 (incl. safety gate), PostToolUse × 2 |
| Rules | 3 | `@primitives`, `@integrations`, `@decision-trees` — knowledge base for the architect |
| MCP server | 1 | `lua-platform` exposes 5 read-only tools (`list_agents`, `get_agent`, `list_primitive_versions`, `get_deployment_status`, `tail_logs`) |
| Lints | 9 | Catch known regression classes (CLI flag denylist, MCP refs, monorepo paths, etc.) |
| Tests | 248 | Jest suites against hook scripts + MCP tools + runtime adapters |

## Why a port?

Codex CLI's plugin model is genuinely close to Claude Code's:

- **Hook event names match** — `SessionStart`, `PreToolUse`, `PostToolUse`, `UserPromptSubmit`, `Stop` (PascalCase, like Claude Code; not Cursor's camelCase). Same JSON output protocol (`{hookSpecificOutput: {hookEventName, permissionDecision}}` for blocks, exit code 2 for hard denial).
- **Skills format identical** — `skills/<name>/SKILL.md` with `name` + `description` frontmatter. Anthropic's SKILL.md standard, adopted by both.
- **MCP via `.mcp.json`** — same JSON schema as Claude Code (or `~/.codex/config.toml` `[mcp_servers]` for user-scope).
- **Plugin manifest at `.codex-plugin/plugin.json`** — same kebab-case `name`, similar field set as Cursor's `.cursor-plugin/plugin.json`.
- **Real local install** — `codex plugin marketplace add ./` is a first-class command; no symlink dance like the Cursor port needed.

The only meaningful adaptation is **subagents** — Codex uses TOML files at `agents/*.toml` with a different schema (`name`, `description`, `developer_instructions`, optional `model` / `mcp_servers`). The conversion is mechanical (frontmatter + body → TOML keys).

## Layout

```
codex-lua-plugin/
├── .codex-plugin/
│   └── plugin.json             ← Codex plugin manifest
├── marketplace.json            ← Codex marketplace pointer (this repo IS a marketplace of 1)
├── skills/                     ← 14 verbs as skills (Anthropic SKILL.md format)
│   ├── lua-architect/SKILL.md
│   └── ... (13 more)
├── agents/                     ← 5 subagents in Codex TOML format
│   ├── lua-architect.toml
│   └── ... (4 more)
├── hooks/
│   ├── hooks.json              ← Claude-Code-shaped (matcher + hooks array)
│   ├── before-shell-execution.mjs    ← §3.3 safety gate (umbrella)
│   ├── confirm-deploy.mjs / block-auto-deploy.mjs / warn-version-zero.mjs
│   ├── check-lua-version.mjs / detect-project.mjs / check-lua-auth.mjs
│   └── inject-context.mjs / post-deploy-smoke.mjs / post-compile-summary.mjs
├── rules/                      ← knowledge files as MDC rules
├── .mcp.json                   ← MCP server registration
├── mcp/lua-platform/           ← bundled MCP server (vendored from upstream repo)
├── lib/                        ← shared utilities (hook-runtime adapter handles CC + Cursor + Codex)
├── scripts/install.mjs         ← LOCAL INSTALL via `codex plugin marketplace add`
├── test/                       ← 248 jest tests (vendored, all pass on the matrix)
└── docs/USER_GUIDE.md
```

## Safety contracts

The plugin enforces the same gates as the Claude Code and Cursor versions:

- **§3.3 deploy gate** — bare `lua deploy` is denied by `hooks/before-shell-execution.mjs` unless prefixed with `LUA_DEPLOY_CONFIRMED=1` (the `/lua-deploy` skill sets this after walking the user through the gated 5-step ship sequence).
- **`--auto-deploy` block** — denied for any command containing `--auto-deploy`.
- **Credential isolation** — `lua auth key*` is denied to prevent the API key from being printed into the chat transcript.
- **Single-permission contract** — preserved in the skill bodies.

See [`SECURITY.md`](./SECURITY.md) for disclosure path.

## Companion projects

- **[lua-platform-mcp](https://github.com/lua-ai-global/lua-platform-mcp)** — the standalone MCP server (also listed in the [Cline MCP Marketplace](https://cline.bot/mcp-marketplace) for direct use without an IDE plugin)
- **[claude-code-lua-plugin](https://github.com/lua-ai-global/claude-code-lua-plugin)** — Anthropic Claude Code version
- **[cursor-lua-agent-builder](https://github.com/lua-ai-global/cursor-lua-agent-builder)** — Cursor version

## License

[MIT](./LICENSE) © Lua AI
