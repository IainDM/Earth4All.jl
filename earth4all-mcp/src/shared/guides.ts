export const MODEL_OVERVIEW_GUIDE = `# Earth4All Model Overview

Earth4All is a system dynamics integrated assessment model (IAM) that simulates global sustainability from 1980 to 2100. It was created by the Club of Rome, the Potsdam Institute for Climate Impact Research, the Stockholm Resilience Centre, and BI Norwegian Business School.

## 12 Interconnected Sectors

| Sector | Key Outputs |
|--------|-------------|
| **Population** | Total population, workforce size, fertility, mortality, life expectancy |
| **Output** | GDP, consumption, investment, government spending, employment |
| **Public** | Public spending, tax revenue, government debt, budget distribution |
| **Labour Market** | Unemployment rate, worker share of output, participation rate |
| **Demand** | Income distribution (owners, workers, government), inequality index |
| **Inventory** | Capacity utilisation, inflation rate |
| **Finance** | Interest rates, financial system dynamics |
| **Energy** | Fossil/renewable production, GHG emissions, energy costs, electrification |
| **Food & Land** | Crop production, agricultural emissions, food costs, land use |
| **Wellbeing** | Social trust, social tension, Average Wellbeing Index (AWBI) |
| **Climate** | Global warming (°C), CO₂ concentration, sea level rise |
| **Other** | Composite sustainability and performance metrics |

## How It Works

The model is a system of ~500 ordinary differential equations (ODEs) solved from 1980 to 2100.
Each sector feeds variables into other sectors through causal feedback loops.
For example:
- Population growth → labour supply → GDP → investment → energy demand → emissions → warming → agricultural impact → food costs → wellbeing

## Key Dashboard Variables

| Variable | Code | Unit | Description |
|----------|------|------|-------------|
| Population | pop.POP | Mp | Total world population (millions) |
| GDP per person | pop.GDPP | k$/p/y | Global GDP per person |
| Warming | cli.OW | °C | Global temperature rise above pre-industrial |
| Inequality | dem.INEQ | ratio | Owner income / Worker income |
| Wellbeing | wel.AWBI | index | Average Wellbeing Index |
| Social Tension | wel.STE | index | Social tension driven by inequality |

## Units

| Quantity | Unit |
|----------|------|
| Population | Mp (millions of people) |
| GDP | G$/y (billions of dollars per year) |
| GDP per person | k$/p (thousands of dollars per person) |
| Temperature | °C above pre-industrial |
| Emissions | GtCO₂/y |
| Energy | EJ/y |
| Time | years |
| Fractions | 0–1 |
`;

export const SCENARIOS_GUIDE = `# Earth4All Scenarios

## Too Little Too Late (TLTL)
The baseline scenario modelling current policy trajectories. No extraordinary policy shifts.
- All turnaround parameters remain at zero/default values
- Warming reaches ~2.5°C by 2100
- Population peaks around 9 billion then declines
- Inequality persists, social tensions rise
- Wellbeing stagnates

## Giant Leap (GL)
The transformative scenario with all five turnarounds active.
- 21 parameters are changed from TLTL defaults
- Warming stabilises below 2°C
- Extreme poverty ends by mid-century
- Inequality falls significantly
- Wellbeing doubles by 2100

## The Five Extraordinary Turnarounds

### 1. End Poverty
Reform international finance and fiscal policy. Parameters:
- output.USPIS2022 = 0.01 (unconventional fiscal stimulus, private)
- output.USPUS2022 = 0.01 (unconventional fiscal stimulus, public)
- demand.FGDC2022 = 0.1 (government debt cancellation)
- public.MIROTA2022 = 0.005 (turnaround action introduction rate)

### 2. Address Gross Inequality
Progressive taxation and redistribution. Parameters:
- demand.EETF2022 = 0.02 (extra employee tax)
- demand.EPTF2022 = 0.02 (extra profit tax)
- demand.EGTRF2022 = 0.01 (extra government transfer)
- demand.ETGBW = 0.2 (extra transfer beyond welfare)
- demand.FETPO = 0.8 (fraction extra taxes to owners)
- demand.GEIC = 0.02 (extra investment in capacity)

### 3. Empower Women
Full gender equity in education and economic participation. Parameters:
- population.GEFR = 0.2 (extra fertility reduction)

### 4. Transform Food System
Sustainable agriculture and reduced waste. Parameters:
- foodland.GCWR = 0.2 (crop waste reduction)
- foodland.GFNRM = 0.5 (reduce non-regenerative methods)
- foodland.GFRA = 0.5 (expand regenerative agriculture)

### 5. Clean Energy Transition
Net zero emissions through renewables and carbon capture. Parameters:
- energy.GFCO2SCCS = 0.9 (90% CO₂ sources with CCS)
- energy.EROCEPA2022 = 0.004 (extra energy productivity growth)
- energy.GFNE = 1 (100% new electrification)
- energy.GREF = 1 (100% renewable electricity)
- climate.ERDN2OKF2022 = 0.01 (N₂O reduction)
- climate.ERDCH4KC2022 = 0.01 (CH₄ reduction)
- climate.DACCO22100 = 8 (direct air capture, GtCO₂/y by 2100)

## Custom Scenarios
Use create_project to start from either TLTL or GL, then use set_parameter or set_turnaround to create custom configurations. Every parameter change should cite a source.
`;

