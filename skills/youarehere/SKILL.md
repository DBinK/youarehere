---
name: youarehere
description: 读取用户在 VS Code 里当前选中的代码位置。当用户用「这段代码」「这里」「我选中的」「当前这个文件」「光标处」「正在看的」等指代，或提出一个没有指明文件位置的代码问题（而用户很可能正看着某段代码）时使用。不要在用户已经明确给出文件路径或粘贴了代码内容时使用。
---

# 读取 VS Code 当前选区

用户在 VS Code 里的当前文件、光标位置和选区，由 `youarehere` 扩展实时写到一个 JSON 文件里。**直接读那个文件就行，不需要写脚本解析。**

## 文件在哪

固定路径，直接读：

```text
~/.youarehere/context.json
```

读不到，说明扩展没在运行——告诉用户装或启动 `youarehere` 扩展。

## 文件长这样

```json
{
  "schema": "youarehere/v1",
  "workspace": "/path/to/workspace",
  "file": "/path/to/workspace/src/example.ts",
  "relativeFile": "src/example.ts",
  "cursor": { "line": 12, "character": 5 },
  "activeLineText": "  const x = 1;",
  "selection": { "startLine": 12, "startCharacter": 1, "endLine": 14, "endCharacter": 26 },
  "updatedAt": "2026-09-18T02:29:02.529Z"
}
```

行号、列号都是 **1-based**，可以直接用，不需要换算。

## 两条容易看错的地方

**1. `selection` 不是 null，不代表用户选中了东西。**

用户没有选中任何文本时，`selection` 仍然存在，是一个**起止相同的零宽区间**——`startLine == endLine` 且 `startCharacter == endCharacter`。这种情况要用 `cursor.line`，**不要**当成 `:12-12` 这样的区间报出去。

**2. 用之前必须比对 `workspace` 和当前工作目录。**

扩展只维护一个固定路径的文件，多开 VS Code 时后写覆盖先写。如果 `workspace` 和你当前的工作目录不一致，这份数据来自另一个窗口——**不要用**，直接告诉用户：状态文件里是 `<那个 workspace>`，而当前在 `<当前目录>`，问他们是不是切错了窗口。

`updatedAt` 是 UTC 时间戳。如果它明显偏旧（比如几分钟前），而用户说"我刚选中的"，也值得提一句。

## 该输出什么

有真选区时，给出 `relativeFile:startLine-endLine` 形式的引用，例如 `src/example.ts:12-14`——这正是用户想要的格式。

**然后自己去读文件拿内容。状态文件里只有位置，没有选中文本。**

没有真选区时，用 `relativeFile:cursor.line`。

`relativeFile` 在 Windows 上可能是反斜杠（`src\foo.ts`），按需转成正斜杠即可。
