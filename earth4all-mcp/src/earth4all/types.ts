export const SECTOR_IDS = [
  "climate",
  "demand",
  "energy",
  "finance",
  "foodland",
  "inventory",
  "labourmarket",
  "other",
  "output",
  "population",
  "public",
  "wellbeing",
] as const;

export type SectorId = (typeof SECTOR_IDS)[number];

export const SECTOR_LABELS: Record<SectorId, string> = {
  climate: "Climate",
  demand: "Demand",
  energy: "Energy",
  finance: "Finance",
  foodland: "Food & Land",
  inventory: "Inventory",
  labourmarket: "Labour Market",
  other: "Other Performance",
  output: "Output",
  population: "Population",
  public: "Public",
  wellbeing: "Wellbeing",
};

export const JULIA_SECTOR_NAMES: Record<SectorId, string> = {
  climate: "Climate",
  demand: "Demand",
  energy: "Energy",
  finance: "Finance",
  foodland: "FoodLand",
  inventory: "Inventory",
  labourmarket: "LabourMarket",
  other: "Other",
  output: "Output",
  population: "Population",
  public: "Public",
  wellbeing: "Wellbeing",
};

export const JULIA_PARAM_KEYS: Record<SectorId, string> = {
  climate: "cli_pars",
  demand: "dem_pars",
  energy: "ene_pars",
  finance: "fin_pars",
  foodland: "foo_pars",
  inventory: "inv_pars",
  labourmarket: "lab_pars",
  other: "oth_pars",
  output: "out_pars",
  population: "pop_pars",
  public: "pub_pars",
  wellbeing: "wel_pars",
};

export const JULIA_INIT_KEYS: Record<SectorId, string> = {
  climate: "cli_inits",
  demand: "dem_inits",
  energy: "ene_inits",
  finance: "fin_inits",
  foodland: "foo_inits",
  inventory: "inv_inits",
  labourmarket: "lab_inits",
  other: "oth_inits",
  output: "out_inits",
  population: "pop_inits",
  public: "pub_inits",
  wellbeing: "wel_inits",
};

export interface ParameterMeta {
  name: string;
  sector: SectorId;
  defaultValue: number;
  description: string;
  unit?: string;
  turnaround?: TurnaroundId;
  glValue?: number;
}

export interface InitialisationMeta {
  name: string;
  sector: SectorId;
  defaultValue: number;
  description: string;
}

export type SectorParameters = Record<string, number>;
export type SectorInitialisations = Record<string, number>;

export const TURNAROUND_IDS = [
  "poverty",
  "inequality",
  "empowerment",
  "food",
  "energy",
] as const;

export type TurnaroundId = (typeof TURNAROUND_IDS)[number];

export interface TurnaroundDefinition {
  id: TurnaroundId;
  name: string;
  description: string;
  parameters: TurnaroundParameter[];
}

export interface TurnaroundParameter {
  sector: SectorId;
  parameter: string;
  tltlValue: number;
  glValue: number;
  description: string;
}

export type ScenarioId = "tltl" | "giant-leap";

export interface ScenarioDefinition {
  id: ScenarioId;
  name: string;
  description: string;
}

export interface OutputVariable {
  name: string;
  sector: SectorId;
  juliaPrefix: string;
  juliaVar: string;
  description: string;
  unit: string;
  minRange: number;
  maxRange: number;
}

export interface DashboardValues {
  year: number;
  population_mp: number;
  gdp_per_person_k: number;
  warming_degC: number;
  inequality: number;
  wellbeing_index: number;
  social_tension: number;
}

export interface SimulationResult {
  success: boolean;
  message: string;
  solve_time_seconds: number;
  dashboard: DashboardValues[];
  timeseries?: Record<string, TimeseriesData>;
  warnings: string[];
}

export interface TimeseriesData {
  variable: string;
  unit: string;
  times: number[];
  values: number[];
}

export interface ProjectConfig {
  id: string;
  name: string;
  description: string;
  baseScenario: ScenarioId;
  createdAt: string;
  updatedAt: string;
}

export interface SourceCitation {
  sector: SectorId;
  parameter: string;
  value: number;
  previousValue: number;
  source: {
    name: string;
    year?: number;
    url?: string;
    notes?: string;
  };
  timestamp: string;
}
