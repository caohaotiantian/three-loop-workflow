# three-loop-workflow

为非平凡的软件变更提供严格的三循环工作流,以可移植的 Agent Skill 形式打包发布(可运行于 Claude Code、Codex 与 opencode)。

English version → [README.md](./README.md)

> **v3 相对 v2 是一次彻底重写,属于破坏性变更(breaking change)。** 替换整个文件夹,不要往里复制。
> 如果你已经安装了 v2,请先阅读 [从 v2 升级](#从-v2-升级)。变更内容与依据见
> [docs/why-v3-cn.md](./docs/why-v3-cn.md)。

## 仓库内容

- **`three-loop-workflow/`** —— 把工作流落实为可执行流程的 Claude skill。把这个文件夹放进 Claude Code 或 Claude.ai,Claude 在处理任何非平凡代码改动时都会按照它执行。

skill 由三个 Markdown 文件加上它的 `LICENSE` 组成:始终加载的 `SKILL.md`;只有 Deep 档工作才会读的 `references/deep.md`;以及只有拆分给多个写入者的工作才会读的 `references/parallel.md`。它们是唯一事实标准。

## 更新内容

[**为什么有 v3**](./docs/why-v3-cn.md) —— v3.0.0 砍掉了什么、保留了什么、依据是什么,以及哪些事情没有人
测量过。
[**三轮修复上限合适吗?**](./docs/2026-07-31-round-cap-experiment-cn.md) —— 预注册、原始数据已提交,
结论是问题不在上限。
完整的版本历史见 [CHANGELOG-cn.md](./CHANGELOG-cn.md)。

历史:
[**v2.0.0 发布公告**](./docs/announcement-v2.0.0-cn.md) 与 [**v2 为什么重写**](./docs/why-v2-cn.md) ——
v1 → v2 那次重写,附实测数据。
[**v2.7.0 的委派指导依据的是什么**](./docs/analysis-2026-09-17-orchestration-evidence.md)
(已在 v3 中退役)—— 它背后的每一个来源,连同日期、评级,以及哪些被刻意留在了外面(仅英文)。

## 什么是三循环工作流

agent 类编码失败有共同模式:急于动手实现、悄悄选择默认值、跳过评审。这套工作流通过三个循环来防止这些失败 —— 并且让循环的**深度**与「这个变更能捅多大娄子」成正比。

| 循环 | 产出 |
|---|---|
| **Plan(计划)** | 第一次编辑之前:目标(Goal)、你曾想顺手去做的非目标(Non-goals),以及 **Accept(验收)** —— 「没有这个变更就会失败」的最便宜的真实证据。只在真正的分岔处写决策。plan 写在 `.agent/<task>/plan.md`,每个任务一个目录,随变更一起提交。`.gitignore` 里已有的 `.agent` 条目保留 |
| **Build(构建)** | 构建 → 证据 → **一次**独立评审 → 分诊 → 修复,评审者复查每一次修复;修复不再收敛时停下来问 |
| **Close(收尾)** | 交接,写在变更描述里:证据实际显示了什么、哪些没能检查、谁评审的、未修复的 non-blocking 发现,以及残余风险 |

**深度按风险高低来选,取能满足要求的最轻一档。** agent 按自己的判断升档,包括在构建中发现某条触发条件的时候;只有你能降档,而且要在 agent 推荐它选定的深度、并展示这次变更会因此跳过什么以及留下的失败之后。如果你仍然坚持,它照做并记录下来,硬约束不因此放弃。

| 深度 | 适用场景 | 执行内容 |
|---|---|---|
| **Direct(直接)** | 正确性在改动本身中可见,或已有检查会在这次变更是错的时候变红。不确定就等于不可见:修 typo 是 Direct,改一个默认值不是 | 直接改,跑检查;不需要 plan,不需要评审者,交接只写一行,写明跑了哪些检查及其结果 |
| **Standard(标准)** | 行为变更的默认档 | 计划 → 构建 → 证据 → **一次**独立评审 → 分诊 → 修复,随变更规模伸缩:一行的变更只需一行的计划和一次简短的评审 |
| **Deep(深度)** | 只在触发条件命中时:对仓库之外所消费的契约做破坏性变更;仓库之外的不可逆效果;改动项目视为契约的文件中的规则;指向不同结构的备选方案 | 在 Standard 基础上加上 `references/deep.md`:先写决策再选择、回滚方案、有出处的外部论断、对 plan 的一次独立阅读,以及 Close 检查,分阶段构建时最后还有一次针对整个变更的评审 —— 再加上所命中那条触发条件的额外项,其中前两条触发条件要两名评审者 |

五条硬约束是仅有的不属于默认值的规则:

1. **Direct 以上的变更由一个没有写它的上下文评审**;只有在没有这样的上下文可用时,交接里才说明这一点。这时评审作为一趟单独的 pass 来跑,只依据 diff 和简报,标注为 "self-review, not independent",并把简报提供给你,让你拿到别处去跑。在 Deep 档,每一次独立阅读都变成这样的一趟 pass。
2. **跑项目的检查。** 没能跑的检查不算通过。
3. **交接报告观察到的东西**,而不是打算做的东西。
4. **改变「谁能访问什么」的变更** —— 认证、授权、密钥、一条接收不可信输入的新路径 —— 永远不是 Direct。
5. **仓库之外不可撤销的动作要等你**:推送到共享分支、部署、写入真实数据、发送任何东西。

其它一切都是默认值:agent 只有在说明理由时才偏离,你项目的指南可以覆盖其中任何一条,手段由 agent 自己决定。证据要相称 —— **默认不要求新增单元测试**,skill 点名了单元测试是错误检查手段的场合(UI 渲染、接线、配置、对外部服务的薄调用、一次性脚本、散文),在那些地方,由一个没有写这个变更的上下文去驱动人会点击、输入或调用的路径。

## 何时触发 skill

| 变更类型 | 深度 |
|---|---|
| 新功能、行为修复、性能优化、重构 | Standard |
| 对仓库之外所消费的契约做破坏性变更;仓库之外的不可逆效果 —— 迁移已持久化的数据、涉及金钱、发给第三方的任何东西;改动项目视为契约的文件中的规则;指向不同结构的备选方案 | Deep |
| 任何正确性在改动本身中可见、或已有检查会在这次变更是错的时候变红的改动 —— 比如修 typo,但改一个默认值不算 | Direct |
| 评审一个不是你写的变更,在它落地之前 | 只评审 —— 同一份简报,以该变更的描述作为 plan;分诊,然后把已确认的发现交给作者。你不负责修 |
| 关于现有代码如何工作的问答、不改代码的探索 | 不适用 |

没有任何 Deep 触发条件命中,Deep 就是错的。一个高风险的局部提高它自己的深度,而不是整个变更的深度。

## 安装 skill

本 skill **自包含(self-contained)**:没有插件、没有 hook、没有脚本,也不点名任何工具。它假定有版本控制,因此变更是一份 diff;你能运行项目的命令,并在 Deep 触发时读到 `references/deep.md`;宿主在有独立评审上下文时提供它(否则以 `SKILL.md` 第 5 节为后备);不可逆的外部动作和 `SKILL.md` 第 6 节的停止需要用户在场;宿主能为有界领域那一步启动 sub-agent。

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

### Claude.ai

在 Skill 管理页上传打包好的 `.skill` 文件。

### 跨平台安装(Claude Code / Codex / opencode)

本 skill 遵循 agentskills.io 开放标准,因此同一份规范来源 `three-loop-workflow/` 文件夹可运行于三种运行时:

| 运行时 | 安装位置 |
|---|---|
| **Claude Code** | `.claude/skills/`(项目级)或 `~/.claude/skills/`(用户级) |
| **Codex** | `.agents/skills/`(或 `$HOME/.agents/skills/`) |
| **opencode** | 原生读取 `.claude/skills/` 与 `.agents/skills/` 两处 —— 无需单独安装 |

把文件夹复制到 `.claude/skills/` 与 `.agents/skills/` 即可覆盖全部三种运行时。

## 从 v2 升级

**替换整个文件夹,不要往上覆盖复制。** 把 v3 覆盖到 v2 安装上,只会覆盖 `SKILL.md`,v2 其余的引用文件和脚本
都会原地残留。没有任何东西会路由到它们,但某个 agent 只要 grep 这个 skill 目录,就会找到它们,并读到 v3 已经
废弃的规则。

```bash
# Claude Code,用户级 —— 项目级或 .agents/skills/ 的安装用同样的写法
rsync -a --delete three-loop-workflow/ ~/.claude/skills/three-loop-workflow/
```

需要知道的几件事:

- **把 `.agent/<task>/plan.md` 和变更一起提交,** 每个任务一个目录,这样别人能读到这段历史。如果 `.agent/`
  已经在 `.gitignore` 里,留下那一条;skill 不会删它。
- **项目指南里的 anchor map 无害,但不再被读取。** v3 把指南当散文来读,从中取它的检查命令,以及它视为契约的
  文件。
- **删掉任何要求运行 skill 自带脚本的指令。** v2 在 skill 里附带了 `scripts/phase.js` 与
  `scripts/check-workflow-syntax.sh`;v3 不附带任何脚本,所以从已安装的 skill 里调用其中任何一个的指南、包装
  脚本或 CI 步骤,在那里什么也找不到。
- **术语没有变。** Plan/Build/Close、Direct/Standard/Deep 与 blocking/non-blocking 的含义和原来一样,只是收窄了:
  Deep 的触发条件更窄,Direct 取决于正确性是否在改动本身中可见。

继续留在 v2:`git checkout v2.7.0`,或从 v2.7.0 release 下载 `.skill`。该版本不会再有任何改动。

## 从 v1 升级

这是 v1 → v2 的说明,留给仍在用 v1 的人。规则是一样的:**替换整个文件夹,不要往里合并。** v1 与 v2 只有两个
文件名相同 —— `SKILL.md` 和 `references/platforms.md` —— 所以把 v2 覆盖到 v1 安装上,**另外 18 个 v1 文件**
会原地残留(`loop-1-design.md`、`l3-phase.js`、`check-consistency.sh` 等等)。上面的 `rsync --delete` 也会把它们
清掉;从 v1 直接升到 v3,同样是替换整个文件夹。

- 如果你的 `settings.json` 把 v1 的 `validate-commit-msg.sh` 配成了提交 hook,请删掉那个条目 —— 指向不存在
  命令的 hook 会在每次提交时报错。
- v1 的术语对应关系:L1/L2/L3/F → Plan/Build/Close,Full/Light/None → Deep/Standard/Direct,
  severe/general → blocking/non-blocking。

v1 依然存在:`git checkout v1.14.0`,或 v1.14.0 release 上的 `.skill`。该版本不会再有任何改动。

## 项目接入(每个仓库一次)

**什么都不必做。** skill 会把仓库的项目指南 —— `AGENTS.md`、`CLAUDE.md`,或两者都有 —— 当散文来读,从中取它的检查命令,以及它视为契约的文件。指南里一个都没写时,agent 会从仓库里推导出来 —— 检查来自构建配置与 CI,契约是在仓库之外被消费、或被持久化的那些东西 —— 并说明它推断了什么。没有指南,从来不意味着可以跳过检查。

你的指南可以覆盖 skill 的任何默认值,所以一个想把 plan 放在固定位置、或者想跑自己的评审或安全工具的项目,在指南里写明即可。你加上的工具补充独立评审,绝不替代它。

## 仓库结构

```
.
├── three-loop-workflow/              skill 本体(唯一事实标准)
│   ├── SKILL.md                      始终加载:硬约束、深度、计划、构建、证据、评审、修复与停止、
│   │                                 交接
│   ├── references/
│   │   └── deep.md                   只在某条 Deep 触发条件命中时读取
│   └── LICENSE
├── scripts/
│   ├── accept-release.sh             仓库门禁:重算每一个已发布的数字,并运行下面所有检查
│   ├── lint-skill.sh                 已发布 skill 的散文性质:不出现运行时机制名、不出现统计数字、
│   │                                 双向检查路由
│   ├── negative-test.sh              在副本上逐一破坏每项检查,要求它能察觉
│   ├── check-workflow-syntax.sh      解析 Workflow 脚本(node --check 做不到);为 probe.js 把关
│   └── exp-analyse.mjs               从原始数据重算轮次上限实验的数字
├── tests/                            gate-fixtures/ 供语法门禁使用(确定性、零成本),以及
│                                     probe.js —— 按需运行的对照臂仪器,用来问「这条规则
│                                     到底有没有改变模型的行为」
├── docs/
│   ├── why-v3-cn.md                  v3 砍掉与保留了什么、依据是什么、哪些没有测量
│   ├── why-v2-cn.md                  v1 → v2 重写全过程的长文
│   ├── announcement-v2.0.0-cn.md     v2.0.0 发布公告
│   ├── 2026-07-31-round-cap-*.md     文档形态的 Deep 变更能在三轮内收敛吗?
│   ├── analysis-2026-09-17-*.md      v2.7.0 的委派指导依据的是什么(已在 v3 中退役):每个来源
│   │                                 连同日期与评级,以及哪些被留在了外面
│   ├── measurements/                 预注册与原始产物,已提交,好让数字能被重算而不是被相信
│   └── design/、implementation/       已冻结的 v1 每任务归档 —— 历史记录,不代表当前行为
├── README.md                         英文说明
├── README-cn.md                      本文件
├── CHANGELOG.md                      完整版本历史
└── CHANGELOG-cn.md                   中文版本历史
```

## 修改本工作流

这个 skill **按其自身定义就是 load-bearing 的**。修改 `three-loop-workflow/` 下任何随 skill 发布的文件,就是在改动本仓库视为契约的文件中的规则,按 skill 自己的第三条触发条件属于 **Deep** 档:先写决策再选择、回滚方案、对 plan 的一次独立阅读,以及 Close 检查。这条触发条件额外带来的是冷读 —— 一个没有变更上下文的读者,通读这条规则所在的整套文件,而不只是改动的那几行,当作产品来读,而不是当作 diff。

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

v2 的「值得警惕的借口」表(位于 `references/escalation.md`,已在 v3.0.0 中退役),以及对始终加载的 `description` 的「去摘要化」处理(v3 保留了这一处理),均传承自 [superpowers](https://github.com/obra/superpowers) skill 集合(Jesse Vincent,MIT)中的理由化 / 红旗速查表。