export const PARAMETERS_GUIDE = `# Earth4All Parameter Reference

Parameters control the behaviour of the Earth4All model. Each belongs to one of 12 sectors.

## Parameter Naming Convention
Parameters use abbreviated uppercase names from the original Vensim model.
- Prefixed by sector context (e.g., population parameters start with letters related to demographics)
- Suffixed with year (e.g., \`2022\`) when they represent policy changes starting in that year
- TLTL defaults are typically 0 for policy parameters (no intervention)
- GL values represent the transformative scenario

## Key Parameters by Sector

### Population
| Parameter | Default | GL | Description |
|-----------|---------|-----|-------------|
| GEFR | 0 | 0.2 | Goal for extra fertility reduction |
| DNC80 | 4.3 | - | Desired number of children in 1980 |
| DNCM | 1.2 | - | Minimum desired number of children |
| LEMAX | 85 | - | Maximum life expectancy (years) |
| FP | 20 | - | Fertile period (years) |
| GEPA | 0 | - | Goal for extra pension age |

### Climate
| Parameter | Default | GL | Description |
|-----------|---------|-----|-------------|
| ERDN2OKF2022 | 0 | 0.01 | Extra reduction in N₂O |
| ERDCH4KC2022 | 0 | 0.01 | Extra reduction in CH₄ |
| DACCO22100 | 0 | 8 | Direct air capture CO₂ by 2100 (GtCO₂/y) |
| OBWA2022 | 1.35 | - | Observed warming in 2022 (°C) |
| ECS | 3.5 | - | Equilibrium climate sensitivity (°C) |

### Energy
| Parameter | Default | GL | Description |
|-----------|---------|-----|-------------|
| GFCO2SCCS | 0 | 0.9 | Goal for fraction CO₂ sources with CCS |
| EROCEPA2022 | 0 | 0.004 | Extra energy productivity rate of change |
| GFNE | 0.5 | 1 | Goal for fraction new electrification |
| GREF | 0.5 | 1 | Goal for renewable electricity fraction |

### Demand
| Parameter | Default | GL | Description |
|-----------|---------|-----|-------------|
| EETF2022 | 0 | 0.02 | Extra employee tax fraction |
| EPTF2022 | 0 | 0.02 | Extra profit tax fraction |
| EGTRF2022 | 0 | 0.01 | Extra government transfer fraction |
| ETGBW | 0 | 0.2 | Extra transfer beyond welfare |
| FETPO | 0 | 0.8 | Fraction extra taxes on profits to owners |
| FGDC2022 | 0 | 0.1 | Fraction government debt cancelled |
| GEIC | 0 | 0.02 | Goal for extra investment in capacity |
| INEQ1980 | 0.61 | - | Inequality index in 1980 |

### Food & Land
| Parameter | Default | GL | Description |
|-----------|---------|-----|-------------|
| GCWR | 0 | 0.2 | Goal for crop waste reduction |
| GFNRM | 0 | 0.5 | Goal for non-regenerative methods fraction |
| GFRA | 0 | 0.5 | Goal for regenerative agriculture fraction |

### Output
| Parameter | Default | GL | Description |
|-----------|---------|-----|-------------|
| USPIS2022 | 0 | 0.01 | Unconventional stimulus (private) |
| USPUS2022 | 0 | 0.01 | Unconventional stimulus (public) |

### Public
| Parameter | Default | GL | Description |
|-----------|---------|-----|-------------|
| MIROTA2022 | 0 | 0.005 | Min introduction rate of turnaround action |

## How to Use Parameters
1. Use list_scenarios to understand the base scenarios
2. Use create_project to start a project
3. Use preview_model to see current parameter values
4. Use set_parameter to change individual parameters (cite your source!)
5. Use set_turnaround to enable/disable entire turnaround bundles
6. Use run_simulation to run the model and see results
`;

