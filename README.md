<div align="center">

# You Are Here

**A VS Code extension that tells AI coding Agents where you're looking in your code.**

[![Stars](https://img.shields.io/github/stars/DBinK/youarehere)](https://github.com/DBinK/youarehere/stargazers)
[![Version](https://vsmarketplacebadges.dev/version-short/DBinK.youarehere.svg)](https://marketplace.visualstudio.com/items?itemName=DBinK.youarehere)
[![Installs](https://vsmarketplacebadges.dev/installs-short/DBinK.youarehere.svg)](https://marketplace.visualstudio.com/items?itemName=DBinK.youarehere)
[![License](https://img.shields.io/github/license/DBinK/youarehere)](https://github.com/DBinK/youarehere/blob/main/LICENSE)
[![Agent Skills](https://img.shields.io/badge/Agent%20Skills-compatible-blueviolet)](https://agentskills.io)

**English** | [简体中文](README.zh-CN.md)

</div>

## Description

An AI coding Agent can read any file in a project, but it cannot tell which file is open. Passing that position manually means supplying a file path and line range, or pasting the code.

This extension writes the active file, cursor position and selection to a fixed path on disk, where an Agent can read it. The bundled skills are the intended interface, and they follow the [Agent Skills](https://agentskills.io) format: around 70 Agents implement it, among them Codex, Cursor, Gemini CLI, opencode, GitHub Copilot, Cline, Windsurf and Zed.

## Quick Start

1. **Install the VS Code extension** — from the [Visual Studio Marketplace](https://marketplace.visualstudio.com/items?itemName=DBinK.youarehere) or [Open VSX](https://open-vsx.org/extension/DBinK/youarehere), or from a VSIX during development (see [Development](#development)).

2. **Install the skills**

   ```bash
   npx skills add DBinK/youarehere -g
   ```

   `-g` installs into the user-level skills directory of every supported Agent it detects. Omit it to install into the current project instead. If `skills` cannot install it, ask your Agent to install the skill from https://github.com/DBinK/youarehere.

3. **Point the Agent at the selection**

   Select code in VS Code, then pass `/youarehere` and the question to the Agent. With [Codex](https://github.com/openai/codex):

   ```text
   > /youarehere why does this loop skip the last element?

     Reading src/parser.ts:42-58. The loop is bounded by `i < len - 1`,
     so the last element is never visited.
   ```

   The Agent resolves the position from `~/.youarehere/ref.json` and reads those lines itself.

## Bundled skills

| Skill | Invocation | What it does |
| --- | --- | --- |
| `youarehere` | `/youarehere` only | reads the code at the selection, then answers |
| `youarehere-full` | automatic, or `/youarehere-full` | the full state below, plus how to read it |

`youarehere` runs only when invoked by name. Use it to point the Agent at the current selection.

## Context Files

The extension writes two files into a fixed directory. Both use `0600`.

They are rewritten whenever the editor state changes: on startup, when the active editor changes, when the selection changes, and when workspace folders change.

### `~/.youarehere/ref.json`

The smallest useful view: a single reference, enough for an Agent to locate the position.

```json
{
  "ref": "/path/to/workspace/src/example.ts:10-16",
  "isDirty": false,
  "updatedAt": "2026-09-18T06:28:23.746Z"
}
```

`ref` is an absolute path. What follows the last colon is either a line range (`10-16`), or a single line (`42`) when nothing is selected.

### `~/.youarehere/context.json`

The full state, for readers that need more than a reference. This is what `youarehere-full` reads.

```json
{
  "schema": "youarehere/v1",
  "workspace": "/path/to/workspace",
  "file": "/path/to/workspace/src/example.ts",
  "relativeFile": "src/example.ts",
  "isDirty": false,
  "cursor": {
    "line": 10,
    "character": 5
  },
  "activeLineText": "const value = example();",
  "selection": {
    "startLine": 10,
    "startCharacter": 5,
    "endLine": 10,
    "endCharacter": 5
  },
  "updatedAt": "2026-07-07T10:00:00.000Z"
}
```

Line and character numbers are 1-based.

When nothing is selected, `selection` is a zero-width range: `startLine == endLine` and `startCharacter == endCharacter`. It is never `null`.

`isDirty` is `true` when the buffer has unsaved changes, so the file on disk may not match what is on screen.

## Multiple Windows

The state file has a single fixed path, so concurrent VS Code windows overwrite one another. The most recently focused window wins. A `workspace` that differs from the reader's working directory is usually not a problem, since one is often a subdirectory or worktree of the other. Compare them only when they name unrelated projects.

## Requirements

- VS Code is running with this extension installed.
- The reader runs on the same machine as VS Code.

## Development

Everything lives in `extension.js`. To build the extension:

```bash
npm install
npm run package
```

This writes `youarehere-<version>.vsix`. To install it locally:

```bash
code --install-extension youarehere-<version>.vsix --force
```

The `skills/` directory ships inside the VSIX.

### Release

Every version goes to both the Visual Studio Marketplace and Open VSX. Each registry reads its own token from the environment, so export both first.

```bash
export VSCE_PAT=<azure-devops-pat>   # needs the Marketplace > Manage scope
export OVSX_PAT=<open-vsx-token>
```

Then publish:

```bash
npm run publish:vsce
npm run publish:ovsx
```

Both commands package the extension from source and upload the result. The `DBinK` publisher on the Marketplace and the `DBinK` namespace on Open VSX must exist before the first publish. Create the Open VSX namespace with `npx ovsx create-namespace DBinK -p "$OVSX_PAT"`. The publish tooling needs Node.js 22 or newer.

## Credits

Inspired by [yuichisuzuki0601/active-context-mcp](https://github.com/yuichisuzuki0601/active-context-mcp).

## License

MIT
