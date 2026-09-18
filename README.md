# You Are Here

[GitHub repository](https://github.com/DBinK/youarehere)

## Description

A VS Code extension that tells AI coding agents where you are looking in your code — which file, cursor position, and selection.

The extension publishes that context to a fixed path on disk. Any agent that can read a file can pick it up — no MCP server, no extra process, no configuration.

Inspired by [yuichisuzuki0601/active-context-mcp](https://github.com/yuichisuzuki0601/active-context-mcp), which exposes the same context through an MCP server. This fork drops the MCP layer and ships a skill instead.

## Setup

Install the VS Code extension first, then install the skill:

```bash
npx skills add DBinK/youarehere -g
```

`-g` installs into your user-level skills directory for every supported agent it detects. Leave it off to install into the current project instead.

If `skills` does not detect your agent, copy the skill into `~/.agents/skills/` manually.

The skill reads the context file and turns it into a `relativeFile:startLine-endLine` reference. You can also read the file directly without the skill.

## Context File

The path is fixed:

```text
~/.youarehere/context.json
```

```json
{
  "schema": "youarehere/v1",
  "workspace": "/path/to/workspace",
  "file": "/path/to/workspace/src/example.ts",
  "relativeFile": "src/example.ts",
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

## How It Works

- The VS Code extension writes the current editor state (file, cursor, selection) to `~/.youarehere/context.json` whenever it changes.
- The file is written with `0600` permissions.
- Consumers read that file directly.

## Requirements

- VS Code is running with this extension installed.
- The consumer runs on the same machine as VS Code.

## When It Updates

- After VS Code starts
- When the active editor changes
- When the selection changes
- When workspace folders change

## Multiple Windows

The context file has a single fixed path, so multiple VS Code windows overwrite each other — the most recent one wins. Compare the `workspace` field against your working directory before trusting the data.

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
