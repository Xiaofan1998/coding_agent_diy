import fs from "node:fs/promises";
import path from "node:path";
import { spawn } from "node:child_process";

const root = path.resolve(path.dirname(new URL(import.meta.url).pathname), "..");
const files = [];

await walk(root, files);

for (const file of files) {
  await runCheck(file);
}

console.log(`Checked ${files.length} JavaScript files.`);

async function walk(currentDir, output) {
  const entries = await fs.readdir(currentDir, { withFileTypes: true });
  for (const entry of entries) {
    if (entry.name === ".coding-agent" || entry.name === "node_modules" || entry.name === ".git") {
      continue;
    }
    const absolute = path.join(currentDir, entry.name);
    if (entry.isDirectory()) {
      await walk(absolute, output);
    } else if (entry.isFile() && absolute.endsWith(".js")) {
      output.push(absolute);
    }
  }
}

async function runCheck(file) {
  await new Promise((resolve, reject) => {
    const child = spawn(process.execPath, ["--check", file], {
      stdio: "inherit"
    });
    child.on("exit", (code) => {
      if (code === 0) {
        resolve();
        return;
      }
      reject(new Error(`Syntax check failed for ${file}`));
    });
    child.on("error", reject);
  });
}
