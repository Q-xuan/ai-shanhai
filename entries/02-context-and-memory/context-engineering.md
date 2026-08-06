---
term: Context Engineering
slug: context-engineering
order: 5
translation: 上下文工程
---

## 一句话解释

Context Engineering 是「系统性策划 AI 每一轮能看到什么」的工程:选哪些文件、写不写 AGENTS.md、何时压缩、工具结果留多少——把 context 当稀缺的工程资源来经营。

## 展开说说

这个词 2025 年走红(Karpathy、Shopify 的 Tobi 等人公开站台),被视为 prompt engineering 的继任者。逻辑很简单:模型是无状态的,context 是你**唯一可控的输入**,那么决定输出质量的最大变量,就是你往这扇窗口里放了什么。

它管的事比 prompt 宽得多:

- **拿什么进来**:手动 @ 文件、代码库索引、RAG 检索、MCP 工具返回;
- **留什么常驻**:AGENTS.md、记忆文件、系统提示——每次都占着 token 的那部分;
- **什么时候清**:会话脏了开新的、窗口满了 compact——防止 Context Rot 的日常操作。

一句话总结它和近亲的分工:Prompt Engineering 管「怎么说」,Context Engineering 管「给它看什么」,Harness Engineering 管「它能干什么」。

## 你会听到有人这么说

> 「结果差别怪模型,这是 context engineering 没做好——该给的文件没给。」

> 「prompt 写得再花哨,context 是脏的也白搭。」

## 老司机锐评

这是目前投入产出比最高的一门「工程」:不用训练模型、不用写代码,把喂给 AI 的资料管好,表现立竿见影。新手玩 prompt,老手经营 context。
