# three-loop-workflow

为非平凡的软件变更提供严格的三循环工作流,以可移植的 Agent Skill 形式打包发布(可运行于 Claude Code、Codex 与 opencode)。

English version → [README.md](./README.md)

> **v2 相对 v1 是一次彻底重写,属于破坏性变更(breaking change)。** 如果你已经安装了 v1,请先阅读
> [从 v1 升级](#从-v1-升级) 再复制任何文件 —— 你必须**替换**整个文件夹,而不是往里复制。
> 变更内容与依据见 [docs/why-v2-cn.md](./docs/why-v2-cn.md)。

## 仓库内容

- **`three-loop-workflow/`** —— 把工作流落实为可执行流程的 Claude skill。把这个文件夹放进 Claude Code 或 Claude.ai,Claude 在处理任何非平凡代码改动时都会按照它执行。

skill 文件(`SKILL.md`、`references/`、`scripts/`)是唯一事实标准 —— 它们是 Claude Code 实际加载并执行的内容。短小的入口(`SKILL.md`)按需路由到分阶段的引用文件。

## 更新内容

[**v2.0.0 发布公告**](./docs/announcement-v2.0.0-cn.md) —— 简版,以及如何升级。
[**我们为什么重写**](./docs/why-v2-cn.md) —— 详版,附全部实测数据。
[**三轮修复上限合适吗?**](./docs/2026-07-31-round-cap-experiment-cn.md) —— 预注册、原始数据已提交,
结论是问题不在上限。
[**委派指导依据的是什么**](./docs/analysis-2026-09-17-orchestration-evidence.md) —— v2.7.0 编排指导背后的
每一个来源,连同日期、评级,以及哪些被刻意留在了外面(仅英文)。
完整的版本历史见 [CHANGELOG-cn.md](./CHANGELOG-cn.md)。

## 什么是三循环工作流

agent 类编码失败有共同模式:急于动手实现、悄悄选择默认值、跳过评审。这套工作流通过三个循环来防止这些失败 —— 并且让循环的**深度**与「这个变更能捅多大娄子」成正比。

| 循环 | 产出 |
|---|---|
| **Plan(计划)** | `.agent/<task>/plan.md` —— 目标、非目标、决策,以及分两半的 **Accept(验收)**:一条带退出码的命令,加上——只要变更会落在有人点击、输入或调用的地方——一个没读过代码的人也能照着走一遍的可观察结果 |
| **Build(构建)** | 编写 → 门禁 → 评审 → 分诊 → 修复,循环到 blocking 计数归零 |
| **Close(收尾)** | *(Deep 档)* 回答任何单个阶段都没问过的整体一致性问题 —— 另有一趟与深度无关的「当作产品通读」,凡是变更产出的东西会被整体阅读或整体运行的,都要跑 |

**深度是最先决定的,先于阅读任何其它内容。** 由两个问题决定:*如果这件事做错了,会波及多少?* 以及 *撤销它有多难?*

| 深度 | 适用场景 | 执行内容 |
|---|---|---|
| **Direct(直接)** | 影响面收敛且可逆 —— typo、注释、格式、局部重命名、没有 advisory 在背后的 patch 或 minor 依赖升级。绝不包括 major 版本升级、任何导出符号的重命名,以及会挪动规则的文档改动 | 直接改,跑门禁,结束 |
| **Standard(标准)** | 真实工作的默认档 —— 新功能、行为修复、重构、性能优化 | 计划简报 → 构建 → 门禁 → **一次**全新评审者的 diff 评审 → 修复 |
| **Deep(深度)** | 破坏已发布契约;仓库之外的不可逆效果;修改 load-bearing 文档中的规则;或仓库本身无法裁决、且其备选方案指向不同结构的决策 | 在 Standard 基础上,增加「先记录备选方案再选择」、分阶段构建,以及一次 Close —— 并**按触发它的那一条来缩放**:每条触发条件都点名了能抓住**它自己**那份风险的机制,以及可以不问自答直接砍掉的部分 |

有五条规则承担了大部分作用:

1. **开工之前,先把你的理解确认一遍。** 当 Goal 写下的那个「对请求的理解」本来可以是另一种时,就把这一句话连同 Accept 的可观察结果,摆到提出请求的人面前,然后等。Standard 变更没有 plan reviewer,所以它是最便宜的一道检查:检查这是不是**该做的**那个变更,而不是把错的东西正确地做出来。没有歧义的时候它不花钱:说一句你要做什么,然后接着做。
2. **门禁先于 agent。** 在派出任何评审者**之前**,先跑项目自己的 typecheck / lint / build / test。让 agent 去评价一段根本编译不过的代码毫无价值,而编译器是免费的。
3. **作者永远不评审自己的产出。** 这条绑定的是**身份**,不是调用方式。
4. **对准最可能出错的地方,并且先分诊、再计数。** 评审者按顺序被问:遇到预期之外的输入会怎样、它调用的东西**失败**时会发生什么、它假定了哪些关于 **diff 之外**代码的事实 —— 并且要求它报告一切。然后逐条对照它引用的代码,按顺序问两个问题:它是真的吗?它是这个变更的问题吗?点到已声明 Non-goal 的发现按名字否掉。收敛判定基于**已确认**的发现,绝不基于原始报告,也不基于评审者的结论性措辞。
5. **触及轮次上限即升级。** 每个阶段三轮修复。上限绝不会悄悄变成第四轮,也绝不降低门槛 —— 而一个改了代码却没改变已确认发现的轮次,会立刻升级上报,而不是把剩下的预算花完。

## 何时触发 skill

| 变更类型 | 深度 |
|---|---|
| 新功能、行为修复、性能优化、重构 | Standard |
| 破坏已发布契约;仓库之外的不可逆效果 —— 迁移已持久化的数据或配置、覆盖已存储的数据、花钱、发给第三方;修改 load-bearing 文档中的规则 | Deep |
| typo、注释、格式、文档重排、局部重命名、minor/patch 依赖升级 | Direct |
| 拿仓库当前的实际行为去核对项目指南(`AGENTS.md` / `CLAUDE.md`) | 与其它变更一样按深度门判定 —— 更正过期的命令或数字是 Direct,改动指南列为 load-bearing 的规则是 Deep。它永远是独立的一次任务,不嵌在别的变更里 |
| 评审一个不是你写的变更,在它落地之前 | 只评审 —— 跑门禁、一名全新评审者、分诊,然后把已确认的发现交给作者。不会闭合,因为你不负责修 |
| 关于现有代码如何工作的问答、不改代码的探索 | 不适用 |

在 Direct 与 Standard 之间犹豫时,选 Standard。在 Standard 与 Deep 之间犹豫时,Deep 的条件是一份**清单,不是感觉** —— 没有任何一条命中,Standard 就是正确答案。一个高风险的局部不会把整个变更升档;跑 Standard,然后单独把那个局部升级上报。

## 安装 skill

本 skill 是**「自包含」(self-contained)** 的 —— 不依赖外部插件、不需要配套 agent、不需要 hook。所有 subagent 与 Workflow 节点默认都运行在内置的默认 subagent 上;`phase.js` 支持按阶段覆盖模型。

### Claude Code

```bash
# 项目级:只在 <your-repo> 里生效
mkdir -p <your-repo>/.claude/skills
cp -r three-loop-workflow <your-repo>/.claude/skills/

# 用户级:跨所有项目生效
mkdir -p ~/.claude/skills
cp -r three-loop-workflow ~/.claude/skills/

# 确认落在正确的层级 —— 如果这个文件不存在,skill 不会被激活
test -f ~/.claude/skills/three-loop-workflow/SKILL.md && echo installed
```

`mkdir -p` 是必需的。如果 `skills/` 目录本来不存在 —— 这正是「跑过 Claude Code 但从未安装过任何
skill」的仓库的常见状态 —— `cp -r` 会把这个文件夹的**内容**拷进 `.claude/skills/`,`SKILL.md` 就落高了
一层。命令退出码是 0,不会有任何警告,skill 只是永远不会被激活。

或打包成单个可分发的 `.skill` 文件:

```bash
# 在仓库根目录执行(先删除旧包,避免残留已从 three-loop-workflow/ 删除的文件)
rm -f three-loop-workflow.skill && zip -r three-loop-workflow.skill three-loop-workflow/
# 产出 three-loop-workflow.skill —— Claude Code 可识别的 zip 包
```

带标签的发布(`v*`)也会通过 `.github/workflows/release.yml` 在 GitHub release 上附带一个预构建的
`.skill`,因此你可以直接下载而不必本地打包。

### 安装之后,在每个使用它的仓库里

把 `.agent/` 加进该仓库的 `.gitignore`。skill 会在那里为每个任务写一个目录,并假定它已被忽略;除此之外无需其它配置。

### Claude.ai

在 Skill 管理页上传打包好的 `.skill` 文件。

### 跨平台安装(Claude Code / Codex / opencode)

本 skill 遵循 agentskills.io 开放标准,因此同一份规范来源 `three-loop-workflow/` 文件夹可运行于三种运行时:

| 运行时 | 安装位置 |
|---|---|
| **Claude Code** | `.claude/skills/`(项目级)或 `~/.claude/skills/`(用户级) |
| **Codex** | `.agents/skills/`(或 `$HOME/.agents/skills/`) |
| **opencode** | 原生读取 `.claude/skills/` 与 `.agents/skills/` 两处 —— 无需单独安装 |

把文件夹复制到 `.claude/skills/` 与 `.agents/skills/` 即可覆盖全部三种运行时。纪律本身与运行时无关;只有 Workflow / subagent 编排属于 Claude Code 的加速层(acceleration layer)。在其它运行时上哪些能力会降级、以及该如何诚实地说明,见 `three-loop-workflow/references/platforms.md`。

## 从 v1 升级

**替换整个文件夹,不要往里合并。** v1 与 v2 只有两个文件名相同 —— `SKILL.md` 和 `references/platforms.md`。把 v2 覆盖到已有的 v1 安装上,只会覆盖这两个,**另外 18 个 v1 文件**会原地残留(`loop-1-design.md`、`l3-phase.js`、`check-consistency.sh` 等等)。没有任何东西会路由到它们,但某个 agent 只要 grep 这个 skill 目录,就会找到并读到本版本已经废弃的规则。

```bash
# Claude Code,用户级
rm -rf ~/.claude/skills/three-loop-workflow
cp -r three-loop-workflow ~/.claude/skills/

# 或者等价地
rsync -a --delete three-loop-workflow/ ~/.claude/skills/three-loop-workflow/
```

需要知道的几件事:

- **你的 `CLAUDE.md` anchor map 不用改,继续有效。** 五个角色名完全一致,其中只有两个会改变 skill 的行为(见下文)。如果你还维护 `AGENTS.md`,
  v2 也会一并读取 —— 见下文。
- **`docs/design/` 与 `docs/implementation/` 不再产出。** v2 为每个任务写一个受 gitignore 的目录 ——
  `.agent/<task>/plan.md`,以及该任务需要的其它文件。请把 `.agent/` 加进你的 `.gitignore`。
  已有归档留着或删掉都行,没有任何东西会读它们。
- **门禁脚本已移除。** v1 随包发布了 `check-consistency.sh`、`validate-commit-msg.sh` 与
  `check-workflow-syntax.sh`;v2 只保留最后一个,并移到了 `scripts/`。如果你的 `settings.json` 把
  `validate-commit-msg.sh` 配成了提交 hook,请删掉那个条目 —— 指向不存在命令的 hook 会在每次提交时报错。
- **术语变了。** L1/L2/L3/F → Plan/Build/Close;Full/Light/None → Deep/Standard/Direct;
  severe/general → blocking/non-blocking。任何引用了旧术语的项目文档都需要同步更新。

继续留在 v1 是可行的,只是它不再演进:`git checkout v1.14.0`,或从 v1.14.0 release 下载 `.skill`。
该版本不会再有任何改动。

## 项目接入(每个仓库一次)

**你什么都不必做。** skill 会读取仓库的项目指南 —— `AGENTS.md`、`CLAUDE.md`,或两者都有 —— 而绝大多数指南都是无结构的散文,这正是它面向的常态:它读你的指南,从中取走它需要的东西,门禁命令、指南视为契约的文件、它写下的规范。当它需要的某样东西在指南里无家可归时,它会从仓库里推导出来 —— 门禁命令来自构建配置与 CI workflow,契约文件来自谁依赖它们 —— 并用一行说明它推断了什么、依据是什么。角色缺失从来不意味着它所支撑的规则可以跳过。

可选的精细化做法是:skill 引用这些东西用的是**角色(role)** 而不是字面 heading 名,因此在指南顶部放一份按角色命名各章节的 **anchor map**,可以让它的角色引用直接解析,而不必再去推断。如果你要写一份,值得写准的是两个角色,因为只有这两个会改变 skill 的行为:

| 角色 | 承载内容 | v2 是否使用 |
|---|---|---|
| `_load-bearing-docs_` | 受完整循环保护的契约文件清单 | **是** —— 它决定 Deep 档判定,并把删除其中文件设为需先询问 |
| `_common-commands_` | 具体的 typecheck / lint / build / test 命令 | **是** —— 门禁在派出任何评审者之前执行这些命令 |
| `_engineering-norms_` | 项目级编码规范 | 仅作为示例被提及;没有任何规则依据它分支判断,但 `maintenance.md` 会把沉淀下来的规范归档到这里 |
| `_repo-workflow_` | 本仓库的任务流程 | 未被引用 |
| `_language-policy_` | 语言和术语规则 | 未被引用 |

另外三个是 anchor map 约定的一部分,对其它工具和人类读者也有用,但没有任何规则依据它们分支判断 —— `maintenance.md` 只会把沉淀下来的规范归档到 `_engineering-norms_` 下。另外,skill 不会在一次变更进行到一半时去重构你的指南:写 anchor map 是在改一个契约文件,所以那是它自己的一次 Deep 变更,会在当前这次变更落地之后,作为一个单独的任务提出来。

项目指南顶部的 anchor map 示例:

```markdown
<!-- Anchor map (required by three-loop-workflow skill) -->
- _repo-workflow_       → "## Development Workflow"
- _load-bearing-docs_   → "## Load-Bearing Documents"
- _language-policy_     → "## Language Policy"
- _common-commands_     → "## Common Commands"
- _engineering-norms_   → "## Engineering Norms"
```

skill 从不写死文件名。它会读取 `AGENTS.md`、`CLAUDE.md` 或两者 —— 如果你两个都留,常见分工是把共用规则放 `AGENTS.md`、运行时相关规则放 `CLAUDE.md`,而 skill 会两个都读,不会二选一。

## 仓库结构

```
.
├── three-loop-workflow/              skill 本体(唯一事实标准)
│   ├── SKILL.md                      始终加载:先是深度判定,然后是路由表
│   ├── references/
│   │   ├── plan.md                   计划文件、事实与决策之分、spike、计划评审
│   │   ├── build.md                  编写 → 门禁 → 评审 → 分诊 → 修复;诊断;flaky
│   │   ├── orchestration.md          把实现工作交给另一个 agent:下简报、验证它报回来的结果、
│   │   │                             并发写入者的 worktree,以及把 Build 循环当脚本运行
│   │   ├── close.md                  收尾:孤儿清理、影响半径、迁移验证、拿实际落地的东西重读
│   │   │                             Rollback,以及当作产品通读
│   │   ├── maintenance.md            把任务 journal 折回项目指南的维护 pass
│   │   ├── escalation.md             何时以及如何上报;死锁报告
│   │   └── platforms.md              各运行时,以及离开 Claude Code 后哪些能力降级
│   └── scripts/
│       ├── phase.js                  把 Build 循环写成确定性的 Workflow 脚本
│       └── check-workflow-syntax.sh  解析 Workflow 脚本(node --check 做不到)
├── tests/                            gate-fixtures/ 供语法门禁使用(确定性、零成本),以及
│                                     probe.js —— 按需运行的对照臂仪器,用来问「这条规则
│                                     到底有没有改变模型的行为」
├── docs/
│   ├── announcement-v2.0.0-cn.md     发布公告
│   ├── why-v2-cn.md                  重写全过程的长文
│   ├── 2026-07-31-round-cap-*.md     文档形态的 Deep 变更能在三轮内收敛吗?
│   ├── analysis-2026-09-17-*.md      v2.7.0 的委派指导依据的是什么:每个来源连同日期与评级,
│   │                                 以及哪些被留在了外面
│   ├── measurements/                 预注册与原始产物,已提交,好让数字能被重算而不是被相信
│   └── design/、implementation/       已冻结的 v1 每任务归档 —— 历史记录,不代表当前行为
├── README.md                         英文说明
├── README-cn.md                      本文件
├── CHANGELOG.md                      完整版本历史
└── CHANGELOG-cn.md                   中文版本历史
```

## 修改本工作流

这个 skill **按其自身定义就是 load-bearing 的**。修改 `SKILL.md` 或任何 `references/*.md` 都是在改动契约文件里的规则,按 skill 自己的深度判定属于 **Deep** 档:先记录备选方案再选择、plan 交两名独立读者、外加一次 Close。而 Deep 会按触发它的那一条来缩放,这里触发的正是「契约文件里的规则」那一条 —— 所以 Close 这一侧承重的是「当作产品通读」,phases 与迁移步骤则不问自答直接砍掉。

如果你要往这套纪律里加一条规则 —— 或者想知道某条规则是否还值它花掉的 token —— 请运行探针:

```
Workflow({ scriptPath: "tests/probe.js" })
```

它把一个处境抛给若干从未见过这个 skill 的全新 agent,重复数次,然后把答案交给你评分。**不用提示就答对**,说明这条规则与模型自身的判断重复。**答错**,说明它在承重 —— 这是这里唯一的正面结果。**答得比规则更好**,说明规则本身是错的。

它是仪器,不是门禁:没有任何东西保证它是绿的,也刻意不进 CI。写处境之前请先读 `probe.js` 的文件头。**题面里出现规则本身,测的就是阅读理解** —— 这个项目此前两套行为测试都死于这一点,其中第二套(十一个 fixture、每次 23 个 agent、只返回 1 bit)已于 2026-08-11 删除。

探针只跑对照臂,这有一项代价值得点名:**它测不出 skill 把一个有能力的模型变得更差** —— 也就是某条规则把它从正确的默认判断上推开。那正是被删套件里那些 guard 存在的理由,现在没有任何东西接替。要问这个问题,只能手工跑两条臂再对比。

## 许可证

MIT —— 见 [LICENSE](./LICENSE)。

## 致谢

`references/escalation.md` 中的「值得警惕的借口」表,以及对始终加载的 `description` 的「去摘要化」处理,均传承自 [superpowers](https://github.com/obra/superpowers) skill 集合(Jesse Vincent,MIT)中的理由化 / 红旗速查表。
