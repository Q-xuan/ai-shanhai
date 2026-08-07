/**
 * build-site.ts — 从 entries/ 生成中国风词脉图单页应用 index.html。
 * 主视图即词脉图:点词条节点,右侧滑出释义册页。自包含,零依赖。
 */
import { writeFileSync } from "node:fs";
import { loadSections, type Entry } from "./generate.js";

const CN_NUMERALS = ["壹", "贰", "叁", "肆", "伍", "陆", "柒", "捌", "玖", "拾"];
/** 分区配色(中国传统色):朱砂 / 黛蓝 / 苍绿 / 藤黄 / 紫檀 */
const SECTION_COLORS = ["#b3342a", "#3a5a7a", "#4a7a5a", "#b8862f", "#7a4a6b"];
const COLOR_NAMES = ["朱砂", "黛蓝", "苍绿", "藤黄", "紫檀"];

/** 词条正文用到的极简 markdown 子集:## 标题、> 引用、- 列表、**粗体**、`代码`。 */
function mdInline(text: string): string {
  return text
    .replace(/&/g, "&amp;")
    .replace(/</g, "&lt;")
    .replace(/>/g, "&gt;")
    .replace(/\*\*(.+?)\*\*/g, "<strong>$1</strong>")
    .replace(/`([^`]+)`/g, "<code>$1</code>");
}

function mdToHtml(md: string): string {
  const out: string[] = [];
  const lines = md.split("\n");
  let i = 0;
  while (i < lines.length) {
    const line = lines[i];
    if (!line.trim()) {
      i++;
      continue;
    }
    if (line.startsWith("## ")) {
      out.push(`<h4>${mdInline(line.slice(3))}</h4>`);
      i++;
      continue;
    }
    if (line.startsWith("> ")) {
      out.push(`<blockquote>${mdInline(line.slice(2))}</blockquote>`);
      i++;
      continue;
    }
    if (line.startsWith("- ")) {
      const items: string[] = [];
      while (i < lines.length && lines[i].startsWith("- ")) {
        items.push(`<li>${mdInline(lines[i].slice(2))}</li>`);
        i++;
      }
      out.push(`<ul>${items.join("")}</ul>`);
      continue;
    }
    out.push(`<p>${mdInline(line)}</p>`);
    i++;
  }
  return out.join("\n");
}

export function buildSite(): string {
  const { sections, entriesByDir } = loadSections();
  const totalTerms = [...entriesByDir.values()].reduce((n, list) => n + list.length, 0);

  // 词脉图节点:带分区色;text 供搜索匹配(英文词 + 中文 + 正文)
  const nodes: Array<Record<string, unknown>> = [];
  const all: Entry[] = [];
  sections.forEach((section, si) => {
    for (const e of entriesByDir.get(section.dir)!) {
      all.push(e);
      nodes.push({
        id: e.slug,
        label: e.term,
        trans: e.translation,
        c: si,
        text: `${e.term} ${e.translation} ${e.body}`.replace(/\s+/g, " ").toLowerCase(),
      });
    }
  });

  // 边:某词条正文提到另一词条的英文名即连边
  const linkKeys = new Set<string>();
  const links: Array<[number, number]> = [];
  all.forEach((a, i) => {
    all.forEach((b, j) => {
      if (i === j) return;
      const escaped = b.term.replace(/[.*+?^${}()|[\]\\]/g, "\\$&");
      if (new RegExp("\\b" + escaped + "\\b", "i").test(a.body)) {
        const key = i < j ? i + "-" + j : j + "-" + i;
        if (!linkKeys.has(key)) {
          linkKeys.add(key);
          links.push([i, j]);
        }
      }
    });
  });

  // 释义册页的内容池(隐藏,点击节点时取出)
  const pool = all
    .map(
      (e) => `  <div data-slug="${e.slug}">
    <h2 class="d-term">${e.term}<span class="trans">${e.translation}</span></h2>
