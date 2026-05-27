import { describe, it, expect, beforeEach, afterEach } from "vitest";
import fs from "fs/promises";
import path from "path";
import os from "os";
import {
  readProjectConfig,
  readSectorParameters,
  readAllParameters,
  readSources,
  projectExists,
} from "../earth4all/reader.js";
import {
  writeProjectConfig,
  writeSectorParameters,
  writeAllParameters,
  writeSources,
  appendSource,
  saveBaseline,
  readBaseline,
} from "../earth4all/writer.js";
import type { ProjectConfig, SourceCitation, SectorId } from "../earth4all/types.js";

let testDir: string;

describe("reader/writer", () => {
  beforeEach(async () => {
    testDir = await fs.mkdtemp(path.join(os.tmpdir(), "e4a-rw-test-"));
  });

  afterEach(async () => {
    await fs.rm(testDir, { recursive: true, force: true });
  });

  describe("projectExists", () => {
    it("returns false for non-existent project", async () => {
      expect(await projectExists(testDir)).toBe(false);
    });

    it("returns true after writing project config", async () => {
      const config: ProjectConfig = {
        id: "test",
        name: "Test",
        description: "desc",
        baseScenario: "tltl",
        createdAt: new Date().toISOString(),
        updatedAt: new Date().toISOString(),
      };
      await writeProjectConfig(testDir, config);
      expect(await projectExists(testDir)).toBe(true);
    });
  });

  describe("project config", () => {
    it("round-trips project config through write/read", async () => {
      const config: ProjectConfig = {
        id: "abc123",
        name: "My Project",
        description: "Testing round-trip",
        baseScenario: "giant-leap",
        createdAt: "2024-01-15T10:00:00Z",
        updatedAt: "2024-01-15T12:00:00Z",
      };

      await writeProjectConfig(testDir, config);
      const read = await readProjectConfig(testDir);
      expect(read).toEqual(config);
    });
  });

  describe("sector parameters", () => {
    it("round-trips sector parameters", async () => {
      const params = { GEFR: 0.2, DNCM: 1.5, LEMAX: 90 };
      await writeSectorParameters(testDir, "population", params);
      const read = await readSectorParameters(testDir, "population");
      expect(read).toEqual(params);
    });

    it("returns empty object for missing sector", async () => {
      const read = await readSectorParameters(testDir, "climate");
      expect(read).toEqual({});
    });

    it("round-trips all parameters", async () => {
      const allParams = {
        climate: { DACCO22100: 8, OBWA2022: 1.35 },
        demand: { EETF2022: 0.02 },
        energy: { GREF: 1 },
        finance: { FSRT: 1 },
        foodland: { GCWR: 0.2 },
        inventory: { DAT: 1.2 },
        labourmarket: { AUR: 0.05 },
        other: { TEGR: 4 },
        output: { USPIS2022: 0.01 },
        population: { GEFR: 0.2, DNCM: 1.2 },
        public: { MIROTA2022: 0.005 },
        wellbeing: { AI: 0.6 },
      } as Record<SectorId, Record<string, number>>;

      await writeAllParameters(testDir, allParams);
      const read = await readAllParameters(testDir);
      expect(read).toEqual(allParams);
    });
  });

  describe("sources", () => {
    it("writes and reads sources", async () => {
      const sources: SourceCitation[] = [
        {
          sector: "population",
          parameter: "DNCM",
          value: 2.0,
          previousValue: 1.2,
          source: { name: "UN WPP 2024", year: 2024 },
          timestamp: "2024-01-15T10:00:00Z",
        },
      ];
      await writeSources(testDir, sources);
      const read = await readSources(testDir);
      expect(read).toEqual(sources);
    });

    it("returns empty array when no sources file", async () => {
      const read = await readSources(testDir);
      expect(read).toEqual([]);
    });

    it("appends sources incrementally", async () => {
      await writeSources(testDir, []);

      const citation1: SourceCitation = {
        sector: "population",
        parameter: "DNCM",
        value: 2.0,
        previousValue: 1.2,
        source: { name: "Source A" },
        timestamp: "2024-01-15T10:00:00Z",
      };
      await appendSource(testDir, citation1);

      const citation2: SourceCitation = {
        sector: "energy",
        parameter: "GREF",
        value: 0.8,
        previousValue: 0.5,
        source: { name: "Source B" },
        timestamp: "2024-01-15T11:00:00Z",
      };
      await appendSource(testDir, citation2);

      const sources = await readSources(testDir);
      expect(sources).toHaveLength(2);
      expect(sources[0].parameter).toBe("DNCM");
      expect(sources[1].parameter).toBe("GREF");
    });
  });

  describe("baselines", () => {
    it("round-trips baselines", async () => {
      const params = {
        climate: { DACCO22100: 4 },
        demand: { EETF2022: 0.01 },
        energy: {},
        finance: {},
        foodland: {},
        inventory: {},
        labourmarket: {},
        other: {},
        output: {},
        population: { GEFR: 0.1 },
        public: {},
        wellbeing: {},
      } as Record<SectorId, Record<string, number>>;

      await saveBaseline(testDir, "my-baseline", params);
      const read = await readBaseline(testDir, "my-baseline");
      expect(read).toEqual(params);
    });

    it("supports multiple baselines", async () => {
      const params1 = { climate: { DACCO22100: 4 } } as Record<SectorId, Record<string, number>>;
      const params2 = { climate: { DACCO22100: 8 } } as Record<SectorId, Record<string, number>>;

      await saveBaseline(testDir, "baseline-a", params1);
      await saveBaseline(testDir, "baseline-b", params2);

      const read1 = await readBaseline(testDir, "baseline-a");
      const read2 = await readBaseline(testDir, "baseline-b");
      expect(read1.climate.DACCO22100).toBe(4);
      expect(read2.climate.DACCO22100).toBe(8);
    });
  });
});
