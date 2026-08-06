/**
 * check.ts — 校验 README.md、index.html 与 entries/ 源文件是否同步。
 * 不同步时以非零码退出,供 CI / pre-commit 使用。
 */
import { readFileSync } from "node:fs";
import { buildReadme } from "./generate.js";
import { buildSite } from "./build-site.js";

const targets: Array<[string, string]> = [
  ["README.md", buildReadme()],
  ["index.html", buildSite()],
];

let failed = false;
for (const [file, expected] of targets) {
  let actual: string | null = null;
  try {
    actual = readFileSync(file, "utf8");
  } catch {
    // 文件不存在也算不同步
  }
  if (actual !== expected) {
    console.error(`${file} 与 entries/ 不同步。请运行 \`npm run build\` 后重新提交。`);
    failed = true;
  }
}
if (failed) process.exit(1);
console.log("README.md、index.html 与源词条同步。");