export const TROUBLESHOOTING_GUIDE = `# Troubleshooting

## Common Issues

### Julia not found
**Error**: "Julia worker failed to start"
**Fix**: Ensure Julia is installed and available in PATH. Set JULIA_CMD environment variable if needed.

### Earth4All.jl not found
**Error**: "Failed to load Earth4All.jl"
**Fix**: The Earth4All.jl source is colocated at \`../src\` relative to the \`earth4all-mcp/\` directory. If the loader fails, verify the merge structure is intact, or set \`EARTH4ALL_SRC\` to override the source path.
\`\`\`bash
export EARTH4ALL_SRC=/path/to/alternate/src
\`\`\`

### First simulation is slow (30-60 seconds)
This is normal. Julia needs to JIT-compile Earth4All.jl on first use. Subsequent simulations will be fast (1-5 seconds) thanks to the persistent worker process.

### Simulation timeout
The default timeout is 5 minutes. If Julia compilation takes longer (first run), increase SIMULATION_TIMEOUT_MS.

### Unknown parameter warning
If you see "Unknown parameter sector.PARAM — skipped", check that the parameter name is spelled correctly. Parameter names are case-sensitive uppercase abbreviations.

### NaN or Inf in results
Some extreme parameter combinations can cause numerical instability. Try:
1. Check your parameter values are within reasonable ranges
2. Start from a known-good scenario (TLTL or GL)
3. Make smaller changes incrementally

### Project not found
Projects are stored in data/projects/. If you restart the server, previously created projects persist. Use list_projects to see available projects.
`;

export const VARIABLES_GUIDE = `# Output Variables Reference

## Dashboard Variables (key indicators)

| Variable | Format | Sector | Unit | Description |
|----------|--------|--------|------|-------------|
| pop.POP | pop.POP | Population | Mp | Total world population |
| pop.GDPP | pop.GDPP | Population | k$/p/y | GDP per person |
| cli.OW | cli.OW | Climate | °C | Observed warming |
| dem.INEQ | dem.INEQ | Demand | ratio | Inequality index |
| wel.AWBI | wel.AWBI | Wellbeing | index | Average Wellbeing Index |
| wel.STE | wel.STE | Wellbeing | index | Social tension |

## Extended Variables

| Variable | Sector | Unit | Description |
|----------|--------|------|-------------|
| inv.GDP | Inventory | G$/y | Total global GDP |
| ene.CO2EMPP | Energy | GtCO₂/y | CO₂ emissions |
| ene.FREF | Energy | fraction | Renewable electricity fraction |
| pop.LE | Population | years | Life expectancy |
| lab.UR | Labour Market | fraction | Unemployment rate |
| foo.FCI | Food & Land | index | Food cost index |
| wel.STR | Wellbeing | index | Social trust |
| cli.CO2C | Climate | ppm | CO₂ concentration |

## How to Access Time Series

Use get_variable_timeseries with the variable code (e.g., "pop.POP") to get the full 1980-2100 time series after running a simulation.

## Interpreting Results

### Population (pop.POP)
- TLTL: peaks ~9,200 Mp around 2050, declines to ~8,800 Mp by 2100
- GL: peaks ~8,500 Mp around 2040, declines to ~7,000 Mp by 2100

### Warming (cli.OW)
- TLTL: reaches ~2.5°C by 2100
- GL: peaks ~1.9°C around 2060, stabilises/declines

### Inequality (dem.INEQ)
- TLTL: remains ~0.6 (high inequality)
- GL: falls to ~0.35 by 2100

### Wellbeing (wel.AWBI)
- TLTL: stagnates around 0.7-0.8
- GL: rises to ~1.8 by 2100
`;

