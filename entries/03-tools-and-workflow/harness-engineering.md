---
term: Harness Engineering
slug: harness-engineering
order: 6
translation: 执行壳工程
---

## 一句话解释

Harness Engineering 是「设计和打磨 harness 」的工程:系统提示怎么写、工具怎么设计、权限怎么分级、出错怎么兜底——把同一个模型从玩具变成可靠工具的那层手艺。

## 展开说说

模型能力是模型提供商的事,而 agent 可不可靠,八成取决于壳做得好不好。这门工程管的事:

- **工具设计**:给模型什么工具、描述怎么写、参数怎么校验——Tool Calling 稳不稳全看这里;
- **系统提示**:行为准则、边界情况、输出格式的几十条军规;
- **权限与安全**:哪些操作自动放行、哪些必须 Human in the Loop;
- **兜底机制**:Agent Loop 空转了怎么限步、输出格式错了怎么重试、测试怎么自动跑。

和前两者一起凑成「工程三件套」:Prompt Engineering 管「怎么说」,Context Engineering 管「给它看什么」,Harness Engineering 管「它能做什么、做错了怎么办」。普通用户调前两个,做 agent 产品的人主攻第三个。

## 你会听到有人这么说

> 「同一个模型,他们家 agent 就是稳——harness engineering 的功底差距。」

> 「这工具描述写得太含糊,模型天天调错,是 harness 的锅。」

## 老司机锐评

模型半年一换,harness 的工程资产却越攒越厚:好的工具描述、权限策略、校验回路,换个模型照样用。做产品别把宝全押在模型上,壳才是护城河。
