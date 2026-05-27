import { spawn, type ChildProcess } from "child_process";
import { existsSync } from "fs";
import path from "path";
import { logger } from "./logger.js";
import {
  PROJECT_ROOT,
  JULIA_WORKER_SCRIPT,
  JULIA_SYSIMAGE_PATH,
  JULIA_STARTUP_TIMEOUT_MS,
  JULIA_SYSIMAGE_STARTUP_TIMEOUT_MS,
  SIMULATION_TIMEOUT_MS,
} from "../constants.js";
import type { SectorId, SectorParameters, SimulationResult } from "../earth4all/types.js";

interface PendingCommand {
  resolve: (value: string) => void;
  reject: (reason: Error) => void;
  timeout: ReturnType<typeof setTimeout>;
}

interface JuliaWorkerState {
  process: ChildProcess | null;
  ready: boolean;
  starting: boolean;
  pendingResolve: ((value: string) => void) | null;
  pendingReject: ((reason: Error) => void) | null;
  buffer: string;
  commandQueue: PendingCommand[];
}

const state: JuliaWorkerState = {
  process: null,
  ready: false,
  starting: false,
  pendingResolve: null,
  pendingReject: null,
  buffer: "",
  commandQueue: [],
};

function getJuliaCommand(): string {
  return process.env.JULIA_CMD ?? "julia";
}

function getJuliaFlags(): { flags: string[]; usingSysimage: boolean } {
  const flags = process.env.JULIA_FLAGS?.split(/\s+/).filter(Boolean) ?? [];
  let usingSysimage = false;

  // If a custom sysimage exists, use it — packages are pre-compiled inside,
  // so no pkgimages needed and no segfault risk.
  if (!flags.some((f) => f.startsWith("--sysimage")) && existsSync(JULIA_SYSIMAGE_PATH)) {
    flags.push(`--sysimage=${JULIA_SYSIMAGE_PATH}`);
    usingSysimage = true;
    logger.info(`Using custom sysimage: ${JULIA_SYSIMAGE_PATH}`);
  } else if (!flags.some((f) => f.startsWith("--pkgimages"))) {
    // Fallback: --pkgimages=no avoids segfaults during native code image
    // loading for heavy packages, but is slow. Build a sysimage to fix:
    //   julia julia/build_sysimage.jl
    flags.push("--pkgimages=no");
  }

  return { flags, usingSysimage };
}

function rejectAllQueued(err: Error): void {
  if (state.pendingReject) {
    state.pendingReject(err);
    state.pendingResolve = null;
    state.pendingReject = null;
  }
  for (const cmd of state.commandQueue) {
    clearTimeout(cmd.timeout);
    cmd.reject(err);
  }
  state.commandQueue = [];
}

function getEarth4AllSrc(): string {
  return (
    process.env.EARTH4ALL_SRC ??
    path.resolve(PROJECT_ROOT, "..", "src")
  );
}