${mdToHtml(e.body)}
  </div>`,
    )
    .join("\n");

  // 图例
  const legend = sections
    .map(
      (s, i) =>
        `    <div><span class="dot s${i}"></span><span class="num">${CN_NUMERALS[i]}</span><span class="cname">${COLOR_NAMES[i % COLOR_NAMES.length]}</span>${s.title}</div>`,
    )
    .join("\n");

  // 索引浮层
  const indexSections = sections
    .map((s, i) => {
      const terms = entriesByDir
        .get(s.dir)!
        .map((e) => `<a data-slug="${e.slug}">${e.term}</a>`)
        .join(" · ");
      return `    <div class="idx-sec">
      <h3><span class="num" style="color:${SECTION_COLORS[i % SECTION_COLORS.length]}">${CN_NUMERALS[i]}</span>${s.title}<span class="en">${s.titleEn}</span></h3>
      <p>${terms}</p>
    </div>`;
    })
    .join("\n");

  return TEMPLATE.replace("__NODES__", JSON.stringify(nodes))
    .replace("__LINKS__", JSON.stringify(links))
    .replace("__EDGE_STYLE__", "")
    .replace("__POOL__", pool)
    .replace("__LEGEND__", legend)
    .replace("__INDEX__", indexSections)
    .replace("__TERM_COUNT__", String(totalTerms))
    .replace("__SECTION_COUNT__", String(sections.length));
}

const TEMPLATE = `<!DOCTYPE html>
<html lang="zh-CN">
<head>
<meta charset="UTF-8">
<meta name="viewport" content="width=device-width, initial-scale=1.0">
<!-- 此文件由 scripts/build-site.ts 自动生成,请勿手改。修改 entries/ 后运行 npm run site -->
<title>AI 山海经 · AI 编程黑话词典</title>
<meta name="description" content="用大白话(中文)解释 AI coding 里的英文黑话:Agent、Context、Token、Hallucination、Vibe Coding……">
<style>
  :root {
    --paper: #f5efe0;
    --card: #fdfaf2;
    --ink: #2b2620;
    --ink-soft: #6b6152;
    --cinnabar: #b3342a;
    --cinnabar-dark: #8c271f;
    --line: #ddd2b8;
    /* 画布主题变量(canvas 通过 getComputedStyle 读取,单一事实源) */
    --ridge1: rgba(43, 38, 32, 0.05);
    --ridge2: rgba(43, 38, 32, 0.07);
    --edge: rgba(43, 38, 32, 0.13);
    --node-mode: coin;
    --edge-style: simple;
    --sc0: #b3342a; --sc1: #3a5a7a; --sc2: #4a7a5a; --sc3: #b8862f; --sc4: #7a4a6b;
  }
  /* 意境:青花——釉下钴蓝,单色素描 */
  body.t-qinghua {
    --paper: #eef3f5; --card: #f7fafb; --ink: #1d3a5f; --ink-soft: #5a7099;
    --line: #c3d2de;
    --ridge1: rgba(29, 58, 95, 0.06); --ridge2: rgba(29, 58, 95, 0.09);
    --edge: rgba(29, 58, 95, 0.18);
    --node-mode: plate;
    --sc0: #1d4e9e; --sc1: #2a5fae; --sc2: #3670be; --sc3: #4a83c8; --sc4: #6496d2;
  }
  /* 意境:青铜——夜色铜绿配金文 */
  body.t-bronze {
    --paper: #17211c; --card: #1f2d26; --ink: #d8c9a3; --ink-soft: #8f8a6a;
    --cinnabar: #c9a96a; --cinnabar-dark: #a8873f; --line: #3a4a3e;
    --ridge1: rgba(216, 201, 163, 0.04); --ridge2: rgba(216, 201, 163, 0.06);
    --edge: rgba(201, 169, 106, 0.22);
    --node-mode: ding;
    --sc0: #c9a96a; --sc1: #6f8f77; --sc2: #8aa082; --sc3: #8a9a6a; --sc4: #9a8a5a;
  }
  /* 意境:敦煌——赭石窟壁,石绿土红 */
  body.t-dunhuang {
    --paper: #2e2118; --card: #3a2c20; --ink: #e8dcc0; --ink-soft: #b09877;
    --cinnabar: #d4713f; --cinnabar-dark: #a8542a; --line: #54402e;
    --ridge1: rgba(232, 220, 192, 0.04); --ridge2: rgba(232, 220, 192, 0.06);
    --edge: rgba(201, 160, 61, 0.32);
    --node-mode: star; --edge-style: star;
    --sc0: #c94f3d; --sc1: #3d7a6a; --sc2: #c9a03d; --sc3: #4a6a9e; --sc4: #8a5a7a;
  }
  .dot.s0 { background: var(--sc0); }
  .dot.s1 { background: var(--sc1); }
  .dot.s2 { background: var(--sc2); }
  .dot.s3 { background: var(--sc3); }
  .dot.s4 { background: var(--sc4); }
  * { box-sizing: border-box; margin: 0; padding: 0; }
  html, body { height: 100%; }
  body {
    font-family: "Noto Serif SC", "Songti SC", "STSong", "SimSun", serif;
    background: var(--paper);
    color: var(--ink);
    overflow: hidden;
  }

  /* ---------- 顶栏 ---------- */
  .topbar {
    position: fixed;
    top: 0; left: 0; right: 0;
    height: 64px;
    display: flex;
    align-items: center;
    gap: 16px;
    padding: 0 18px;
    background: var(--paper);
    border-bottom: 3px double var(--ink);
    z-index: 20;
  }
  .seal {
    display: inline-flex;
    align-items: center;
    justify-content: center;
    width: 44px;
    height: 44px;
    flex: none;
    background: var(--cinnabar);
    color: #f9f3e3;
    font-size: 15px;
    font-weight: 700;
    line-height: 1.3;
    border-radius: 6px;
    transform: rotate(-4deg);
    box-shadow: 0 2px 0 var(--cinnabar-dark);
    letter-spacing: 1px;
  }
  .brand h1 { font-size: 19px; letter-spacing: 3px; white-space: nowrap; }
  .brand p { font-size: 11px; color: var(--ink-soft); letter-spacing: 1px; white-space: nowrap; }
  #q {
    margin-left: auto;
    width: min(320px, 34vw);
    padding: 8px 16px;
    font: inherit;
    font-size: 13.5px;
    color: var(--ink);
    background: var(--card);
    border: 1px solid var(--line);
    border-radius: 999px;
    outline: none;
  }
  #q:focus { border-color: var(--cinnabar); }
  .topbtn {
    font: inherit;
    font-size: 13px;
    letter-spacing: 2px;
    color: var(--ink);
    background: none;
    border: 1px solid var(--line);
    border-radius: 4px;
    padding: 7px 14px;
    cursor: pointer;
    white-space: nowrap;
  }
  .topbtn:hover { border-color: var(--cinnabar); color: var(--cinnabar); }

  /* ---------- 词脉图 ---------- */
  #graph {
    position: fixed;
    top: 64px;
    left: 0;
    width: 100vw;
    height: calc(100vh - 64px);
    touch-action: none;
    cursor: grab;
  }
  #graph:active { cursor: grabbing; }

  .legend {
    position: fixed;
    left: 16px;
    bottom: 14px;
    z-index: 10;
    font-size: 12.5px;
    color: var(--ink-soft);
    background: color-mix(in srgb, var(--card) 88%, transparent);
    border: 1px solid var(--line);
    border-radius: 6px;
    padding: 8px 14px;
    line-height: 1.9;
  }
  .legend .dot { display: inline-block; width: 9px; height: 9px; border-radius: 50%; margin-right: 7px; }
  .legend .num { margin-right: 5px; }
  .legend .cname { color: #a3987f; font-size: 11px; margin-right: 6px; letter-spacing: 1px; }
  .legend .credit { margin-top: 6px; font-size: 11px; color: #a3987f; letter-spacing: 1px; }
  .hint {
    position: fixed;
    right: 18px;
    bottom: 16px;
    z-index: 10;
    font-size: 12px;
    color: var(--ink-soft);
    letter-spacing: 1.5px;
  }
  /* 竖排题字:詞脈 */
  .vtitle {
    position: fixed;
    top: 96px;
    right: 22px;
    z-index: 5;
    writing-mode: vertical-rl;
    font-family: "Kaiti SC", "KaiTi", "STKaiti", "Noto Serif SC", "SimSun", serif;
    font-size: 54px;
    letter-spacing: 22px;
    color: var(--cinnabar);
    opacity: 0.16;
    pointer-events: none;
    user-select: none;
  }

  /* ---------- 释义册页 ---------- */
  #drawer {
    position: fixed;
    top: 64px; right: 0; bottom: 0;
    width: min(460px, 94vw);
    background: var(--card);
    background-image: radial-gradient(rgba(43, 38, 32, 0.03) 1px, transparent 1px);
    background-size: 20px 20px;
    border-left: 3px double var(--ink);
    transform: translateX(106%);
    transition: transform 0.28s ease;
    z-index: 30;
    overflow-y: auto;
    padding: 34px 34px 70px;
    box-shadow: -8px 0 24px rgba(43, 38, 32, 0.12);
  }
  #drawer.open { transform: none; }
  #drawer-close {
    position: absolute;
    top: 10px;
    right: 14px;
    background: none;
    border: none;
    font: inherit;
    font-size: 24px;
    color: var(--ink-soft);
    cursor: pointer;
  }
  #drawer-close:hover { color: var(--cinnabar); }
  #drawer-body h2.d-term {
    font-size: 27px;
    letter-spacing: 1px;
    border-bottom: 3px double var(--ink);
    padding-bottom: 12px;
    margin-bottom: 18px;
  }
  .trans {
    font-size: 13.5px;
    font-weight: 400;
    color: var(--cinnabar);
    border: 1px solid var(--cinnabar);
    border-radius: 3px;
    padding: 1px 8px;
    margin-left: 12px;
    vertical-align: 4px;
    white-space: nowrap;
  }
  #drawer-body h4 {
    font-size: 15px;
    color: var(--cinnabar);
    letter-spacing: 2px;
    margin: 20px 0 6px;
  }
  #drawer-body h4::before { content: "◆ "; font-size: 10px; vertical-align: 2px; }
  #drawer-body p { margin-bottom: 10px; font-size: 15px; line-height: 1.9; }
  #drawer-body ul { margin: 0 0 10px 1.4em; font-size: 15px; line-height: 1.9; }
  #drawer-body li { margin-bottom: 4px; }
  #drawer-body blockquote {
    background: color-mix(in srgb, var(--cinnabar) 7%, transparent);
    border-left: 3px solid var(--cinnabar);
    padding: 8px 16px;
    margin: 8px 0;
    border-radius: 0 4px 4px 0;
    color: var(--ink-soft);
    font-size: 14.5px;
  }
  #drawer-body code {
    background: rgba(43, 38, 32, 0.07);
    padding: 1px 6px;
    border-radius: 3px;
    font-size: 0.9em;
  }
  .chips { margin-top: 26px; border-top: 1px solid var(--line); padding-top: 16px; }
  .chips-title { font-size: 13px; color: var(--cinnabar); letter-spacing: 3px; margin-bottom: 10px; }
  .chip {
    display: inline-block;
    border: 1px solid var(--cinnabar);
    color: var(--cinnabar);
    border-radius: 999px;
    padding: 2px 13px;
    margin: 0 7px 7px 0;
    font-size: 13px;
    cursor: pointer;
  }
  .chip:hover { background: var(--cinnabar); color: #f9f3e3; }

  /* ---------- 索引浮层 ---------- */
  #index-overlay {
    position: fixed;
    inset: 0;
    background: rgba(245, 239, 224, 0.97);
    z-index: 40;
    display: none;
    overflow-y: auto;
    padding: 80px 24px 60px;
  }
  #index-overlay.show { display: block; }
  .index-inner { max-width: 880px; margin: 0 auto; }
  .index-inner > h2 { text-align: center; font-size: 24px; letter-spacing: 10px; margin-bottom: 8px; }
  .index-inner > .intro {
    text-align: center;
    color: var(--ink-soft);
    font-size: 14px;
    max-width: 620px;
    margin: 0 auto 36px;
    line-height: 1.9;
  }
  .idx-sec { margin-bottom: 26px; break-inside: avoid; }
  .idx-sec h3 { font-size: 17px; letter-spacing: 2px; border-bottom: 1px solid var(--line); padding-bottom: 6px; margin-bottom: 8px; }
  .idx-sec h3 .num { margin-right: 8px; }
  .idx-sec h3 .en { font-size: 12px; color: var(--ink-soft); font-weight: 400; margin-left: 10px; }
  .idx-sec p { font-size: 14.5px; line-height: 2.1; color: var(--ink-soft); }
  .idx-sec a { color: var(--ink); text-decoration: none; cursor: pointer; }
  .idx-sec a:hover { color: var(--cinnabar); }
  #index-close {
    position: fixed;
    top: 76px;
    right: 22px;
    background: none;
    border: none;
    font: inherit;
    font-size: 26px;
    color: var(--ink-soft);
    cursor: pointer;
    z-index: 41;
  }
  .hint .m { display: none; }
  @media (max-width: 760px) {
    .idx-cols { columns: 1; }
    .brand p { display: none; }
    #q { width: 100px; font-size: 12.5px; }
    #fit { display: none; }
    .topbtn { padding: 6px 10px; letter-spacing: 1px; }
    /* 窄屏:册页全宽,图例精简,提示换成触屏版 */
    #drawer { width: 100vw; border-left: none; border-top: 3px double var(--ink); }
    .legend { font-size: 11px; padding: 5px 10px; line-height: 1.7; }
    .legend .cname, .legend .credit { display: none; }
    .hint { right: 10px; bottom: 10px; font-size: 11px; }
    .hint .d { display: none; }
    .hint .m { display: inline; }
    .vtitle { font-size: 38px; letter-spacing: 14px; top: 84px; right: 12px; }
  }
