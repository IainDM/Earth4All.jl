import type { SectorId, SourceCitation } from "./types.js";
import { appendSource } from "./writer.js";

export interface SourceInfo {
  name: string;
  year?: number;
  url?: string;
  notes?: string;
}

export async function trackParameterChange(
  projectDir: string,
  sector: SectorId,
  parameter: string,
  newValue: number,
  previousValue: number,
  source: SourceInfo,
): Promise<void> {
  const citation: SourceCitation = {
    sector,
    parameter,
    value: newValue,
    previousValue,
    source: {
      name: source.name,
      ...(source.year !== undefined && { year: source.year }),
      ...(source.url !== undefined && { url: source.url }),
      ...(source.notes !== undefined && { notes: source.notes }),
    },
    timestamp: new Date().toISOString(),
  };
  await appendSource(projectDir, citation);
}
