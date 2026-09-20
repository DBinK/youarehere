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

## 发版

开发者说「发版」时，Agent 按这个顺序做，商店上传留给人：

1. **定版本号**：按上一节的 semver 规则决定 bump 到哪一档（破坏性 → minor，修复、重构、文档 → patch），改 `package.json`、`package-lock.json`、两个 `skills/*/SKILL.md` 的 `metadata.version`。四个文件用 `npm version <x.y.z> --no-git-tag-version` 加手工改 SKILL.md
2. **落 CHANGELOG**：把 `[Unreleased]` 攒的条目落到 `## [x.y.z] - YYYY-MM-DD`（当天日期），两语言都改，顶部留一个空的 `[Unreleased]`，底部补该版本的比较链接
3. **过门禁**：`npm run package` 后确认 VSIX 清单里没有 `skills/` 与 `AGENTS.md`；`npx skills-ref validate ./skills/here ./skills/youarehere`；五处版本号一致
4. **合并到 main**：`git switch main && git merge --no-ff <分支>`，不用 rebase，推送 main
5. **打 tag 并推送**：`git tag vX.Y.Z && git push origin vX.Y.Z`。tag 打在 main 上，也就是发出去的源码状态
6. **在 main 上构建**：`npm run package`，产物 `youarehere-X.Y.Z.vsix`。构建要在 tag 之后，产物才对得上 tag
7. **建 GitHub release**，notes 取该版本的 CHANGELOG 段：
   ```bash
   V=X.Y.Z
   awk -v v="$V" 'index($0, "## [" v "]") == 1 {f=1; next} /^## \[/ {f=0} f' CHANGELOG.md > /tmp/notes.md
   gh release create "v$V" "youarehere-$V.vsix" --title "v$V" --notes-file /tmp/notes.md
   ```
   v0.2.1 及更早的 release 只有自动生成的 PR 列表、没挂产物；从 0.3.0 起 notes 用 CHANGELOG 段并附上 VSIX
8. **商店由人工上传**：Marketplace 与 Open VSX 的命令、令牌见 README 的「发布」一节。Agent 不执行 `vsce publish` 与 `ovsx publish`，也不碰这两个令牌

发完版回到分支继续干活，版本号已经在 main 上，后续改动按下一档继续 bump。

## 状态文件

- `~/.youarehere/context.json` 与 `ref.json` 由扩展写，两个都带 `extensionVersion` 与 `isDirty`
- `schema` 保持 `youarehere/v1`。新增字段算向后兼容，读取方忽略不认识的键
- 字段顺序：`extensionVersion` 固定放在最后，其余顺序不动，两份 README 与两个技能的示例同步
- `extensionVersion` 取扩展自己的 `package.json` 版本，不要写死，它是技能判断自己是否落后的唯一依据
- 扩展侧不检测已装 skills，也不读它们的版本：两者捆绑使用，不存在只装其一的情况。扩展只在每次安装后首次激活时提示一次命令，判据是扩展目录的安装时间（`fs.statSync(context.extension.extensionPath).mtimeMs`）而不是版本号，重装同一个版本也会弹；按钮不分首次还是重装，一律先 `npx skills remove` 清掉退场的旧技能名，再 `npx skills add` 装回来。两条命令的 `-g` 必须一致：`skills remove` 默认项目作用域，少了它删不掉全局装的旧技能（全新安装时 remove 只是空操作）
- 改这两个文件的字段时，同步改两个技能里的 `Check the versions first` 段落与两份 README 的示例
- 提示没弹时这样查：读 profile 的 `state.vscdb`（键 `DBinK.youarehere`）里的 `youarehere.skills.promptedInstall`，和扩展目录 mtime 比对。相等 = 这次安装已处理；不等 = 该弹。扩展的诊断走 `log()`（「You Are Here」输出频道），落盘在 `logs/<session>/window*/exthost/output_logging_*/<n>-You Are Here.log`，排障直接看它；`console.log` 的输出不会进 `exthost.log`（默认级别过滤），别指望

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
- 改名或删除 skill 属于对外破坏性变更：bump 版本，CHANGELOG 记 `**Breaking:**`，并给出完整迁移序列。实测 `npx skills update` 不会清理改名后遗留的旧名字，旧技能会留在 Agent 的 skills 目录里继续触发
- 不再使用的旧名字必须加进 `extension.js` 的 `RETIRED_SKILL_NAMES`；被新技能复用的旧名字留在 `SKILL_NAMES`（更新按钮按 `SKILL_NAMES + RETIRED_SKILL_NAMES` 一起删）。提示里的更新按钮（中文「立即更新」/英文 Update skills now）先执行 `npx skills remove` 再 `npx skills add`，靠这两份列表清理遗留技能

## 提交与 PR

- 提交信息用 Conventional Commits，破坏性变更加 `!`。例：`refactor(skills)!: 技能改名为 here 与 youarehere`
- 发布动作单独一个提交。例：`chore(release): 发布 0.3.0 并落实 CHANGELOG`
- PR 描述按 `概述`、`主要变更`、`破坏性变更`、`验证` 组织。验证一节写实际跑过的命令和结果
- 分支从最新 main 切出，集成分支与同步上游默认用 merge，不用 rebase

## 验证

- 版本一致性：每次 bump 后核对 `package.json`、`package-lock.json`、两个 `SKILL.md` 的 `metadata.version`、两个 CHANGELOG 的版本段，五处必须相同
- 扩展改动：`npm install && npm run package`，检查 `youarehere-<version>.vsix` 的文件清单，`skills/` 与 `AGENTS.md` 都不应出现
- 扩展逻辑改动：另用 stub 的 `vscode` 模块跑一遍 `activate`，检查 `context.json` 与 `ref.json` 的字段、模态提示的三个按钮行为（Update skills now 建终端并 `sendText`，Copy command 调 `env.clipboard.writeText` 且内容不带 `-y`（两种按钮给出的两条命令都带 `-g`），关闭按钮由 VS Code 自己补（扩展不传 `isCloseAffordance`），它不记录因而不算回答）、中英两套文案（`vscode.env.language` 以 `zh` 开头用中文，其余用英文）与 `log()` 写入的输出频道行、以及提示是否每次安装后只触发一次（判据是扩展目录 mtime，见上）。stub 需要覆盖 `window`（含 `createTerminal`）、`workspace`、`env.clipboard` 与 `globalState`（用 Map 模拟），`os.homedir` 指向临时目录以免写到真实状态文件，扩展目录用临时目录以便用 `fs.utimesSync` 模拟重装
- skill 改动：`skills-ref validate` 加真实安装一次
- 文档改动：核对示例与实现一致，核对链接能打开
- 发布流程（两个市场、token、发布命令）见 README 的「开发」一节里的「发布」，这里不重复
