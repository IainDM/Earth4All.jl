import fs from "fs/promises";
import path from "path";
import type {
  SectorId,
  SectorParameters,
  SectorInitialisations,
  ProjectConfig,
  SourceCitation,
} from "./types.js";
import { SECTOR_IDS } from "./types.js";

export async function readProjectConfig(
  projectDir: string,
): Promise<ProjectConfig> {
  const raw = await fs.readFile(
    path.join(projectDir, "_project.json"),
    "utf-8",
  );
  return JSON.parse(raw) as ProjectConfig;
}

export async function readSectorParameters(
  projectDir: string,
  sector: SectorId,
): Promise<SectorParameters> {
  const filePath = path.join(projectDir, "parameters", `${sector}.json`);
  try {
    const raw = await fs.readFile(filePath, "utf-8");
    return JSON.parse(raw) as SectorParameters;
  } catch {
    return {};
  }
}

export async function readAllParameters(
  projectDir: string,
): Promise<Record<SectorId, SectorParameters>> {
  const result: Record<string, SectorParameters> = {};
  await Promise.all(
    SECTOR_IDS.map(async (sector) => {
      result[sector] = await readSectorParameters(projectDir, sector);
    }),
  );
  return result as Record<SectorId, SectorParameters>;
}

export async function readSectorInitialisations(
  projectDir: string,
  sector: SectorId,
): Promise<SectorInitialisations> {
  const filePath = path.join(projectDir, "initialisations", `${sector}.json`);
  try {
    const raw = await fs.readFile(filePath, "utf-8");
    return JSON.parse(raw) as SectorInitialisations;
  } catch {
    return {};
  }
}

export async function readAllInitialisations(
  projectDir: string,
): Promise<Record<SectorId, SectorInitialisations>> {
  const result: Record<string, SectorInitialisations> = {};
  await Promise.all(
    SECTOR_IDS.map(async (sector) => {
      result[sector] = await readSectorInitialisations(projectDir, sector);
    }),
  );
  return result as Record<SectorId, SectorInitialisations>;
}

export async function readSources(
  projectDir: string,
): Promise<SourceCitation[]> {
  const filePath = path.join(projectDir, "_sources.json");
  try {
    const raw = await fs.readFile(filePath, "utf-8");
    return JSON.parse(raw) as SourceCitation[];
  } catch {
    return [];
  }
}

export async function readSimulationResults(
  projectDir: string,
): Promise<Record<string, unknown> | null> {
  const filePath = path.join(projectDir, "results", "latest.json");
  try {
    const raw = await fs.readFile(filePath, "utf-8");
    return JSON.parse(raw) as Record<string, unknown>;
  } catch {
    return null;
  }
}

export async function readTimeseries(
  projectDir: string,
): Promise<Record<string, unknown> | null> {
  const filePath = path.join(projectDir, "results", "latest_timeseries.json");
  try {
    const raw = await fs.readFile(filePath, "utf-8");
    return JSON.parse(raw) as Record<string, unknown>;
  } catch {
    return null;
  }
}

export async function projectExists(projectDir: string): Promise<boolean> {
  try {
    await fs.access(path.join(projectDir, "_project.json"));
    return true;
  } catch {
    return false;
  }
}