export const JULIA_API_GUIDE = `# Earth4All.jl API Reference

The MCP tools you use are backed by **Earth4All.jl**, a Julia implementation of the Earth4All integrated assessment model. Understanding this API helps you explain the model internals to users and reason about simulation results.

## Running Simulations

Earth4All.jl provides three levels of simulation functions:

### Scenario Builders (build but do not solve)
- \`run_tltl()\` — Build the Too Little Too Late (business-as-usual) scenario
- \`run_gl()\` — Build the Giant Leap scenario with policy parameters pre-configured
- \`run_e4a(; <sector>_pars..., <sector>_inits...)\` — Build a fully customisable scenario

### Solution Functions (build and solve, returning a SciML ODESolution for 1980–2100)
- \`run_tltl_solution()\` — Solve TLTL
- \`run_gl_solution()\` — Solve Giant Leap
- \`run_e4a_solution(; kwargs...)\` — Solve a custom scenario

Custom scenario example:
\`\`\`julia
cli_ps = Earth4All.Climate.getparameters()
cli_ps[:DACCO22100] = 16.0
sol = Earth4All.run_e4a_solution(cli_pars=cli_ps)
\`\`\`

## Inspecting Variables

### \`variable_list(sol)\`
Returns a sorted list of all variables in a solution as \`(name, description)\` tuples.
Variable names are namespaced by sector using the \`₊\` separator, e.g. \`pop₊POP\`, \`cli₊OW\`, \`dem₊INEQ\`.

### \`get_timeseries(sol, name)\`
Extract the time series for any variable. Accepts either:
- Full namespaced name: \`"pop₊POP"\`
- Short name (if unambiguous): \`"GDPP"\`

Returns \`(t=Vector, values=Vector)\`.

## Model Structure (System Dynamics)

These functions expose the causal structure of the model — which variables are stocks (state variables governed by differential equations), which are flows (rates of change), and which are auxiliaries (algebraic computations).

### \`list_stocks()\`
List every stock (state/level) variable. Stocks are governed by \`D(x) = inflows - outflows\`.
Returns: \`name\`, \`description\`, \`sector\`, \`equation\`.

### \`stock_flows(stock_name)\`
Show the inflows and outflows for a specific stock. Accepts full (\`"pop₊A0020"\`) or short (\`"A0020"\`) names.
Returns: \`name\`, \`description\`, \`sector\`, \`equation\`, \`inflows\`, \`outflows\`.

### \`list_flows()\`
List every flow term that appears as an inflow or outflow of at least one stock.
Returns: \`name\`, \`as_inflow_of\`, \`as_outflow_of\`.

### \`flow_stocks(flow_name)\`
Show which stock(s) a particular flow feeds into or drains from.

### \`list_auxiliaries()\`
List every auxiliary (algebraic) variable — computed each time step from stocks, parameters, and other auxiliaries.
Returns: \`name\`, \`description\`, \`sector\`.

## Sector Modules

The model comprises 12 sector modules, each with its own prefix:

| Module | Prefix | Domain |
|--------|--------|--------|
| Climate | cli | Greenhouse gases, warming, ice melt |
| Demand | dem | Consumption, inequality, government finance |
| Energy | ene | Fossil fuels, renewables, electrification |
| Finance | fin | Investment, credit, interest rates |
| FoodLand | foo | Agriculture, land use, food supply |
| Inventory | inv | GDP, inventory management |
| LabourMarket | lab | Employment, wages, participation |
| Other | oth | Supplementary variables |
| Output | out | Productivity, capacity, output |
| Population | pop | Demographics, life expectancy, fertility |
| Public | pub | Government spending, taxation |
| Wellbeing | wel | Wellbeing indices, social tension/trust |

### Retrieving Defaults
Every sector provides:
- \`<Sector>.getparameters()\` — returns a copy of default parameter values
- \`<Sector>.getinitialisations()\` — returns a copy of default initial conditions

## Plotting

- \`fig_baserun_tltl()\` — Plot 6 key indicators (POP, AWBI, GDPP, STE, INEQ, OW) for TLTL
- \`fig_baserun_gl()\` — Same for Giant Leap

## Variable Naming Convention

In the Julia API, variables use the \`₊\` separator: \`pop₊POP\`, \`cli₊OW\`.
In the MCP tools, the convention is \`sector.VAR\`: \`pop.POP\`, \`cli.OW\`.
Both refer to the same underlying model variables.

## Validation Utilities

Earth4All.jl includes utilities for comparing model output against Vensim reference data:
- \`check_solution(sol)\` — Validate against Vensim reference for all 12 sectors
- \`all_mre(scen, sol)\` — Print maximum relative error per sector
- \`compare_and_plot(scen, sol, desc, ...)\` — Find a variable by description and plot against reference
- \`plot_two_sols(scen1, sol1, scen2, sol2, ...)\` — Compare same variable across two solutions
`;

export const GUIDES: Record<string, { name: string; description: string; content: string }> = {
  "model-overview": {
    name: "Model Overview",
    description: "Earth4All model structure, sectors, and how they connect",
    content: MODEL_OVERVIEW_GUIDE,
  },
  parameters: {
    name: "Parameter Reference",
    description: "Full parameter reference: names, descriptions, defaults, units, and turnaround mappings",
    content: PARAMETERS_GUIDE,
  },
  scenarios: {
    name: "Scenarios Guide",
    description: "TLTL vs Giant Leap, the five turnarounds, and which parameters they change",
    content: SCENARIOS_GUIDE,
  },
  troubleshooting: {
    name: "Troubleshooting",
    description: "Common simulation errors and how to fix them",
    content: TROUBLESHOOTING_GUIDE,
  },
  variables: {
    name: "Variables Reference",
    description: "Key output variables, their meanings, units, and expected ranges",
    content: VARIABLES_GUIDE,
  },
  "julia-api": {
    name: "Julia API Reference",
    description: "Earth4All.jl Julia API: simulation functions, model structure (stocks/flows/auxiliaries), sector modules, and validation utilities",
    content: JULIA_API_GUIDE,
  },
};
