// PostToolUse hook (Write|Edit): runs Prettier and ESLint --fix on the file Claude just changed.
// Exit 2 with remaining ESLint errors on stderr so Claude sees them and fixes them.
import { spawnSync } from "node:child_process";
import path from "node:path";

const projectDir = process.env.CLAUDE_PROJECT_DIR || process.cwd();

let input = "";
for await (const chunk of process.stdin) input += chunk;

const { tool_input = {}, tool_response = {} } = JSON.parse(input || "{}");
const filePath = tool_input.file_path || tool_response.filePath;
if (!filePath) process.exit(0);

const absolute = path.resolve(projectDir, filePath);
const relative = path.relative(projectDir, absolute);
// Only touch files inside the project (skip node_modules and anything outside).
if (relative.startsWith("..") || path.isAbsolute(relative) || relative.includes("node_modules")) {
  process.exit(0);
}

// Bin paths are built from node_modules directly: ESLint's "exports" hides bin/ from require.resolve.
const run = (bin, args) =>
  spawnSync(process.execPath, [path.join(projectDir, "node_modules", bin), ...args], {
    cwd: projectDir,
    encoding: "utf8",
  });

run("prettier/bin/prettier.cjs", ["--write", "--ignore-unknown", "--log-level", "warn", absolute]);

if (/\.(m|c)?[jt]sx?$/.test(absolute)) {
  const eslint = run("eslint/bin/eslint.js", ["--fix", "--quiet", "--no-warn-ignored", absolute]);
  if (eslint.status === 1) {
    process.stderr.write(`ESLint errors remain in ${relative}:\n${eslint.stdout}`);
    process.exit(2);
  }
}
