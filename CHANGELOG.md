# 更新日志

本项目所有值得记录的变更都写在这里。

格式遵循 [Keep a Changelog](https://keepachangelog.com/en/1.1.0/)，版本号遵循[语义化版本](https://semver.org/spec/v2.0.0.html)。

**简体中文** | [English](CHANGELOG.en.md)

## [Unreleased]

## [0.3.0] - 2026-09-20

### Added

- 装入或更新扩展后，首次启动弹一次提示：它带的两个 skills 单独安装，版本须与扩展一致。提示有两个按钮——「立即更新」在终端执行安装命令，「复制命令」把命令放进剪贴板；两个按钮都先清掉退场的旧技能名，再装回当前版本；点「取消」不算处理，下次启动仍会提示。重装同一版本同样会提示
- 提示文案跟随编辑器的显示语言：`vscode.env.language` 以 `zh` 开头（简体 `zh-cn` 等）用中文，其余用英文
- 两个状态文件新增 `extensionVersion` 字段，记录是哪个扩展版本写的

### Changed

- 把 `README.md` 与 `CHANGELOG.md` 换成中文版，英文分别是 `README.en.md` 与 `CHANGELOG.en.md`
- **Breaking:** 把 `youarehere` 技能改名为 `here`，`youarehere-full` 技能改名为 `youarehere`，现在 `youarehere` 是自动触发的那个。迁移要两步：先 `npx skills remove youarehere youarehere-full`，再 `npx skills add DBinK/youarehere -g`。只跑 `npx skills update` 不够，改名遗留的 `youarehere-full` 会留在目录里继续自动触发
- 两个技能在版本对不上时先停下：`extensionVersion` 缺失说明扩展低于 0.3.0，要求更新扩展；字段存在但不相等的才要求更新 skills，然后继续读代码

### Fixed

- 修正两份 README 与 `youarehere` 技能中 `context.json` 示例的 `cursor` 与 `activeLineText`

## [0.2.1] - 2026-09-18

### Added

- 两份 README 都加上扩展 logo

## [0.2.0] - 2026-09-18

### Added

- `youarehere-full` 技能补充左闭右开的坐标规则，整行选区不再让 Agent 多读一行
- 状态文件写不进去时（例如 home 目录只读）给出提示，不再让扩展激活失败

### Changed

- 状态文件改为原子写入，读取方不会看到写了一半的 `context.json` 或 `ref.json`
- `skills/` 目录不再随 VSIX 打包，技能改为从仓库用 `npx skills add` 安装
- 市场文案改为以 `IDE Selection to Your CLI Agent` 打头，配套修改描述与关键词，并更换扩展图标

### Fixed

- 修复选区结束于下一行行首时 `ref.json` 多引用一行的问题
- 修复保存当前文件后 `isDirty` 仍为旧值的问题
- 修复状态写入中途失败时在 `~/.youarehere` 残留 `.tmp` 文件的问题

## [0.1.0] - 2026-09-18

### Added

- 新增扩展，把当前文件、光标位置与选区写入 `~/.youarehere/context.json`，Agent 不必再被手动告知你在看哪里
- 新增 `~/.youarehere/ref.json`，给只需要 `path:lines` 引用的读取方一个精简视图
- 两个文件都带 `isDirty`，读取方能判断缓冲区是否有未保存改动
- 新增 `youarehere` 与 `youarehere-full` 两个技能，用 `npx skills add DBinK/youarehere -g` 安装
- 支持 VS Code 1.90 及以上

### Changed

- 扩展从 `active-context-mcp` 改名为 `youarehere`，发布者从 `ysd` 改为 `DBinK`
- 状态文件从 `os.tmpdir()/active-context-mcp/active-context.json` 移到 `~/.youarehere/context.json`

### Removed

- 移除内置的 MCP server。Agent 通过内置技能直接读状态文件，不再需要 MCP 客户端配置

[Unreleased]: https://github.com/DBinK/youarehere/compare/v0.3.0...HEAD
[0.3.0]: https://github.com/DBinK/youarehere/compare/v0.2.1...v0.3.0
[0.2.1]: https://github.com/DBinK/youarehere/compare/v0.2.0...v0.2.1
[0.2.0]: https://github.com/DBinK/youarehere/compare/v0.1.0...v0.2.0
[0.1.0]: https://github.com/DBinK/youarehere/releases/tag/v0.1.0
