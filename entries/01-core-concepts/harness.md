---
term: Harness
slug: harness
order: 5
translation: 执行壳
---

## 一句话解释

Harness 是套在模型外面的那层软件:系统提示、工具、权限、上下文管理。模型只会「文字进、文字出」,让它看起来会干活的一切,都是 harness 做的。

## 展开说说

模型本身是个「残废」:不能读文件、不能跑命令、记不住上一句话。是 harness 在每一轮请求前组装好 context、执行模型发来的 tool call、把工具结果喂回去、保管会话历史、在危险操作前喊你确认。Agent Loop 的实际运转者就是它,模型只是循环里被反复调用的一个函数。

这个概念最大的用处是**诊断问题**:同一个模型,在 Kimi Code、Claude Code、Cursor 里表现完全不同——差异主要在 harness(系统提示、工具集、权限策略),不在模型。所以 agent 犯傻时,先怀疑 harness 喂的 context,再怀疑模型本身。

你的绝大多数配置也写在 harness 层:`AGENTS.md`、权限模式、MCP servers,都是给 harness 的指令,不是给模型的。

## 你会听到有人这么说

> 「同一个模型,为什么 A 工具敢直接改文件,B 工具只会动嘴?——harness 不同。」

> 「别急着换模型,先看看 harness 给它喂了什么东西。」

## 老司机锐评

对日常体验来说,选 harness 比选模型影响更大。模型是发动机,harness 是整辆车——你天天开的是车,不是发动机。
