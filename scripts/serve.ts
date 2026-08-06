/**
 * serve.ts — 本地 live server:静态托管 + entries/ 变更自动重建 + 浏览器自动刷新。
 * 用法:npm run serve [端口,默认 3000]
 */
import { createServer, type ServerResponse } from "node:http";
import { readFileSync, existsSync, statSync, watch } from "node:fs";
import { join, extname, normalize } from "node:path";
import { networkInterfaces } from "node:os";
import { execSync } from "node:child_process";

const PORT = Number(process.argv[2]) || 3000;
const ROOT = process.cwd();

const MIME: Record<string, string> = {
  ".html": "text/html; charset=utf-8",
  ".md": "text/plain; charset=utf-8",
  ".json": "application/json; charset=utf-8",
  ".png": "image/png",
  ".ico": "image/x-icon",
};

/** SSE 客户端:收到 reload 事件就刷新页面。注入到 HTML 响应里,不动磁盘文件。 */
const RELOAD_SNIPPET = `
<script>
(new EventSource("/__livereload")).onmessage = function () { location.reload(); };
</script>
</body>`;

const sseClients = new Set<ServerResponse>();

/** entries/ 变更 → 重新生成 → 广播刷新(防抖 300ms) */
let timer: ReturnType<typeof setTimeout> | null = null;
watch(join(ROOT, "entries"), { recursive: true }, () => {
  if (timer) clearTimeout(timer);
  timer = setTimeout(() => {
    try {
      execSync("npm run build", { cwd: ROOT, stdio: "inherit" });
      for (const res of sseClients) res.write("data: reload\n\n");
      console.log(`[${new Date().toLocaleTimeString()}] entries/ 已变更,重新生成并刷新浏览器`);
    } catch {
      console.error("重新生成失败,请检查 entries/ 的格式");
    }
  }, 300);
});

const server = createServer((req, res) => {
  const url = (req.url || "/").split("?")[0];

  if (url === "/__livereload") {
    res.writeHead(200, {
      "Content-Type": "text/event-stream",
      "Cache-Control": "no-cache",
      Connection: "keep-alive",
    });
    res.write("retry: 1000\n\n");
    sseClients.add(res);
    req.on("close", () => sseClients.delete(res));
    return;
  }

  // 防目录穿越,默认 index.html
  let path = normalize(join(ROOT, decodeURIComponent(url)));
  if (!path.startsWith(ROOT)) {
    res.writeHead(403).end("Forbidden");
    return;
  }
  if (url === "/" || !existsSync(path) || statSync(path).isDirectory()) {
    path = join(ROOT, "index.html");
  }
  if (!existsSync(path)) {
    res.writeHead(404).end("Not Found");
    return;
  }

  let body: string | Buffer = readFileSync(path);
  const mime = MIME[extname(path)] || "application/octet-stream";
  if (mime.startsWith("text/html")) {
    body = body.toString("utf8").replace("</body>", RELOAD_SNIPPET);
  }
  res.writeHead(200, { "Content-Type": mime, "Cache-Control": "no-store" });
  res.end(body);
});

server.listen(PORT, "0.0.0.0", () => {
  const ips = Object.values(networkInterfaces())
    .flat()
    .filter((i) => i && i.family === "IPv4" && !i.internal)
    .map((i) => i!.address);
  console.log(`词典已上线(改动 entries/ 会自动重建并刷新页面):`);
  console.log(`  本机:   http://localhost:${PORT}`);
  for (const ip of ips) console.log(`  局域网: http://${ip}:${PORT}`);
});
