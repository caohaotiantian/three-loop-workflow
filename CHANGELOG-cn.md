# 更新日志

three-loop-workflow skill 的完整版本历史。skill 的介绍、适用范围与安装方式见 [README-cn.md](./README-cn.md)。

## v2.2.0 —— 门禁现在会失败了

一次针对整个仓库的对抗式审计发现:所有用来检查这个项目的机制,都属于以下四种之一 —— 一次 token grep、
一个由 agent 自己填的布尔值、一个对逻辑一无所知的解析器,或者干脆什么都没有。那些不变式确实是对的,但它们
之所以是对的,靠的是作者足够用心,而不是靠「否则会有东西发现」—— 而这个项目已经发布过的两次回归,当时门禁
都是绿的。

**验收脚本又变成了 v1 的 `check-consistency.sh`。** 它用 `grep -q` 来钉住 `phase.js` 的守卫。用
`false &&` 把两个空 diff 守卫同时关掉、所有 token 原样保留,它依然打印 `ok an uncommitted phase is
rejected, not reviewed` 和 `ACCEPT: all checks passed`,退出码 0。直接把一个守卫整段删掉也照样通过,因为
规则的措辞还留在它上面的注释里。两种情况都在一个全新 clone 里复现过。控制流现在**由执行来断言**:
`scripts/sim-phase.js` 用桩 agent 驱动真实脚本,`scripts/negative-test.sh` 用二十一种方式破坏这两个脚本,
只要 harness 漏掉一个就失败。这里可以把结论说白:要检查一条**规则**,就去运行它;只对**文本**用 grep ——
文本的存在本身就是你想要的性质。

**验收脚本现在也进版本控制了。** 它原先住在一个被 gitignore 的任务目录里,却是六个发布提交 `Gates:` 里
引用的证据,而它的上一代已经找不回来了。`SKILL.md` §2 不再叫你把验收脚本放在那儿。

**CI 会在每次 push 和 pull request 上运行。** 在此之前根本没有任何东西自动运行;发布流程就是 checkout、
zip、上传。现在它还会拒绝与 frontmatter 版本不一致的 tag,并校验打包产物里到底装了什么。

**`phase.js` 对「agent 只是自己报上来」的任何东西都失败关闭(fail closed)。** 一个格式合法但实现者从未
创建过的 sha,过去能让一个阶段在空 diff 上判定收敛;现在会拿门禁步骤自己跑出来的 `git rev-parse HEAD` 与
base 交叉核对,**每一轮都核对**,包括某一轮修复把本阶段提交重置掉的情况。无法解析的 sha 会让阶段停下,而
不是悄悄停用它下游的那些守卫。修复 agent 死掉算错误,不算用掉一轮。评审者只拿到 diff 和计划,别的都不给
—— 实现者自己写的「最没信心的部分」过去会同时发给两名评审者,而这恰好破坏了两评审者规则所依赖的独立性。
non-blocking 发现与分诊驳回记录会跨轮累积并返回给调用方,先前的驳回还会带进下一轮分诊,这样同一个幽灵不
会被反复重新推导。`depth: 'standard' | 'deep'` 是声明「跑多少评审」的首选写法;`reviewers` 仍然有效,但
两个都不传现在是错误 —— 一个默认为 1 的计数,曾让 Deep 阶段因为漏传参数而跑成 Standard 评审。

**双臂套件现在自己计算结论,而不是断言结论。** `suite_pass` 过去是评分 agent 填进 schema 的布尔值;一个
返回零行 + `suite_pass: true` 的 agent 就能让整轮变绿 —— 而这个套件存在的理由,正是它的前身连续 16 个版本
亮着绿灯却什么都没测量。现在读取 agent 只报告它读到了什么,所有比较都是脚本里的算术。

**「两臂都答对的 fixture 判为 INVALID」对七个 fixture 里的六个都是错的**,而这恰恰是被当作「本套件区别于
那个因为是摆设而被删掉的旧套件」的性质。其中六个是回归 guard,对它们来说两臂都答对就是通过。现在每一处
这个说法都带上了限定词。

**安装命令装不上。** 当 `skills/` 还不存在时,`cp -r three-loop-workflow <repo>/.claude/skills/` 拷进去的
是文件夹的**内容** —— 而这正是「跑过 Claude Code 但从未安装过 skill」的仓库的常见状态。`SKILL.md` 落高了
一层,退出码 0,没有任何警告,skill 永远不会被激活。两个 README 现在都先 `mkdir -p`,而门禁会去跑 README
自己写的那几条命令。

**`close.md` 增加了 Deep 档的「整体成品阅读」。** 在 v2.0.0 那次发布上,一轮又一轮的 diff 评审都没能拦住
那个版本里最严重的缺陷,而拿到成品文件、没有任何变更上下文的读者一眼就发现了它。抓住它的那种评审方式,
在 skill 里根本没有出现过。

