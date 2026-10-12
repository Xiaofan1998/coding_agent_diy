import path from "node:path";
import os from "node:os";
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

export function resolveWorkspacePath(config, targetPath = ".", options = {}) {
  const absolute = resolveCandidatePath(config, targetPath);
  const access = options.access || "read";

  if (isAllowedWorkspacePath(config, absolute)) {
    return absolute;
  }

  const mode = normalizeFilesystemAccessMode(config.runtime?.filesystemAccessMode);
  if (mode === "legacy-workspace") {
    throw new Error(`Path escapes configured workspace roots: ${targetPath}`);
  }

  return absolute;
}

export function resolveCandidatePath(config, targetPath = ".") {
  return path.isAbsolute(targetPath)
    ? path.resolve(targetPath)
    : path.resolve(config.projectRoot, targetPath);
}

export function normalizeFilesystemAccessMode(value) {
  if (value === "full-access" || value === "request-access" || value === "legacy-workspace") {
    return value;
  }
  return "request-access";
}

export function classifyFilesystemAccess(config, targetPath = ".", options = {}) {
  const absolute = resolveCandidatePath(config, targetPath);
  const access = options.access || "read";
  const mode = normalizeFilesystemAccessMode(config.runtime?.filesystemAccessMode);
  const insideWorkspace = isAllowedWorkspacePath(config, absolute);
  const sensitive = isSensitiveFilesystemPath(absolute);
  const needsApproval = access === "write" && mode === "request-access" && (!insideWorkspace || sensitive);

  return {
    absolute,
    access,
    mode,
    insideWorkspace,
    sensitive,
    needsApproval,
    reason: needsApproval
      ? (!insideWorkspace ? "outside_workspace_write" : "sensitive_path_write")
      : "allowed"
  };
}

export function isSensitiveFilesystemPath(candidatePath) {
  const absolute = path.resolve(candidatePath);
  const home = os.homedir();
  const sensitiveRoots = [
    "/",
    "/bin",
    "/sbin",
    "/usr",
    "/etc",
    "/var",
    "/private",
    "/System",
    "/Library",
    path.join(home, ".ssh"),
    path.join(home, ".gnupg"),
    path.join(home, ".aws"),
    path.join(home, ".kube"),
    path.join(home, "Library", "Keychains")
  ];
  const sensitiveFiles = [
    path.join(home, ".zshrc"),
    path.join(home, ".bashrc"),
    path.join(home, ".bash_profile"),
    path.join(home, ".profile"),
    path.join(home, ".gitconfig")
  ];

  return sensitiveFiles.some((file) => path.resolve(file) === absolute)
    || sensitiveRoots.some((root) => {
      const resolvedRoot = path.resolve(root);
      return resolvedRoot === "/"
        ? absolute === "/"
        : isSubPath(resolvedRoot, absolute);
    });
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
