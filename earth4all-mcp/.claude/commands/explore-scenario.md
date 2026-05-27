# Explore Earth4All Scenario

End-to-end workflow for exploring an Earth4All sustainability scenario.

## Steps

1. **Select base scenario**: Choose TLTL (business as usual) or Giant Leap (transformative policies)
2. **Create project**: Set up a new project from the chosen base
3. **Review parameters**: Preview the model to understand the starting configuration
4. **Choose turnarounds**: Enable or disable specific policy turnarounds
5. **Fine-tune parameters**: Optionally adjust individual parameters with citations
6. **Run simulation**: Execute the Earth4All model
7. **Review results**: Analyse the dashboard showing population, GDP, warming, inequality, wellbeing, and social tension through 2100
8. **Compare with alternative**: Optionally create a second project and compare side-by-side
9. **Iterate**: Based on results, modify parameters and re-run to explore "what if" questions

## Usage

Provide a description of what you want to explore, such as:
- "What happens if we only pursue the energy transition without addressing inequality?"
- "How does the Giant Leap scenario change if climate sensitivity is 4.5°C instead of 3.5°C?"
- "Explore the impact of different fertility reduction rates on long-term population"
- "Compare TLTL vs Giant Leap focusing on wellbeing outcomes"

The agent will use the Earth4All MCP server tools to set up, run, and analyse the scenarios.

## Earth4All.jl API

The MCP tools are backed by the **Earth4All.jl** Julia library. Understanding the Julia API helps with deeper exploration:

- **Model structure**: `list_stocks()`, `stock_flows(name)`, `list_flows()`, `list_auxiliaries()` expose the system dynamics structure — stocks (state variables), flows (rates of change), and auxiliaries (algebraic computations). Use these to trace causal pathways through the model.
- **Custom simulations**: `run_e4a_solution(; cli_pars=..., dem_pars=..., ...)` runs fully customised scenarios by passing modified parameter dictionaries for any of the 12 sectors.
- **Variable inspection**: `variable_list(sol)` lists all variables; `get_timeseries(sol, name)` extracts time series. Julia uses `₊` separator (e.g. `pop₊POP`), MCP uses `.` (e.g. `pop.POP`).
- **Sector defaults**: Each sector module provides `getparameters()` and `getinitialisations()` to retrieve default values.
- **Validation**: `check_solution(sol)` validates output against Vensim reference data.

See `earth4all://guides/julia-api` for the full reference.