</style>
</head>
<body>

<header class="topbar">
  <div class="seal">山海</div>
  <div class="brand">
    <h1>山海經</h1>
    <p>AI 编程黑话词典 · 术语皆英文 · 释义皆中文 · __SECTION_COUNT__ 区 __TERM_COUNT__ 词</p>
  </div>
  <input id="q" type="search" placeholder="搜词:agent / token / 幻觉 …" aria-label="搜索词条">
  <button class="topbtn" id="theme-btn" title="切换意境:宣纸 / 青花 / 青铜 / 敦煌">宣 纸</button>
  <button class="topbtn" id="fit" title="回到全景">回 中</button>
  <button class="topbtn" id="index-btn" title="词条索引与关于">索 引</button>
</header>

<canvas id="graph"></canvas>
<div class="vtitle">詞脈</div>

<div class="legend">
__LEGEND__
  <div class="credit">词条互相引用成网 · 开源 MIT · 内容源于 entries/</div>
</div>
<div class="hint"><span class="d">拖空白平移 · 滚轮缩放 · 点词看释义</span><span class="m">单指拖动 · 双指缩放 · 点词看释义</span></div>

<aside id="drawer" aria-label="词条释义">
  <button id="drawer-close" aria-label="关闭">×</button>
  <div id="drawer-body"></div>
