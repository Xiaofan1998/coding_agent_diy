#!/usr/bin/env node

import { spawn } from "node:child_process";
import path from "node:path";
import { fileURLToPath } from "node:url";

const root = path.resolve(path.dirname(fileURLToPath(import.meta.url)), "..");
const chatCommand = path.join(root, "bin", "code-agent");
const args = process.argv.slice(2);

const messages = [];
let delayMs = 400;
let timeoutMs = 20000;

for (let index = 0; index < args.length; index += 1) {
  const token = args[index];
  if (token === "--message" && args[index + 1]) {
    messages.push(args[index + 1]);
    index += 1;
    continue;
  }
  if (token === "--delay" && args[index + 1]) {
    delayMs = Number(args[index + 1]) || delayMs;
    index += 1;
    continue;
  }
  if (token === "--timeout" && args[index + 1]) {
    timeoutMs = Number(args[index + 1]) || timeoutMs;
    index += 1;
    continue;
  }
}

if (messages.length === 0) {
  messages.push("你是谁呀");
}

const child = spawn(chatCommand, ["chat"], {
  cwd: root,
  stdio: ["pipe", "pipe", "pipe"],
  env: {
    ...process.env,
    CODE_AGENT_DEBUG: process.env.CODE_AGENT_DEBUG || "1"
  }
});

let stdout = "";
let stderr = "";
let completed = false;
let promptWaiters = [];
let resolveExit;
const exitPromise = new Promise((resolve) => {
  resolveExit = resolve;
});

child.stdout.setEncoding("utf8");
child.stderr.setEncoding("utf8");

child.stdout.on("data", (chunk) => {
  stdout += chunk;
  process.stdout.write(`[chat-monitor][stdout] ${chunk}`);
  if (stdout.endsWith("> ")) {
    resolvePromptWaiters();
  }
});

child.stderr.on("data", (chunk) => {
  stderr += chunk;
  process.stderr.write(`[chat-monitor][stderr] ${chunk}`);
});

child.on("exit", (code) => {
  completed = true;
  process.stdout.write(`\n[chat-monitor] chat exited with code ${code ?? 0}\n`);
  resolveExit(code ?? 0);
});

const timeoutHandle = setTimeout(() => {
  if (completed) {
    return;
  }
  process.stderr.write(`\n[chat-monitor] timeout after ${timeoutMs}ms, terminating chat\n`);
  child.kill("SIGTERM");
}, timeoutMs);

await runScriptedConversation();
await exitPromise;
clearTimeout(timeoutHandle);

if (stderr.includes("Error:")) {
  process.exitCode = 1;
}

async function runScriptedConversation() {
  await waitForPrompt();
  for (const message of messages) {
    child.stdin.write(`${message}\n`);
    await wait(delayMs);
    await waitForPrompt();
  }
  child.stdin.write("/exit\n");
}

function wait(ms) {
  return new Promise((resolve) => setTimeout(resolve, ms));
}

function waitForPrompt() {
  if (stdout.endsWith("> ")) {
    return Promise.resolve();
  }
  return new Promise((resolve) => {
    promptWaiters.push(resolve);
  });
}

function resolvePromptWaiters() {
  const waiters = promptWaiters;
  promptWaiters = [];
  for (const resolve of waiters) {
    resolve();
  }
}
