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
        `    <div><span class="dot" style="background:${SECTION_COLORS[i % SECTION_COLORS.length]}"></span><span class="num">${CN_NUMERALS[i]}</span><span class="cname">${COLOR_NAMES[i % COLOR_NAMES.length]}</span>${s.title}</div>`,
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
  }
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
    background: rgba(253, 250, 242, 0.88);
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
    background: rgba(179, 52, 42, 0.06);
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
  .idx-cols { columns: 2; column-gap: 48px; }
  @media (max-width: 760px) {
    .idx-cols { columns: 1; }
    .brand p { display: none; }
    #q { width: 130px; }
    .hint { display: none; }
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
  <button class="topbtn" id="fit" title="回到全景">回 中</button>
  <button class="topbtn" id="index-btn" title="词条索引与关于">索 引</button>
</header>

<canvas id="graph"></canvas>
<div class="vtitle">詞脈</div>

<div class="legend">
__LEGEND__
  <div class="credit">词条互相引用成网 · 开源 MIT · 内容源于 entries/</div>
</div>
<div class="hint">拖空白平移 · 滚轮缩放 · 点词看释义</div>

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
var COLORS = ${JSON.stringify(SECTION_COLORS)};

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
    view.ox = W / 2 - ((minX + maxX) / 2) * view.s;
    view.oy = H / 2 - ((minY + maxY) / 2) * view.s;
    target = null;
  }

  /* ----- 绘制 ----- */
  /* 水墨远山:两层山脊剪影,极淡墨色,铺在宣纸底上(屏幕坐标,不随视图变) */
  function ridge(base, amp, freq, phase, alpha) {
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
    ctx.fillStyle = "rgba(43,38,32," + alpha + ")";
    ctx.fill();
  }

  function draw() {
    ctx.setTransform(DPR, 0, 0, DPR, 0, 0);
    ctx.fillStyle = "#f5efe0";
    ctx.fillRect(0, 0, W, H);
    ridge(H * 0.86, 70, 1.0, 1.3, 0.05);
    ridge(H * 0.92, 100, 1.7, 4.1, 0.07);
    ctx.translate(view.ox, view.oy);
    ctx.scale(view.s, view.s);
    ctx.lineCap = "round";
    var i, n, m, focus = hover >= 0 ? hover : selected;
    for (i = 0; i < LINKS.length; i++) {
      n = nodes[LINKS[i][0]]; m = nodes[LINKS[i][1]];
      var hot = focus >= 0 && (LINKS[i][0] === focus || LINKS[i][1] === focus);
      /* 笔意连线:微弯的曲线,圆头,像提笔直下的一笔 */
      var mx = (n.x + m.x) / 2, my = (n.y + m.y) / 2;
      var dx = m.x - n.x, dy = m.y - n.y;
      var d = Math.sqrt(dx * dx + dy * dy) || 1;
      var bend = (i % 2 === 0 ? 1 : -1) * d * 0.07;
      var cx = mx - (dy / d) * bend, cy = my + (dx / d) * bend;
      ctx.strokeStyle = hot ? "rgba(179,52,42,0.7)" : "rgba(43,38,32,0.13)";
      ctx.lineWidth = hot ? 2 : 1.1;
      ctx.beginPath();
      ctx.moveTo(n.x, n.y);
      ctx.quadraticCurveTo(cx, cy, m.x, m.y);
      ctx.stroke();
    }
    for (i = 0; i < nodes.length; i++) {
      n = nodes[i];
      var dim = !matches(i) || (focus >= 0 && focus !== i && adj[focus].indexOf(i) === -1);
      var r = radius(n);
      ctx.globalAlpha = dim ? 0.18 : 1;
      if (i === selected) {
        /* 朱批圈:选中时外圈一道朱砂 */
        ctx.beginPath();
        ctx.arc(n.x, n.y, r + 7, 0, Math.PI * 2);
        ctx.strokeStyle = "rgba(179,52,42,0.55)";
        ctx.lineWidth = 1.6;
        ctx.stroke();
      }
      /* 铜钱节点:外圆内方——天圆地方 */
      ctx.beginPath();
      ctx.arc(n.x, n.y, r, 0, Math.PI * 2);
      ctx.fillStyle = i === selected ? COLORS[n.c] : "#fdfaf2";
      ctx.fill();
      ctx.lineWidth = i === selected || i === hover ? 2.6 : 1.6;
      ctx.strokeStyle = COLORS[n.c];
      ctx.stroke();
      var sq = r * 0.52;
      ctx.beginPath();
      ctx.rect(n.x - sq / 2, n.y - sq / 2, sq, sq);
      ctx.fillStyle = i === selected ? "#f5efe0" : "#f5efe0";
      ctx.fill();
      ctx.lineWidth = 1.2;
      ctx.strokeStyle = COLORS[n.c];
      ctx.stroke();
      ctx.fillStyle = i === selected ? COLORS[n.c] : "#2b2620";
      ctx.font = "600 13px 'Noto Serif SC','Songti SC','SimSun',serif";
      ctx.textAlign = "center";
      ctx.fillText(n.label, n.x, n.y - r - 17);
      ctx.fillStyle = "#6b6152";
      ctx.font = "12px 'Kaiti SC','KaiTi','STKaiti','Noto Serif SC','SimSun',serif";
      ctx.fillText(n.trans, n.x, n.y - r - 3);
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
  function toWorld(e) {
    var r = canvas.getBoundingClientRect();
    return { x: (e.clientX - r.left - view.ox) / view.s, y: (e.clientY - r.top - view.oy) / view.s };
  }
  function pick(p) {
    for (var i = nodes.length - 1; i >= 0; i--) {
      var n = nodes[i];
      var r = radius(n) + 8;
      var dx = p.x - n.x, dy = p.y - n.y;
      if (dx * dx + dy * dy < r * r) return i;
    }
    return -1;
  }

  /* ----- 交互 ----- */
  canvas.addEventListener("pointerdown", function (e) {
    moved = 0;
    var i = pick(toWorld(e));
    if (i >= 0) {
      drag = i;
      canvas.setPointerCapture(e.pointerId);
    } else {
      panning = true;
      panStart = { x: e.clientX, y: e.clientY, ox: view.ox, oy: view.oy };
    }
  });
  canvas.addEventListener("pointermove", function (e) {
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
  canvas.addEventListener("pointerup", function () {
    if (drag >= 0 && moved < 6) selectNode(drag);
    else if (panning && moved < 6) closeDrawer();
    drag = -1;
    panning = false;
  });
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
  document.addEventListener("keydown", function (e) {
    if (e.key === "Escape") { closeDrawer(); overlay.classList.remove("show"); }
  });
  window.addEventListener("resize", function () { resize(); });

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