</aside>

<div id="index-overlay">
  <button id="index-close" aria-label="关闭">×</button>
  <div class="index-inner">
    <h2>词 条 索 引</h2>
    <p class="intro">Agent、Context、Token、Hallucination、Vibe Coding……这些词天天在工位上飞,却没人好好解释过。这本词典用大白话把它们讲明白:术语保留英文原词,解释全部中文,顺便带一点被坑过的人才会有的观点。主视图是一张词脉图——词条互相引用,连成一张网,点开任意节点即可阅读释义。</p>
    <div class="idx-cols">
__INDEX__
    </div>
  </div>
</div>

<div id="pool" hidden>
__POOL__
</div>

<script>
var NODES = __NODES__;
var LINKS = __LINKS__;
var EDGE_STYLE = "__EDGE_STYLE__";

(function () {
  var canvas = document.getElementById("graph");
  if (!canvas || !canvas.getContext) return;
  var ctx = canvas.getContext("2d");
  var W = 0, H = 0, DPR = Math.min(window.devicePixelRatio || 1, 2);
  var nodes = NODES.map(function (n) {
    return { id: n.id, label: n.label, trans: n.trans, c: n.c, text: n.text, x: 0, y: 0, vx: 0, vy: 0, deg: 0 };
  });
  var adj = nodes.map(function () { return []; });
  LINKS.forEach(function (l) { adj[l[0]].push(l[1]); adj[l[1]].push(l[0]); });
  nodes.forEach(function (n, i) {
    n.deg = adj[i].length;
    var a = (i / nodes.length) * Math.PI * 2;
    n.x = Math.cos(a) * 220;
    n.y = Math.sin(a) * 220;
  });
  var view = { s: 1, ox: 0, oy: 0 };
  var target = null;
  var hover = -1, drag = -1, selected = -1, moved = 0;
  var panning = false, panStart = null, query = "";

  var drawer = document.getElementById("drawer");
  var drawerBody = document.getElementById("drawer-body");
  var pool = document.getElementById("pool");
  var overlay = document.getElementById("index-overlay");
  var input = document.getElementById("q");

  function idxOf(slug) {
    for (var i = 0; i < nodes.length; i++) if (nodes[i].id === slug) return i;
    return -1;
  }
  function radius(n) { return 7 + n.deg * 1.2; }
  function matches(i) { return !query || nodes[i].text.indexOf(query) !== -1; }

  function resize() {
    W = canvas.clientWidth;
    H = canvas.clientHeight;
    canvas.width = W * DPR;
    canvas.height = H * DPR;
  }

  /* ----- 力导向模拟:斥力 + 弹簧 + 向心 ----- */
  function tick() {
    var i, j, n, m, dx, dy, d, d2, f, k;
    for (i = 0; i < nodes.length; i++) {
      for (j = i + 1; j < nodes.length; j++) {
        n = nodes[i]; m = nodes[j];
        dx = n.x - m.x; dy = n.y - m.y;
        d2 = dx * dx + dy * dy || 1;
        d = Math.sqrt(d2);
        f = 16000 / d2;
        n.vx += (dx / d) * f; n.vy += (dy / d) * f;
        m.vx -= (dx / d) * f; m.vy -= (dy / d) * f;
      }
    }
    for (k = 0; k < LINKS.length; k++) {
      n = nodes[LINKS[k][0]]; m = nodes[LINKS[k][1]];
      dx = m.x - n.x; dy = m.y - n.y;
      d = Math.sqrt(dx * dx + dy * dy) || 1;
      f = (d - 260) * 0.01;
      n.vx += (dx / d) * f; n.vy += (dy / d) * f;
      m.vx -= (dx / d) * f; m.vy -= (dy / d) * f;
    }
    for (i = 0; i < nodes.length; i++) {
      n = nodes[i];
      if (i === drag) { n.vx = 0; n.vy = 0; continue; }
      n.vx = (n.vx - n.x * 0.0025) * 0.82;
      n.vy = (n.vy - n.y * 0.0025) * 0.82;
      if (n.vx > 8) n.vx = 8; if (n.vx < -8) n.vx = -8;
      if (n.vy > 8) n.vy = 8; if (n.vy < -8) n.vy = -8;
      n.x += n.vx; n.y += n.vy;
    }
  }

  function fitView() {
    var minX = 1e9, maxX = -1e9, minY = 1e9, maxY = -1e9;
    nodes.forEach(function (n) {
      minX = Math.min(minX, n.x); maxX = Math.max(maxX, n.x);
      minY = Math.min(minY, n.y); maxY = Math.max(maxY, n.y);
    });
    var bw = Math.max(maxX - minX, 1) + 200;
    var bh = Math.max(maxY - minY, 1) + 160;
    view.s = Math.max(0.35, Math.min(1.1, W / bw, H / bh));
    /* 触屏窄屏:不强求一屏看全,保证默认可读,交由拖动/捏合探索 */
    if (COARSE) view.s = Math.max(view.s, 0.72);
    view.ox = W / 2 - ((minX + maxX) / 2) * view.s;
    view.oy = H / 2 - ((minY + maxY) / 2) * view.s;
    target = null;
  }

  /* ----- 绘制 ----- */
  /* 主题从 CSS 变量读取(getComputedStyle),CSS 是唯一事实源 */
  function hexA(hex, a) {
    if (hex.charAt(0) !== "#") return hex;
    var h = hex.slice(1);
    if (h.length === 3) h = h[0] + h[0] + h[1] + h[1] + h[2] + h[2];
    return "rgba(" + parseInt(h.slice(0, 2), 16) + "," + parseInt(h.slice(2, 4), 16) + "," + parseInt(h.slice(4, 6), 16) + "," + a + ")";
  }
  function readTheme() {
    var cs = getComputedStyle(document.body);
    var g = function (k) { return cs.getPropertyValue(k).trim(); };
    return {
      paper: g("--paper"), card: g("--card"), ink: g("--ink"), soft: g("--ink-soft"),
      hot: g("--cinnabar"), ridge1: g("--ridge1"), ridge2: g("--ridge2"), edge: g("--edge"),
      nodeMode: g("--node-mode") || "coin", edgeStyle: g("--edge-style") || "simple",
      palette: [g("--sc0"), g("--sc1"), g("--sc2"), g("--sc3"), g("--sc4")],
    };
  }
  var THEME = readTheme();
  var THEME_ORDER = ["default", "qinghua", "bronze", "dunhuang"];
  var THEME_LABELS = { default: "宣 纸", qinghua: "青 花", bronze: "青 铜", dunhuang: "敦 煌" };
  function setTheme(name) {
    document.body.className = name === "default" ? "" : "t-" + name;
    THEME = readTheme();
    document.getElementById("theme-btn").textContent = THEME_LABELS[name] || "宣 纸";
    try { localStorage.setItem("shanhai-theme", name); } catch (e) { /* file:// 下可能失败,无碍 */ }
  }

  /* 水墨远山:两层山脊剪影,铺在底色上(屏幕坐标,不随视图变) */
  function ridge(base, amp, freq, phase, color) {
    ctx.beginPath();
    ctx.moveTo(-60, H + 10);
    for (var x = -60; x <= W + 60; x += 16) {
      var y =
        base -
        (Math.abs(Math.sin(x * 0.004 * freq + phase)) * 0.7 +
          Math.abs(Math.sin(x * 0.011 * freq + phase * 2)) * 0.3) *
          amp;
      ctx.lineTo(x, y);
    }
    ctx.lineTo(W + 60, H + 10);
    ctx.closePath();
    ctx.fillStyle = color;
    ctx.fill();
  }

  /* ----- 连线样式:simple 微弯曲线 / brush 墨笔飞白 / thread 朱丝结缘 / wash 水墨晕染 / star 星宿图 ----- */
  function drawEdge(n, m, cx, cy, hot) {
    var style = EDGE_STYLE || THEME.edgeStyle;
    if (style === "brush") {
      /* 毛笔:沿曲线填一条两端出锋的墨带,起笔收笔细、行笔粗 */
      var T = 26, j, t, u, px, py, nx2, ny2, wgt;
      var pts = [];
      for (j = 0; j <= T; j++) {
        t = j / T; u = 1 - t;
        pts.push([u * u * n.x + 2 * u * t * cx + t * t * m.x, u * u * n.y + 2 * u * t * cy + t * t * m.y]);
      }
      ctx.beginPath();
      for (j = 0; j <= T; j++) {
        var p0 = pts[Math.max(0, j - 1)], p1 = pts[Math.min(T, j + 1)];
        var ddx = p1[0] - p0[0], ddy = p1[1] - p0[1];
        var dd = Math.sqrt(ddx * ddx + ddy * ddy) || 1;
        wgt = (hot ? 2.4 : 1.6) * Math.pow(Math.sin((Math.PI * j) / T), 0.6) + 0.01;
        nx2 = (-ddy / dd) * wgt; ny2 = (ddx / dd) * wgt;
        if (j === 0) ctx.moveTo(pts[j][0] + nx2, pts[j][1] + ny2);
        else ctx.lineTo(pts[j][0] + nx2, pts[j][1] + ny2);
      }
      for (j = T; j >= 0; j--) {
        var q0 = pts[Math.max(0, j - 1)], q1 = pts[Math.min(T, j + 1)];
        var ddx2 = q1[0] - q0[0], ddy2 = q1[1] - q0[1];
        var dd2 = Math.sqrt(ddx2 * ddx2 + ddy2 * ddy2) || 1;
        wgt = (hot ? 2.4 : 1.6) * Math.pow(Math.sin((Math.PI * j) / T), 0.6) + 0.01;
        ctx.lineTo(pts[j][0] + (ddy2 / dd2) * wgt, pts[j][1] - (ddx2 / dd2) * wgt);
      }
      ctx.closePath();
      ctx.fillStyle = hot ? hexA(THEME.hot, 0.6) : hexA(THEME.ink, 0.28);
      ctx.fill();
      return;
    }
    if (style === "thread") {
      /* 朱丝:两股红线相缠,如中国结、月老牵线 */
      var off = hot ? 3 : 2.2;
      var ddx3 = m.x - n.x, ddy3 = m.y - n.y;
      var dd3 = Math.sqrt(ddx3 * ddx3 + ddy3 * ddy3) || 1;
      var px3 = (-ddy3 / dd3) * off, py3 = (ddx3 / dd3) * off;
      ctx.lineWidth = hot ? 1.3 : 0.9;
      ctx.strokeStyle = hexA(THEME.hot, hot ? 0.85 : 0.4);
      ctx.beginPath(); ctx.moveTo(n.x, n.y); ctx.quadraticCurveTo(cx + px3, cy + py3, m.x, m.y); ctx.stroke();
      ctx.strokeStyle = hexA(THEME.hot, hot ? 0.5 : 0.22);
      ctx.beginPath(); ctx.moveTo(n.x, n.y); ctx.quadraticCurveTo(cx - px3, cy - py3, m.x, m.y); ctx.stroke();
      return;
    }
    if (style === "wash") {
      /* 晕染:淡墨洇开,像宣纸上洇出的水汽 */
      ctx.save();
      ctx.shadowColor = hot ? hexA(THEME.hot, 0.55) : hexA(THEME.ink, 0.4);
      ctx.shadowBlur = hot ? 7 : 5;
      ctx.strokeStyle = hot ? hexA(THEME.hot, 0.35) : hexA(THEME.ink, 0.1);
      ctx.lineWidth = hot ? 2.2 : 1.8;
      ctx.beginPath(); ctx.moveTo(n.x, n.y); ctx.quadraticCurveTo(cx, cy, m.x, m.y); ctx.stroke();
      ctx.restore();
      ctx.strokeStyle = hot ? hexA(THEME.hot, 0.55) : hexA(THEME.ink, 0.16);
      ctx.lineWidth = 0.8;
      ctx.beginPath(); ctx.moveTo(n.x, n.y); ctx.quadraticCurveTo(cx, cy, m.x, m.y); ctx.stroke();
      return;
    }
    if (style === "star") {
      /* 星宿图:敦煌星图式细虚线连星官 */
      ctx.setLineDash(hot ? [] : [2, 5]);
      ctx.strokeStyle = hot ? hexA(THEME.hot, 0.75) : THEME.edge;
      ctx.lineWidth = hot ? 1.4 : 0.9;
      ctx.beginPath(); ctx.moveTo(n.x, n.y); ctx.quadraticCurveTo(cx, cy, m.x, m.y); ctx.stroke();
      ctx.setLineDash([]);
      return;
    }
    /* simple:微弯的圆头曲线 */
    ctx.strokeStyle = hot ? hexA(THEME.hot, 0.7) : THEME.edge;
    ctx.lineWidth = hot ? 2 : 1.1;
    ctx.beginPath();
    ctx.moveTo(n.x, n.y);
    ctx.quadraticCurveTo(cx, cy, m.x, m.y);
    ctx.stroke();
  }

  /* 节点造型:coin 铜钱(外圆内方)/ plate 青花盘(双圈)/ ding 青铜方鼎(圆角方器)/ star 星宿(光点) */
  function drawNode(n, r, sel, hov) {
    var col = THEME.palette[n.c % THEME.palette.length];
    var lw = sel || hov ? 2.6 : 1.6;
    if (THEME.nodeMode === "plate") {
      ctx.beginPath();
      ctx.arc(n.x, n.y, r, 0, Math.PI * 2);
      ctx.fillStyle = sel ? col : THEME.card;
      ctx.fill();
      ctx.lineWidth = lw;
      ctx.strokeStyle = col;
      ctx.stroke();
      ctx.beginPath();
      ctx.arc(n.x, n.y, r * 0.52, 0, Math.PI * 2);
      ctx.lineWidth = 1.1;
      ctx.strokeStyle = sel ? THEME.card : col;
      ctx.stroke();
      return;
    }
    if (THEME.nodeMode === "ding") {
      var k = r * 0.35, x0 = n.x - r, y0 = n.y - r, s2 = r * 2;
      ctx.beginPath();
      ctx.moveTo(x0 + k, y0);
      ctx.arcTo(x0 + s2, y0, x0 + s2, y0 + s2, k);
      ctx.arcTo(x0 + s2, y0 + s2, x0, y0 + s2, k);
      ctx.arcTo(x0, y0 + s2, x0, y0, k);
      ctx.arcTo(x0, y0, x0 + s2, y0, k);
      ctx.closePath();
      ctx.fillStyle = sel ? col : THEME.card;
      ctx.fill();
      ctx.lineWidth = lw;
      ctx.strokeStyle = col;
      ctx.stroke();
      /* 器心一点铭文 */
      var g = r * 0.3;
      ctx.beginPath();
      ctx.rect(n.x - g / 2, n.y - g / 2, g, g);
      ctx.fillStyle = sel ? THEME.card : col;
      ctx.fill();
      return;
    }
    if (THEME.nodeMode === "star") {
      ctx.beginPath();
      ctx.arc(n.x, n.y, r, 0, Math.PI * 2);
      ctx.strokeStyle = sel ? THEME.hot : col;
      ctx.lineWidth = 1;
      ctx.globalAlpha *= 0.6;
      ctx.stroke();
      ctx.globalAlpha /= 0.6;
      ctx.beginPath();
      ctx.arc(n.x, n.y, r * 0.45, 0, Math.PI * 2);
      ctx.fillStyle = sel ? THEME.hot : col;
      ctx.fill();
      return;
    }
    /* coin 铜钱:外圆内方——天圆地方 */
    ctx.beginPath();
    ctx.arc(n.x, n.y, r, 0, Math.PI * 2);
    ctx.fillStyle = sel ? col : THEME.card;
    ctx.fill();
    ctx.lineWidth = lw;
    ctx.strokeStyle = col;
    ctx.stroke();
    var sq = r * 0.52;
    ctx.beginPath();
    ctx.rect(n.x - sq / 2, n.y - sq / 2, sq, sq);
    ctx.fillStyle = THEME.paper;
    ctx.fill();
    ctx.lineWidth = 1.2;
    ctx.strokeStyle = col;
    ctx.stroke();
  }

  function draw() {
    ctx.setTransform(DPR, 0, 0, DPR, 0, 0);
    ctx.fillStyle = THEME.paper;
    ctx.fillRect(0, 0, W, H);
    ridge(H * 0.86, 70, 1.0, 1.3, THEME.ridge1);
    ridge(H * 0.92, 100, 1.7, 4.1, THEME.ridge2);
    ctx.translate(view.ox, view.oy);
    ctx.scale(view.s, view.s);
    ctx.lineCap = "round";
    var i, n, m, focus = hover >= 0 ? hover : selected;
    for (i = 0; i < LINKS.length; i++) {
      n = nodes[LINKS[i][0]]; m = nodes[LINKS[i][1]];
      var hot = focus >= 0 && (LINKS[i][0] === focus || LINKS[i][1] === focus);
      var mx = (n.x + m.x) / 2, my = (n.y + m.y) / 2;
      var dx = m.x - n.x, dy = m.y - n.y;
      var d = Math.sqrt(dx * dx + dy * dy) || 1;
      var bend = (i % 2 === 0 ? 1 : -1) * d * 0.07;
      var cx = mx - (dy / d) * bend, cy = my + (dx / d) * bend;
      drawEdge(n, m, cx, cy, hot);
    }
    for (i = 0; i < nodes.length; i++) {
      n = nodes[i];
      var dim = !matches(i) || (focus >= 0 && focus !== i && adj[focus].indexOf(i) === -1);
      var r = radius(n);
      ctx.globalAlpha = dim ? 0.18 : 1;
      if (i === selected) {
        /* 朱批圈:选中时外圈一道 */
        ctx.beginPath();
        ctx.arc(n.x, n.y, r + 7, 0, Math.PI * 2);
        ctx.strokeStyle = hexA(THEME.hot, 0.55);
        ctx.lineWidth = 1.6;
        ctx.stroke();
      }
      drawNode(n, r, i === selected, i === hover);
      /* 标签保持屏幕可读字号:缩小时字不跟着缩,放大时也不过度变大 */
      var ls = Math.max(0.6, Math.min(3, 1 / view.s));
      ctx.fillStyle = i === selected ? THEME.palette[n.c % THEME.palette.length] : THEME.ink;
      ctx.font = "600 " + (13 * ls).toFixed(1) + "px 'Noto Serif SC','Songti SC','SimSun',serif";
      ctx.textAlign = "center";
      ctx.fillText(n.label, n.x, n.y - r - 15 * ls);
      ctx.fillStyle = THEME.soft;
      ctx.font = (12 * ls).toFixed(1) + "px 'Kaiti SC','KaiTi','STKaiti','Noto Serif SC','SimSun',serif";
      ctx.fillText(n.trans, n.x, n.y - r - 2 * ls);
      ctx.globalAlpha = 1;
    }
  }

  function frame() {
    tick();
    if (target) {
      view.s += (target.s - view.s) * 0.14;
      view.ox += (target.ox - view.ox) * 0.14;
      view.oy += (target.oy - view.oy) * 0.14;
      if (Math.abs(target.s - view.s) < 0.005 && Math.abs(target.ox - view.ox) < 0.8) target = null;
    }
    draw();
    requestAnimationFrame(frame);
  }

  /* ----- 册页 ----- */
  function openDrawer(i) {
    var item = pool.querySelector('[data-slug="' + nodes[i].id + '"]');
    var chips = "";
    if (adj[i].length) {
      chips = '<div class="chips"><div class="chips-title">相 关 词 条</div>';
      for (var k = 0; k < adj[i].length; k++) {
        var nb = nodes[adj[i][k]];
        chips += '<span class="chip" data-slug="' + nb.id + '">' + nb.label + "</span>";
      }
      chips += "</div>";
    }
    drawerBody.innerHTML = (item ? item.innerHTML : "") + chips;
    drawer.scrollTop = 0;
    drawer.classList.add("open");
  }
  function closeDrawer() {
    drawer.classList.remove("open");
    selected = -1;
  }
  function selectNode(i) {
    selected = i;
    overlay.classList.remove("show");
    openDrawer(i);
    var dw = Math.min(460, W * 0.94);
    var ts = Math.max(view.s, 1.0);
    target = { s: ts, ox: ((W - dw) / 2) - nodes[i].x * ts, oy: H / 2 - nodes[i].y * ts };
  }

  /* ----- 坐标与拾取 ----- */
  var COARSE = window.matchMedia && window.matchMedia("(pointer: coarse)").matches;
  function toWorld(e) {
    var r = canvas.getBoundingClientRect();
    return { x: (e.clientX - r.left - view.ox) / view.s, y: (e.clientY - r.top - view.oy) / view.s };
  }
  function pick(p) {
    var pad = COARSE ? 16 : 8;
    for (var i = nodes.length - 1; i >= 0; i--) {
      var n = nodes[i];
      var r = radius(n) + pad;
      var dx = p.x - n.x, dy = p.y - n.y;
      if (dx * dx + dy * dy < r * r) return i;
    }
    return -1;
  }

  /* ----- 交互:单指拖节点/平移,双指捏合缩放 ----- */
  var pointers = new Map();
  var pinchStart = null;
  function pinchInfo() {
    var pts = Array.from(pointers.values());
    var dx = pts[0].x - pts[1].x, dy = pts[0].y - pts[1].y;
    return {
      d: Math.sqrt(dx * dx + dy * dy) || 1,
      mx: (pts[0].x + pts[1].x) / 2,
      my: (pts[0].y + pts[1].y) / 2,
    };
  }
  canvas.addEventListener("pointerdown", function (e) {
    pointers.set(e.pointerId, { x: e.clientX, y: e.clientY });
    canvas.setPointerCapture(e.pointerId);
    moved = 0;
    if (pointers.size === 2) {
      drag = -1;
      panning = false;
      var pi = pinchInfo();
      pinchStart = { d: pi.d, mx: pi.mx, my: pi.my, s: view.s, ox: view.ox, oy: view.oy, rect: canvas.getBoundingClientRect() };
      return;
    }
    var i = pick(toWorld(e));
    if (i >= 0) {
      drag = i;
    } else {
      panning = true;
      panStart = { x: e.clientX, y: e.clientY, ox: view.ox, oy: view.oy };
    }
  });
  canvas.addEventListener("pointermove", function (e) {
    if (pointers.has(e.pointerId)) pointers.set(e.pointerId, { x: e.clientX, y: e.clientY });
    if (pinchStart && pointers.size >= 2) {
      var pi = pinchInfo();
      var ns = Math.max(0.35, Math.min(2.6, pinchStart.s * (pi.d / pinchStart.d)));
      var wx = (pinchStart.mx - pinchStart.rect.left - pinchStart.ox) / pinchStart.s;
      var wy = (pinchStart.my - pinchStart.rect.top - pinchStart.oy) / pinchStart.s;
      view.ox = pi.mx - pinchStart.rect.left - wx * ns;
      view.oy = pi.my - pinchStart.rect.top - wy * ns;
      view.s = ns;
      target = null;
      moved += 10;
      return;
    }
    if (drag >= 0) {
      var p = toWorld(e);
      var n = nodes[drag];
      moved += Math.abs(p.x - n.x) + Math.abs(p.y - n.y);
      n.x = p.x; n.y = p.y;
      target = null;
    } else if (panning) {
      moved += Math.abs(e.movementX) + Math.abs(e.movementY);
      view.ox = panStart.ox + (e.clientX - panStart.x);
      view.oy = panStart.oy + (e.clientY - panStart.y);
      target = null;
    } else {
      hover = pick(toWorld(e));
      canvas.style.cursor = hover >= 0 ? "pointer" : "grab";
    }
  });
  function endPointer(e) {
    pointers.delete(e.pointerId);
    if (pinchStart) { pinchStart = null; drag = -1; panning = false; return; }
    if (e.type !== "pointerup") return;
    if (drag >= 0 && moved < 6) selectNode(drag);
    else if (panning && moved < 6) closeDrawer();
    drag = -1;
    panning = false;
  }
  canvas.addEventListener("pointerup", endPointer);
  canvas.addEventListener("pointercancel", endPointer);
  canvas.addEventListener("pointerleave", function () { hover = -1; });
  canvas.addEventListener("wheel", function (e) {
    e.preventDefault();
    var r = canvas.getBoundingClientRect();
    var mx = e.clientX - r.left, my = e.clientY - r.top;
    var f = Math.exp(-e.deltaY * 0.0012);
    var ns = Math.max(0.35, Math.min(2.6, view.s * f));
    view.ox = mx - ((mx - view.ox) / view.s) * ns;
    view.oy = my - ((my - view.oy) / view.s) * ns;
    view.s = ns;
    target = null;
  }, { passive: false });

  input.addEventListener("input", function () {
    query = input.value.trim().toLowerCase();
  });
  input.addEventListener("keydown", function (e) {
    if (e.key !== "Enter" || !query) return;
    for (var i = 0; i < nodes.length; i++) {
      if (matches(i)) { selectNode(i); return; }
    }
  });

  document.addEventListener("click", function (e) {
    var t = e.target && e.target.closest ? e.target.closest("[data-slug]") : null;
    if (t) {
      var i = idxOf(t.getAttribute("data-slug"));
      if (i >= 0) selectNode(i);
    }
  });
  document.getElementById("drawer-close").addEventListener("click", closeDrawer);
  document.getElementById("fit").addEventListener("click", function () { closeDrawer(); fitView(); });
  document.getElementById("index-btn").addEventListener("click", function () { overlay.classList.add("show"); });
  document.getElementById("index-close").addEventListener("click", function () { overlay.classList.remove("show"); });
  document.getElementById("theme-btn").addEventListener("click", function () {
    var cur = "default";
    for (var t = 0; t < THEME_ORDER.length; t++) {
      if (document.getElementById("theme-btn").textContent === THEME_LABELS[THEME_ORDER[t]]) cur = THEME_ORDER[t];
    }
    setTheme(THEME_ORDER[(THEME_ORDER.indexOf(cur) + 1) % THEME_ORDER.length]);
  });
  document.addEventListener("keydown", function (e) {
    if (e.key === "Escape") { closeDrawer(); overlay.classList.remove("show"); }
  });
  window.addEventListener("resize", function () { resize(); });

  var savedTheme = "default";
  try { savedTheme = localStorage.getItem("shanhai-theme") || "default"; } catch (e) { /* 忽略 */ }
  setTheme(savedTheme);
  resize();
  for (var i = 0; i < 300; i++) tick();
  fitView();
  draw();
  frame();
})();
</script>

</body>
</html>
`;

// 仅在直接运行时写文件;被 check.ts 导入时不产生副作用。
if (process.argv[1] && process.argv[1].replace(/\\/g, "/").endsWith("scripts/build-site.ts")) {
  writeFileSync("index.html", buildSite());
  console.log("已生成 index.html");
}
