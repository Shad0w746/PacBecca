import { spawnSync } from "node:child_process";
import { readFileSync } from "node:fs";
import { setTimeout as wait } from "node:timers/promises";

const repo = "Shad0w746/PacBecca";
const liveUrl = "https://shad0w746.github.io/PacBecca/";
const leaderboardApiUrl = "https://pacbecca-leaderboard.danwalkerworks.workers.dev/api/leaderboard";
const githubPagesBasePath = "/PacBecca/";
const workflowNames = ["CI", "Deploy GitHub Pages"];
const packageJson = JSON.parse(readFileSync(new URL("../package.json", import.meta.url), "utf8"));

async function main() {
  const branch = output("git", ["branch", "--show-current"]).trim();
  if (branch !== "main") {
    fail(`Production deploy must run from main. Current branch: ${branch || "(unknown)"}`);
  }

  const status = output("git", ["status", "--porcelain"]).trim();
  if (status) {
    fail("Working tree has uncommitted changes. Commit or stash them before deploying.");
  }

  const headSha = output("git", ["rev-parse", "HEAD"]).trim();
  const shortSha = headSha.slice(0, 7);
  log(`Preparing production deploy for ${shortSha} (v${packageJson.version}).`);

  run("pnpm", ["check"]);
  run("pnpm", ["build"], {
    env: {
      VITE_BASE_PATH: githubPagesBasePath,
      VITE_LEADERBOARD_API_URL: leaderboardApiUrl
    }
  });

  run("git", ["push", "origin", "main"]);

  for (const workflowName of workflowNames) {
    const runId = await waitForWorkflowRun(workflowName, headSha);
    run("gh", ["run", "watch", String(runId), "--repo", repo, "--exit-status"]);
  }

  await verifyLiveSite();
  log(`Production deploy verified at ${liveUrl}`);
}

function run(command, args, options = {}) {
  log(`$ ${[command, ...args].join(" ")}`);
  const result = spawnSync(executable(command), args, {
    cwd: new URL("..", import.meta.url),
    env: {
      ...process.env,
      ...(options.env ?? {})
    },
    shell: process.platform === "win32",
    stdio: "inherit"
  });

  if (result.status !== 0) {
    fail(`${command} ${args.join(" ")} failed with exit code ${result.status ?? "unknown"}.`);
  }
}

function output(command, args) {
  const result = spawnSync(executable(command), args, {
    cwd: new URL("..", import.meta.url),
    env: process.env,
    shell: process.platform === "win32",
    encoding: "utf8"
  });

  if (result.status !== 0) {
    fail(`${command} ${args.join(" ")} failed:\n${result.stderr || result.stdout}`);
  }

  return result.stdout;
}

async function waitForWorkflowRun(workflowName, headSha) {
  log(`Waiting for ${workflowName} workflow for ${headSha.slice(0, 7)}...`);
  const startedAt = Date.now();
  const timeoutMs = 180_000;

  while (Date.now() - startedAt < timeoutMs) {
    const runs = JSON.parse(
      output("gh", [
        "run",
        "list",
        "--repo",
        repo,
        "--branch",
        "main",
        "--limit",
        "20",
        "--json",
        "databaseId,workflowName,headSha,status,conclusion"
      ])
    );
    const runForCommit = runs.find(
      (run) => run.workflowName === workflowName && run.headSha === headSha
    );

    if (runForCommit) {
      log(`Found ${workflowName} run ${runForCommit.databaseId}.`);
      return runForCommit.databaseId;
    }

    await wait(5_000);
  }

  fail(`Timed out waiting for ${workflowName} workflow to appear for ${headSha.slice(0, 7)}.`);
}

async function verifyLiveSite() {
  log(`Checking live site ${liveUrl}`);
  const htmlResponse = await fetch(liveUrl, { cache: "no-store" });
  if (!htmlResponse.ok) {
    fail(`Live site returned HTTP ${htmlResponse.status}.`);
  }

  const html = await htmlResponse.text();
  if (!html.includes("/PacBecca/assets/")) {
    fail("Live HTML does not reference /PacBecca/assets/.");
  }

  const scriptMatch = html.match(/src="([^"]+\.js)"/);
  if (!scriptMatch) {
    fail("Could not find deployed JavaScript bundle in live HTML.");
  }

  const scriptUrl = new URL(scriptMatch[1], liveUrl);
  const scriptResponse = await fetch(scriptUrl, { cache: "no-store" });
  if (!scriptResponse.ok) {
    fail(`Live JavaScript bundle returned HTTP ${scriptResponse.status}.`);
  }

  const script = await scriptResponse.text();
  if (!script.includes(packageJson.version)) {
    fail(`Live JavaScript bundle does not contain version ${packageJson.version}.`);
  }
}

function executable(command) {
  if (process.platform !== "win32") {
    return command;
  }

  return command === "pnpm" ? "pnpm.cmd" : command;
}

function log(message) {
  console.log(`[deploy] ${message}`);
}

function fail(message) {
  console.error(`[deploy] ${message}`);
  process.exit(1);
}

main().catch((error) => {
  fail(error instanceof Error ? error.message : String(error));
});
