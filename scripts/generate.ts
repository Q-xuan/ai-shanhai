/**
 * generate.ts — 从 entries/ 下的词条 markdown 生成单个 README.md。
 *
 * 词条格式:YAML-lite frontmatter(term / slug / order / translation)+ 自由 markdown 正文。
 * 维护方式:只改 entries/ 里的文件,然后跑 `npm run generate`。
 */
import { readdirSync, readFileSync, writeFileSync } from "node:fs";
import { join } from "node:path";

const ENTRIES_DIR = "entries";
const OUTPUT_FILE = "README.md";

interface Section {
  dir: string;
  title: string;
  titleEn: string;
  blurb: string;
}

export interface Entry {
  term: string;
  slug: string;
  order: number;
  translation: string;
  body: string;
  sectionDir: string;
}

/** 解析极简 frontmatter:--- 之间的 key: value 行。够用就行,不引依赖。 */
function parseEntry(filePath: string, sectionDir: string): Entry {
  const raw = readFileSync(filePath, "utf8");
  const match = raw.match(/^---\r?\n([\s\S]*?)\r?\n---\r?\n([\s\S]*)$/);
  if (!match) {
    throw new Error(`词条缺少 frontmatter: ${filePath}`);
  }
  const meta: Record<string, string> = {};
  for (const line of match[1].split(/\r?\n/)) {
    const kv = line.match(/^(\w+):\s*(.+)$/);
    if (kv) meta[kv[1]] = kv[2].trim();
  }
  for (const key of ["term", "slug", "order", "translation"]) {
    if (!meta[key]) throw new Error(`词条 ${filePath} 缺少字段: ${key}`);
  }
  return {
    term: meta.term,
    slug: meta.slug,
    order: Number(meta.order),
    translation: meta.translation,
    body: match[2].trim(),
    sectionDir,
  };
}

export function loadSections(): { sections: Section[]; entriesByDir: Map<string, Entry[]> } {
  const sections = JSON.parse(
    readFileSync(join(ENTRIES_DIR, "sections.json"), "utf8"),
  ) as Section[];
  const entriesByDir = new Map<string, Entry[]>();

  for (const section of sections) {
    const dirPath = join(ENTRIES_DIR, section.dir);
    const files = readdirSync(dirPath).filter((f) => f.endsWith(".md"));
    const entries = files
      .map((f) => parseEntry(join(dirPath, f), section.dir))
      .sort((a, b) => a.order - b.order);
    const slugs = new Set(entries.map((e) => e.slug));
    if (slugs.size !== entries.length) {
      throw new Error(`分区 ${section.dir} 内 slug 重复`);
    }
    entriesByDir.set(section.dir, entries);
  }
  return { sections, entriesByDir };
}

const GENERATED_NOTE =
  "<!-- 此文件由 scripts/generate.ts 自动生成,请勿手改。修改 entries/ 后运行 npm run generate -->";

export function buildReadme(): string {
  const { sections, entriesByDir } = loadSections();
  const lines: string[] = [];

  lines.push(GENERATED_NOTE, "");
  lines.push("# AI 山海经 · AI 编程黑话词典", "");
  lines.push(
    "**用大白话解释 AI coding 里的英文术语。** 术语保留英文原词,解释全部中文——因为在真实工作里,大家说的就是这些英文词,缺的只是有人把它们讲明白。",
    "",
  );
  lines.push(
    "这本词典有点话痨、有点观点。它不追求百科式的中立,而是告诉你:这个词在工位上到底意味着什么,以及一个被坑过的人会给什么建议。",
    "",
  );
  lines.push(
    "每个词条固定四段:**一句话解释**(电梯里能说完)→ **展开说说**(真正的细节)→ **你会听到有人这么说**(真实对话场景)→ **老司机锐评**(带点偏见的实用建议)。",
    "",
  );

  // 目录
  lines.push("## 目录", "");
  for (const section of sections) {
    const entries = entriesByDir.get(section.dir)!;
    lines.push(`- [${section.title} ${section.titleEn}](#${section.dir})`);
    for (const entry of entries) {
      lines.push(`  - [${entry.term}(${entry.translation})](#${entry.slug})`);
    }
  }
  lines.push("");

  // 正文
  for (const section of sections) {
    const entries = entriesByDir.get(section.dir)!;
    lines.push(`<a id="${section.dir}"></a>`, "");
    lines.push(`## ${section.title} · ${section.titleEn}`, "");
    lines.push(`> ${section.blurb}`, "");
    for (const entry of entries) {
      lines.push(`<a id="${entry.slug}"></a>`, "");
      lines.push(`### ${entry.term}(${entry.translation})`, "");
      // 词条正文里的标题统一降两级(## → ####),保持 README 的层级:分区 > 术语 > 段落标题。
      const body = entry.body.replace(
        /^(#{1,4})( )/gm,
        (_m, hashes: string, space: string) => "#".repeat(Math.min(hashes.length + 2, 6)) + space,
      );
      lines.push(body, "");
    }
  }

  // 维护说明
  lines.push("---", "");
  lines.push("## 参与维护", "");
  lines.push(
    "词条源文件都在 `entries/` 目录下,按分区分文件夹存放,一个术语一个 markdown 文件。这个 README 和网页版 `index.html` 都是**自动生成**的,不要直接改它们。",
    "",
  );
  lines.push("**新增或修改一个术语,只需要三步:**", "");
  lines.push(
    "1. 在对应分区文件夹里新建(或编辑)一个 `.md` 文件,按现有词条的格式写 frontmatter 和正文;",
  );
  lines.push("2. 运行 `npm run build` 重新生成 README 和网页版;");
  lines.push("3. 提交时带上生成后的文件,CI 里的 `npm run check` 会验证它们和源文件同步。", "");
  lines.push(
    "新增分区则在 `entries/sections.json` 里登记文件夹名和中英文标题。格式统一由 Prettier 负责:`npm run format`。",
    "",
  );
  lines.push("## License", "");
  lines.push("[MIT](./LICENSE)。欢迎 PR,观点越鲜明越好——但请保持对新手友好。");

  return lines.join("\n") + "\n";
}

// 仅在直接运行时写文件;被 check.ts 导入时不产生副作用。
if (process.argv[1] && process.argv[1].replace(/\\/g, "/").endsWith("scripts/generate.ts")) {
  const output = buildReadme();
  writeFileSync(OUTPUT_FILE, output);
  console.log(`已生成 ${OUTPUT_FILE}`);
}
