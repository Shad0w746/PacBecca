import { readFileSync } from "node:fs";
import { resolve } from "node:path";

const repoRoot = resolve(import.meta.dirname, "..");
const packageJson = JSON.parse(readFileSync(resolve(repoRoot, "package.json"), "utf8"));
const versionFile = readFileSync(resolve(repoRoot, "VERSION"), "utf8").trim();
const changelog = readFileSync(resolve(repoRoot, "CHANGELOG.md"), "utf8");
const semverPattern = /^(0|[1-9]\d*)\.(0|[1-9]\d*)\.(0|[1-9]\d*)$/;
const errors = [];

if (!semverPattern.test(packageJson.version)) {
  errors.push(`package.json version must use MAJOR.MINOR.PATCH format: ${packageJson.version}`);
}

if (!semverPattern.test(versionFile)) {
  errors.push(`VERSION must use MAJOR.MINOR.PATCH format: ${versionFile}`);
}

if (packageJson.version !== versionFile) {
  errors.push(`package.json version (${packageJson.version}) must match VERSION (${versionFile})`);
}

if (!new RegExp(`^## ${escapeRegExp(versionFile)} - \\d{4}-\\d{2}-\\d{2}$`, "m").test(changelog)) {
  errors.push(`CHANGELOG.md must include a dated heading for ${versionFile}`);
}

if (errors.length > 0) {
  console.error(errors.join("\n"));
  process.exit(1);
}

console.log(`PacBecca version ${versionFile} is valid.`);

function escapeRegExp(value) {
  return value.replace(/[.*+?^${}()|[\]\\]/g, "\\$&");
}
