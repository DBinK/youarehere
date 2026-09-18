# You Are Here

[GitHub repository](https://github.com/DBinK/youarehere)

## Description

A VS Code extension that tells AI coding agents where you are looking in your code — which file, cursor position, and selection.

The extension publishes that context to a fixed path on disk. Any agent that can read a file can pick it up.

## Setup

Install the VS Code extension first, then install the skills:

```bash
npx skills add DBinK/youarehere -g
```

`-g` installs into your user-level skills directory for every supported agent it detects. Leave it off to install into the current project instead.

If `skills` cannot install it, ask your agent to install the skill from https://github.com/DBinK/youarehere.

Two skills are bundled:

| Skill | Invocation | Output |
| --- | --- | --- |
| `youarehere` | `/youarehere` only | one line: `path:10-16  dirty  2026-09-18T06:28:23.746Z` |
| `youarehere-full` | automatic, or `/youarehere-full` | the full state below, plus how to read it |

`youarehere` is deliberately not auto-triggered — it is for when you want a bare reference and nothing else.

## Context Files

The extension writes two files into a fixed directory. Both use `0600`.

### `~/.youarehere/context.json`

The full state:

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

### `~/.youarehere/ref.json`

A reduced view of the same state, for consumers that only want a reference:

```json
{
  "ref": "/path/to/workspace/src/example.ts:10-16",
  "isDirty": false,
  "updatedAt": "2026-09-18T06:28:23.746Z"
}
```

`ref` is an absolute path. What follows the last colon is either a line range (`10-16`), or a single line (`42`) when nothing is selected.

## How It Works

- The VS Code extension writes the full editor state to `~/.youarehere/context.json`, and a reduced three-field view to `~/.youarehere/ref.json`, whenever it changes.
- Both files are written with `0600` permissions.
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
