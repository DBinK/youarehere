# AGENTS.md

本仓库的工作约定。改扩展代码、改 skill、写文档都适用。

## 合入 main 前 bump 版本号

- 任何改动交付物的 PR，都要在合入 main 之前 bump 版本，不要留到合并之后补
- 要改的是四个地方：`package.json`、`package-lock.json`，以及两个 `skills/*/SKILL.md` 的 `metadata.version`
- 技能版本跟随扩展版本，不单独编号。`metadata.version` 必须与 `package.json` 一致，bump 时一起改，不要只改一边
- 前两个文件用 `npm version <x.y.z> --no-git-tag-version` 改，避免顺手打出 tag
- 版本号按 semver。当前处于 0.x：
  - 破坏性变更（skill 改名或删除、状态文件路径或 schema 变化）→ minor，例如 0.2.1 → 0.3.0
  - 修复、重构、文档 → patch
- skill 不在 VSIX 里，改 skill 不改变扩展产物，但版本号照样 bump。skill 是仓库交付给用户的接口

## CHANGELOG.md

- 用 Keep a Changelog 的分类：`Added`、`Changed`、`Fixed`、`Removed`
- 平时把改动写进 `[Unreleased]`。bump 版本时落成 `## [x.y.z] - YYYY-MM-DD`，并在顶部留一个空的 `[Unreleased]`
- 破坏性条目以 `**Breaking:**` 开头，写清用户要做什么，例如重装 skill、删掉旧名字
- 每条以过去式动词开头，写用户能观察到的行为，不写内部实现
- 底部比较链接同步维护。`[Unreleased]` 指向上一个 tag 到 HEAD，每个已发布版本都有对照链接
- 每个发布版本都要有对应 tag。tag 缺失时链接就是 404，不要长期缺着

## skills/

- 位置 `skills/<name>/SKILL.md`，遵循 Agent Skills 格式
- frontmatter 的 `name` 必须与目录名完全一致，只能用小写字母、数字、连字符
- frontmatter 字段固定这几项，与仓库现状保持一致：
  - `description`：写清做什么、什么时候用，这是触发机制，改它要谨慎
  - `license: MIT`
  - `compatibility`：写清技能的前提，即本机运行 "You Are Here" 扩展（ID `DBinK.youarehere`），并写明最低 VS Code 版本。对用户提起扩展时用市场显示名加 ID，因为市场与 VS Code 扩展面板里显示的是 `displayName`，不是 `youarehere`
  - `metadata.author: DBinK`
  - `metadata.version`：跟随扩展版本，与 `package.json` 相同
- 不用 `allowed-tools`：规范标注为 experimental，各客户端解释不一致
- 改完先校验：`npx skills-ref validate ./skills/<name>`
- 再真装一次确认名字派生正确：`npx skills add <仓库路径>`，本地路径即可，不必先推送
- `skills/` 不进 VSIX（见 `.vscodeignore`），用户通过 `npx skills add DBinK/youarehere -g` 安装
- 改名或删除 skill 属于对外破坏性变更：bump 版本，CHANGELOG 记 `**Breaking:**`，条目里给出重装和清理旧 skill 的命令

## 提交与 PR

- 提交信息用 Conventional Commits，描述写中文，破坏性变更加 `!`。例：`refactor(skills)!: 技能改名为 here 与 youarehere`
- 发布动作单独一个提交。例：`chore(release): 发布 0.3.0 并落实 CHANGELOG`
- PR 描述按 `概述`、`主要变更`、`破坏性变更`、`验证` 组织。验证一节写实际跑过的命令和结果
- 分支从最新 main 切出，集成分支与同步上游默认用 merge，不用 rebase

## 验证

- 版本一致性：每次 bump 后核对 `package.json` 与两个 `SKILL.md` 的 `metadata.version`，三处必须相同
- 扩展改动：`npm install && npm run package`，检查 `youarehere-<version>.vsix` 的文件清单，`skills/` 与 `AGENTS.md` 都不应出现
- skill 改动：`skills-ref validate` 加真实安装一次
- 文档改动：核对示例与实现一致，核对链接能打开
- 发布流程（两个市场、token、发布命令）见 README 的 Release 一节，这里不重复
