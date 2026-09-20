---
name: youarehere
description: Read the code the user is currently looking at in VS Code. Use when the user refers to "this code", "here", "what I've selected", "the current file", "at the cursor", or "what I'm looking at", or asks a code question without naming a location (and they're likely looking at code). Do not use when the user has already given a file path or pasted the code.
license: MIT
compatibility: Requires the "You Are Here" extension for VS Code (DBinK.youarehere, VS Code 1.90 or later) running on the same machine. It writes ~/.youarehere/context.json with schema youarehere/v1.
metadata:
  author: DBinK
  version: "0.3.0"
---

# Read the current VS Code selection

The user's current file, cursor position and selection in VS Code are written in real time to a JSON file by the "You Are Here" extension (`DBinK.youarehere`). **Just read that file — there's no need to write a script to parse it.**

## Where the file is

It's a fixed path, read it directly:

```text
~/.youarehere/context.json
```

If you can't read it, the extension isn't running — tell the user to install or launch the "You Are Here" extension (`DBinK.youarehere`).

## What it looks like

```json
{
  "schema": "youarehere/v1",
  "workspace": "/path/to/workspace",
  "file": "/path/to/workspace/src/example.ts",
  "relativeFile": "src/example.ts",
  "isDirty": false,
  "cursor": { "line": 12, "character": 5 },
  "activeLineText": "  const x = 1;",
  "selection": { "startLine": 12, "startCharacter": 1, "endLine": 14, "endCharacter": 26 },
  "updatedAt": "2026-09-18T02:29:02.529Z"
}
```

Line and character numbers are **1-based** — use them directly, no conversion needed.

Use `file` for the path — it's absolute, readable from any working directory. `relativeFile` is the workspace-relative version and is `null` when the user hasn't opened a folder; don't use it.

## Five things that are easy to misread

**1. `file: null` means the active editor isn't a real file.**

A diff view, the Source Control panel, an output panel. `cursor` and `activeLineText` may still have values, but you have no file path — **you can't read any code**.

Tell the user directly: there's no readable file right now, please select code in a real file.

**2. `isDirty: true` means the file on disk is not what the user sees on screen.**

The user changed code without saving. Your line numbers are **buffer coordinates**, but you're reading the **file on disk** — line numbers may have shifted and the content may be stale.

Don't pretend you read the right code. Tell the user: the file has unsaved changes, what you read is the on-disk version, please save and ask again.

**3. `selection` not being null does not mean the user selected something.**

When the user has selected no text, `selection` is still present — a **zero-width range** where `startLine == endLine` and `startCharacter == endCharacter`. In that case use `cursor.line`; do **not** treat it as a range like `:12-12`.

**4. `endLine` overshoots by one when the selection ends at a line boundary.**

Coordinates are end-exclusive: selecting whole lines (clicking the line-number gutter, or shift-extending past a line's end) puts `end` at column 1 of the *next* line, so `endCharacter == 1` and `endLine` is one past the last selected line. When `endCharacter == 1` and `endLine > startLine`, read up to `endLine - 1` instead.

**5. When `workspace` is unrelated to your current directory, the data may come from another window.**

The extension maintains a single file at a fixed path, so with multiple VS Code windows open the last writer wins. But **most "mismatches" are normal — don't raise an alarm just because the paths differ**: parent/child directories (you're in a subdirectory of the project, or VS Code has a worktree open) are all fine.

Only when they look like **two unrelated projects** (the state file says `/path/to/project-a`, you're in `/path/to/project-b`) should you check with the user: the state file says `<workspace>`, you're in `<current directory>` — ask whether they have the wrong window.

When `workspace` is `null` (the user opened a single file, no folder), skip this one.

`updatedAt` is a UTC timestamp. If it's clearly stale (minutes old) while the user says "I just selected this", that's worth mentioning too.

## What to do

**Go read the file yourself for the content** — the state file holds a position only, not the selected text.

With a real selection, read the lines from `startLine` to `endLine`, dropping `endLine` when `endCharacter` is `1` and the selection spans more than one line; otherwise read the line at `cursor.line`.

Then answer the user's question.