**`SKILL.md` 说明了「没有项目指南时怎么办」。** 三个 Deep 触发条件里的一个、以及门禁步骤,都要通过一份
任何外部标准都不要求的 anchor map 去解引用角色,而任何地方都没写过兜底 —— 于是在没有采用这套约定的仓库
上,Deep 清单有三分之一是静默失效的。

另外:语法门禁现在会对 `Date.now()`、`Math.random()`、无参 `new Date()` 以及缺失 `export const meta` 失败,
并带有双向的固化 fixture;`build.md` 里关于 worktree 清理和链式调用示例的两处事实错误已修正。

这个结果要窄着读。本次一共用掉三轮修复,并触及上限。十九条已确认的发现里,有十条是本次发布**新加的**门禁
与 harness 自身的缺陷 —— 检查者需要被检查,而且是两次 —— 另有两条只有靠它引入的「整体成品阅读」才发现。
本次发布自己的提交信息里有两处说法也说过了头,已在任务记录里更正,而不是靠改写历史。三轮上限对于这种形状
的变更是否合适,本次并未定论。

## v2.1.0 —— 多阶段 Deep 工作现在真的跑得起来

随 v2.0.0 一起公布的三条批评被标为「已记录、未修复」。它们进入那份清单时**没有经过分诊** —— 这与「把未确认的发现计入」是同一个错误,只不过发生在汇报方向上。正式分诊后:一条是误读,两条是真的。

**多阶段 Deep 工作根本无法正确运行。** `scripts/phase.js` 让每个阶段的实现者各自建分支;`references/build.md` 却说各阶段共用一个工作树、并且「分支名不等于隔离」;整个 skill 里没有任何地方会合并阶段分支;而且已关闭的阶段不返回 head commit,调用方即便想推进基线也做不到。给每个阶段传同一个 `baseSha`,第 3 阶段的评审者就会连第 1、2 阶段一起看到,并正确地把它们报成「超出本阶段目标的改动」,白白烧掉一轮修复。现在:各阶段是同一条分支上的顺序提交,已关闭的阶段返回其评审真正看到的那个 commit,`build.md` 给出串联它们的循环写法。

**Deep 此前不论大小都套用同一整套流程。** 对契约文件改一行规则会命中 Deep 清单,于是连分阶段构建和完整 Close 都要走一遍。它仍然要记录备选方案、仍然要两名评审者 —— 那正是它属于 Deep 的原因 —— 但这套组合现在会按规模缩放:一个阶段,一次只有几个问题的 Close。`SKILL.md` 同时写明了每一档要花多少个 agent:选档就是做成本决策的那一刻,而这个 skill 此前从未说过。

**手工路径也一并修好了。** 这次改动的第一版只修了 `scripts/phase.js`;`build.md` 仍然告诉手工执行 Deep 的人「动手前捕获一个 `baseSha`」,并让每个阶段都对着它评审。那正是其它运行时使用的可移植路径,否则这次修复只会发布一半。

**agent 报告的 sha 现在会被校验。** 空 diff 守卫是一次相等比较,因此一个缩写的或带空白的 sha 会比较不相等,从而放过一个未提交的阶段。`sha()` 现在要求完整的 40 位十六进制对象 id;同时,一轮什么都没提交的修复也会被抓出来,而不是对着一棵没变过的树一路磨到 cap-exhausted。

**已驳回:** 「Deep 触发条件会对契约文件的*任何*改动生效」。原文写的是「改变了规则的改动」,而 Direct 一行已经涵盖 typo、注释与格式。该批评误读了表格。

第三条 —— 大量散文只是在复述一个有能力的模型本来就会做的事 —— 成立,本次未修复,并且是实测过的:7 个行为 fixture 里有 6 个,被一个禁止阅读 skill 的 agent 正确回答。

## v2.0.0 —— 彻底重写

**破坏性变更。** v2 是替换 v1,而不是在其上做增量。所有循环名与档位名都变了,v1 的 20 个文件中有 18 个已不存在;只有 `SKILL.md` 与 `references/platforms.md` 保留了原路径,而这两个文件的内容也被重写。v1 的安装无法向前兼容。升级路径见 [docs/announcement-v2.0.0-cn.md](./docs/announcement-v2.0.0-cn.md),每项决策背后的实测依据见 [docs/why-v2-cn.md](./docs/why-v2-cn.md)。

| | v1.14.0 | v2.0.0 |
|---|---|---|
| `SKILL.md` | 2,915 词 | **1,307 词** |
| 全部散文(仅 Markdown) | 21,802 词 | **6,047 词** |
| skill 内文件数(含脚本) | 20 | **8** |
| 每个任务提交的文档数 | 2 | **0**(临时的 `.agent/<task>/plan.md`) |

