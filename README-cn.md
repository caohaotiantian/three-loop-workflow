# three-loop-workflow

为非平凡的软件变更提供严格三循环工作流,以 Claude skill 形式打包发布。

English version → [README.md](./README.md)

## 仓库内容

- **`WORKFLOW-v3.md`** —— 工作流的权威规范文档。
- **`three-loop-workflow/`** —— 把规范落实为可执行流程的 Claude skill。把这个文件夹放进 Claude Code 或 Claude.ai,Claude 在处理任何非平凡代码改动时都会按照它执行。

规范是事实标准。skill 是面向 Claude 优化过的衍生物 —— 把规范拆成短小的入口(`SKILL.md`)加上按需加载的分阶段引用文件,避免一次塞太多内容到模型上下文里。

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
python -m scripts.package_skill three-loop-workflow
# 产出 three-loop-workflow.skill —— Claude Code 双击即可识别
```

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
├── WORKFLOW-v3.md                    源规范(权威)
├── three-loop-workflow/              skill 本体
│   ├── SKILL.md                      入口:四原则 + 路由表 + 触发条件
│   └── references/
│       ├── loop-1-design.md          L1 评审模板 + 8 个必须章节
│       ├── loop-2-implementation.md  L2 Phase 拆分 + 评审模板
│       ├── loop-3-development.md     L3 四角色模板 + 提交规范 + E2E
│       ├── end-to-end-review.md      F 收尾清单
│       ├── escalation-rules.md       何时/如何升级;死锁报告流程
│       └── claude-md-integration.md  CLAUDE.md 角色词汇表 + 跨文件一致性
├── README.md                         英文说明
└── README-cn.md                      本文件
```

## 修改本工作流

这个 skill **按其自身定义就是 load-bearing 的**。修改 `SKILL.md` 或任何 `references/*.md` 都会触发完整的 L1 → L2 → L3 循环。

一条过渡条款:当一份 load-bearing 文档**首次引入**或首次被追溯归类为 load-bearing(包括 `WORKFLOW.md` 的第一版),允许用一份一页篇幅的追溯设计简报加上一次连续两轮干净的独立评审来替代完整三循环。后续修改必须走正式流程。
