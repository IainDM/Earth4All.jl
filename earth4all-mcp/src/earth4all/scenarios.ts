import type {
  ScenarioId,
  ScenarioDefinition,
  TurnaroundId,
  TurnaroundDefinition,
} from "./types.js";

export const SCENARIOS: Record<ScenarioId, ScenarioDefinition> = {
  tltl: {
    id: "tltl",
    name: "Too Little Too Late",
    description:
      "Current policy trajectories — business as usual. Models what happens if the world continues on its present course with no extraordinary policy shifts. Warming reaches ~2.5°C, inequality persists, and social tensions rise.",
  },
  "giant-leap": {
    id: "giant-leap",
    name: "Giant Leap",
    description:
      "Transformative policies via the five extraordinary turnarounds. Models an ambitious but achievable set of policy changes across poverty, inequality, empowerment, food, and energy. Warming stabilises below 2°C, extreme poverty ends, and wellbeing rises significantly.",
  },
};

export const TURNAROUNDS: Record<TurnaroundId, TurnaroundDefinition> = {
  poverty: {
    id: "poverty",
    name: "End Poverty",
    description:
      "Reform international finance and fiscal policy to lift 3-4 billion people out of poverty. Includes unconventional fiscal stimulus and government debt cancellation.",
    parameters: [
      {
        sector: "output",
        parameter: "USPIS2022",
        tltlValue: 0,
        glValue: 0.01,
        description: "Unconventional stimulus as fraction of GDP (private sector)",
      },
      {
        sector: "output",
        parameter: "USPUS2022",
        tltlValue: 0,
        glValue: 0.01,
        description: "Unconventional stimulus as fraction of GDP (public sector)",
      },
      {
        sector: "demand",
        parameter: "FGDC2022",
        tltlValue: 0,
        glValue: 0.1,
        description: "Fraction of government debt cancelled from 2022",
      },
      {
        sector: "public",
        parameter: "MIROTA2022",
        tltlValue: 0,
        glValue: 0.005,
        description: "Minimum introduction rate of turnaround action from 2022",
      },
    ],
  },
  inequality: {
    id: "inequality",
    name: "Address Gross Inequality",
    description:
      "Progressive taxation and transfers so the top 10% take no more than 40% of national income. Includes extra employee and profit taxes and redistribution via government transfers.",
    parameters: [
      {
        sector: "demand",
        parameter: "EETF2022",
        tltlValue: 0,
        glValue: 0.02,
        description: "Extra employee tax fraction from 2022",
      },
      {
        sector: "demand",
        parameter: "EPTF2022",
        tltlValue: 0,
        glValue: 0.02,
        description: "Extra profit tax fraction from 2022",
      },
      {
        sector: "demand",
        parameter: "EGTRF2022",
        tltlValue: 0,
        glValue: 0.01,
        description: "Extra government transfer rate fraction from 2022",
      },
      {
        sector: "demand",
        parameter: "ETGBW",
        tltlValue: 0,
        glValue: 0.2,
        description: "Extra transfer to government beyond welfare",
      },
      {
        sector: "demand",
        parameter: "FETPO",
        tltlValue: 0.5,
        glValue: 0.8,
        description: "Fraction of extra taxes on profits going to owners (redistribution)",
      },
      {
        sector: "demand",
        parameter: "GEIC",
        tltlValue: 0,
        glValue: 0.02,
        description: "Goal for extra investment in capacity",
      },
    ],
  },
  empowerment: {
    id: "empowerment",
    name: "Empower Women",
    description:
      "Full gender equity in education, health, and economic participation by 2050. Reduces fertility through improved access to education and family planning.",
    parameters: [
      {
        sector: "population",
        parameter: "GEFR",
        tltlValue: 0,
        glValue: 0.2,
        description: "Goal for extra fertility reduction (fraction/year)",
      },
    ],
  },
  food: {
    id: "food",
    name: "Transform Food System",
    description:
      "Shift to healthy diets for people and planet. Reduce crop waste, expand regenerative agriculture, and reduce non-regenerative farming methods.",
    parameters: [
      {
        sector: "foodland",
        parameter: "GCWR",
        tltlValue: 0.05,
        glValue: 0.2,
        description: "Goal for crop waste reduction (fraction)",
      },
      {
        sector: "foodland",
        parameter: "GFNRM",
        tltlValue: 0.1,
        glValue: 0.5,
        description: "Goal for fraction of non-regenerative methods",
      },
      {
        sector: "foodland",
        parameter: "GFRA",
        tltlValue: 0.1,
        glValue: 0.5,
        description: "Goal for fraction of regenerative agriculture",
      },
    ],
  },
  energy: {
    id: "energy",
    name: "Clean Energy Transition",
    description:
      "Net zero emissions by 2050 through rapid renewable energy deployment, electrification, carbon capture, and reductions in non-CO2 greenhouse gases.",
    parameters: [
      {
        sector: "energy",
        parameter: "GFCO2SCCS",
        tltlValue: 0.2,
        glValue: 0.9,
        description: "Goal for fraction of CO2 sources with CCS",
      },
      {
        sector: "energy",
        parameter: "EROCEPA2022",
        tltlValue: 0.002,
        glValue: 0.004,
        description: "Extra rate of change in energy productivity from 2022",
      },
      {
        sector: "energy",
        parameter: "GFNE",
        tltlValue: 0.5,
        glValue: 1,
        description: "Goal for fraction of new electrification",
      },
      {
        sector: "energy",
        parameter: "GREF",
        tltlValue: 0.5,
        glValue: 1,
        description: "Goal for renewable electricity fraction",
      },
      {
        sector: "climate",
        parameter: "ERDN2OKF2022",
        tltlValue: 0,
        glValue: 0.01,
        description: "Extra reduction in N2O from known forcing from 2022",
      },
      {
        sector: "climate",
        parameter: "ERDCH4KC2022",
        tltlValue: 0,
        glValue: 0.01,
        description: "Extra reduction in CH4 from known causes from 2022",
      },
      {
        sector: "climate",
        parameter: "DACCO22100",
        tltlValue: 0,
        glValue: 8,
        description: "Direct air capture of CO2 by 2100 (GtCO2/y)",
      },
    ],
  },
};

export function getGiantLeapOverrides(): Record<string, Record<string, number>> {
  const overrides: Record<string, Record<string, number>> = {};
  for (const turnaround of Object.values(TURNAROUNDS)) {
    for (const param of turnaround.parameters) {
      if (!overrides[param.sector]) {
        overrides[param.sector] = {};
      }
      overrides[param.sector][param.parameter] = param.glValue;
    }
  }
  return overrides;
}

export function getTurnaroundOverrides(
  turnaroundId: TurnaroundId,
): Record<string, Record<string, number>> {
  const turnaround = TURNAROUNDS[turnaroundId];
  const overrides: Record<string, Record<string, number>> = {};
  for (const param of turnaround.parameters) {
    if (!overrides[param.sector]) {
      overrides[param.sector] = {};
    }
    overrides[param.sector][param.parameter] = param.glValue;
  }
  return overrides;
}
