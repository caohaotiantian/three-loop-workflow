# three-loop-workflow

为非平凡的软件变更提供严格三循环工作流,以可移植的 Agent Skill 形式打包发布(可运行于 Claude Code、Codex 与 opencode)。

English version → [README.md](./README.md)

## 仓库内容

- **`three-loop-workflow/`** —— 把工作流落实为可执行流程的 Claude skill。把这个文件夹放进 Claude Code 或 Claude.ai,Claude 在处理任何非平凡代码改动时都会按照它执行。

skill 文件(`SKILL.md` + `references/`)是唯一事实标准 —— 它们是 Claude Code 实际加载并执行的内容。短小的入口(`SKILL.md`)按需路由到分阶段的引用文件。

## 更新日志

完整的版本历史见 **[CHANGELOG-cn.md](./CHANGELOG-cn.md)**。

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

把文件夹复制到 `.claude/skills/` 与 `.agents/skills/` 即可覆盖全部三种运行时。纪律本身与运行时无关;只有 Workflow / subagent 编排属于 Claude Code 的加速层(acceleration layer)。完整能力矩阵与「新鲜评审者隔离阶梯」见 `three-loop-workflow/references/platforms.md`。

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
│       ├── failure-retrospective.md  把一类失败转化为持久的预防措施
│       ├── claude-md-integration.md  CLAUDE.md 角色词汇表 + 跨文件一致性
│       ├── check-consistency.sh      three-loop-consistency 自检
│       ├── check-workflow-syntax.sh  Workflow 脚本语法门
│       └── validate-commit-msg.sh    可选的提交前缀 lint 钩子
├── tests/scenarios/                  常驻压力场景套件 —— v1.5 行为门(合并 tier/升级/终止相关改动前运行;不打包进 .skill,非 load-bearing)
├── docs/design/、docs/implementation/  每个任务的 L1/L2 归档(按需创建)
├── README.md                         英文说明
├── README-cn.md                      本文件
├── CHANGELOG.md                      完整版本历史
└── CHANGELOG-cn.md                   中文版本历史
```

## 修改本工作流

这个 skill **按其自身定义就是 load-bearing 的**。修改 `SKILL.md` 或任何 `references/*.md` 都会触发完整的 L1 → L2 → L3 循环。

一条过渡条款:当一份 load-bearing 文档**首次引入**或首次被追溯归类为 load-bearing,允许用一份一页篇幅的追溯设计简报加上一次连续两轮干净的独立评审来替代完整三循环。后续修改必须走正式流程。

## 许可证

MIT —— 见 [LICENSE](./LICENSE)。

## 致谢

v1.5 的人因 / 工艺层概念(理由化 / 红旗速查表、去摘要化的 description 思路、校准的严重度)改编自 [superpowers](https://github.com/obra/superpowers) skill 集合(Jesse Vincent,MIT)。
