import path from "node:path";
import { isSubPath } from "./fs-utils.js";

export const EXTERNAL_ARTIFACT_ROOT_PREFIX = "__code_agent_artifacts__";

export function getArtifactRootDir(config) {
  return path.resolve(config.artifactRootDir || path.join(config.projectRoot, "docs"));
}

export function getArtifactDir(config, ...segments) {
  return path.join(getArtifactRootDir(config), ...segments);
}

export function buildArtifactLocation(config, subdir, fileName) {
  const absolutePath = path.join(getArtifactDir(config, subdir), fileName);
  const storedPath = toStoredArtifactPath(config, absolutePath);
  return {
    absolutePath,
    storedPath
  };
}

export function toStoredArtifactPath(config, absolutePath) {
  const normalizedAbsolute = path.resolve(absolutePath);
  const projectRoot = path.resolve(config.projectRoot);
  const artifactRoot = getArtifactRootDir(config);

  if (isSubPath(projectRoot, normalizedAbsolute)) {
    return normalizeStoredPath(path.relative(projectRoot, normalizedAbsolute));
  }

  if (isSubPath(artifactRoot, normalizedAbsolute)) {
    return normalizeStoredPath(path.join(EXTERNAL_ARTIFACT_ROOT_PREFIX, path.relative(artifactRoot, normalizedAbsolute)));
  }

  throw new Error(`Artifact path escapes both project root and artifact root: ${normalizedAbsolute}`);
}

export function resolveArtifactRecordPath(config, storedPath) {
  const normalized = normalizeStoredPath(storedPath || "");
  const projectRoot = path.resolve(config.projectRoot);
  const artifactRoot = getArtifactRootDir(config);
  const externalPrefix = `${EXTERNAL_ARTIFACT_ROOT_PREFIX}/`;

  if (normalized === EXTERNAL_ARTIFACT_ROOT_PREFIX || normalized.startsWith(externalPrefix)) {
    const relativePath = normalized === EXTERNAL_ARTIFACT_ROOT_PREFIX
      ? ""
      : normalized.slice(externalPrefix.length);
    const absolutePath = path.resolve(artifactRoot, relativePath);
    if (!isSubPath(artifactRoot, absolutePath)) {
      throw new Error(`Artifact record escapes configured artifact root: ${storedPath}`);
    }
    return absolutePath;
  }

  const absolutePath = path.resolve(projectRoot, normalized);
  if (!isSubPath(projectRoot, absolutePath)) {
    throw new Error(`Artifact record escapes project root: ${storedPath}`);
  }
  return absolutePath;
}

export function getArtifactRoutePrefix(config, subdir = "") {
  const baseStoredPath = toStoredArtifactPath(config, getArtifactDir(config, subdir));
  return `/${trimTrailingSlash(baseStoredPath)}/`;
}

function normalizeStoredPath(value) {
  return String(value || "").replaceAll(path.sep, "/").replace(/^\/+/, "");
}

function trimTrailingSlash(value) {
  return value.replace(/\/+$/, "");
}
