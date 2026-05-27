import fs from "fs/promises";
import path from "path";
import crypto from "crypto";
import type {
  ScenarioId,
  SectorId,
  SectorParameters,
  ProjectConfig,
} from "../earth4all/types.js";
import { SECTOR_IDS } from "../earth4all/types.js";
import { getProjectsDir, REFERENCE_DIR } from "../constants.js";
import { getDefaultParameters } from "../earth4all/parameters.js";
import { getGiantLeapOverrides } from "../earth4all/scenarios.js";
import {
  writeProjectConfig,
  writeAllParameters,
  writeSources,
  saveBaseline,
} from "../earth4all/writer.js";
import {
  readProjectConfig,
  readAllParameters,
  projectExists,
} from "../earth4all/reader.js";
import { readBaseline } from "../earth4all/writer.js";

function generateId(): string {
  return crypto.randomBytes(6).toString("hex");
}

function getProjectDir(projectId: string): string {
  return path.join(getProjectsDir(), projectId);
}

export async function listScenarios(): Promise<
  { id: ScenarioId; name: string; description: string }[]
> {
  return [
    {
      id: "tltl",
      name: "Too Little Too Late",
      description:
        "Current policy trajectories — business as usual. Warming reaches ~2.5°C, inequality persists, social tensions rise.",
    },
    {
      id: "giant-leap",
      name: "Giant Leap",
      description:
        "Transformative policies via five extraordinary turnarounds. Warming stabilises below 2°C, extreme poverty ends, wellbeing rises.",
    },
  ];
}

export async function listProjects(): Promise<ProjectConfig[]> {
  try {
    await fs.mkdir(getProjectsDir(), { recursive: true });
    const entries = await fs.readdir(getProjectsDir(), { withFileTypes: true });
    const projects: ProjectConfig[] = [];
    for (const entry of entries) {
      if (entry.isDirectory()) {
        const dir = path.join(getProjectsDir(), entry.name);
        if (await projectExists(dir)) {
          projects.push(await readProjectConfig(dir));
        }
      }
    }
    return projects.sort(
      (a, b) =>
        new Date(b.updatedAt).getTime() - new Date(a.updatedAt).getTime(),
    );
  } catch {
    return [];
  }
}

export async function createProject(
  name: string,
  description: string,
  baseScenario: ScenarioId,
): Promise<ProjectConfig> {
  const id = generateId();
  const projectDir = getProjectDir(id);

  const config: ProjectConfig = {
    id,
    name,
    description,
    baseScenario,
    createdAt: new Date().toISOString(),
    updatedAt: new Date().toISOString(),
  };

  // Build parameters: start from TLTL defaults, apply GL overrides if needed
  const allParams: Record<string, SectorParameters> = {};
  for (const sector of SECTOR_IDS) {
    allParams[sector] = getDefaultParameters(sector);
  }

  if (baseScenario === "giant-leap") {
    const overrides = getGiantLeapOverrides();
    for (const [sector, sectorOverrides] of Object.entries(overrides)) {
      for (const [param, value] of Object.entries(sectorOverrides)) {
        allParams[sector][param] = value;
      }
    }
  }

  await writeProjectConfig(projectDir, config);
  await writeAllParameters(
    projectDir,
    allParams as Record<SectorId, SectorParameters>,
  );
  await writeSources(projectDir, []);

  return config;
}

export async function getProject(
  projectId: string,
): Promise<ProjectConfig | null> {
  const projectDir = getProjectDir(projectId);
  if (!(await projectExists(projectDir))) {
    return null;
  }
  return readProjectConfig(projectDir);
}

export async function getProjectParameters(
  projectId: string,
): Promise<Record<SectorId, SectorParameters>> {
  const projectDir = getProjectDir(projectId);
  return readAllParameters(projectDir);
}

export async function setParameter(
  projectId: string,
  sector: SectorId,
  parameter: string,
  value: number,
): Promise<{ previousValue: number | undefined }> {
  const projectDir = getProjectDir(projectId);
  const params = await readAllParameters(projectDir);
  const previousValue = params[sector]?.[parameter];
  params[sector][parameter] = value;

  // Write just the changed sector
  const { writeSectorParameters } = await import("../earth4all/writer.js");
  await writeSectorParameters(projectDir, sector, params[sector]);

  // Update project timestamp
  const config = await readProjectConfig(projectDir);
  config.updatedAt = new Date().toISOString();
  await writeProjectConfig(projectDir, config);

  return { previousValue };
}

export async function resetParameter(
  projectId: string,
  sector: SectorId,
  parameter: string,
): Promise<{ previousValue: number | undefined; defaultValue: number }> {
  const projectDir = getProjectDir(projectId);
  const config = await readProjectConfig(projectDir);
  const params = await readAllParameters(projectDir);
  const previousValue = params[sector]?.[parameter];

  // Get the default for the base scenario
  const defaults = getDefaultParameters(sector);
  if (config.baseScenario === "giant-leap") {
    const overrides = getGiantLeapOverrides();
    const sectorOverrides = overrides[sector];
    if (sectorOverrides && parameter in sectorOverrides) {
      defaults[parameter] = sectorOverrides[parameter];
    }
  }

  const defaultValue = defaults[parameter];
  params[sector][parameter] = defaultValue;

  const { writeSectorParameters } = await import("../earth4all/writer.js");
  await writeSectorParameters(projectDir, sector, params[sector]);

  config.updatedAt = new Date().toISOString();
  await writeProjectConfig(projectDir, config);

  return { previousValue, defaultValue };
}

export async function saveProjectBaseline(
  projectId: string,
  baselineName: string,
): Promise<void> {
  const projectDir = getProjectDir(projectId);
  const params = await readAllParameters(projectDir);
  await saveBaseline(projectDir, baselineName, params);
}

export async function restoreProjectBaseline(
  projectId: string,
  baselineName: string,
): Promise<void> {
  const projectDir = getProjectDir(projectId);
  const params = await readBaseline(projectDir, baselineName);
  await writeAllParameters(projectDir, params);

  const config = await readProjectConfig(projectDir);
  config.updatedAt = new Date().toISOString();
  await writeProjectConfig(projectDir, config);
}

export { getProjectDir };
