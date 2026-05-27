import { describe, it, expect, beforeEach, afterEach } from "vitest";
import fs from "fs/promises";
import path from "path";
import os from "os";
import { setProjectsDir } from "../constants.js";
import {
  listScenarios,
  listProjects,
  createProject,
  getProject,
  getProjectParameters,
  setParameter,
  resetParameter,
  saveProjectBaseline,
  restoreProjectBaseline,
} from "../project/manager.js";

let testDir: string;

describe("project manager", () => {
  beforeEach(async () => {
    testDir = await fs.mkdtemp(path.join(os.tmpdir(), "e4a-test-"));
    setProjectsDir(testDir);
  });

  afterEach(async () => {
    await fs.rm(testDir, { recursive: true, force: true });
  });

  describe("listScenarios", () => {
    it("returns TLTL and Giant Leap", async () => {
      const scenarios = await listScenarios();
      expect(scenarios).toHaveLength(2);
      expect(scenarios[0].id).toBe("tltl");
      expect(scenarios[1].id).toBe("giant-leap");
    });

    it("scenarios have names and descriptions", async () => {
      const scenarios = await listScenarios();
      for (const s of scenarios) {
        expect(s.name.length).toBeGreaterThan(0);
        expect(s.description.length).toBeGreaterThan(0);
      }
    });
  });

  describe("createProject", () => {
    it("creates a TLTL project with correct defaults", async () => {
      const config = await createProject("Test TLTL", "A test project", "tltl");
      expect(config.id).toBeTruthy();
      expect(config.name).toBe("Test TLTL");
      expect(config.baseScenario).toBe("tltl");

      const params = await getProjectParameters(config.id);
      expect(params.population.GEFR).toBe(0);
      expect(params.climate.DACCO22100).toBe(0);
      expect(params.energy.GFNE).toBe(0.5);
    });

    it("creates a Giant Leap project with GL overrides applied", async () => {
      const config = await createProject("Test GL", "A GL test", "giant-leap");
      expect(config.baseScenario).toBe("giant-leap");

      const params = await getProjectParameters(config.id);
      expect(params.population.GEFR).toBe(0.2);
      expect(params.climate.DACCO22100).toBe(8);
      expect(params.energy.GREF).toBe(1);
      expect(params.demand.EETF2022).toBe(0.02);
      expect(params.foodland.GFRA).toBe(0.5);
    });

    it("creates unique IDs", async () => {
      const a = await createProject("A", "desc", "tltl");
      const b = await createProject("B", "desc", "tltl");
      expect(a.id).not.toBe(b.id);
    });

    it("sets createdAt and updatedAt timestamps", async () => {
      const config = await createProject("Test", "desc", "tltl");
      expect(config.createdAt).toBeTruthy();
      expect(config.updatedAt).toBeTruthy();
      expect(new Date(config.createdAt).getTime()).toBeGreaterThan(0);
    });
  });

  describe("listProjects", () => {
    it("returns empty list when no projects exist", async () => {
      const projects = await listProjects();
      expect(projects).toEqual([]);
    });

    it("lists created projects", async () => {
      await createProject("Alpha", "first", "tltl");
      await createProject("Beta", "second", "giant-leap");
      const projects = await listProjects();
      expect(projects).toHaveLength(2);
      const names = projects.map((p) => p.name);
      expect(names).toContain("Alpha");
      expect(names).toContain("Beta");
    });
  });

  describe("getProject", () => {
    it("returns null for non-existent project", async () => {
      const project = await getProject("nonexistent");
      expect(project).toBeNull();
    });

    it("returns project config for existing project", async () => {
      const created = await createProject("Existing", "desc", "tltl");
      const fetched = await getProject(created.id);
      expect(fetched).not.toBeNull();
      expect(fetched!.name).toBe("Existing");
    });
  });

  describe("setParameter", () => {
    it("modifies a parameter and returns previous value", async () => {
      const config = await createProject("Test", "desc", "tltl");
      const result = await setParameter(config.id, "population", "DNCM", 2.0);
      expect(result.previousValue).toBe(1.2);

      const params = await getProjectParameters(config.id);
      expect(params.population.DNCM).toBe(2.0);
    });

    it("updates the project timestamp", async () => {
      const config = await createProject("Test", "desc", "tltl");
      const originalTime = config.updatedAt;

      await new Promise((r) => setTimeout(r, 10));
      await setParameter(config.id, "population", "DNCM", 2.0);

      const updated = await getProject(config.id);
      expect(new Date(updated!.updatedAt).getTime()).toBeGreaterThanOrEqual(
        new Date(originalTime).getTime(),
      );
    });

    it("does not affect other parameters", async () => {
      const config = await createProject("Test", "desc", "tltl");
      await setParameter(config.id, "population", "DNCM", 2.0);

      const params = await getProjectParameters(config.id);
      expect(params.population.GEFR).toBe(0);
      expect(params.population.LEMAX).toBe(85);
    });
  });

  describe("resetParameter", () => {
    it("resets a TLTL project parameter to TLTL default", async () => {
      const config = await createProject("Test", "desc", "tltl");
      await setParameter(config.id, "population", "DNCM", 999);

      const result = await resetParameter(config.id, "population", "DNCM");
      expect(result.previousValue).toBe(999);
      expect(result.defaultValue).toBe(1.2);

      const params = await getProjectParameters(config.id);
      expect(params.population.DNCM).toBe(1.2);
    });

    it("resets a GL project parameter to GL default", async () => {
      const config = await createProject("Test GL", "desc", "giant-leap");
      await setParameter(config.id, "population", "GEFR", 0.5);

      const result = await resetParameter(config.id, "population", "GEFR");
      expect(result.previousValue).toBe(0.5);
      expect(result.defaultValue).toBe(0.2);
    });
  });

  describe("baselines", () => {
    it("save and restore baseline preserves parameter state", async () => {
      const config = await createProject("Test", "desc", "tltl");

      await setParameter(config.id, "population", "DNCM", 3.0);
      await saveProjectBaseline(config.id, "custom");

      await setParameter(config.id, "population", "DNCM", 5.0);
      let params = await getProjectParameters(config.id);
      expect(params.population.DNCM).toBe(5.0);

      await restoreProjectBaseline(config.id, "custom");
      params = await getProjectParameters(config.id);
      expect(params.population.DNCM).toBe(3.0);
    });
  });
});
