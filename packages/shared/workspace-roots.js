import path from "node:path";
import { isSubPath } from "./fs-utils.js";

export function parseWorkspaceRoots(projectRoot, value) {
  const roots = [
    path.resolve(projectRoot),
    ...splitPathList(value).map((item) => path.resolve(item))
  ];
  return dedupePaths(roots);
}

export function parseAllowedPaths(value) {
  return dedupePaths(splitPathList(value).map((item) => path.resolve(item)));
}

export function resolveWorkspacePath(config, targetPath = ".") {
  const absolute = path.isAbsolute(targetPath)
    ? path.resolve(targetPath)
    : path.resolve(config.projectRoot, targetPath);

  if (!isAllowedWorkspacePath(config, absolute)) {
    throw new Error(`Path escapes configured workspace roots: ${targetPath}`);
  }

  return absolute;
}

export function isAllowedWorkspacePath(config, candidatePath) {
  const workspaceRoots = config.workspaceRoots || [path.resolve(config.projectRoot)];
  const allowPaths = config.allowPaths || [];
  return workspaceRoots.some((root) => isSubPath(root, candidatePath))
    || allowPaths.some((allowedPath) => isSubPath(allowedPath, candidatePath));
}

function splitPathList(value = "") {
  return String(value || "")
    .split(path.delimiter)
    .map((item) => item.trim())
    .filter(Boolean);
}

function dedupePaths(paths) {
  return [...new Set(paths.map((item) => path.resolve(item)))];
}
