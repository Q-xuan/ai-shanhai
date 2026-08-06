# AGENTS.md — AI 山海经 · AI 编程黑话词典

给后续维护本项目的 agent 的约定与经验。**先读完再动手。**

## 项目是什么

中国风的开源 AI 编程术语词典:术语保留英文,解释全部中文。主视图是一张「词脉图」(Obsidian 式关系图谱,铜钱节点 + 水墨远山 + 朱砂配色),点节点从右侧册页读词条。

## 目录结构与数据流

```
entries/            ← 唯一的内容源,改内容只动这里
  sections.json     ← 分区登记:文件夹名 / 中文标题 / 英文标题 / 简介
  01-core-concepts/ ... 05-culture/   ← 一个术语一个 .md
scripts/
  generate.ts       ← entries → README.md
  build-site.ts     ← entries → index.html(单文件词脉图应用)
  check.ts          ← 校验两个产物与 entries 同步(CI 用)
  serve.ts          ← 本地 live server(0.0.0.0,改 entries 自动重建+刷新)
README.md, index.html   ← 生成产物,严禁手改
```

数据流:`entries/` → `npm run build` → `README.md` + `index.html`。

## 铁律

1. **绝不手改 `README.md` 和 `index.html`**,改了 `npm run check` 必然报错。改内容 = 改 `entries/` + `npm run build`。
2. **`scripts/generate.ts`、`scripts/build-site.ts` 直接运行才写文件**(文件尾有 `process.argv[1]` 判断)。被 `check.ts` 导入时不能有副作用——改这两个脚本时保留这个 guard。
3. **提交前必跑**:`npm run ci`(prettier + 同步校验)和 `npx tsc --noEmit`,全绿再提交。
4. **零运行时依赖**。frontmatter 解析、markdown→HTML、力导向图全是手写的,保持这样,不要引库。

## 词条写作约定

- frontmatter 四字段:`term`(英文原词)/ `slug`(小写连字符,全库唯一)/ `order`(分区内排序)/ `translation`(中文通译)。
- 正文固定四段,用 `##` 二级标题:**一句话解释 → 展开说说 → 你会听到有人这么说 → 老司机锐评**。生成器会自动把正文标题降两级,源文件里保持 `##`。
- 正文支持的 markdown 子集:`##`、`-` 列表、`>` 引用、`**粗体**、`` `代码` ``。别用表格、图片、链接(极简解析器不认)。
- 口吻:大白话、有观点、对新手友好;「锐评」段要敢下判断。
- 写词条时**自然提及其他词条的英文名**(如 Context、Agent Loop),词脉图的边就是这么自动连上的——正文 `\\b词名\\b` 匹配即连边。
- 译法约定:用业界通行译法而非直译(如 Human in the Loop →「人在回路」不是「人在循环」;Subagent →「子智能体」与 Agent=智能体 保持一致)。拿不准先搜查证,别拍脑袋。

## 网页版(build-site.ts)的坑——都是踩过的

- **TEMPLATE 是 TS 模板字符串**:内嵌客户端 JS **禁止出现反引号和 `${`**(除非是有意的 TS 插值)。客户端 JS 一律字符串拼接。
- **canvas 是可替换元素**:`position:fixed; left:0; right:0` 不会拉伸它,会缩回 300×150 固有尺寸。必须显式 `width:100vw; height:calc(100vh - 64px)`。
- **力导向布局调参**:参数在 tick() 里(斥力 16000/d²、弹簧 L=260 k=0.01、向心 0.0025、限速 ±8、阻尼 0.82,预跑 300 帧)。加词条后若布局拥挤,把 NODES/LINKS 从 index.html 抠出来丢进离线模拟器试参数,别在浏览器里盲调。参考指标:最小节点间距 ≥100px。
- **弹簧力别多乘 d**:力∝距离即可,乘成 d² 会发散,节点全被甩出画布。
- **首帧要同步 draw()** 一次再进 rAF 循环,否则无头截图/慢设备上看到空白。

## 验证视觉效果的正确姿势

`npm run ci` 只验同步,不验渲染。改视觉后必须实际看:

```bash
# 无头 Chrome 截图(快,适合全景)
chrome --headless --disable-gpu --window-size=1440,900 \
  --virtual-time-budget=5000 --screenshot=out.png "file:///.../index.html"
# 交互态(选中/册页/索引)用 CDP:headless chrome 开 --remote-debugging-port,
# 再用 CDP 客户端 navigate + Input.dispatchMouseEvent 点击 + captureScreenshot
```

注意:占着调试端口的僵尸 headless chrome 会让新实例 bind 失败,先清进程再换端口。

## 本地预览

`npm run serve` → http://localhost:3000(绑 0.0.0.0,局域网可访问)。只监听 `entries/`;改 `scripts/` 后浏览器需手动刷新。

## 部署

GitHub Pages:master 分支根目录直接托管 `index.html`。发布流程:改 entries → `npm run build` → `npm run ci` → 提交推送。
