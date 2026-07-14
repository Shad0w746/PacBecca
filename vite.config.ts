import { mkdir, writeFile } from "node:fs/promises";
import { dirname, resolve } from "node:path";
import { fileURLToPath } from "node:url";
import { defineConfig, type Plugin } from "vite";

const projectRoot = dirname(fileURLToPath(import.meta.url));
const leaderboardPath = resolve(projectRoot, "public", "leaderboard.txt");

function leaderboardFileApi(): Plugin {
  return {
    name: "pacbecca-leaderboard-file-api",
    configureServer(server) {
      server.middlewares.use("/api/leaderboard", async (request, response) => {
        if (request.method !== "POST") {
          response.statusCode = 405;
          response.setHeader("Content-Type", "application/json");
          response.end(JSON.stringify({ error: "Method not allowed" }));
          return;
        }

        try {
          const body = await readRequestBody(request);
          const parsed = JSON.parse(body) as { text?: unknown };

          if (typeof parsed.text !== "string" || parsed.text.length > 10000) {
            response.statusCode = 400;
            response.setHeader("Content-Type", "application/json");
            response.end(JSON.stringify({ error: "Invalid leaderboard text" }));
            return;
          }

          await mkdir(dirname(leaderboardPath), { recursive: true });
          await writeFile(leaderboardPath, parsed.text, "utf8");

          response.statusCode = 200;
          response.setHeader("Content-Type", "application/json");
          response.end(JSON.stringify({ ok: true }));
        } catch {
          response.statusCode = 500;
          response.setHeader("Content-Type", "application/json");
          response.end(JSON.stringify({ error: "Could not save leaderboard" }));
        }
      });
    }
  };
}

function readRequestBody(request: NodeJS.ReadableStream): Promise<string> {
  return new Promise((resolveBody, reject) => {
    let body = "";

    request.setEncoding("utf8");
    request.on("data", (chunk: string) => {
      body += chunk;
    });
    request.on("end", () => resolveBody(body));
    request.on("error", reject);
  });
}

export default defineConfig({
  base: process.env.VITE_BASE_PATH ?? "/",
  plugins: [leaderboardFileApi()],
  server: {
    port: 5173,
    strictPort: false
  },
  preview: {
    port: 4173,
    strictPort: false
  }
});
