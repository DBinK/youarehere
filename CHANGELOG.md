# 更新日志

本项目所有值得记录的变更都写在这里。

格式遵循 [Keep a Changelog](https://keepachangelog.com/en/1.1.0/)，版本号遵循[语义化版本](https://semver.org/spec/v2.0.0.html)。

**简体中文** | [English](CHANGELOG.en.md)

## [Unreleased]

## [0.3.0] - 2026-09-20

### Changed

- 把 `README.md` 换成中文版，英文移到 `README.en.md`，仓库首页与 VS Code 市场页面因此默认显示中文
- **Breaking:** 把 `youarehere` 技能改名为 `here`，`youarehere-full` 技能改名为 `youarehere`，现在 `youarehere` 指的是自动触发的那个技能。`/youarehere` 原本用于读取当前选区处的代码，`/youarehere-full` 读完整状态，改名后两者分别是 `/here` 与 `/youarehere`。用 `npx skills add DBinK/youarehere -g` 重装，并移除旧的 `youarehere-full`，否则两个技能同名并存

### Fixed

- 修正两份 README 中 `context.json` 示例的 `cursor` 与 `activeLineText`，让示例与紧随其后的左闭右开选区规则一致

## [0.2.1] - 2026-09-18

### Added

- 两份 README 都加上扩展 logo

## [0.2.0] - 2026-09-18

### Added

- `youarehere-full` 技能补充左闭右开的坐标规则，整行选区不再让 Agent 多读一行
- 状态文件写不进去时（例如 home 目录只读）给出提示，不再让扩展激活失败

### Changed

- 状态文件改为先写临时文件再重命名，读取方不会看到写了一半的 `context.json` 或 `ref.json`
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
