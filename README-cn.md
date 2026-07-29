# three-loop-workflow

为非平凡的软件变更提供严格的三循环工作流,以可移植的 Agent Skill 形式打包发布(可运行于 Claude Code、Codex 与 opencode)。

English version → [README.md](./README.md)

> **v2.0.0 是一次彻底重写,属于破坏性变更(breaking change)。** 如果你已经安装了 v1,请先阅读
> [从 v1 升级](#从-v1-升级) 再复制任何文件 —— 两个版本除了文件夹名字之外没有任何共同之处。
> 变更内容与依据见 [docs/why-v2-cn.md](./docs/why-v2-cn.md)。

## 仓库内容

- **`three-loop-workflow/`** —— 把工作流落实为可执行流程的 Claude skill。把这个文件夹放进 Claude Code 或 Claude.ai,Claude 在处理任何非平凡代码改动时都会按照它执行。

skill 文件(`SKILL.md` + `references/`)是唯一事实标准 —— 它们是 Claude Code 实际加载并执行的内容。短小的入口(`SKILL.md`)按需路由到分阶段的引用文件。

## 更新内容

[**v2.0.0 发布公告**](./docs/announcement-v2.0.0-cn.md) —— 简版,以及如何升级。
[**我们为什么重写**](./docs/why-v2-cn.md) —— 详版,附全部实测数据。
完整的版本历史见 [CHANGELOG-cn.md](./CHANGELOG-cn.md)。

## 什么是三循环工作流

agent 类编码失败有共同模式:急于动手实现、悄悄选择默认值、跳过评审。这套工作流通过三个循环来防止这些失败 —— 并且让循环的**深度**与「这个变更能捅多大娄子」成正比。

| 循环 | 产出 |
|---|---|
| **Plan(计划)** | `.agent/plan.md` —— 目标、非目标、决策,以及一条带退出码的 **Accept(验收)** 命令 |
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
cp -r three-loop-workflow <your-repo>/.claude/skills/

# 用户级:跨所有项目生效
cp -r three-loop-workflow ~/.claude/skills/
```

或打包成单个可分发的 `.skill` 文件:

```bash
# 在仓库根目录执行(先删除旧包,避免残留已从 three-loop-workflow/ 删除的文件)
rm -f three-loop-workflow.skill && zip -r three-loop-workflow.skill three-loop-workflow/
# 产出 three-loop-workflow.skill —— Claude Code 可识别的 zip 包
```

带标签的发布(`v*`)也会通过 `.github/workflows/release.yml` 在 GitHub release 上附带一个预构建的
`.skill`,因此你可以直接下载而不必本地打包。

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

**替换整个文件夹,不要往里合并。** v1 与 v2 只有目录名相同,文件名没有一个相同。把 v2 覆盖到已有的 v1 安装上,会让 20 个 v1 文件原地残留,skill 随后会路由到与自身内容互相矛盾的引用文件。

```bash
# Claude Code,用户级
rm -rf ~/.claude/skills/three-loop-workflow
cp -r three-loop-workflow ~/.claude/skills/

# 或者等价地
rsync -a --delete three-loop-workflow/ ~/.claude/skills/three-loop-workflow/
```

需要知道的几件事:

- **你的 `CLAUDE.md` anchor map 不用改,继续有效。** 五个角色完全一致。如果你还维护 `AGENTS.md`,
  v2 也会一并读取 —— 见下文。
- **`docs/design/` 与 `docs/implementation/` 不再产出。** v2 的计划是单个临时文件 `.agent/plan.md`,
  且被 gitignore。请把 `.agent/` 加进你的 `.gitignore`。已有归档留着或删掉都行,没有任何东西会读它们。
- **hook 和门禁脚本已移除。** 如果你的 `settings.json` 调用了本 skill 的 `require-plan.sh` 或
  `validate-commit-msg.sh`,请删掉那些配置 —— 脚本不再随包发布,而指向不存在命令的 hook 会在每次编辑时报错。
- **术语变了。** L1/L2/L3/F → Plan/Build/Close;Full/Light/None → Deep/Standard/Direct;
  severe/general → blocking/non-blocking。任何引用了旧术语的项目文档都需要同步更新。

继续留在 v1 是可行的,只是它不再演进:`git checkout v1.14.0`,或从 v1.14.0 release 下载 `.skill`。
该版本不会再有任何改动。

## 项目接入(每个仓库一次)

skill 通过**角色(role)** 引用项目特定的值,而不是字面 heading 名。每个项目在自己的项目指南里绑定这些角色 —— `AGENTS.md`、`CLAUDE.md`,或两者都有。五个必须角色:

| 角色 | 承载内容 |
|---|---|
| `_repo-workflow_` | 本仓库的任务流程 |
| `_load-bearing-docs_` | 受完整循环保护的契约文件清单 |
| `_language-policy_` | 语言和术语规则 |
| `_common-commands_` | 具体的 typecheck / lint / build / test 命令 |
| `_engineering-norms_` | 项目级编码规范 |

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
│   │   ├── build.md                  编写 → 门禁 → 评审 → 分诊 → 修复;诊断;flaky;worktree
│   │   ├── close.md                  Deep 档收尾:孤儿清理、影响半径、迁移验证
│   │   ├── escalation.md             何时以及如何上报;死锁报告
│   │   └── platforms.md              各运行时,以及离开 Claude Code 后哪些能力降级
│   └── scripts/
│       ├── phase.js                  把 Build 循环写成确定性的 Workflow 脚本
│       └── check-workflow-syntax.sh  解析 Workflow 脚本(node --check 做不到)
├── tests/                            双臂行为套件:每个 fixture 都在「加载 skill」与「屏蔽 skill」
│                                     两种条件下各跑一次;两臂都答对的 fixture 判为 INVALID
├── docs/
│   ├── announcement-v2.0.0-cn.md     发布公告
│   ├── why-v2-cn.md                  重写全过程的长文
│   └── design/、implementation/       已冻结的 v1 每任务归档 —— 历史记录,不代表当前行为
├── README.md                         英文说明
├── README-cn.md                      本文件
├── CHANGELOG.md                      完整版本历史
└── CHANGELOG-cn.md                   中文版本历史
```

## 修改本工作流

这个 skill **按其自身定义就是 load-bearing 的**。修改 `SKILL.md` 或任何 `references/*.md` 都是在改动契约文件里的规则,按 skill 自己的深度判定属于 **Deep** 档:先记录备选方案再选择、两名独立评审者、外加一次 Close。

如果你改动的是纪律本身,请运行双臂套件:

```
Workflow({ scriptPath: "tests/run-scenarios.js" })
```

两臂都答对的 fixture 会被判为 INVALID 而不是绿灯 —— 那说明这条规则没有起作用。写 fixture 之前请先读 `tests/README.md`;写场景题的大多数写法,最后测的都是阅读理解,而不是这个 skill。

## 许可证

MIT —— 见 [LICENSE](./LICENSE)。

## 致谢

`references/escalation.md` 中的「值得警惕的借口」表,以及对始终加载的 `description` 的「去摘要化」处理,均传承自 [superpowers](https://github.com/obra/superpowers) skill 集合(Jesse Vincent,MIT)中的理由化 / 红旗速查表。
