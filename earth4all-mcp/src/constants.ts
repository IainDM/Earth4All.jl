import { fileURLToPath } from "url";
import path from "path";

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

export const PROJECT_ROOT = path.resolve(__dirname, "..");
export const DATA_DIR = path.join(PROJECT_ROOT, "data");
export const REFERENCE_DIR = path.join(DATA_DIR, "reference");
export const JULIA_DIR = path.join(PROJECT_ROOT, "julia");

let _projectsDir =
  process.env.EARTH4ALL_PROJECTS_DIR ?? path.join(DATA_DIR, "projects");

export function getProjectsDir(): string {
  return _projectsDir;
}

export function setProjectsDir(dir: string): void {
  _projectsDir = dir;
}

// Keep for backward compatibility but prefer getProjectsDir()
export const PROJECTS_DIR = path.join(DATA_DIR, "projects");

export const JULIA_WORKER_SCRIPT = path.join(JULIA_DIR, "worker.jl");
export const JULIA_RUNNER_SCRIPT = path.join(JULIA_DIR, "run_earth4all.jl");

const SYSIMAGE_EXT = process.platform === "win32" ? "dll" : process.platform === "darwin" ? "dylib" : "so";
export const JULIA_SYSIMAGE_PATH = path.join(JULIA_DIR, `earth4all_sysimage.${SYSIMAGE_EXT}`);

export const SIMULATION_TIMEOUT_MS = 5 * 60 * 1000; // 5 minutes
export const JULIA_STARTUP_TIMEOUT_MS = 3 * 60 * 1000; // 3 minutes for first compile
export const JULIA_SYSIMAGE_STARTUP_TIMEOUT_MS = 30 * 1000; // 30 seconds when using sysimage

export const MODEL_START_YEAR = 1980;
export const MODEL_END_YEAR = 2100;
export const MILESTONE_YEARS = [2025, 2050, 2075, 2100] as const;

export const SERVER_NAME = "earth4all-mcp";
export const SERVER_VERSION = "0.1.0";