export async function ensureWorker(): Promise<void> {
  if (state.ready && state.process && !state.process.killed) {
    return;
  }

  if (state.starting) {
    // Wait for the existing startup to complete
    return new Promise((resolve, reject) => {
      const check = setInterval(() => {
        if (state.ready) {
          clearInterval(check);
          resolve();
        } else if (!state.starting) {
          clearInterval(check);
          reject(new Error("Julia worker failed to start"));
        }
      }, 500);
    });
  }

  state.starting = true;

  return new Promise((resolve, reject) => {
    const juliaCmd = getJuliaCommand();
    const { flags: juliaFlags, usingSysimage } = getJuliaFlags();
    const e4aSrc = getEarth4AllSrc();
    const startupTimeout = usingSysimage ? JULIA_SYSIMAGE_STARTUP_TIMEOUT_MS : JULIA_STARTUP_TIMEOUT_MS;

    logger.info(`Starting Julia worker: ${juliaCmd} ${[...juliaFlags, JULIA_WORKER_SCRIPT, e4aSrc].join(" ")}`);

    const proc = spawn(juliaCmd, [...juliaFlags, JULIA_WORKER_SCRIPT, e4aSrc], {
      stdio: ["pipe", "pipe", "pipe"],
      env: { ...process.env, EARTH4ALL_SRC: e4aSrc },
    });

    state.process = proc;
    state.buffer = "";

    const timeout = setTimeout(() => {
      state.starting = false;
      proc.kill();
      reject(new Error(`Julia worker startup timed out after ${startupTimeout / 1000}s`));
    }, startupTimeout);

    proc.stderr?.on("data", (data: Buffer) => {
      logger.debug(`Julia stderr: ${data.toString().trim()}`);
    });

    proc.stdout?.on("data", (data: Buffer) => {
      state.buffer += data.toString();

      // Process complete lines
      let newlineIdx: number;
      while ((newlineIdx = state.buffer.indexOf("\n")) !== -1) {
        const line = state.buffer.slice(0, newlineIdx).trim();
        state.buffer = state.buffer.slice(newlineIdx + 1);

        if (!line) continue;

        try {
          const msg = JSON.parse(line);

          if (!state.ready && msg.status === "ready") {
            // Worker is ready
            state.ready = true;
            state.starting = false;
            clearTimeout(timeout);
            logger.info("Julia worker is ready");
            resolve();
          } else if (state.pendingResolve) {
            // This is a response to a pending command
            const res = state.pendingResolve;
            state.pendingResolve = null;
            state.pendingReject = null;
            res(line);
          }
        } catch {
          logger.warn(`Non-JSON from Julia: ${line}`);
        }
      }
    });

    proc.on("error", (err) => {
      state.starting = false;
      state.ready = false;
      clearTimeout(timeout);
      rejectAllQueued(err);
      reject(err);
    });

    proc.on("exit", (code) => {
      state.ready = false;
      state.starting = false;
      state.process = null;
      logger.info(`Julia worker exited with code ${code}`);
      rejectAllQueued(new Error(`Julia worker exited with code ${code}`));
    });
  });
}

function dispatchNext(): void {
  if (state.commandQueue.length === 0 || state.pendingResolve) {
    return; // Nothing queued, or a command is already in-flight
  }

  const next = state.commandQueue[0];
  state.pendingResolve = (value: string) => {
    clearTimeout(next.timeout);
    state.commandQueue.shift();
    state.pendingResolve = null;
    state.pendingReject = null;
    next.resolve(value);
    dispatchNext(); // Send next queued command
  };
  state.pendingReject = (reason: Error) => {
    clearTimeout(next.timeout);
    state.commandQueue.shift();
    state.pendingResolve = null;
    state.pendingReject = null;
    next.reject(reason);
    dispatchNext();
  };
}

async function sendCommand(command: Record<string, unknown>): Promise<string> {
  await ensureWorker();

  if (!state.process || !state.process.stdin) {
    throw new Error("Julia worker is not running");
  }

  return new Promise((resolve, reject) => {
    const timeout = setTimeout(() => {
      // Remove this entry from the queue
      const idx = state.commandQueue.findIndex((c) => c.timeout === timeout);
      if (idx !== -1) state.commandQueue.splice(idx, 1);
      if (state.pendingResolve === null) {
        // Wasn't dispatched yet, just reject
      } else {
        state.pendingResolve = null;
        state.pendingReject = null;
        dispatchNext();
      }
      reject(new Error(`Julia command timed out after ${SIMULATION_TIMEOUT_MS / 1000}s`));
    }, SIMULATION_TIMEOUT_MS);

    state.commandQueue.push({ resolve, reject, timeout });

    // Write the command immediately — Julia will process them in order
    const json = JSON.stringify(command);
    state.process!.stdin!.write(json + "\n");

    // If no command is in-flight, dispatch this one
    dispatchNext();
  });
}

export async function runSimulation(
  parameters: Record<string, SectorParameters>,
  initialisations?: Record<string, Record<string, number>>,
  variables?: string[],
): Promise<SimulationResult> {
  const command: Record<string, unknown> = {
    command: "run",
    parameters,
  };
  if (initialisations) {
    command.initialisations = initialisations;
  }
  if (variables) {
    command.variables = variables;
  }

  const response = await sendCommand(command);
  return JSON.parse(response) as SimulationResult;
}

export async function pingWorker(): Promise<boolean> {
  try {
    const response = await sendCommand({ command: "ping" });
    const parsed = JSON.parse(response);
    return parsed.status === "ok";
  } catch {
    return false;
  }
}

export async function shutdownWorker(): Promise<void> {
  if (state.process && !state.process.killed) {
    try {
      state.process.stdin?.write(JSON.stringify({ command: "exit" }) + "\n");
    } catch {
      // Process may already be gone
    }
    state.process.kill();
    state.process = null;
    state.ready = false;
  }
}
