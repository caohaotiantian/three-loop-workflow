# three-loop-workflow

为非平凡的软件变更提供严格三循环工作流,以 Claude skill 形式打包发布。

English version → [README.md](./README.md)

## 仓库内容

- **`three-loop-workflow/`** —— 把工作流落实为可执行流程的 Claude skill。把这个文件夹放进 Claude Code 或 Claude.ai,Claude 在处理任何非平凡代码改动时都会按照它执行。

skill 文件(`SKILL.md` + `references/`)是唯一事实标准 —— 它们是 Claude Code 实际加载并执行的内容。短小的入口(`SKILL.md`)按需路由到分阶段的引用文件。

## 更新日志

| 版本 | 主要新增内容 |
|---|---|
| **v1.3** | 路由表新增 `agentType` 推荐列；`references/schemas.md`（ReviewVerdict 结构化输出 schema）；新增"本技能不适用的情形"说明表；快速导览区块；常见错误模式速查表；文档命名规范；TaskCreate 轮次追踪指引 |
| **v1.3.1** | `references/l3-phase.js` — 基于 Workflow 工具的 L3 阶段执行器（推荐模式）；`references/loop-3-workflow.md` — 调用指南；`references/schemas.md` 新增 AcceptVerdict 和 DevResult schema；SKILL.md 路由表新增 Workflow 模式行 |
| **v1.3.2** | skill 现在是「自包含」(self-contained)的:所有 subagent/Workflow 节点都运行在内置的默认 subagent 上;移除了对 feature-dev 插件 agent 类型的依赖（从 SKILL.md 删除了 `agentType` 推荐列以及裸名 vs 命名空间评审 agent 的说明段落） |
| **v1.3.3** | skill 不再诱发代码中的「过程叙述型注释」:在 SKILL.md 新增明确的 Surgical Changes 规则（「注释解释代码,而非工作流」），并在 L3 评审中新增对其的检查项;`references/l3-phase.js` 范例已清除设计文档/决策/示意图引用 |
| **v1.4** | **编排能力升级。** 正确性:L3 dev 改动通过 `baseSha` 物化 diff,并新增区别于「轮次耗尽」的 `agent-error` 状态(`l3-phase.js`);将 skill 文件确立为**唯一事实标准**(删除冗余的派生规范 `WORKFLOW-v3.md`),并加入 `three-loop-consistency` 自检;删除了关于 worktree 隔离的虚假声明。纪律调优:仅 L3 的「首轮即清洁」终止放宽;带门控的 **Light/Full 两档**(`references/light-mode.md`)及新鲜视角的分档复核;基于范围(而非工时)的 Phase 定义;成本预期说明。质量上限:L1「先理解再设计」Explore 前置步骤;门控式**行为验证**(`/run`、`/verify`);声明或显式排除性能/UX/无障碍预算。可选模式(均为可选、零安装回退):对抗式**多投票评审面板**及机械并集(`references/review-panel.js`、`multi-voter-review.md`);受工具限制、按模型路由的**评审 agent**(`references/optional-subagents.md`);提交前缀 lint 钩子(`references/validate-commit-msg.sh`);**agent 团队**模式(`references/loop-3-teams.md`) |
| **v1.5** | **合规性加固**(基于与 `superpowers` skill 集合的对比,提炼 32 条经审定的改进,分 3 波交付)。**去摘要化:** 常驻加载的 `description` 不再复述工作流,「快速导览」区块改为*完整阅读引用文件*的指令 —— 常驻加载面**净缩小**。**人因层:** 一张统一的「理由化/红旗」速查表(`escalation-rules.md`)+ 评审者实际会读到的内联触发线。**验证而非贴标签:** TDD「看着它失败」由评审者从 git log 核验;收尾要求*新鲜*的命令输出;F 阶段现在默认运行全量改动的**新鲜视角正确性评审**(不再只做文档归并)。**失败处理:** fix 角色新增根因门 + 失败复现测试;轮次上限耗尽被重新定性为可能的设计/拆分缺陷;死锁报告需附「故障定位证据」。**人体工学:** 诚实的 dev 状态(`blocked` / `concerns[]`,至多一次有界重派 → `dev-escalation`);按角色的 `models` 路由;校准的严重度(防虚高);按 diff 核验。**需求澄清:** 带门控的 L1「起草前确认意图」前置步骤;免费的预派发自检;多子系统拆分信号。**自测试:** 常驻 `tests/scenarios/` 行为测试套件 + 维护门(`check-consistency.sh` 现在还配对 `clean-first-round` / `fixApplied`)—— skill 现在能在压力下检验自身纪律 |
| **v1.5.1** | **审计修复加固**(来自一次多视角自审计)。一致性门现在真正在各源文件间配对 `two-generation` token(此前只是注释、形同虚设),并对常驻加载的 `SKILL.md` 强制 `wc -w` 字数上限;提交前缀 lint 改为从**第一个** `-m` 提取主题(多 `-m` 提交此前未被校验),并在无 jq 回退路径里反转义 JSON;None 档现在要求评审者复核 load-bearing 改动确实不改任何规则;`l3-phase.js` 合并 `clarifications` 并在轮次耗尽时报告实际运行的轮次;新增 6 个行为场景(向下分档、None 边界、设计冲突回滚、删除先询问、伪装成 typo 的规则改动、依赖升级评审);新增 MIT `LICENSE` 与 superpowers 致谢;打包的 `.skill` 现在通过 CI 在 `v*` 标签时构建,不再提交进仓库;对抗式评审**面板**现在需要存活投票者达到法定多数(⌊N/2⌋+1)才能给出干净的 PASS —— 丢失多数投票者的面板会重跑,而非靠仅剩一票悄悄放行 |

