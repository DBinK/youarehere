<div align="center">

# You Are Here

**一个 VS Code 扩展，告诉 AI 编程 Agent 你正在看代码的哪个位置。**

[![Stars](https://img.shields.io/github/stars/DBinK/youarehere)](https://github.com/DBinK/youarehere/stargazers)
[![Version](https://vsmarketplacebadges.dev/version-short/DBinK.youarehere.svg)](https://marketplace.visualstudio.com/items?itemName=DBinK.youarehere)
[![Installs](https://vsmarketplacebadges.dev/installs-short/DBinK.youarehere.svg)](https://marketplace.visualstudio.com/items?itemName=DBinK.youarehere)
[![License](https://img.shields.io/github/license/DBinK/youarehere)](https://github.com/DBinK/youarehere/blob/main/LICENSE)
[![Agent Skills](https://img.shields.io/badge/Agent%20Skills-compatible-blueviolet)](https://agentskills.io)

[English](README.md) | **简体中文**

</div>

## 简介

AI 编程 Agent 能读项目里的任何文件，却不知道你当前打开的是哪一个。要手动补上这个信息，就需要提供文件路径和行号区间，或者把代码粘贴过去。

这个扩展把当前文件、光标位置和选区写到一个固定路径，Agent 可以直接读。推荐用法是内置的两个 skill，它们遵循 [Agent Skills](https://agentskills.io) 格式，Codex、Cursor、Gemini CLI、opencode、GitHub Copilot、Cline、Windsurf、Zed 等约 70 个 Agent 都能用。

## 快速开始

1. **安装 VS Code 扩展**——从 [Visual Studio Marketplace](https://marketplace.visualstudio.com/items?itemName=DBinK.youarehere) 或 [Open VSX](https://open-vsx.org/extension/DBinK/youarehere) 安装，开发阶段也可以从 VSIX 装（见[开发](#开发)）。

2. **安装 skills**

   ```bash
   npx skills add DBinK/youarehere -g
   ```

   `-g` 会装进检测到的每个受支持 Agent 的用户级 skills 目录；不加则装进当前项目。如果 `skills` 装不了，让 Agent 从 https://github.com/DBinK/youarehere 安装。

3. **让 Agent 读取选区**

   在 VS Code 里选中代码，把 `/youarehere` 和问题一起发给 Agent。以 [Codex](https://github.com/openai/codex) 为例：

   ```text
   > /youarehere 这个循环为什么跳过最后一个元素？

     读了 src/parser.ts:42-58。循环上界是 `i < len - 1`，
     所以最后一个元素永远访问不到。
   ```

   Agent 从 `~/.youarehere/ref.json` 拿到位置，自己去读那几行。

## 内置 skill

| Skill | 调用方式 | 行为 |
| --- | --- | --- |
| `youarehere` | 仅 `/youarehere` | 读取选区处的代码，然后作答 |
| `youarehere-full` | 自动触发，或 `/youarehere-full` | 完整状态，以及怎么读它 |

`youarehere` 只在按名字调用时运行，用来让 Agent 直接看你选中的代码。

## 上下文文件

扩展把两个文件写进固定目录，权限都是 `0600`。

编辑器状态变化时两个文件都会重写：启动后、活动编辑器切换时、选区变化时、工作区文件夹变化时。

### `~/.youarehere/ref.json`

最精简的接口，只有一个引用，够 Agent 定位：

```json
{
  "ref": "/path/to/workspace/src/example.ts:10-16",
  "isDirty": false,
  "updatedAt": "2026-09-18T06:28:23.746Z"
}
```

`ref` 是绝对路径。最后一个冒号后面，要么是行号区间（`10-16`），要么是单个行号（`42`，表示没有选中任何内容）。

### `~/.youarehere/context.json`

完整状态。需要的信息比一个引用更多时读它，`youarehere-full` 用的就是这个。

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

没有选中内容时，`selection` 是一个零宽区间：`startLine == endLine` 且 `startCharacter == endCharacter`。它不会是 `null`。

缓冲区有未保存的改动时 `isDirty` 为 `true`，此时磁盘上的文件可能和屏幕上看到的不一致。

## 多窗口

状态文件只有一个固定路径，多个 VS Code 窗口同时开着会互相覆盖。最后改动编辑器状态的那个窗口生效，切换活动编辑器、移动光标或选区都算，只切换窗口焦点则不会更新文件。`workspace` 和读取方的工作目录不一致通常没问题，两者往往是父子目录或 worktree 的关系。只有指向两个不相干的项目时才需要核对。

## 环境要求

- VS Code 正在运行，并且装了本扩展。
- 读取方与 VS Code 运行在同一台机器上。

## 开发

所有源码都在 `extension.js`。构建扩展：

```bash
npm install
npm run package
```

这会生成 `youarehere-<version>.vsix`。本地安装：

```bash
code --install-extension youarehere-<version>.vsix --force
```

`skills/` 目录会随 VSIX 一起打包。

### 发布

每个版本同时发到 Visual Studio Marketplace 和 Open VSX。两个命令都从环境变量读令牌，先导出。

```bash
export VSCE_PAT=<azure-devops-pat>   # 需要 Marketplace > Manage 权限
export OVSX_PAT=<open-vsx-token>
```

然后发布：

```bash
npm run publish:vsce
npm run publish:ovsx
```

两个命令都会从源码打包再上传。首次发布前，Marketplace 上的 `DBinK` publisher 和 Open VSX 上的 `DBinK` namespace 必须已存在。Open VSX 建 namespace 用 `npx ovsx create-namespace DBinK -p "$OVSX_PAT"`。发布工具需要 Node.js 22 或更高版本。

## 致谢

灵感来自 [yuichisuzuki0601/active-context-mcp](https://github.com/yuichisuzuki0601/active-context-mcp)。

## 许可证

MIT
