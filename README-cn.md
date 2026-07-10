# three-loop-workflow

为非平凡的软件变更提供严格三循环工作流,以可移植的 Agent Skill 形式打包发布(可运行于 Claude Code、Codex 与 opencode)。

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
| **v1.5.1** | **审计修复加固**(来自一次多视角自审计)。一致性门现在真正在各源文件间配对 `two-generation` token(此前只是注释、形同虚设),并对常驻加载的 `SKILL.md` 强制 `wc -w` 字数上限;提交前缀 lint 改为从**第一个** `-m` 提取主题(多 `-m` 提交此前未被校验),并在无 jq 回退路径里反转义 JSON;None 档现在要求评审者复核 load-bearing 改动确实不改任何规则;`l3-phase.js` 合并 `clarifications` 并在轮次耗尽时报告实际运行的轮次;新增 6 个行为场景(向下分档、None 边界、设计冲突回滚、删除先询问、伪装成 typo 的规则改动、依赖升级评审);新增 MIT `LICENSE` 与 superpowers 致谢;打包的 `.skill` 现在通过 CI 在 `v*` 标签时构建,不再提交进仓库;对抗式评审**面板**现在需要存活投票者达到法定多数(⌊N/2⌋+1)才能给出干净的 PASS —— 丢失多数投票者的面板会重跑,而非靠仅剩一票悄悄放行。**第二轮自审计**又修复了九处 load-bearing 缺口:文档化的 L1/L2 收敛不再把严格的 `two-generation` 规则压缩成单轮干净评审(评审者给出的 `verdict` 不再是收敛权威,并新增门禁守卫禁止其作为收敛条件回归);提交前缀 lint 现在能筛查带全局选项的 `git commit`(`git -C` / `-c` / `--no-pager`),其无 jq 回退不再过度捕获后续字段;skill 自身的行为检查改由主智能体执行(机械的 accept 角无法运行它),dev-escalation 不再丢失最初的阻塞原因;accept 角保持仅看退出码,跳过/xfail 计数移交 PhaseEnd 复跑,收尾整体评审中的 general 发现会被记录/延后而非消失;Light Mode 的收敛规则现已明确写出,档位表的文件数触发器与 None 单元也被收紧(SKILL.md 字数净减) |
| **v1.5.2** | **L3 执行器 args 传递修复。** `references/l3-phase.js` 与 `references/review-panel.js` 现在会**规范化各自的 Workflow `args`**:部分 Workflow 运行时把脚本的全局 `args` 以 JSON **字符串**(对工具调用参数的原样透传)而非已解析对象的形式交付,因此直接对其解构会使每个字段都变成 `undefined`,运行随即以一条晦涩的 `undefined is not an object (evaluating 'phaseLabel.replace')` 崩溃 —— 此前被误读为「args 传递坏了 / Workflow 执行器不可用」,并据此退回散文(prose)模式。现在两个脚本都会对 `args` 解析**并**校验(同时容忍对象*或* JSON 字符串),任何畸形 args 路径都会落到一条指明修复方式的描述性抛错,而非原始崩溃。`references/loop-3-workflow.md`(「Arg delivery」)与 `references/multi-voter-review.md` 记录了这一「字符串交付」事实,使该 `JSON.parse` 被明确视为有意为之(而非死代码),且抛出的 args 错误不会被再次误读为执行器故障。 |
| **v1.6.0** | **全项目收尾(project-wide closeout)。** 最终的 **F:端到端评审(End-to-End Review)** 从「仅看 diff 与本任务文档」的收尾扩展为面向**整个项目**的收尾(`references/end-to-end-review.md`,清单重新编号为 9 步),新增五项行为:(1)**仓库级校验门(repo-wide validation gates)**——F 运行项目在 `_common-commands_` 中声明的**每一个**校验门,而不只是 `<TEST-CMD>`(并给出区分「校验门」与构建/部署/打包动作的可操作判据);(2)**全项目影响半径评审(whole-project blast-radius review)**——新鲜评审现在还会扫描 diff **之外**、对被改动或被移除符号的调用方/消费者,捕捉 diff 无法显示的遗漏调用方;(3)**变更孤儿清理扫掠(change-orphan sweep)**——F 移除**本次变更**在全项目范围造成的孤儿产物,同时保留既有死代码(原则 0.3);(4)**条件式迁移核验(migration verification)**——当变更涉及 schema / 数据 / 配置 / 存储 / API 版本 / 依赖迁移(迁移现在本身即 Full Mode 触发器)时,F 核验其已提交、可回滚或已落实回滚、已正反向应用并测试、且无调用方仍停留在旧契约;(5)**有界的项目文档校准(project-doc reconciliation)**——F 更新那些被本次变更改得名实不符的项目文档(README、CLAUDE.md、用户/API 文档),并以「属于本次变更 vs 顺手乱改」的判据保持 Surgical Changes 不被破坏。五个新行为场景钉住这些新行为,`check-consistency.sh` 为每条新承诺子句、其交叉引用分隔符以及这些 fixture 设防。 |
| **v1.7.0** | **失败复盘(failure retrospective)**(对 Trellis `trellis-break-loop` 的无状态移植,来自与 `mattpocock-skills` 和 `Trellis` 两个集合的对比)。一类**系统性(class-level)失败**——轮次上限**死锁**且存活的根因是一类任务域缺陷,或 **F 第 6 步的系统性(影响半径)根因**——现在会把一项持久的**类级预防(class-prevention)**落到一个「已被常读」的面上(一个测试、一条 `_engineering-norms_` 规则、一处 skill 护栏),而不再随 diff 消失。检测是**本次调用内**完成的(skill 保持无状态——git 即记忆);跨任务的收益来自*预防落在何处*。该复盘是**增量式(additive)**的:它绝不放宽 F 的严重度路由(severe 发现仍阻塞收尾),且**落点为 `_load-bearing-docs_` 文件的预防会延后为 `finding`**,而非把未经评审的改动夹带进收尾(**subject-partition** 使其与「Meta-test the cap」互不重复)。新增 `references/failure-retrospective.md`、`escalation-rules.md` 与 `end-to-end-review.md` 中的触发钩子、一条 Light Mode 处置子句、`check-consistency.sh` 中一个**仅引用文件配对**的 token `failure_retrospective` 加四个行为 fixture ——**零 SKILL.md 表面开销**(条件式触发器不配占用常驻加载的字数)。 |
| **v1.8.0** | **L1 证据规则(Evidence Rule)**(来自同一次外部 skill 对比;移植自 Trellis `trellis-brainstorm`)。在 L1 pre-step B,升级任何澄清式提问之前,先从代码库 / `docs/design/` / CLAUDE.md 中作答:**仓库可答的事实应当查证,而非发问**(避免橡皮图章式升级),而**仓库无法回答的真实产品/范围/风险决策仍然升级**。同时防范**两个方向**的失败——过度发问,以及更危险的发问不足(把一个决策臆断为「仓库能回答的事实」,即一次静默默认)——通过 `escalation-rules.md` 中一条新的「理由化」表行与两个方向相反的行为 fixture 实现。仅引用文件配对的 token `evidence_rule` 横跨 `loop-1-design.md` ↔ `escalation-rules.md`;**零 SKILL.md 表面开销**。 |
| **v1.9.0** | **针对 skill 自身编辑的「否定式→肯定式」检查(negation→positive)**(来自同一次对比;移植自 mattpocock `writing-great-skills`)。本 skill 是自托管的——对它的每次编辑都要走它自己的 L1 评审;该评审的「skill 自身编辑」分支现在会标记**以裸禁令(「永远不要 X」)措辞的新规则**——若其目标可用**肯定式(「要做 Y」)**表达,则要求改写:一条裸禁令会把被禁行为拽进阅读方的上下文,半读为「去做这件事」的指令;禁令只作为与肯定式目标配对的硬护栏保留。值得注意的是,对本次改动的 L1 评审证明所审「craft 层」的**其余部分**其实**skill 早已内建**(no-op 检测 ↔ Simplicity First / trace test / anti-bloat;同义词漂移 ↔ 术语 `[Language constraint]`),因此只新增了这一条非重复的规则。单文件 token `negation_positive` 加一个行为 fixture;**零 SKILL.md 表面开销**。 |
| **v1.9.1** | **L3 执行器正确性(审计加固)。** 一次新的自审计带来两处修复:(1)**合并交接踩坑**——由于 dev subagent 在共享工作树中作业,其 `git checkout -b` 会把 HEAD 移到 dev 分支上,导致推荐的收尾 `git merge --ff-only <branch>` 变成把分支合并进自身;现在 dev 在编辑前先基于捕获的 `baseSha` 建分支,主智能体在调用时记录其集成分支,合并步骤先切回该分支(`l3-phase.js` dev 提示词 + `loop-3-workflow.md`,无控制流改动);(2)为此前未被断言的两个核心机制补充**行为 fixture**——轮次上限→死锁升级,以及 L3「首轮即清洁」的*肯定式*收敛。(一个更大的审计发现——把 accept 环的轮次预算与 review 预算分离——已拆分为独立周期。)零 SKILL.md 表面开销。 |
| **v1.9.2** | **依赖档位消歧(审计加固)。** 一次**主版本(major)依赖升级**此前同时命中「依赖升级→None 档」(SKILL.md None 行 + 描述)与「依赖主版本迁移→Full 档」(Full 行 + 迁移定义)——是常见任务上的真实错档风险。现在 None 档的依赖条款被限定为 **minor/patch**(正好是迁移定义中「major-version」的语义补集),因此主版本升级会经由未改动的迁移触发器进入 Full,并获得 F 的迁移核验。两个单词限定符 + 一个行为 fixture(主版本升级→Full)。 |
| **v1.10.0** | **fix 角的诊断方法(diagnosis method)**(审计 backlog 的 Wave 2;`mattpocock-skills` 与 `Trellis` 独立收敛到的唯一一处真实能力缺口)。fix 角此前*要求*「说出根因」却**没给出找到根因的方法**——于是在轮次预算压力下,智能体会锚定第一个看似合理的理论并打补丁(即死锁报告要捕捉的「每轮换一个 item 失败」的空转)。现在,当**复现后根因仍不明显**时:生成 **3-5 条按可能性排序、可证伪(falsifiable)的假设**(每条给出可检验的预测——「说不出预测,就只是感觉,不是假设」),并寻找**可区分(discriminating)的证据**(能把头部假设区分开的那个观察),而不是去印证第一个。接入 `loop-3-development.md`、**两个** `l3-phase.js` fix 提示词,以及一条「理由化」表行;配对 token `diagnosis_method` + 一个「反驳式构造」的 fixture(诱人的第一个理论可被证伪且是错的,因此只有走可区分路径才能得到正确答案)。零 SKILL.md 表面开销。 |
| **v1.11.0** | **L1 证据规则的 spike/实验分支**(Wave 2b;移植自 mattpocock `prototype`)。证据规则原先是二元的——仓库可答的*事实*→查证;*决策*→升级——但有些设计输入问题**两者都不是**:只能靠**运行**来定(供应商 SDK 是否*真的*支持 X;真实 payload 是什么形状;方案 X 能否达到预算)。升级只会弹回给同样得去跑的用户;假设则是静默默认。现在:跑一个 **spike**,并加紧约束使其不致沦为「先写码后设计」——**(a)** 一次性,在**临时隔离 worktree** 中运行并**机械删除**(复用既有 E2E 隔离 spawn 机制);**(b)** 唯一持久产出 = 答案 + 问题,记入设计文档(git 即记忆);**(c)** 限定于该问题——设计仍把守 L3。配对 token `spike_answer` + 一条「理由化」表行 + 一个四路 fixture(spike vs 假设 vs 升级 vs 直接构建)。零 SKILL.md 表面开销。 |
| **v1.12.0** | **设计文档中外部/技术断言的「逐字证据」标准**(Wave 3;移植自 Trellis `research.md`)。证据规则管的是*是否*去查证/升级/spike 一个问题;而**一个已陈述事实的形式**此前无人把守。于是设计文档可以把一个*自信*的外部/技术断言(「该回调是同步触发的」)当作**无出处的既定事实**写下,这个(往往是幻觉的)断言便会像已确立那样传播进 L2 阶段计划与 L3 代码。现在 L1 评审会把**未附逐字 `file:line` 出处**(或 spike 得出的值)、却作为事实陈述的**承重外部/技术断言**——无论自信还是含糊(自信而无据者更危险)——标记为 general 问题,且**由新鲜视角的评审者拥有该分类**(作者不能靠把「API 行为断言」改写成「意图」来规避)。与证据规则 + spike 组合(是否发问 / 运行求解 / 事实的形式)。配对 token `verbatim_evidence` + 一条「理由化」表行 + 一个 fixture(基线评审者会接受的自信无据断言 → 索要出处 demand-source)。零 SKILL.md 表面开销。 |
| **v1.12.1** | **为对抗式评审面板的角度(angles)设防同步(gate 完整性加固)。** 五个投票者角度(四条原则重述为对抗视角 + 正确性)存在两份——`review-panel.js` 的 `ANGLES` 与 `l3-phase.js` 的 `PANEL_ANGLES`——作为一条*已登记*但**未设防**的承诺子句,两者已悄然**漂移**(`l3-phase.js` 那份被削短,丢了「speculative abstraction / unstated assumptions / cross-file drift / unreachable logic」):独立面板与内联面板在按略有不同的视角评审。已将 `PANEL_ANGLES` 对齐到更丰富的规范 `ANGLES`(内联面板覆盖面严格增加),并向 `check-consistency.sh` 增加**按数组块锚定的逐字一致性 gate**(已做反向测试:扰动任一字符串即红失败),从而捕捉未来的任何分歧。零 SKILL.md 表面开销。 |
| **v1.12.2** | **Wave-4 反膨胀 / gate 完整性收尾(净负向的卫生整理,无行为变更)。** 六个条目:**F6** 增加逐字一致性 gate,使 `[Calibration]`/`[Grounding]` 评审提示行不能在 `loop-1-design.md` 与 `loop-2-implementation.md` 之间悄然漂移(与 v1.12.1 的 panel-angles 同步为同一修复模式;`[Trip-wires]` 行在 L1/L2 本就不同,已排除)。**F4** 为 `references/*.md` 增加可用环境变量覆盖的**每文件**字数上限(默认 3000),在不惩罚「把细节从 SKILL.md 下沉到 references/」这一设计的前提下,捕捉单个引用文件膨胀。**F15** 将近乎无用的裸词 gate token `consolidation`(15 处偶然出现 → 假绿)替换为独特的、仅限 references 的标记 `consolidation_pass`。**F5/F13/F14** 精简 `failure-retrospective.md`、`loop-3-teams.md`、`optional-subagents.md` 中过度文档化的散文,保留每一个受设防 token、fixture 断言字段与行为规则(四个 `failure-retrospective-*` fixture 仍冷跑通过)。零 SKILL.md 散文表面开销(仅提升 frontmatter 版本号)。 |
| **v1.12.3** | **将 F11(L3 accept 循环预算饥饿)关闭为 won't-fix。** 以 `l3-phase.js` 中 `acceptRound = round` 行上的一条设计理由注释,记录 accept 循环为何刻意共享评审轮次上限预算、而非拥有独立预算:acceptFix 提交是新鲜评审门从未看到的代码,因此给 accept 单独的预算会为换回一个罕见边界情形而成倍增加未经评审的改动(需要过一次评审修复的 Phase 便没有 accept 修复余量);共享预算耗尽的 Phase 按设计升级(escalate)。将 acceptFix 重新经过评审(此举*确能*堵住该绕过)的替代方案经权衡后暂缓——为堵一个至今零次实际发生的漏洞而做整套 L3 重设计并不划算。仅注释,无行为变更;该注释遵循 §0.3(解释代码本身,不含审计标签)。零 SKILL.md 散文表面开销。 |
| **v1.13.0** | **跨运行时可移植性(Claude Code / Codex / opencode)。** 本技能的结构本就符合 agentskills.io 开放标准,因此可从同一份规范文件夹在三种 agent 运行时上运行;本次发布把这一点显式声明出来,且不改变任何纪律规则。新增 `references/platforms.md`,承载**逐运行时安装/发现矩阵**(Claude Code 用 `.claude/skills/`、Codex 用 `.agents/skills/`、opencode 两者皆读)、从每个 Claude-Code 机制到其**手动模式实现**的**能力映射**(含 `AskUserQuestion → STOP:QUESTION`),以及**新鲜评审者隔离阶梯**(派生 subagent → 新鲜/清空的上下文 → 公开披露降级,并诚实说明:没有 subagent 的运行时无法自我强制隔离)。`SKILL.md` 新增一个顶层 `compatibility` frontmatter 字段 + 一行专用路由,并重构 L3 编排划分:**将 Workflow 模式命名为 Claude-Code 加速层、将手动模式命名为 Codex/opencode 所运行的可移植基线**(沿用既有词汇;D8 重申手动模式保留 L3「首轮即清洁」放宽,不改任何规则)。配对的 `cross_runtime` 漂移 token + 新增的 `no-subagent-review-stays-fresh` 行为 fixture 为 SKILL.md ↔ platforms.md 这一对设防。常驻加载字数上限一次性上调 **2888 → 2920**,作为对诚实的 `compatibility` 字段 + 该路由行的、有界的、经用户授权的额度——是真实的新能力,而非漂移的许可证。 |
| **v1.14.0** | **修复环节的测试完整性(flake)规则**(源自对 *loop engineering* —— Cobus Greyling / Addy Osmani —— 的评审;这是该技能尚未纳入的、唯一可迁移的安全护栏)。修复环节告诉 agent **如何找到成因**(`diagnosis_method`)以及**找不到成因时怎么办**(升级上报),却从未命名「诊断出的成因是**非确定性**」这一情形:在 accept/fix 循环的「变绿压力」下,最省 token 的做法是**掩盖**一个 flaky 失败——禁用/跳过测试、放松断言、加盲目重试、或调大超时把进度条刷绿(即 loop engineering 的「用代码修 flake」反模式)。现在,一旦某个失败被诊断为非确定性(重跑即过、无代码改动——是 flake,而非本 diff 的回归),修复环节**说明成因并把该 flake 作为独立事项升级上报**,而不是掩盖它;确定性失败仍归 `diagnosis_method` 处理。接入 `loop-3-development.md`、**两个** `l3-phase.js` 修复提示词,以及一行 Rationalizations;配对 token `test_integrity` + 一个经 spike 验证、不可作弊的 fixture。**一次设计期 A/B spike 测出了增量**:强模型修复 agent 本就拒绝掩盖(在其上为 no-op),但**弱/降配路由**的修复 agent(`models.fix` 允许的档位)会 **5/5** 掩盖该 flake,而规则将其纠正到 **0/5**——因此该规则是针对技能自身所允许路由的模型稳健性护栏。零 SKILL.md 常驻面(仅 frontmatter 版本)。 |

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
└── README-cn.md                      本文件
```

## 修改本工作流

这个 skill **按其自身定义就是 load-bearing 的**。修改 `SKILL.md` 或任何 `references/*.md` 都会触发完整的 L1 → L2 → L3 循环。

一条过渡条款:当一份 load-bearing 文档**首次引入**或首次被追溯归类为 load-bearing,允许用一份一页篇幅的追溯设计简报加上一次连续两轮干净的独立评审来替代完整三循环。后续修改必须走正式流程。

## 许可证

MIT —— 见 [LICENSE](./LICENSE)。

## 致谢

v1.5 的人因 / 工艺层概念(理由化 / 红旗速查表、去摘要化的 description 思路、校准的严重度)改编自 [superpowers](https://github.com/obra/superpowers) skill 集合(Jesse Vincent,MIT)。
