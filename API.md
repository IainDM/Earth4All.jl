# Earth4All.jl API Reference

Earth4All.jl is a Julia implementation of the [Earth4All](https://earth4all.life/)
integrated assessment model, a system dynamics model comprising 12 coupled sectors
that simulate global economic, social, and climate dynamics from 1980 to 2100.

## Table of Contents

- [Quick Start](#quick-start)
- [Running Simulations](#running-simulations)
  - [Scenario Builders](#scenario-builders)
  - [Solution Functions](#solution-functions)
- [Inspecting Variables](#inspecting-variables)
  - [Listing Variables](#listing-variables)
  - [Extracting Time Series](#extracting-time-series)
- [Model Structure (System Dynamics)](#model-structure-system-dynamics)
  - [Stocks](#stocks)
  - [Flows](#flows)
  - [Auxiliaries](#auxiliaries)
  - [Auxiliary Inputs and Effects](#auxiliary-inputs-and-effects)
  - [Parameters](#parameters)
- [Plotting](#plotting)
- [Sector Modules](#sector-modules)
  - [Sector Constructors](#sector-constructors)
  - [Parameters and Initial Conditions](#parameters-and-initial-conditions)
- [Customising Scenarios](#customising-scenarios)
- [Validation Utilities](#validation-utilities)

---

## Quick Start

```julia
using Earth4All

# Run the "Too Little Too Late" scenario
sol = Earth4All.run_tltl_solution()

# Discover all available variables
vars = Earth4All.variable_list(sol)

# Extract a time series
ts = Earth4All.get_timeseries(sol, "pop₊POP")
println("Population in 2050: ", ts.values[findfirst(>=(2050), ts.t)])

# Explore model structure
for s in Earth4All.list_stocks()
    println(s.sector, " | ", s.name, " — ", s.description)
end
```

---

## Running Simulations

### Scenario Builders

These functions build a composed ODE system (all 12 sectors connected) but do
**not** solve it.  They are used internally by the solution functions and are
useful when you need the raw system for inspection.

#### `run_tltl(; kwargs...)`

Build the **Too Little Too Late** scenario — the business-as-usual baseline.

Returns a composed `ODESystem`.

#### `run_gl(; cli_ps, dem_ps, ene_ps, foo_ps, out_ps, pop_ps, pub_ps, kwargs...)`

Build the **Giant Leap** scenario with ambitious policy parameters pre-configured
across Climate, Demand, Energy, FoodLand, Output, Population, and Public sectors.

Each `*_ps` argument defaults to the sector's base parameters and is modified
with the Giant Leap policy values before system construction.

Returns a composed `ODESystem`.

#### `run_e4a(; <sector>_pars..., <sector>_inits..., kwargs...)`

Build a fully customisable **Earth 4 All** scenario.  Accepts parameter and
initialisation dictionaries for every sector:

| Keyword | Default |
|---------|---------|
| `cli_pars`, `cli_inits` | `Climate.getparameters()`, `Climate.getinitialisations()` |
| `dem_pars`, `dem_inits` | `Demand.getparameters()`, `Demand.getinitialisations()` |
| `ene_pars`, `ene_inits` | `Energy.getparameters()`, `Energy.getinitialisations()` |
| `fin_pars`, `fin_inits` | `Finance.getparameters()`, `Finance.getinitialisations()` |
| `foo_pars`, `foo_inits` | `FoodLand.getparameters()`, `FoodLand.getinitialisations()` |
| `inv_pars`, `inv_inits` | `Inventory.getparameters()`, `Inventory.getinitialisations()` |
| `lab_pars`, `lab_inits` | `LabourMarket.getparameters()`, `LabourMarket.getinitialisations()` |
| `oth_pars`, `oth_inits` | `Other.getparameters()`, `Other.getinitialisations()` |
| `out_pars`, `out_inits` | `Output.getparameters()`, `Output.getinitialisations()` |
| `pop_pars`, `pop_inits` | `Population.getparameters()`, `Population.getinitialisations()` |
| `pub_pars`, `pub_inits` | `Public.getparameters()`, `Public.getinitialisations()` |
| `wel_pars`, `wel_inits` | `Wellbeing.getparameters()`, `Wellbeing.getinitialisations()` |

Returns a composed `ODESystem`.

### Solution Functions

These functions build **and solve** a scenario, returning a SciML solution object
that covers the time span 1980–2100.

#### `run_tltl_solution()`

Solve the Too Little Too Late scenario.

```julia
sol = Earth4All.run_tltl_solution()
```

Returns an ODE solution (`ODESolution`).

#### `run_gl_solution()`

Solve the Giant Leap scenario.

```julia
sol = Earth4All.run_gl_solution()
```

Returns an ODE solution (`ODESolution`).

#### `run_e4a_solution(; kwargs...)`

Solve a custom scenario.  Accepts the same keyword arguments as `run_e4a`.

```julia
# Custom scenario: double the direct air capture target
cli_ps = Earth4All.Climate.getparameters()
cli_ps[:DACCO22100] = 16.0
sol = Earth4All.run_e4a_solution(cli_pars=cli_ps)
```

Returns an ODE solution (`ODESolution`).

---

## Inspecting Variables

### Listing Variables

#### `variable_list(sol) -> Vector{Tuple{String, String}}`

Return a sorted list of **all** variables available in the solution.  Each entry
is a `(name, description)` tuple.  The `name` string can be passed directly to
`get_timeseries`.

```julia
sol = Earth4All.run_tltl_solution()
vars = Earth4All.variable_list(sol)

for (name, desc) in vars
    println(name, " — ", desc)
end
```

Variable names are namespaced by sector, for example `pop₊POP`, `cli₊OW`,
`dem₊INEQ`.

### Extracting Time Series

#### `get_timeseries(sol, name::String) -> NamedTuple{(:t, :values)}`

Extract the time series for any variable from a solution.

The `name` argument can be:
- A **full namespaced name** as returned by `variable_list`, e.g. `"pop₊POP"`
- A **short name** (variable only), e.g. `"POP"`, if it is unambiguous across
  all sectors

Returns a `NamedTuple` with:
- `t` — `Vector` of time points
- `values` — `Vector` of variable values at each time point

```julia
sol = Earth4All.run_tltl_solution()

# Full namespaced name
ts = Earth4All.get_timeseries(sol, "pop₊POP")

# Short name (unambiguous)
ts = Earth4All.get_timeseries(sol, "GDPP")

# Use the data
using Plots
plot(ts.t, ts.values, xlabel="Year", ylabel="GDP per person")
```

If a short name matches variables in multiple sectors, an error is raised
listing all matches so you can use the full name instead.

---

## Model Structure (System Dynamics)

These functions expose the System Dynamics structure of the Earth4All model:
which variables are stocks (levels), which are flows (rates), and how they
connect.  They build the sector systems internally and do not require a solution
object.

### Stocks

#### `list_stocks() -> Vector{NamedTuple}`

List every **stock** (state/level) variable in the model.  Stocks are variables
governed by differential equations `D(x) = inflows - outflows`.  Internal
delay-buffer variables used by `delay_n!` are excluded.

Each entry has fields: `name`, `description`, `sector`, `equation`.

```julia
for s in Earth4All.list_stocks()
    println(s.sector, " | ", s.name, " — ", s.description)
    println("   rate = ", s.equation)
end
```

#### `stock_flows(stock_name::String) -> NamedTuple`

Show the **inflows** and **outflows** for a specific stock.

`stock_name` may be the full namespaced name (e.g. `"pop₊A0020"`) or the short
name (e.g. `"A0020"`) when unambiguous.

Returns a `NamedTuple` with fields: `name`, `description`, `sector`, `equation`,
`inflows` (vector of term strings), `outflows` (vector of term strings).

For simple rate equations like `BIRTHS - PASS20` the decomposition identifies
`BIRTHS` as an inflow and `PASS20` as an outflow.  For complex expressions (e.g.
exponential smoothing `(OW - PWA) / PD`) the full expression is returned as a
single inflow term.

```julia
sf = Earth4All.stock_flows("A0020")
println("Stock:    ", sf.name, " — ", sf.description)
println("Equation: ", sf.equation)
println("Inflows:  ", sf.inflows)
println("Outflows: ", sf.outflows)
```

### Flows

#### `list_flows() -> Vector{NamedTuple}`

List every **flow** term that appears as an inflow or outflow of at least one
stock.  Each entry indicates which stock(s) the flow feeds into or drains from.

Each entry has fields: `name`, `as_inflow_of` (vector of stock names),
`as_outflow_of` (vector of stock names).

```julia
for f in Earth4All.list_flows()
    println(f.name)
    isempty(f.as_inflow_of)  || println("   inflow of:  ", f.as_inflow_of)
    isempty(f.as_outflow_of) || println("   outflow of: ", f.as_outflow_of)
end
```

#### `flow_stocks(flow_name::String) -> NamedTuple`

Show which stock(s) a particular flow connects to.  The `flow_name` must match
exactly one of the term strings returned by `list_flows`.

Returns a `NamedTuple` with fields: `name`, `as_inflow_of`, `as_outflow_of`.

```julia
f = Earth4All.flow_stocks("BIRTHS")
# (name = "BIRTHS", as_inflow_of = ["pop₊A0020"], as_outflow_of = String[])
```

### Auxiliaries

#### `list_auxiliaries() -> Vector{NamedTuple}`

List every **auxiliary** (algebraic) variable — those that are neither stocks nor
delay-buffer internals.  Auxiliaries are computed each time step from stocks,
parameters, and other auxiliaries.

Each entry has fields: `name`, `description`, `sector`.

```julia
for a in Earth4All.list_auxiliaries()
    println(a.sector, " | ", a.name, " — ", a.description)
end
```

### Auxiliary Inputs and Effects

#### `auxiliary_inputs(name::String) -> NamedTuple`

Show all variables that are **direct inputs** to the given auxiliary — i.e. the
variables that appear on the right-hand side of its defining equation.

`name` may be the full namespaced name (e.g. `"wel₊AWBI"`) or the short name
(e.g. `"AWBI"`) when unambiguous.

Cross-sector dependencies are resolved automatically: if an auxiliary in the
Wellbeing sector references `GDPP`, the result reports the variable from its
home sector (Population) rather than the local external copy.

Returns a `NamedTuple` with fields: `name`, `description`, `sector`, `equation`,
`inputs` (vector of `(name, description, sector)` tuples).

```julia
info = Earth4All.auxiliary_inputs("AWBI")
println("Equation: ", info.equation)
for inp in info.inputs
    println("  ", inp.name, " — ", inp.description, " (", inp.sector, ")")
end
```

#### `auxiliary_effects(name::String) -> NamedTuple`

Show all variables whose defining equations **directly reference** the given
auxiliary — i.e. every variable for which this auxiliary is an input.

Effects are traced across sector boundaries: if `GDPP` (defined in Population)
appears in Wellbeing's equations, those downstream variables are included.

Returns a `NamedTuple` with fields: `name`, `description`, `sector`,
`effects` (vector of `(name, description, sector)` tuples).

```julia
info = Earth4All.auxiliary_effects("GDPP")
for eff in info.effects
    println("  ", eff.name, " — ", eff.description, " (", eff.sector, ")")
end
```

### Parameters

#### `list_parameters() -> Vector{NamedTuple}`

List every **parameter** across all 12 sectors of the model with its default
value and description.

Each entry has fields: `name` (namespaced, e.g. `"cli₊DACCO22100"`),
`description`, `sector`, `value`.

```julia
for p in Earth4All.list_parameters()
    println(p.sector, " | ", p.name, " = ", p.value, " — ", p.description)
end

# Filter to a single sector
climate_params = filter(p -> p.sector == "Climate", Earth4All.list_parameters())
```

Note: to get a mutable `Dict{Symbol, Float64}` for use with `run_e4a_solution`,
use the per-sector `getparameters()` functions (see
[Parameters and Initial Conditions](#parameters-and-initial-conditions)).

---

## Plotting

#### `fig_baserun_tltl(; kwargs...)`

Generate a plot of the 6 key indicator variables for the Too Little Too Late
scenario (1980–2100):

| Variable | Sector | Description | Y-axis range |
|----------|--------|-------------|-------------|
| `POP` | Population | Population (Mp) | 0–10,000 |
| `AWBI` | Wellbeing | Average Wellbeing Index | 0–2.4 |
| `GDPP` | Population | GDP per Person (kDollar/p/y) | 0–60 |
| `STE` | Wellbeing | Social Tension | 0–2 |
| `INEQ` | Demand | Inequality | 0–1.6 |
| `OW` | Climate | Global Warming (deg C) | 0–4 |

```julia
Earth4All.fig_baserun_tltl()
```

#### `fig_baserun_gl(; kwargs...)`

Same as above for the Giant Leap scenario.

```julia
Earth4All.fig_baserun_gl()
```

---

## Sector Modules

The model is organised into 12 sector modules, each accessible as a submodule
of `Earth4All`:

| Module | Prefix | Domain |
|--------|--------|--------|
| `Climate` | `cli` | Greenhouse gases, warming, ice melt |
| `Demand` | `dem` | Consumption, inequality, government finance |
| `Energy` | `ene` | Fossil fuels, renewables, electrification |
| `Finance` | `fin` | Investment, credit, interest rates |
| `FoodLand` | `foo` | Agriculture, land use, food supply |
| `Inventory` | `inv` | GDP, inventory management |
| `LabourMarket` | `lab` | Employment, wages, participation |
| `Other` | `oth` | Supplementary variables |
| `Output` | `out` | Productivity, capacity, output |
| `Population` | `pop` | Demographics, life expectancy, fertility |
| `Public` | `pub` | Government spending, taxation |
| `Wellbeing` | `wel` | Wellbeing indices, social tension/trust |

### Sector Constructors

Each module provides a main constructor that builds an `ODESystem` for that
sector:

```julia
@named pop = Earth4All.Population.population()
@named cli = Earth4All.Climate.climate(; params=custom_params)
```

All constructors accept:
- `params` — `Dict{Symbol, Float64}` of parameter values
- `inits` — `Dict{Symbol, Float64}` of initial conditions
- `tables` — lookup tables for interpolation
- `ranges` — ranges for lookup tables

Each module also provides `*_full_support` and `*_partial_support` variants
that replace cross-sector coupling variables with exogenous interpolation tables,
useful for testing sectors in isolation.

### Parameters and Initial Conditions

Every sector module provides functions to retrieve default parameter and
initialisation dictionaries:

```julia
# Get a copy of default parameters (safe to modify)
ps = Earth4All.Climate.getparameters()
ps[:DACCO22100] = 12.0   # modify for custom scenario

# Get a copy of default initial conditions
inits = Earth4All.Population.getinitialisations()
```

#### `<Sector>.getparameters() -> Dict{Symbol, Float64}`

Returns a **copy** of the sector's default parameter dictionary.

#### `<Sector>.getinitialisations() -> Dict{Symbol, Float64}`

Returns a **copy** of the sector's default initial condition dictionary.

Available for all 12 sectors: `Climate`, `Demand`, `Energy`, `Finance`,
`FoodLand`, `Inventory`, `LabourMarket`, `Other`, `Output`, `Population`,
`Public`, `Wellbeing`.

---

## Customising Scenarios

To create a custom scenario, retrieve the default parameters, modify them,
and pass them to `run_e4a_solution`:

```julia
# Start from defaults
cli_ps = Earth4All.Climate.getparameters()
dem_ps = Earth4All.Demand.getparameters()

# Apply custom policy assumptions
cli_ps[:DACCO22100] = 12.0    # Aggressive direct air capture
dem_ps[:EETF2022] = 0.03      # Higher empowerment tax

# Solve
sol = Earth4All.run_e4a_solution(cli_pars=cli_ps, dem_pars=dem_ps)

# Inspect results
ts = Earth4All.get_timeseries(sol, "cli₊OW")
println("Warming in 2100: ", ts.values[end])
```

---

## Validation Utilities

These functions in `src/functions.jl` compare model output against Vensim
reference datasets.  They are primarily used for development and testing.

#### `compare(a, b, pepsi)`

Compare two numeric arrays element-wise. Returns
`(max_relative_error, value_a, value_b, index)` at the point of maximum error.
The `pepsi` parameter controls the error metric (positive: denominator offset;
negative: symmetric relative error).

#### `mre_sys(scen, sol, sys, vs_ds, pepsi, nt, verbose, do_plot)`

Calculate the maximum relative error between a solution and a Vensim dataset for
all variables in a single sector system.

#### `check_solution(sol, pepsi, nt, verbose, do_plot)`

Validate a solution against Vensim reference data for all 12 sectors.

#### `all_mre(scen, sol)`

Print the maximum relative error for each sector and overall.

#### `read_vensim_dataset(fn, to_be_removed)`

Read a tab-separated Vensim export file into a `Dict{String, Vector{Float64}}`.

#### `system_array()`

Build an array of all 12 named sector systems (useful for validation loops).

#### `sector_name()`

Return the list of 12 sector name strings.

#### `print_vars(sys)`

Print all endogenous variables of an ODE system in a markdown table format.

#### `print_ps(sys)`

Print all parameters of an ODE system in a markdown table format.

#### `print_exo_vars(sys)`

Print all exogenous (cross-sector) variables with their source sector.

#### `compare_and_plot(scen, sol, desc, fy, ly, nt, pepsi)`

Find a variable by description across all sectors and create a comparison plot
against the Vensim reference data.

#### `plot_two_sols(scen1, sol1, scen2, sol2, sys, desc, fy, ly, nt)`

Plot the same variable from two different solutions side by side for comparison.