## 什么是三循环工作流

agent 类编码失败有共同模式:急于动手实现、悄悄选择默认值、跳过评审。这套工作流通过三层强制纪律来防止这些失败 —— 每个功能变更都必须穿过三个自上而下的循环和最终评审:

| 阶段 | 产出 | 轮次上限 |
|---|---|---|
| **L1** 设计文档循环 | `docs/design/<task-slug>.md`(8 个必须章节) | 3 |
| **L2** 实现文档循环 | `docs/implementation/<task-slug>.md`(Phase 拆分 + 验收命令) | 3 |
| **L3** 开发工作循环 | 通过四角色模板(dev → review → accept → fix)产出代码 | 每个 Phase 3 轮 |
| **F** 端到端评审 | 任务收尾 | —— |

每个循环必须等到**全新 subagent 评审**报告本轮零严重问题、上一轮零一般问题,才能退出。轮次上限会触发向用户升级 —— 永远不会偷偷降低门槛。

每个 subagent 都继承的四条不可妥协原则:

1. **Think Before Coding** —— 把假设说出来,不要默认。
2. **Simplicity First** —— 解决问题的最小代码量,不多写一点。
3. **Surgical Changes** —— 只动请求要求的部分。
4. **Goal-Driven Execution** —— 定义成功,循环到机械可验证为止。

## 何时触发 skill

| 变更类型 | 走完整 L1 → L2 → L3? |
|---|---|
| 新功能、bug 修复、性能优化、重构 | 是 |
| 修改 load-bearing 文档(CLAUDE.md / OpenAPI / 数据库 schema 等) | 是 |
| 纯 typo 修复、文档重排、依赖升级 | 否 —— 但仍需一次独立的 fresh-agent 评审 |
| 问答、不改代码的探索 | 否 |

## 安装 skill

本 skill 是**「自包含」(self-contained)** 的 —— 不依赖任何外部插件。每个 subagent / Workflow 节点都运行在内置的默认 subagent 上,因此单独安装本 skill 即可使用。

**可选**的评审 agent(`three-loop-workflow/references/optional-subagents.md`)可加入受工具限制、按模型路由的评审者 —— 它们是**内置的 Claude Code `.claude/agents` 文件,而非 v1.3.2 移除的外部插件**;即使不安装它们,skill 仍可零安装运行。

### Claude Code

把 skill 文件夹复制到标准位置之一:

```bash
# 项目级:只在 <your-repo> 里生效
cp -r three-loop-workflow <your-repo>/.claude/skills/

# 用户级:跨所有项目生效
cp -r three-loop-workflow ~/.claude/skills/
```

或打包成单个可分发的 `.skill` 文件:

```bash
# 在仓库根目录执行
zip -r three-loop-workflow.skill three-loop-workflow/
# 产出 three-loop-workflow.skill —— Claude Code 可识别的 zip 包
```

