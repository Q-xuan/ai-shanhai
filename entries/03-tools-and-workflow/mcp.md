---
term: MCP
slug: mcp
order: 2
translation: 模型上下文协议
---

## 一句话解释

MCP(Model Context Protocol)是一套开放标准,让 AI 工具用统一的方式接入外部能力——数据库、GitHub、Figma、公司内部系统——不用每家各写各的对接代码。

## 展开说说

没有 MCP 之前,想让 AI 助手连上 GitHub,工具厂商得专门写一套 GitHub 集成;想连数据库,再写一套。MCP 的思路像「AI 界的 USB-C」:

- **MCP Server**:能力提供方,比如「GitHub MCP server」对外暴露「查 issue」「建 PR」这些工具;
- **MCP Client**:AI 工具(如 Kimi Code、Claude Desktop、Cursor),按标准协议连接任意 server,即插即用。

好处是生态一次建设、处处可用:社区写好的几千个 MCP server,你的工具装上就能用。坏处也现实:装来路不明的 MCP server 等于给它开了你系统的权限,留意安全。

## 你会听到有人这么说

> 「装个 Postgres 的 MCP server,让 AI 直接查表结构。」

> 「这报错是 MCP server 挂了,不是模型的问题。」

## 老司机锐评

MCP server 宁缺毋滥。每装一个就多一份 token 开销(工具描述要占 context)和一份攻击面,只装真正天天用的。
