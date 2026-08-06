---
term: Token
slug: token
order: 3
translation: 词元
---

## 一句话解释

Token 是 AI 读文字的「最小单位」,也是计费单位。一个 token 大概是 0.75 个英文单词,或者半个到一个汉字。你说的每句话、AI 回的每个字,都在烧 token。

## 展开说说

AI 不是按「字」或「词」读文本的,它先把文本切成一个个 token 再处理。比如 "unbelievable" 可能被切成 `un` + `believ` + `able` 三个 token;中文里「人工智能」可能是两个 token。

为什么要在乎 token?两个原因:

1. **钱**:API 按 token 收费,输入输出都收(输出通常更贵)。
2. **容量**:模型的 Context Window(上下文窗口)是用 token 数的,塞满了它就「记不住」更早的内容。

经验法则:一个代码文件几千 token,一个长对话轻松上万。觉得 AI 变笨了、变贵了,先看看 token 消耗。

## 你会听到有人这么说

> 「把整个仓库都塞进 prompt 了,这一问烧了我两万 token。」

> 「回答到一半断了——max tokens 设太小了。」

## 老司机锐评

Token 是 AI 时代的「流量包」。新手按字数估算成本,老手按 token 看账单。顺便:代码比散文更费 token,因为缩进、符号都算数。
