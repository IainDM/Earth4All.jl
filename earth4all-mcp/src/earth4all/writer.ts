import fs from "fs/promises";
import path from "path";
import type {
  SectorId,
  SectorParameters,
  ProjectConfig,
  SourceCitation,
} from "./types.js";

export async function ensureDir(dirPath: string): Promise<void> {
  await fs.mkdir(dirPath, { recursive: true });
}

export async function writeProjectConfig(
  projectDir: string,
  config: ProjectConfig,
): Promise<void> {
  await ensureDir(projectDir);
  await fs.writeFile(
    path.join(projectDir, "_project.json"),
    JSON.stringify(config, null, 2),
  );
}

export async function writeSectorParameters(
  projectDir: string,
  sector: SectorId,
  params: SectorParameters,
): Promise<void> {
  const dir = path.join(projectDir, "parameters");
  await ensureDir(dir);
  await fs.writeFile(
    path.join(dir, `${sector}.json`),
    JSON.stringify(params, null, 2),
  );
}

export async function writeAllParameters(
  projectDir: string,
  allParams: Record<SectorId, SectorParameters>,
): Promise<void> {
  await Promise.all(
    Object.entries(allParams).map(([sector, params]) =>
      writeSectorParameters(projectDir, sector as SectorId, params),
    ),
  );
}

export async function writeSources(
  projectDir: string,
  sources: SourceCitation[],
): Promise<void> {
  await ensureDir(projectDir);
  await fs.writeFile(
    path.join(projectDir, "_sources.json"),
    JSON.stringify(sources, null, 2),
  );
}

export async function appendSource(
  projectDir: string,
  citation: SourceCitation,
): Promise<void> {
  const sourcesPath = path.join(projectDir, "_sources.json");
  let sources: SourceCitation[] = [];
  try {
    const raw = await fs.readFile(sourcesPath, "utf-8");
    sources = JSON.parse(raw) as SourceCitation[];
  } catch {
    // File doesn't exist yet
  }
  sources.push(citation);
  await writeSources(projectDir, sources);
}

export async function writeSimulationResults(
  projectDir: string,
  results: Record<string, unknown>,
): Promise<void> {
  const dir = path.join(projectDir, "results");
  await ensureDir(dir);
  await fs.writeFile(
    path.join(dir, "latest.json"),
    JSON.stringify(results, null, 2),
  );
}

export async function writeTimeseries(
  projectDir: string,
  timeseries: Record<string, unknown>,
): Promise<void> {
  const dir = path.join(projectDir, "results");
  await ensureDir(dir);
  await fs.writeFile(
    path.join(dir, "latest_timeseries.json"),
    JSON.stringify(timeseries, null, 2),
  );
}

export async function saveBaseline(
  projectDir: string,
  baselineName: string,
  allParams: Record<SectorId, SectorParameters>,
): Promise<void> {
  const dir = path.join(projectDir, "baselines");
  await ensureDir(dir);
  await fs.writeFile(
    path.join(dir, `${baselineName}.json`),
    JSON.stringify(allParams, null, 2),
  );
}

export async function readBaseline(
  projectDir: string,
  baselineName: string,
): Promise<Record<SectorId, SectorParameters>> {
  const raw = await fs.readFile(
    path.join(projectDir, "baselines", `${baselineName}.json`),
    "utf-8",
  );
  return JSON.parse(raw) as Record<SectorId, SectorParameters>;
}
