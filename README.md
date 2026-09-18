<div align="center">

# You Are Here

**A VS Code extension that tells AI coding Agents where you're looking in your code.**

[![License: MIT](https://img.shields.io/badge/License-MIT-blue.svg)](LICENSE.txt) [![VS Code](https://img.shields.io/badge/VS%20Code-%5E1.90.0-007ACC)](https://code.visualstudio.com/)

**English** | [简体中文](README.zh-CN.md)

</div>

## Description

A VS Code extension that tells AI coding Agents where you are looking in your code — which file, cursor position, and selection.

The extension publishes that context to a fixed path on disk, so any Agent that can read a file can pick it up. The recommended way to consume it is through the bundled skills: they are lightweight, and they work with any Agent that speaks the [Agent Skills](https://agentskills.io) format.

## Quick Start

**1. Install the VS Code extension** — from the Marketplace, or from a VSIX during development (see [Packaging](#packaging)).

**2. Install the skills**

```bash
npx skills add DBinK/youarehere -g
```

`-g` installs into your user-level skills directory for every supported Agent it detects. Leave it off to install into the current project instead. If `skills` cannot install it, ask your Agent to install the skill from https://github.com/DBinK/youarehere.

**3. Point your Agent at your code**

Select some lines in VS Code, then type `/youarehere` followed by your question. Here's [Codex](https://github.com/openai/codex):

```text
> /youarehere why does this loop skip the last element?

  Reading src/parser.ts:42-58. The loop is bounded by `i < len - 1`,
  so the last element is never visited.
```

You never type a filename, and you never paste the code. The Agent reads `~/.youarehere/ref.json`, finds your position, and reads those lines itself.

Two skills are bundled:

| Skill | Invocation | What it does |
| --- | --- | --- |
| `youarehere` | `/youarehere` only | reads the code at your position, then answers |
| `youarehere-full` | automatic, or `/youarehere-full` | the full state below, plus how to read it |

`youarehere` is deliberately not auto-triggered — it is for when you want to point the Agent at your selection explicitly.

## Context Files

The extension writes two files into a fixed directory. Both use `0600`.

### `~/.youarehere/ref.json`

The smallest useful view — a single reference, enough for an Agent to know where you are:

```json
{
  "ref": "/path/to/workspace/src/example.ts:10-16",
  "isDirty": false,
  "updatedAt": "2026-09-18T06:28:23.746Z"
}
```

`ref` is an absolute path. What follows the last colon is either a line range (`10-16`), or a single line (`42`) when nothing is selected.

### `~/.youarehere/context.json`

The full state, for consumers that need more than a reference — this is what `youarehere-full` reads:

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

When nothing is selected, `selection` is a zero-width range — `startLine == endLine` and `startCharacter == endCharacter`. It is never `null`.

`isDirty` is `true` when the buffer has unsaved changes, so the file on disk may not match what is on screen.

## How It Works

- The VS Code extension writes two files whenever the editor state changes: a three-field reference to `~/.youarehere/ref.json`, and the full state to `~/.youarehere/context.json`.
- Both files are written with `0600` permissions.
- Consumers read those files directly.

## Requirements

- VS Code is running with this extension installed.
- The consumer runs on the same machine as VS Code.

## When It Updates

- After VS Code starts
- When the active editor changes
- When the selection changes
- When workspace folders change

## Multiple Windows

The context file has a single fixed path, so multiple VS Code windows overwrite each other — the most recent one wins. Most differences between `workspace` and your working directory are normal — a subdirectory, or a worktree. Only an unrelated project means the data came from another window.

## Packaging

```bash
npm install
npx vsce package --no-dependencies
```

This writes `youarehere-<version>.vsix`. To install it locally:

```bash
code --install-extension youarehere-<version>.vsix --force
```

The `skills/` directory ships inside the VSIX. `notes/` is excluded by `.vscodeignore`.

## License

MIT

## Credits

Inspired by [yuichisuzuki0601/active-context-mcp](https://github.com/yuichisuzuki0601/active-context-mcp).