带标签的发布(`v*`)也会通过 `.github/workflows/release.yml` 在 GitHub release 上附带一个预构建的
`.skill`,因此你可以直接下载而不必本地打包。

### Claude.ai

在 Skill 管理页上传打包好的 `.skill` 文件。

## 项目接入(每个仓库一次)

skill 通过**角色(role)** 引用项目特定的值,而不是字面 heading 名,以保证跨项目可移植性。每个项目在自己的 `CLAUDE.md` 顶部用一份 anchor map 把角色绑定到具体的 heading。五个必须角色:

| 角色 | 承载内容 |
|---|---|
| `_repo-workflow_` | 本仓库的任务流程 |
| `_load-bearing-docs_` | 受完整三循环保护的契约文件清单 |
| `_language-policy_` | 语言和术语规则 |
| `_common-commands_` | 具体的 `<TEST-CMD>` 等命令值 |
| `_engineering-norms_` | 项目级编码规范 |

`CLAUDE.md` 顶部 anchor map 示例:

```markdown
<!-- Anchor map (required by three-loop-workflow skill) -->
- _repo-workflow_       → "## Development Workflow"
- _load-bearing-docs_   → "## Load-Bearing Documents"
- _language-policy_     → "## Language Policy"
- _common-commands_     → "## Common Commands"
- _engineering-norms_   → "## Engineering Norms"
```

完整的接入约定、跨文件一致性自检表、grep 自检命令,见 `three-loop-workflow/references/claude-md-integration.md`。

## 仓库结构

```
.
├── three-loop-workflow/              skill 本体(唯一事实标准)
│   ├── SKILL.md                      入口:四原则 + 分档表 + 路由表
│   └── references/
│       ├── loop-1-design.md          L1 评审模板 + 8 个必须章节 + 理解前置步骤
│       ├── loop-2-implementation.md  L2 Phase 拆分 + 评审模板
│       ├── loop-3-workflow.md        L3 Workflow 模式(调用 l3-phase.js)
│       ├── loop-3-development.md     L3 四角色模板 + 提交规范 + E2E/行为验证
│       ├── l3-phase.js               L3 Workflow 脚本(dev → review → accept → fix)
│       ├── review-panel.js           可选的对抗式评审面板(机械并集)
│       ├── schemas.md                ReviewVerdict / AcceptVerdict / DevResult
│       ├── light-mode.md             Light 档
│       ├── multi-voter-review.md     可选的评审面板升级
│       ├── optional-subagents.md     可选的受工具限制的评审 agent
│       ├── loop-3-teams.md           可选的 agent 团队模式
│       ├── end-to-end-review.md      F 收尾清单
│       ├── escalation-rules.md       何时/如何升级;死锁报告流程
│       ├── claude-md-integration.md  CLAUDE.md 角色词汇表 + 跨文件一致性
│       ├── check-consistency.sh      three-loop-consistency 自检
│       ├── check-workflow-syntax.sh  Workflow 脚本语法门
│       └── validate-commit-msg.sh    可选的提交前缀 lint 钩子
├── tests/scenarios/                  常驻压力场景套件 —— v1.5 行为门(合并 tier/升级/终止相关改动前运行;不打包进 .skill,非 load-bearing)
├── docs/design/、docs/implementation/  每个任务的 L1/L2 归档(按需创建)
├── README.md                         英文说明
└── README-cn.md                      本文件
```

## 修改本工作流

这个 skill **按其自身定义就是 load-bearing 的**。修改 `SKILL.md` 或任何 `references/*.md` 都会触发完整的 L1 → L2 → L3 循环。

一条过渡条款:当一份 load-bearing 文档**首次引入**或首次被追溯归类为 load-bearing,允许用一份一页篇幅的追溯设计简报加上一次连续两轮干净的独立评审来替代完整三循环。后续修改必须走正式流程。

## 许可证

MIT —— 见 [LICENSE](./LICENSE)。

## 致谢

v1.5 的人因 / 工艺层概念(理由化 / 红旗速查表、去摘要化的 description 思路、校准的严重度)改编自 [superpowers](https://github.com/obra/superpowers) skill 集合(Jesse Vincent,MIT)。
