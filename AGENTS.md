# AGENTS.md

本仓库的工作约定。改扩展代码、改 skill、写文档都适用。

## 语言

- 沟通、提交信息、PR 描述、CHANGELOG 条目用什么语言，跟随开发者当前使用的语言，不硬性规定中文或英文
- 仓库 README 与 CHANGELOG 都以中文为默认，英文分别是 `README.en.md` 与 `CHANGELOG.en.md`，两份顶部互链
- `README.md` 与 `CHANGELOG.md` 也是 VS Code 市场页面与 Changelog 标签显示的那两份
- 改其中一份时另一份一起改，不要只改一种语言

## 合入 main 前 bump 版本号

- 任何改动交付物的 PR，都要在合入 main 之前 bump 版本，不要留到合并之后补
- 要改的是四个地方：`package.json`、`package-lock.json`，以及两个 `skills/*/SKILL.md` 的 `metadata.version`
- 技能版本跟随扩展版本，不单独编号。`metadata.version` 必须与 `package.json` 一致，bump 时一起改，不要只改一边
- 前两个文件用 `npm version <x.y.z> --no-git-tag-version` 改，避免顺手打出 tag
- 版本号按 semver。当前处于 0.x：
  - 破坏性变更（skill 改名或删除、状态文件路径或 schema 变化）→ minor，例如 0.2.1 → 0.3.0
  - 修复、重构、文档 → patch
- skill 不在 VSIX 里，改 skill 不改变扩展产物，但版本号照样 bump。skill 是仓库交付给用户的接口

## CHANGELOG

- 两份文件：`CHANGELOG.md` 是中文，`CHANGELOG.en.md` 是英文，两份顶部互链
- 改一份必须同步另一份，不要留译文落后
- `CHANGELOG.md` 这个名字不能改，vsce 只认它，市场页面的 Changelog 标签读的就是它
- 六类标题两份都保留 Keep a Changelog 的英文写法：`Added`、`Changed`、`Fixed`、`Removed`、`Deprecated`、`Security`。只翻译条目正文
- 中文条目以「新增」「变更」「修复」「移除」这类动词开头，英文条目以过去式动词开头
- 平时把改动写进 `[Unreleased]`。bump 版本时落成 `## [x.y.z] - YYYY-MM-DD`，并在顶部留一个空的 `[Unreleased]`
- 破坏性条目以 `**Breaking:**` 开头，两份写法相同，写清用户要做什么，例如重装 skill、删掉旧名字
- 底部比较链接两份同步维护。`[Unreleased]` 指向上一个 tag 到 HEAD，每个已发布版本都有对照链接
- 每个发布版本都要有对应 tag。tag 缺失时链接就是 404，不要长期缺着

## 状态文件

- `~/.youarehere/context.json` 与 `ref.json` 由扩展写，两个都带 `extensionVersion` 与 `isDirty`
- `schema` 保持 `youarehere/v1`。新增字段算向后兼容，读取方忽略不认识的键
- 字段顺序：`extensionVersion` 固定放在最后，其余顺序不动，两份 README 与两个技能的示例同步
- `extensionVersion` 取扩展自己的 `package.json` 版本，不要写死，它是技能判断自己是否落后的唯一依据
- 扩展侧不检测已装 skills，也不读它们的版本：两者捆绑使用，不存在只装其一的情况。扩展只在每个版本首次激活时提示一次命令，首次给安装命令，之后给更新命令
- 改这两个文件的字段时，同步改两个技能里的 `Check the versions first` 段落与两份 README 的示例

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
- 改名或删除 skill 属于对外破坏性变更：bump 版本，CHANGELOG 记 `**Breaking:**`，并给出完整迁移序列。实测 `npx skills update` 不会清理改名后遗留的旧名字，旧技能会留在 Agent 的 skills 目录里继续触发，所以迁移序列必须写成先 `npx skills remove <旧名>` 再 `npx skills add DBinK/youarehere -g`

## 提交与 PR

- 提交信息用 Conventional Commits，破坏性变更加 `!`。例：`refactor(skills)!: 技能改名为 here 与 youarehere`
- 发布动作单独一个提交。例：`chore(release): 发布 0.3.0 并落实 CHANGELOG`
- PR 描述按 `概述`、`主要变更`、`破坏性变更`、`验证` 组织。验证一节写实际跑过的命令和结果
- 分支从最新 main 切出，集成分支与同步上游默认用 merge，不用 rebase

## 验证

- 版本一致性：每次 bump 后核对 `package.json`、两个 `SKILL.md` 的 `metadata.version`、两个 CHANGELOG 的版本段，四处必须相同
- 扩展改动：`npm install && npm run package`，检查 `youarehere-<version>.vsix` 的文件清单，`skills/` 与 `AGENTS.md` 都不应出现
- 扩展逻辑改动：另用 stub 的 `vscode` 模块跑一遍 `activate`，检查 `context.json` 与 `ref.json` 的字段、以及版本提示是否只在每个扩展版本触发一次。stub 需要覆盖 `window`、`workspace`、`env.clipboard`，`globalState` 用 Map 模拟，`os.homedir` 指向临时目录以免写到真实状态文件
- skill 改动：`skills-ref validate` 加真实安装一次
- 文档改动：核对示例与实现一致，核对链接能打开
- 发布流程（两个市场、token、发布命令）见 README 的「开发」一节里的「发布」，这里不重复
