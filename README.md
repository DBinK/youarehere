<div align="center">

<img src="images/here.png" alt="You Are Here logo" width="180">

# You Are Here

**一个 VS Code 扩展，把你 IDE 里选中的代码交给终端里的 CLI Agent。**

[![Stars](https://img.shields.io/github/stars/DBinK/youarehere)](https://github.com/DBinK/youarehere/stargazers)
[![Version](https://vsmarketplacebadges.dev/version-short/DBinK.youarehere.svg)](https://marketplace.visualstudio.com/items?itemName=DBinK.youarehere)
[![Installs](https://vsmarketplacebadges.dev/installs-short/DBinK.youarehere.svg)](https://marketplace.visualstudio.com/items?itemName=DBinK.youarehere)
[![License](https://img.shields.io/github/license/DBinK/youarehere)](https://github.com/DBinK/youarehere/blob/main/LICENSE)
[![Agent Skills](https://img.shields.io/badge/Agent%20Skills-compatible-blueviolet)](https://agentskills.io)

**简体中文** | [English](README.en.md)

</div>

## 简介

AI 编程 Agent 能读项目里的任何文件，却不知道你当前打开的是哪一个。要手动补上这个信息，就需要提供文件路径和行号区间，或者把代码粘贴过去。

这个扩展把当前文件、光标位置和选区写到一个固定路径，Agent 可以直接读。推荐用法是内置的两个 skill，它们遵循 [Agent Skills](https://agentskills.io) 格式，Codex、Cursor、Gemini CLI、opencode、GitHub Copilot、Cline、Windsurf、Zed 等约 70 个 Agent 都能用。CLI Agent 最需要它——它们看不到你的编辑器，而窗口内的 Agent 本来就能自己拿到选区。

## 快速开始

1. **安装 VS Code 扩展**——从 [Visual Studio Marketplace](https://marketplace.visualstudio.com/items?itemName=DBinK.youarehere) 或 [Open VSX](https://open-vsx.org/extension/DBinK/youarehere) 安装，开发阶段也可以从 VSIX 装（见[开发](#开发)）。

2. **安装 skills**

   ```bash
   npx skills add DBinK/youarehere -g
   ```

   `-g` 会装进检测到的每个受支持 Agent 的用户级 skills 目录；不加则装进当前项目。如果 `skills` 装不了，让 Agent 从 https://github.com/DBinK/youarehere 安装。

   扩展与 skills 用同一个版本号。每次安装后首次启动会弹一次模态提示（重装同一个版本也算）：点「立即更新」在终端里跑 `npx skills remove` 与 `npx skills add`（先清掉改名遗留的旧技能再装回来），点「复制命令」把命令去掉 `-y` 放进剪贴板（装到哪些 Agent 由你确认，中文界面下的按钮文案就是这样，英文界面是 Update skills now 与 Copy command），点「取消」（VS Code 自己补的关闭按钮）或直接关掉则下次启动再问；提示正文里带 CHANGELOG 链接。提示按编辑器的显示语言切换中英：`vscode.env.language` 以 `zh` 开头（简体 `zh-cn` 等）就弹中文，其余弹英文。两个技能在版本对不上时也会先要求你更新，再继续。

3. **让 Agent 读取选区**

   在 VS Code 里选中代码，把 `/here` 和问题一起发给 Agent。以 [Codex](https://github.com/openai/codex) 为例：

   ```text
   > /here 这个循环为什么跳过最后一个元素？

     读了 src/parser.ts:42-58。循环上界是 `i < len - 1`，
     所以最后一个元素永远访问不到。
   ```

   Agent 从 `~/.youarehere/ref.json` 拿到位置，自己去读那几行。

## 内置 skill

| Skill | 调用方式 | 行为 |
| --- | --- | --- |
| `here` | 仅 `/here` | 读取选区处的代码，然后作答 |
| `youarehere` | 自动触发，或 `/youarehere` | 完整状态，以及怎么读它 |

`here` 只在按名字调用时运行，用来让 Agent 直接看你选中的代码。

## 上下文文件

扩展把两个文件写进固定目录，权限都是 `0600`。

编辑器状态变化时两个文件都会重写：启动后、活动编辑器切换时、光标或选区变化时、当前文件保存或内容变更时、工作区文件夹变化时。

### `~/.youarehere/ref.json`

最精简的接口，只有一个引用，够 Agent 定位：

```json
{
  "ref": "/path/to/workspace/src/example.ts:10-16",
  "isDirty": false,
  "updatedAt": "2026-09-18T06:28:23.746Z",
  "extensionVersion": "0.3.0"
}
```

`ref` 是绝对路径。最后一个冒号后面，要么是行号区间（`10-16`），要么是单个行号（`42`，表示没有选中任何内容）。

### `~/.youarehere/context.json`

完整状态。需要的信息比一个引用更多时读它，`youarehere` 用的就是这个。

```json
{
  "schema": "youarehere/v1",
  "extensionVersion": "0.3.0",
  "workspace": "/path/to/workspace",
  "file": "/path/to/workspace/src/example.ts",
  "relativeFile": "src/example.ts",
  "isDirty": false,
  "cursor": {
    "line": 17,
    "character": 1
  },
  "activeLineText": "}",
  "selection": {
    "startLine": 10,
    "startCharacter": 1,
    "endLine": 17,
    "endCharacter": 1
  },
  "updatedAt": "2026-09-18T06:28:23.746Z",
  "extensionVersion": "0.3.0"
}
```

行号和列号都是 1-based。

没有选中内容时，`selection` 是一个零宽区间：`startLine == endLine` 且 `startCharacter == endCharacter`。只有当没有活动的文本编辑器时（比如焦点在欢迎页或 webview 上）它才是 `null`。

区间和 VS Code 一样是左闭右开的：选区停在一行行首时 `endCharacter` 为 `1`，该行上没有任何内容被选中。上面 `selection` 的 `end` 落在第 17 行行首，所以实际选中到第 16 行为止，`ref` 读作 `10-16`，原因就在这里。

缓冲区有未保存的改动时 `isDirty` 为 `true`，此时磁盘上的文件可能和屏幕上看到的不一致。

两个文件都带 `extensionVersion`，记录写入它们的是哪个扩展版本。内置 skill 拿它和自己的 `metadata.version` 对比，对不上时先要求你更新 skills 再继续。扩展本身不做检测：每次安装后首次启动提示一次，判据是扩展目录的安装时间而不是版本号，所以重装同一个版本也会再提示；首次安装只给安装命令，重装再补一条清理旧技能名的命令。

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

`skills/` 目录不随 VSIX 打包，按[快速开始](#快速开始)里的方式从仓库安装。

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
