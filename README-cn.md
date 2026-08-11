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
完整的版本历史见 [CHANGELOG-cn.md](./CHANGELOG-cn.md)。

## 什么是三循环工作流

agent 类编码失败有共同模式:急于动手实现、悄悄选择默认值、跳过评审。这套工作流通过三个循环来防止这些失败 —— 并且让循环的**深度**与「这个变更能捅多大娄子」成正比。

| 循环 | 产出 |
|---|---|
| **Plan(计划)** | `.agent/<task>/plan.md` —— 目标、非目标、决策,以及一条带退出码的 **Accept(验收)** 命令 |
| **Build(构建)** | 编写 → 门禁 → 评审 → 修复,循环到 blocking 计数归零 |
| **Close(收尾)** | *(仅 Deep 档)* 回答任何单个阶段都没问过的整体一致性问题 |

**深度是最先决定的,先于阅读任何其它内容。** 由两个问题决定:*如果这件事做错了,会波及多少?* 以及 *撤销它有多难?*

| 深度 | 适用场景 | 执行内容 |
|---|---|---|
| **Direct(直接)** | 影响面收敛且可逆 —— typo、注释、格式、局部重命名、patch/minor 依赖升级 | 直接改,跑门禁,结束 |
| **Standard(标准)** | 真实工作的默认档 —— 新功能、行为修复、重构、性能优化 | 计划简报 → 构建 → 门禁 → **一次**全新评审者的 diff 评审 → 修复 |
| **Deep(深度)** | 破坏已发布契约;数据或配置迁移;修改 load-bearing 文档中的规则;或仓库本身无法裁决的决策 | 在 Standard 基础上,增加「先记录备选方案再选择」、分阶段构建,以及一次 Close |

有四条规则承担了大部分作用:

1. **门禁先于 agent。** 在派出任何评审者**之前**,先跑项目自己的 typecheck / lint / build / test。让 agent 去评价一段根本编译不过的代码毫无价值,而编译器是免费的。
2. **作者永远不评审自己的产出。** 这条绑定的是**身份**,不是调用方式。
3. **先分诊,再计数。** 要求评审者报告一切,然后逐条对照代码核实,驳回那些误读代码的条目。收敛判定基于**已确认**的发现,绝不基于原始报告,也不基于评审者的结论性措辞。
4. **触及轮次上限即升级。** 每个阶段三轮修复。上限绝不会悄悄变成第四轮,也绝不降低门槛。

## 何时触发 skill

| 变更类型 | 深度 |
|---|---|
| 新功能、行为修复、性能优化、重构 | Standard |
| 破坏已发布契约;迁移数据或配置;修改 load-bearing 文档中的规则 | Deep |
| typo、注释、格式、文档重排、局部重命名、minor/patch 依赖升级 | Direct |
| 问答、不改代码的探索 | 不适用 |

在 Direct 与 Standard 之间犹豫时,选 Standard。在 Standard 与 Deep 之间犹豫时,Deep 的条件是一份**清单,不是感觉** —— 没有任何一条命中,Standard 就是正确答案。一个高风险的局部不会把整个变更升档;跑 Standard,然后单独把那个局部升级上报。

## 安装 skill

本 skill 是**「自包含」(self-contained)** 的 —— 不依赖外部插件、不需要配套 agent、不需要 hook。所有 subagent 与 Workflow 节点都运行在内置的默认 subagent 上。

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

skill 通过**角色(role)** 引用项目特定的值,而不是字面 heading 名。每个项目在自己的项目指南里绑定这些角色 —— `AGENTS.md`、`CLAUDE.md`,或两者都有。其中**两个**真正驱动规则:

| 角色 | 承载内容 | v2 是否使用 |
|---|---|---|
| `_load-bearing-docs_` | 受完整循环保护的契约文件清单 | **是** —— 它决定 Deep 档判定,并把删除其中文件设为需先询问 |
| `_common-commands_` | 具体的 typecheck / lint / build / test 命令 | **是** —— 门禁在派出任何评审者之前执行这些命令 |
| `_engineering-norms_` | 项目级编码规范 | 仅作为示例被提及;没有任何规则读取它 |
| `_repo-workflow_` | 本仓库的任务流程 | 未被引用 |
| `_language-policy_` | 语言和术语规则 | 未被引用 |

五个都建议填 —— 它们是 anchor map 约定的一部分,其它工具和人类读者会用到,读你项目指南的 agent 也会把它们当作上下文。但真正改变这个 skill 行为的只有前两个,所以那两个要写准。

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
│   │   ├── orchestration.md          并发写入者的 worktree;把 Build 循环当脚本运行
│   │   ├── close.md                  Deep 档收尾:孤儿清理、影响半径、迁移验证
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
│   ├── measurements/                 预注册与原始产物,已提交,好让数字能被重算而不是被相信
│   └── design/、implementation/       已冻结的 v1 每任务归档 —— 历史记录,不代表当前行为
├── README.md                         英文说明
├── README-cn.md                      本文件
├── CHANGELOG.md                      完整版本历史
└── CHANGELOG-cn.md                   中文版本历史
```

## 修改本工作流

这个 skill **按其自身定义就是 load-bearing 的**。修改 `SKILL.md` 或任何 `references/*.md` 都是在改动契约文件里的规则,按 skill 自己的深度判定属于 **Deep** 档:先记录备选方案再选择、两名独立评审者、外加一次 Close。

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
