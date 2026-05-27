# Earth4All MCP Server — Implementation Plan

## 1. What Is This Project?

An MCP (Model Context Protocol) server that gives AI assistants (Claude, etc.) the ability to **run, explore, and modify the Earth4All integrated assessment model** — a system dynamics model of the global economy, society, and environment created by the Club of Rome.

The core modelling engine is **[Earth4All.jl](https://github.com/worlddynamics/Earth4All.jl)**, an open-source Julia implementation of the Earth4All model built on the [WorldDynamics.jl](https://github.com/worlddynamics/WorldDynamics.jl) framework. The MCP server wraps Earth4All.jl in a set of structured tools that an LLM can invoke through the MCP protocol — listing scenarios, creating projects, modifying parameters, running simulations, and interpreting results.

The project is written in **TypeScript** (MCP server, project management, result formatting) and **Julia** (Earth4All simulation runner). It communicates over stdio JSON-RPC and is designed to run inside Claude Desktop, Claude Code, or any MCP-compatible client.

### Analogy to FEO MCP Server

| Aspect | FEO MCP Server | Earth4All MCP Server |
|--------|---------------|---------------------|
| **Domain** | Power system optimisation | Global integrated assessment |
| **Engine** | PyPSA (Python) | Earth4All.jl (Julia) |
| **Method** | Linear optimal power flow (LOPF) | System dynamics (ODE solving) |
| **Time resolution** | Hourly (8,760 snapshots/year) | Annual (1980–2100, 120 years) |
| **Data format** | Component CSVs + config YAML | Parameter dictionaries + scenario definitions |
| **Scenarios** | Clone & modify reference datasets | TLTL / Giant Leap / custom parameter sets |
| **Key output** | Least-cost dispatch, generation mix, emissions | Population, GDP, wellbeing, inequality, warming |

---

## 2. Earth4All Model Background

### What Earth4All Models

Earth4All is a system dynamics model containing **500+ variables** and **~300 parameters** across **12 interconnected sectors**:

| Sector | Key Outputs |
|--------|-------------|
| **Population** | Total population, workforce size, pensioners, fertility, mortality |
| **Output** | GDP, consumption, investment, government spending, employment |
| **Public** | Public spending, tax revenue, debt, budget distribution |
| **Labour Market** | Unemployment rate, worker share of output, participation rate |
| **Demand** | Income distribution (owners, workers, government) |
| **Inventory** | Capacity utilisation, inflation rate |
| **Finance** | Interest rates |
| **Energy** | Fossil/renewable production, GHG emissions, energy costs |
| **Food & Land** | Crop production, agricultural impacts, food costs |
| **Wellbeing** | Social trust, social tension, Average Wellbeing Index (AWBI) |
| **Climate** | Global warming (°C above pre-industrial), CO₂ concentration |
| **Other Performance Indicators** | Composite sustainability metrics |

### Two Core Scenarios

1. **Too Little Too Late (TLTL)**: Current policy trajectories. Warming reaches ~2.5°C, inequality persists, regional collapses increase.
2. **Giant Leap (GL)**: Transformative policies via the "five extraordinary turnarounds." Warming stabilises, extreme poverty ends, wellbeing rises.

### The Five Turnarounds (Policy Levers)

1. **End Poverty** — Reform international finance, lift 3–4 billion out of poverty
2. **Address Gross Inequality** — Top 10% take ≤40% of national income
3. **Empower Women** — Full gender equity by 2050
4. **Transform Food System** — Healthy diets for people and planet
5. **Clean Energy Transition** — Net zero emissions by 2050

Each turnaround maps to specific parameter changes in the model (21 parameters total across the GL scenario).

### How Earth4All.jl Works

```julia
using ModelingToolkit, WorldDynamics
include("src/Earth4All.jl")

# Run base scenarios
tltl_sol = Earth4All.run_tltl_solution()  # Too Little Too Late
gl_sol = Earth4All.run_gl_solution()      # Giant Leap

# Custom parameters
pop_pars = Earth4All.Population.getparameters()
pop_pars[:DNCM] = 2.2  # Change desired number of children minimum
sol = Earth4All.run_e4a_solution(; pop_pars=pop_pars)
```

- Model is solved as an ODE system using the Euler method with dt=0.015625
- Time span: 1980–2100
- Each sector has `getparameters()` and `getinitializations()` functions
- The 12 sector ODE systems are composed via `WorldDynamics.compose()` with `variable_connections()` linking them

### Key Output Variables (the "dashboard")

| Variable | Sector | Description | Range |
|----------|--------|-------------|-------|
| `pop.POP` | Population | Total world population (millions) | 0–10,000 |
| `pop.GDPP` | Population | GDP per person (k$/person) | 0–60 |
| `wel.AWBI` | Wellbeing | Average Wellbeing Index | 0–2.4 |
| `wel.STE` | Wellbeing | Social tension | 0–2 |
| `dem.INEQ` | Demand | Inequality (Gini-like) | 0–1.6 |
| `cli.OW` | Climate | Global warming (°C) | 0–4 |

---

## 3. Architecture

```
MCP Client (Claude Desktop / Claude Code)
│
│  stdin/stdout JSON-RPC
▼
┌───────────────────────────────────────────────────┐
│            TypeScript MCP Server                   │
│                                                    │
│  ┌──────────────┐  ┌─────────────────────────┐    │
│  │  MCP Layer    │  │   Earth4All Data Layer   │    │
│  │  (servers/)   │  │   (earth4all/)           │    │
│  │  - tools      │  │   - types.ts             │    │
│  │  - resources  │  │   - parameters.ts        │    │
│  │  - prompts    │  │   - reader.ts            │    │
│  └──────┬────────┘  │   - writer.ts            │    │
│         │           │   - friendly-view.ts     │    │
│         ▼           └──────────┬──────────────┘    │
│  ┌──────────────┐              │                   │
│  │  Shared       │◄─────────────┘                  │
│  │  (shared/)    │                                 │
│  │  - handlers   │──────────┐                      │
│  │  - guides     │          │                      │
│  │  - formatters │          │                      │
│  └──────────────┘          │                      │
│                             │                      │
│  ┌──────────────┐          │                      │
│  │  Project      │◄─────────┘                      │
│  │  Manager      │   spawn julia                   │
│  │  (project/)   │──────────┐                      │
│  └──────────────┘          │                      │
└─────────────────────────────┼──────────────────────┘
                              ▼
                ┌──────────────────────────┐
                │   Julia Simulation       │
                │   run_earth4all.jl       │
                │   - Loads Earth4All.jl   │
                │   - Applies param mods   │
                │   - Solves ODE system    │
                │   - Returns JSON stdout  │
                └──────────────────────────┘
```

### Three Server Variants

| Server | Entry Point | Purpose |
|--------|------------|---------|
| **Main** | `src/index.ts` | Full-featured: all tools + resources + prompts |
| **Modelling** | `src/servers/modelling-server.ts` | Focused: scenario tools + modelling-agent prompt |
| **Explorer** | `src/servers/explorer-server.ts` | Focused: parameter exploration + comparison tools |

---

## 4. MCP Tools

### Modelling Tools

| Tool | Description |
|------|-------------|
| `list_scenarios` | List available base scenarios (TLTL, Giant Leap) and their descriptions |
| `list_projects` | List user-created project variants |
| `create_project` | Create a new project from a base scenario (TLTL or GL) for modification |
| `preview_model` | Human-readable summary of a project's current parameters, grouped by sector and turnaround |
| `set_parameter` | Modify a parameter in any sector (e.g., `population.DNCM = 2.2`), with mandatory source citation |
| `reset_parameter` | Reset a parameter to its scenario default value |
| `set_turnaround` | Enable/disable one of the five turnarounds by applying its parameter bundle |
| `run_simulation` | Run the Earth4All ODE simulation via Julia and return results |
| `get_results` | Retrieve results from the last simulation without re-running |
| `compare_scenarios` | Run two configurations side-by-side and return a comparison of key indicators |
| `save_baseline` | Snapshot a project's current parameter state |
| `restore_baseline` | Restore a project to its previously saved baseline |
| `get_variable_timeseries` | Get the full time series (1980–2100) for a specific variable |

### MCP Resources

| URI | Description |
|-----|-------------|
| `earth4all://guides/model-overview` | Earth4All model structure, sectors, and how they connect |
| `earth4all://guides/parameters` | Full parameter reference: names, descriptions, default values, units, and which sector/turnaround they belong to |
| `earth4all://guides/scenarios` | Explanation of TLTL vs Giant Leap, the five turnarounds, and which parameters they change |
| `earth4all://guides/troubleshooting` | Common simulation errors and how to fix them |
| `earth4all://guides/variables` | Key output variables, their meanings, units, and expected ranges |

### MCP Prompts

| Prompt | Description |
|--------|-------------|
| `modelling-agent` | Step-by-step workflow: list scenarios → create project → explore parameters → modify → run simulation → interpret results → compare scenarios |

---

## 5. Data Model

### Parameter Organisation

Unlike FEO's CSV-based component model, Earth4All uses **parameter dictionaries per sector**. Each project stores its parameter state as JSON files:

```
projects/{project-id}/
├── _project.json              # ID, name, description, base scenario, timestamps
├── _sources.json              # Citation tracking for parameter changes
├── parameters/
│   ├── population.json        # { "CMFR": 0.01, "DNC80": 4.3, ... }
│   ├── climate.json
│   ├── demand.json
│   ├── energy.json
│   ├── finance.json
│   ├── foodland.json
│   ├── inventory.json
│   ├── labourmarket.json
│   ├── other.json
│   ├── output.json
│   ├── public.json
│   └── wellbeing.json
├── initialisations/
│   ├── population.json        # Initial values for state variables
│   ├── climate.json
│   └── ...
├── results/
│   ├── latest.json            # Last simulation results (summary)
│   └── latest_timeseries.json # Full time series data
└── baselines/
    └── {baseline-name}.json   # Saved parameter snapshots
```

### Sector Parameters (Examples)

**Population sector** (23 parameters):
| Parameter | Default | Description |
|-----------|---------|-------------|
| `CMFR` | 0.01 | Climate-related mortality factor |
| `DNC80` | 4.3 | Desired number of children in 1980 |
| `DNCM` | 1.2 | Minimum desired number of children |
| `DNCG` | 0.14 | Desired number of children growth sensitivity |
| `LEA` | 0.001 | Life expectancy acceleration |
| `LEMAX` | 85 | Maximum life expectancy |
| `FW` | 0.5 | Fraction of women in workforce |
| `EIP` | 30 | Education investment period |
| ... | ... | ... |

### Giant Leap Parameter Changes (21 parameters)

Turnaround → Sector mappings:

| Turnaround | Sector | Parameters Changed |
|------------|--------|-------------------|
| End Poverty | Demand, Output, Public | 4 parameters |
| Address Inequality | Demand | 4 parameters |
| Empower Women | Demand, Population | 3 parameters |
| Transform Food | FoodLand | 3 parameters |
| Clean Energy | Energy, Climate | 7 parameters |

### Source Tracking

Every parameter modification records:
```json
{
  "sector": "population",
  "parameter": "DNCM",
  "value": 2.2,
  "source": {
    "name": "UN World Population Prospects 2024",
    "year": 2024,
    "url": "https://...",
    "notes": "Assuming higher desired fertility floor based on recent trends"
  },
  "timestamp": "2024-01-15T10:30:00Z"
}
```

### Units

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

---

## 6. Julia Simulation Runner

When `run_simulation` is called, the following pipeline executes:

1. The TypeScript server resolves the project directory, reads all parameter JSON files, and spawns a Julia subprocess (`julia/run_earth4all.jl`).
2. The Julia script receives parameters as JSON on stdin (or via a temp file), loads Earth4All.jl, constructs the model with custom parameters using `run_e4a()`, and solves the ODE system.
3. The Euler solver computes the 120-year trajectory (1980–2100) with dt=0.015625.
4. Results are returned as JSON on stdout, containing:
   - `success` / `message` — solver status
   - `solve_time_seconds` — wall-clock time
   - `llm_summary` — compact summary of key indicators at milestone years (2025, 2050, 2075, 2100): population, GDP/person, warming, inequality, wellbeing, social tension
   - `dashboard` — the 6 key output variables at milestone years
   - `warnings` — any modelling caveats

### Key Design Decisions

- **Julia subprocess per simulation**: Earth4All.jl uses ModelingToolkit.jl which has significant compilation overhead. We will use a **persistent Julia worker process** (via a long-running Julia script that reads commands from stdin) to avoid recompilation on each run. The first run will be slow (~30–60s for Julia compilation), subsequent runs fast (~1–5s).
- **Parameter passing**: Parameters are passed as a flat JSON object grouped by sector. The Julia runner maps them to the `_pars` keyword arguments of `run_e4a()`.
- **Timeout**: 5-minute timeout (the ODE solve itself is fast; the risk is Julia compilation on first run).

---

## 7. Claude Code Integration

### Agents (`.claude/agents/`)

| Agent | Purpose |
|-------|---------|
| `scenario-explorer` | Explores the parameter space by systematically modifying parameters and running simulations to find interesting dynamics. Reports which parameters have the most impact on key indicators. |
| `policy-analyst` | Given a policy question (e.g., "What happens if we only do the energy turnaround?"), constructs the appropriate parameter modifications, runs the simulation, and interprets the results in plain language. |

### Commands (`.claude/commands/`)

| Command | Purpose |
|---------|---------|
| `explore-scenario` | End-to-end workflow: select base scenario → modify parameters guided by the five turnarounds → run simulation → interpret and compare results |

---

## 8. Project Structure

```
earth4all-mcp/
├── src/
│   ├── index.ts                        # Main MCP server entry point
│   ├── constants.ts                    # Timeout, size limits, helpers
│   ├── servers/
│   │   ├── modelling-server.ts         # Modelling-focused MCP server
│   │   └── explorer-server.ts          # Parameter exploration MCP server
│   ├── shared/
│   │   ├── tool-definitions.ts         # MCP tool schemas (JSON Schema)
│   │   ├── tool-handlers.ts            # Tool implementation logic
│   │   ├── julia-runner.ts             # Spawns/manages Julia subprocess
│   │   ├── guides.ts                   # Model overview, parameter reference, workflow guides
│   │   ├── formatters.ts               # LLM-friendly result formatting
│   │   ├── logger.ts                   # Structured logging
│   │   └── file-output.ts              # Write tool output to disk
│   ├── earth4all/
│   │   ├── types.ts                    # TypeScript types for sectors, parameters, variables
│   │   ├── parameters.ts              # Default parameter values per sector (mirroring Earth4All.jl)
│   │   ├── scenarios.ts               # TLTL/GL scenario definitions and turnaround mappings
│   │   ├── variables.ts               # Output variable metadata (names, units, ranges)
│   │   ├── reader.ts                  # Read project parameter files
│   │   ├── writer.ts                  # Write/update project parameter files
│   │   ├── friendly-view.ts           # Human-readable parameter/result preview
│   │   └── source-tracker.ts          # Source citation tracking
│   └── project/
│       ├── index.ts                    # Re-exports
│       └── manager.ts                  # Project CRUD, scenario listing
├── julia/
│   ├── run_earth4all.jl               # Earth4All simulation runner (stdin JSON → stdout JSON)
│   ├── worker.jl                      # Persistent Julia worker process
│   └── install_deps.jl               # Script to install Julia dependencies
├── data/
│   └── reference/
│       ├── tltl/                       # TLTL reference scenario (default parameters)
│       │   ├── _project.json
│       │   └── parameters/             # One JSON per sector
│       └── giant-leap/                 # Giant Leap reference scenario
│           ├── _project.json
│           └── parameters/
├── .claude/
│   ├── agents/
│   │   ├── scenario-explorer.md       # Parameter space exploration agent
│   │   └── policy-analyst.md          # Policy question → simulation → interpretation
│   └── commands/
│       └── explore-scenario.md        # End-to-end scenario exploration workflow
├── package.json
├── tsconfig.json
├── vitest.config.ts
├── .mcp.json                          # MCP server configuration
└── plan.md                            # This file
```

---

## 9. Implementation Phases

### Phase 1: Foundation
- Initialise TypeScript project (package.json, tsconfig, vitest)
- Define TypeScript types for all 12 sectors, their parameters, and output variables
- Implement project manager (create, list, clone from scenario)
- Implement parameter reader/writer (JSON files per sector)
- Implement source tracking

### Phase 2: Julia Integration
- Write the Julia simulation runner (`julia/run_earth4all.jl`)
  - Accept parameter overrides as JSON
  - Load Earth4All.jl, construct model with `run_e4a()`, solve
  - Extract key variables at milestone years
  - Return structured JSON results
- Write the persistent Julia worker (`julia/worker.jl`) for fast subsequent runs
- Implement `julia-runner.ts` to manage the Julia subprocess from TypeScript
- Handle first-run compilation warmup gracefully

### Phase 3: MCP Server
- Define MCP tool schemas in `tool-definitions.ts`
- Implement tool handlers:
  - `list_scenarios`, `list_projects`, `create_project`
  - `preview_model`, `set_parameter`, `reset_parameter`, `set_turnaround`
  - `run_simulation`, `get_results`, `compare_scenarios`
  - `save_baseline`, `restore_baseline`
  - `get_variable_timeseries`
- Implement MCP resources (guides)
- Implement MCP prompts (modelling-agent workflow)
- Wire up main server + variant servers

### Phase 4: Reference Data & Guides
- Encode all default parameters for TLTL and GL scenarios
- Map the five turnarounds to their parameter changes
- Write parameter reference guide (names, descriptions, units, defaults)
- Write model overview guide
- Write troubleshooting guide
- Write scenario comparison guide

### Phase 5: Claude Code Agents
- Write `scenario-explorer` agent definition
- Write `policy-analyst` agent definition
- Write `explore-scenario` command
- Test end-to-end with Claude Code

### Phase 6: Testing & Polish
- Unit tests for parameter reading/writing
- Unit tests for project management
- Integration tests for Julia runner
- Integration tests for MCP tool handlers
- End-to-end test: create project → modify params → run simulation → check results

---

## 10. Development Prerequisites

- **Node.js** >= 18
- **Julia** >= 1.9 with packages: `Earth4All` (or the source checkout), `WorldDynamics`, `ModelingToolkit`, `DifferentialEquations`, `JSON`
- **TypeScript**: `@modelcontextprotocol/sdk`, `zod` for schema validation

### Build and Run

```bash
npm install                # Install TypeScript dependencies
julia julia/install_deps.jl  # Install Julia dependencies
npm run build              # Compile TypeScript to dist/
npm start                  # Run main MCP server
npm run dev                # Development mode (tsx)
npm run start:modelling    # Run modelling server only
npm run start:explorer     # Run explorer server only
npm test                   # Run tests (Vitest)
```

### MCP Client Configuration

```json
{
  "mcpServers": {
    "earth4all-modelling": {
      "command": "npx",
      "args": ["tsx", "src/servers/modelling-server.ts"]
    },
    "earth4all-explorer": {
      "command": "npx",
      "args": ["tsx", "src/servers/explorer-server.ts"]
    }
  }
}
```

---

## 11. Key Design Decisions

### Why TypeScript + Julia (not pure Julia or pure Python)?

- **MCP SDK availability**: The MCP TypeScript SDK is the most mature and widely used.
- **Julia for simulation**: Earth4All.jl is a Julia package; calling it natively avoids a Python translation layer and ensures exact numerical fidelity.
- **Architecture precedent**: The FEO MCP server uses the same pattern (TypeScript MCP + Python subprocess). We follow the same pattern with Julia.

### Why a persistent Julia worker?

Julia's JIT compilation means the first `include("Earth4All.jl")` takes 30–60 seconds. By keeping a Julia process alive, subsequent simulations complete in 1–5 seconds. This is critical for interactive LLM use where users may want to iterate quickly.

### Why project-based (not just in-memory)?

- **Reproducibility**: Every parameter change is tracked with citations.
- **Comparison**: Users can compare different configurations side-by-side.
- **Persistence**: Projects survive server restarts and can be shared.
- **Baseline/restore**: Like FEO, users can checkpoint and rollback.

### Why turnaround bundles?

The five turnarounds are the core policy abstraction in Earth4All. Providing `set_turnaround` as a single tool lets the LLM efficiently apply the 3–7 parameters per turnaround without making individual `set_parameter` calls, while still allowing granular control via `set_parameter` when needed.

---

## 12. LLM-Friendly Output Format

Results are formatted as compact key-value summaries for LLM context windows:

```
=== Earth4All Simulation Results ===
scenario=custom (based on Giant Leap)
modified_params=3 (population.DNCM=2.2, energy.FCGESRE2022=1.0, demand.EETF2022=0.15)

=== Dashboard (2025 → 2050 → 2075 → 2100) ===
population_mp=8100 → 8900 → 9200 → 9000
gdp_per_person_k=15 → 28 → 42 → 50
warming_degC=1.3 → 1.8 → 2.0 → 1.9
inequality=0.65 → 0.50 → 0.40 → 0.35
wellbeing_index=0.8 → 1.2 → 1.6 → 1.8
social_tension=1.1 → 0.8 → 0.5 → 0.4

=== Insights ===
- Population peaks at 9,200M around 2075, then declines
- Warming stabilises below 2°C by mid-century
- Inequality falls significantly due to demand-side turnaround parameters
- Wellbeing index doubles by 2100 compared to today
```

Full time series data is written to files for offline analysis.
