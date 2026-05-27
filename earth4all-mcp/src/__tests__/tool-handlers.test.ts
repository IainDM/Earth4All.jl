import { describe, it, expect, beforeEach, afterEach } from "vitest";
import fs from "fs/promises";
import path from "path";
import os from "os";
import { setProjectsDir } from "../constants.js";
import {
  handleListScenarios,
  handleListProjects,
  handleCreateProject,
  handlePreviewModel,
  handleSetParameter,
  handleResetParameter,
  handleSetTurnaround,
  handleGetResults,
  handleSaveBaseline,
  handleRestoreBaseline,
  handleToolCall,
} from "../shared/tool-handlers.js";

let testDir: string;

describe("tool handlers", () => {
  beforeEach(async () => {
    testDir = await fs.mkdtemp(path.join(os.tmpdir(), "e4a-tools-test-"));
    setProjectsDir(testDir);
  });

  afterEach(async () => {
    await fs.rm(testDir, { recursive: true, force: true });
  });

  describe("handleListScenarios", () => {
    it("returns TLTL and Giant Leap descriptions", async () => {
      const result = await handleListScenarios();
      expect(result.isError).toBeFalsy();
      expect(result.content[0].text).toContain("Too Little Too Late");
      expect(result.content[0].text).toContain("Giant Leap");
    });
  });

  describe("handleListProjects", () => {
    it("returns helpful message when no projects exist", async () => {
      const result = await handleListProjects();
      expect(result.isError).toBeFalsy();
      expect(result.content[0].text).toContain("No projects");
    });

    it("lists projects after creation", async () => {
      await handleCreateProject({
        name: "Test",
        description: "desc",
        base_scenario: "tltl",
      });
      const result = await handleListProjects();
      expect(result.content[0].text).toContain("Test");
    });
  });

  describe("handleCreateProject", () => {
    it("creates a TLTL project", async () => {
      const result = await handleCreateProject({
        name: "My TLTL",
        description: "Testing TLTL",
        base_scenario: "tltl",
      });
      expect(result.isError).toBeFalsy();
      expect(result.content[0].text).toContain("Project created");
      expect(result.content[0].text).toContain("tltl");
    });

    it("creates a Giant Leap project", async () => {
      const result = await handleCreateProject({
        name: "My GL",
        description: "Testing GL",
        base_scenario: "giant-leap",
      });
      expect(result.isError).toBeFalsy();
      expect(result.content[0].text).toContain("giant-leap");
    });
  });

  describe("handlePreviewModel", () => {
    it("returns error for non-existent project", async () => {
      const result = await handlePreviewModel({ project_id: "nonexistent" });
      expect(result.isError).toBe(true);
      expect(result.content[0].text).toContain("not found");
    });

    it("previews a TLTL project", async () => {
      const create = await handleCreateProject({
        name: "Test",
        description: "desc",
        base_scenario: "tltl",
      });
      const id = create.content[0].text.match(/id=(\w+)/)?.[1];
      expect(id).toBeTruthy();

      const result = await handlePreviewModel({ project_id: id! });
      expect(result.isError).toBeFalsy();
      expect(result.content[0].text).toContain("Test");
      expect(result.content[0].text).toContain("Turnaround Status");
    });
  });

  describe("handleSetParameter", () => {
    it("modifies a parameter with citation", async () => {
      const create = await handleCreateProject({
        name: "Test",
        description: "desc",
        base_scenario: "tltl",
      });
      const id = create.content[0].text.match(/id=(\w+)/)?.[1]!;

      const result = await handleSetParameter({
        project_id: id,
        sector: "population",
        parameter: "DNCM",
        value: 2.0,
        source_name: "UN WPP 2024",
        source_notes: "Higher fertility floor",
      });
      expect(result.isError).toBeFalsy();
      expect(result.content[0].text).toContain("population.DNCM = 2");
      expect(result.content[0].text).toContain("was 1.2");
      expect(result.content[0].text).toContain("UN WPP 2024");
    });

    it("returns error for non-existent project", async () => {
      const result = await handleSetParameter({
        project_id: "bad",
        sector: "population",
        parameter: "DNCM",
        value: 2.0,
        source_name: "Test",
      });
      expect(result.isError).toBe(true);
    });
  });

  describe("handleResetParameter", () => {
    it("resets a modified parameter to default", async () => {
      const create = await handleCreateProject({
        name: "Test",
        description: "desc",
        base_scenario: "tltl",
      });
      const id = create.content[0].text.match(/id=(\w+)/)?.[1]!;

      await handleSetParameter({
        project_id: id,
        sector: "population",
        parameter: "DNCM",
        value: 999,
        source_name: "Test",
      });

      const result = await handleResetParameter({
        project_id: id,
        sector: "population",
        parameter: "DNCM",
      });
      expect(result.isError).toBeFalsy();
      expect(result.content[0].text).toContain("1.2");
      expect(result.content[0].text).toContain("was 999");
    });
  });

  describe("handleSetTurnaround", () => {
    it("enables a turnaround", async () => {
      const create = await handleCreateProject({
        name: "Test",
        description: "desc",
        base_scenario: "tltl",
      });
      const id = create.content[0].text.match(/id=(\w+)/)?.[1]!;

      const result = await handleSetTurnaround({
        project_id: id,
        turnaround: "empowerment",
        enabled: true,
      });
      expect(result.isError).toBeFalsy();
      expect(result.content[0].text).toContain("Empower Women");
      expect(result.content[0].text).toContain("enabled");
      expect(result.content[0].text).toContain("population.GEFR = 0.2");
    });

    it("disables a turnaround", async () => {
      const create = await handleCreateProject({
        name: "Test",
        description: "desc",
        base_scenario: "giant-leap",
      });
      const id = create.content[0].text.match(/id=(\w+)/)?.[1]!;

      const result = await handleSetTurnaround({
        project_id: id,
        turnaround: "empowerment",
        enabled: false,
      });
      expect(result.isError).toBeFalsy();
      expect(result.content[0].text).toContain("disabled");
      expect(result.content[0].text).toContain("population.GEFR = 0");
    });

    it("returns error for invalid turnaround", async () => {
      const create = await handleCreateProject({
        name: "Test",
        description: "desc",
        base_scenario: "tltl",
      });
      const id = create.content[0].text.match(/id=(\w+)/)?.[1]!;

      const result = await handleSetTurnaround({
        project_id: id,
        turnaround: "invalid" as any,
        enabled: true,
      });
      expect(result.isError).toBe(true);
    });
  });

  describe("handleGetResults", () => {
    it("returns message when no results exist", async () => {
      const create = await handleCreateProject({
        name: "Test",
        description: "desc",
        base_scenario: "tltl",
      });
      const id = create.content[0].text.match(/id=(\w+)/)?.[1]!;

      const result = await handleGetResults({ project_id: id });
      expect(result.content[0].text).toContain("No simulation results");
    });
  });

  describe("handleSaveBaseline / handleRestoreBaseline", () => {
    it("saves and restores baselines", async () => {
      const create = await handleCreateProject({
        name: "Test",
        description: "desc",
        base_scenario: "tltl",
      });
      const id = create.content[0].text.match(/id=(\w+)/)?.[1]!;

      await handleSetParameter({
        project_id: id,
        sector: "population",
        parameter: "DNCM",
        value: 3.0,
        source_name: "test",
      });

      const saveResult = await handleSaveBaseline({
        project_id: id,
        baseline_name: "checkpoint-1",
      });
      expect(saveResult.isError).toBeFalsy();
      expect(saveResult.content[0].text).toContain("checkpoint-1");

      await handleSetParameter({
        project_id: id,
        sector: "population",
        parameter: "DNCM",
        value: 5.0,
        source_name: "test",
      });

      const restoreResult = await handleRestoreBaseline({
        project_id: id,
        baseline_name: "checkpoint-1",
      });
      expect(restoreResult.isError).toBeFalsy();
    });

    it("returns error for non-existent baseline", async () => {
      const create = await handleCreateProject({
        name: "Test",
        description: "desc",
        base_scenario: "tltl",
      });
      const id = create.content[0].text.match(/id=(\w+)/)?.[1]!;

      const result = await handleRestoreBaseline({
        project_id: id,
        baseline_name: "nonexistent",
      });
      expect(result.isError).toBe(true);
    });
  });

  describe("handleToolCall dispatch", () => {
    it("dispatches list_scenarios", async () => {
      const result = await handleToolCall("list_scenarios", {});
      expect(result.content[0].text).toContain("Too Little Too Late");
    });

    it("returns error for unknown tool", async () => {
      const result = await handleToolCall("unknown_tool", {});
      expect(result.isError).toBe(true);
      expect(result.content[0].text).toContain("Unknown tool");
    });
  });
});
