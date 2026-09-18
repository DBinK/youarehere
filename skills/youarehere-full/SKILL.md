---
name: youarehere-full
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
  "isDirty": false,
  "cursor": { "line": 12, "character": 5 },
  "activeLineText": "  const x = 1;",
  "selection": { "startLine": 12, "startCharacter": 1, "endLine": 14, "endCharacter": 26 },
  "updatedAt": "2026-09-18T02:29:02.529Z"
}
```

行号、列号都是 **1-based**，可以直接用，不需要换算。

路径用 `file`——它是绝对路径，任何工作目录下都能直接读。`relativeFile` 是相对 workspace 的版本，用户没打开文件夹时是 `null`，不要用它。

## 四条容易看错的地方

**1. `file` 为 `null` 时，当前活动编辑器不是一个真实文件。**

比如 diff 视图、Source Control 面板、输出面板。这时 `cursor`、`activeLineText` 可能都有值，但你拿不到文件路径，**读不到任何代码**。

直接告诉用户：现在没有可读的文件，请他在真实文件里选中代码。

**2. `isDirty` 为 `true` 时，磁盘上的文件和用户屏幕上看到的不是同一份内容。**

用户改了代码还没保存。你手上的行号是**缓冲区里的坐标**，但你去读的是**磁盘文件**——行号可能已经错位，内容可能是旧的。

这时不要假装读到了正确的代码。告诉用户：文件有未保存的改动，你读到的是磁盘版本，请他先保存再问。

**3. `selection` 不是 null，不代表用户选中了东西。**

用户没有选中任何文本时，`selection` 仍然存在，是一个**起止相同的零宽区间**——`startLine == endLine` 且 `startCharacter == endCharacter`。这种情况用 `cursor.line`，**不要**当成 `:12-12` 这样的区间。

**4. `workspace` 和你当前目录不相干时，数据可能来自另一个窗口。**

扩展只维护一个固定路径的文件，多开 VS Code 时后写覆盖先写。但**大多数"不一致"是正常的，不要一看到不同就报警**——父子目录（你在项目子目录里开会话、或 VS Code 打开的只是某个 worktree）都算相干。

只有看起来像**两个不相干的项目**时（比如状态文件里是 `/path/to/project-a`，你当前在 `/path/to/project-b`），才跟用户确认：状态文件里是 `<workspace>`，你当前在 `<当前目录>`，问是不是切错了窗口。

`workspace` 为 `null` 时（用户没打开文件夹，只开了单个文件）跳过这一条。

`updatedAt` 是 UTC 时间戳。如果它明显偏旧（比如几分钟前），而用户说"我刚选中的"，也值得提一句。

## 该做什么

**自己去读文件拿内容**——状态文件里只有位置，没有选中文本。

有真选区时读 `startLine` 到 `endLine` 这几行，否则读 `cursor.line` 那一行。

拿到代码后回答用户的问题。