**结构。** L1 → L2 → L3 → F 变为 **Plan → Build → Close**。L1 与 L2 本来就是一份计划被人为切成两半;合并之后,slug 协议、回滚协议、Deprecated 章节约定,以及一整个评审循环都随之消失。Full/Light/None 变为 **Deep/Standard/Direct**,依据「影响半径」与「可逆性」分档,深度档用一份清单来判定,而不再是一堆定性谓词的析取。每任务归档 `docs/design/` + `docs/implementation/` —— 43,822 词,而实际交付产品只有 27,896 词,且没有任何人类读过 —— 被受 gitignore 的 `.agent/<task>/plan.md` 取代,每个任务一个目录。

**每个任务一个计划目录。** 计划位于 `.agent/<task>/plan.md`,该任务范围内的其它东西 —— 验收脚本、临时笔记 —— 都放在同一个目录里。单个固定的 `.agent/plan.md` 有两个问题:共用一个 checkout 的两个任务会互相覆盖,而一个任务结束后不留下任何关于它决定了什么的记录。这等于重新引入了「每任务 slug」—— v2 本已把它连同 v1 的提交式归档一起删掉 —— 但理由不同:这是为了本地隔离与可追溯性,而不是为了提交一份没人会读的文档。相应地,`close.md` 现在要求**保留**这个目录,而不是删除它。`scripts/phase.js` 取消了 `planPath` 的默认值(没有任何默认值能知道任务名),缺失时以 `usage-error` 拒绝。

**门禁先于 agent。** 项目自己的 typecheck / lint / build / test 现在会在派出任何评审者**之前**运行。v1 只在一处括号里提过一次。

**Deep 档两名评审者,Standard 档一名 —— 这是实测结果,不是拍脑袋。** 4 份设计文档 × 3 名独立评审者,随后把全部 116 条发现打乱、盲化,每份文档交给 2 名对抗式裁决者复判:对所有评审者顺序取平均后,1 名评审者覆盖率 **56.5%**,2 名 **85.5%**,第 3 名再增加约 14%。这个结果**推翻了原定计划** —— 原计划是删掉这一轮确认评审。

**先分诊,再计数。** 同一次验证暴露出评审者的精确率很差:被判为 *blocking* 的发现只有 50–70% 经得起裁决,其余等级的只有 30–46%。因此收敛判定现在基于**已确认**的发现。`phase.js` 只在真正执行了修复时才递增轮次计数,修掉了 v1 runner 的饥饿缺陷:在 v1 里,一条 general 发现就会让 accept-fix 预算归零,两轮修复之后,一个干净的第 3 轮会被报成 cap-exhausted。

**每一项删除都给出依据。** `check-consistency.sh` 被删:把 `SKILL.md` 的核心终止规则替换成语义完全相反的版本、只在 HTML 注释里保留那个 token,它依然返回 `three-loop-consistency: OK`,退出码 0。五投票者面板及其反通胀条款被删(被要求「保守一点」的评审者会少报问题)。独立的 accept subagent 被删。v2 草案阶段携带的两个 hook 脚本 —— `require-plan.sh` 以及从 v1 沿用的 `validate-commit-msg.sh` —— 在发布前被移除;它们从未出现在任何一个 v2 发布版里。v2 不再机械强制任何东西,并且明说了这一点。

**能够失败的测试。** v1 的 `tests/scenarios/` 实测**区分度为 0%** —— 6 个 fixture、两条臂,skill-off 6/6、skill-on 6/6,连续 16 个版本亮着绿灯却不携带任何信息。替代方案会在「加载 skill」与「屏蔽 skill」两种条件下各跑一遍每个 fixture,两臂都答对的 fixture 判为 INVALID 而不是绿灯。本次发布针对已发布的代码树实跑:`suite_pass: true`,6/6 guard 守住,无 GUARD-BROKEN,唯一那个区分性 fixture 有效 —— 对照臂因为一个角落有风险就把整个四文件变更升档,skill 臂没有。但要窄着读。评分者自己的告诫是:这是「未发现回归」,而不是对这套纪律的验证 —— 七个 fixture 里只有一个具备区分能力,三个 guard 的两条臂都报告场景正文已把规则说出来了,而那个唯一起作用的 fixture,部分依赖于选项本身的措辞。有两个原本按「区分性」写的 fixture 没能区分,被在 `expected.json` 里明确降级为 guard,而不是悄悄改个标签。

**已知不完备之处,如实列出而非隐藏:** 评审者方差的证据测自一次工作会话,其原始产物不在本仓库中,因此那些数字无法从仓库复现;`close.md` 靠论证而非证据支撑;两名评审者的结论是在设计文档上测得的,不是在 diff 上;「第一轮干净的评审只是弱证据」这一推论来自检出率的推算,从未被直接观测到;此外,7 个 fixture 里有 6 个被一个禁止阅读 skill 的 agent 正确回答,因此这套纪律的大部分与模型自身判断是重复的。真正留下来的,是那些**具体且反直觉**的规则。

## v1 历史

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
