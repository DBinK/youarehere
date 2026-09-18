<div align="center">

# You Are Here

**一个 VS Code 扩展，告诉 AI 编程 Agent 你正在看代码的哪个位置。**

[![License: MIT](https://img.shields.io/badge/License-MIT-blue.svg)](LICENSE.txt) [![VS Code](https://img.shields.io/badge/VS%20Code-%5E1.90.0-007ACC)](https://code.visualstudio.com/)

[English](README.md) | **简体中文**

</div>

## 简介

一个 VS Code 扩展，告诉 AI 编程 Agent 你正在看代码的哪个位置——哪个文件、光标在哪、选中了什么。

扩展把这份上下文发布到磁盘上的一个固定路径，所以任何能读文件的 Agent 都能取到它。推荐的方式是通过内置的 skills 来消费：它们很轻量，而且任何支持 [Agent Skills](https://agentskills.io) 格式的 Agent 都能用。

## 快速开始

**1. 安装 VS Code 扩展**——从 Marketplace 安装，开发阶段也可以从 VSIX 装（见[打包](#打包)）。

**2. 安装 skills**

```bash
npx skills add DBinK/youarehere -g
```

`-g` 会装到你用户级的 skills 目录，覆盖它能检测到的所有受支持的 Agent。不加 `-g` 则装进当前项目。如果 `skills` 装不了，让你的 Agent 从 https://github.com/DBinK/youarehere 安装这个 skill。

**3. 让你的 Agent 看你的代码**

在 VS Code 里选中几行，然后在 Agent 里敲 `/youarehere`，后面接上你的问题。以 [Codex](https://github.com/openai/codex) 为例：

```text
> /youarehere 这个循环为什么跳过最后一个元素？

  读了 src/parser.ts:42-58。循环上界是 `i < len - 1`，
  所以最后一个元素永远访问不到。
```

不用打文件名，也不用粘贴代码。Agent 读 `~/.youarehere/ref.json` 拿到你的位置，自己去读那几行。

内置两个 skill：

| Skill | 调用方式 | 行为 |
| --- | --- | --- |
| `youarehere` | 仅 `/youarehere` | 读取你当前位置的代码，然后作答 |
| `youarehere-full` | 自动触发，或 `/youarehere-full` | 下面的完整状态，以及怎么读它 |

`youarehere` 刻意不做自动触发——它是给你想明确地让 Agent 看你的选区时用的。

## 上下文文件

扩展把两个文件写进一个固定目录，权限都是 `0600`。

### `~/.youarehere/ref.json`

最小的可用视图——一个引用，足够 Agent 知道你在哪：

```json
{
  "ref": "/path/to/workspace/src/example.ts:10-16",
  "isDirty": false,
  "updatedAt": "2026-09-18T06:28:23.746Z"
}
```

`ref` 是绝对路径。最后一个冒号后面的内容，要么是行号区间（`10-16`），要么是单个行号（`42`，表示没有选中任何内容）。

### `~/.youarehere/context.json`

完整状态，给需要的不止一个引用的消费方——`youarehere-full` 读的就是它：

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

行号和列号都是 1-based。

没有选中任何内容时，`selection` 是一个零宽区间——`startLine == endLine` 且 `startCharacter == endCharacter`。它永远不为 `null`。

缓冲区有未保存改动时 `isDirty` 为 `true`，此时磁盘上的文件可能和屏幕上看到的不一致。

## 工作原理

- 编辑器状态变化时，VS Code 扩展会写两个文件：三字段的引用写进 `~/.youarehere/ref.json`，完整状态写进 `~/.youarehere/context.json`。
- 两个文件的权限都是 `0600`。
- 消费方直接读这些文件。

## 环境要求

- VS Code 正在运行，且装了本扩展。
- 消费方与 VS Code 运行在同一台机器上。

## 更新时机

- VS Code 启动后
- 活动编辑器切换时
- 选区变化时
- 工作区文件夹变化时

## 多窗口

上下文文件只有一条固定路径，所以多个 VS Code 窗口会互相覆盖——最后写入的那个生效。`workspace` 和你的工作目录之间有差异大多是正常的（子目录、或某个 worktree）；只有完全不相干的项目才说明数据来自另一个窗口。

## 打包

```bash
npm install
npx vsce package --no-dependencies
```

这会生成 `youarehere-<version>.vsix`。本地安装：

```bash
code --install-extension youarehere-<version>.vsix --force
```

`skills/` 目录会随 VSIX 一起打包。`notes/` 被 `.vscodeignore` 排除。

## 许可证

MIT

## 致谢

灵感来自 [yuichisuzuki0601/active-context-mcp](https://github.com/yuichisuzuki0601/active-context-mcp)。
