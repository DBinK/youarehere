---
name: here
description: Read the user's current position in VS Code (file + line range), then read that code. Only invoke when the user explicitly types /here — do not trigger it from conversation context.
license: MIT
compatibility: Requires the "You Are Here" extension for VS Code (DBinK.youarehere, VS Code 1.90 or later) running on the same machine. It writes ~/.youarehere/ref.json.
metadata:
  author: DBinK
  version: "0.3.0"
---

# Output the VS Code selection reference

The user's current position in VS Code is written to `~/.youarehere/ref.json`, which has exactly three fields:

```json
{
  "ref": "/path/to/workspace/src/example.ts:10-16",
  "isDirty": false,
  "updatedAt": "2026-09-18T06:28:23.746Z"
}
```

## Notes

`ref` is already assembled — use it as-is, don't build the path or the line numbers yourself.

Once you have `ref`, **go read that code** — the state file holds a position only, not the selected text.

When what follows the colon is a **line range** (`:10-16`), the user has those lines selected. When it's a **single line number** (`:42`), the user has merely parked the cursor there and selected nothing.

`isDirty: true` means the file has unsaved changes — reading from disk may give you content that doesn't match what's on the user's screen, with line numbers possibly shifted. Mention it and ask the user to save first.

It's also worth mentioning if `updatedAt` is clearly stale (minutes old, while the user says they just selected something).

`ref: null` means the active editor isn't a real file — a diff view, the Source Control panel, an output panel. You have no file path; tell the user to select code in a real file.

If `ref.json` doesn't exist, the extension isn't running — tell the user to install or launch the "You Are Here" extension (`DBinK.youarehere`).
