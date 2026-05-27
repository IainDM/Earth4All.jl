# Earth4All single-shot simulation runner
# Reads parameter overrides as JSON from stdin, runs the model, writes results as JSON to stdout.
#
# Usage: julia run_earth4all.jl [path/to/src]  (defaults to ../../src when colocated in Earth4All.jl)
#
# Input JSON format:
# {
#   "parameters": { "climate": { "DACCO22100": 8, ... }, "demand": { ... }, ... },
#   "initialisations": { "population": { "A0020": 2170, ... }, ... },
#   "variables": ["pop.POP", "cli.OW", ...]   // optional: which variables to extract
# }
#
# Output JSON format:
# {
#   "success": true,
#   "message": "Simulation completed",
#   "solve_time_seconds": 1.23,
#   "dashboard": [
#     { "year": 2025, "population_mp": 8100, "gdp_per_person_k": 15, ... },
#     ...
#   ],
#   "timeseries": { "pop.POP": { "times": [...], "values": [...] }, ... },
#   "warnings": []
# }

# Load shared pure logic (constants, overrides, protocol helpers)
include(joinpath(@__DIR__, "src", "common.jl"))

# Get Earth4All.jl source path from args or environment
const E4A_SRC = if length(ARGS) >= 1
    ARGS[1]
elseif haskey(ENV, "EARTH4ALL_SRC")
    ENV["EARTH4ALL_SRC"]
else
    joinpath(@__DIR__, "..", "..", "src")
end

# Load Earth4All
try
    include(joinpath(E4A_SRC, "Earth4All.jl"))
catch e
    result = format_error_result(
        "Failed to load Earth4All.jl from $E4A_SRC: $(sprint(showerror, e))";
        warnings=["Earth4All.jl source not found. Set EARTH4ALL_SRC environment variable."],
    )
    println(JSON.json(result))
    exit(1)
end

using ModelingToolkit

# Read input from stdin
input_str = read(stdin, String)
input = JSON.parse(input_str)

# Sector name mapping: JSON key -> Julia module + function names
const SECTOR_MAP = Dict(
    "climate" => (mod=Earth4All.Climate, getparams=Earth4All.Climate.getparameters, getinits=Earth4All.Climate.getinitialisations, pars_kw=:cli_pars, inits_kw=:cli_inits),
    "demand" => (mod=Earth4All.Demand, getparams=Earth4All.Demand.getparameters, getinits=Earth4All.Demand.getinitialisations, pars_kw=:dem_pars, inits_kw=:dem_inits),
    "energy" => (mod=Earth4All.Energy, getparams=Earth4All.Energy.getparameters, getinits=Earth4All.Energy.getinitialisations, pars_kw=:ene_pars, inits_kw=:ene_inits),
    "finance" => (mod=Earth4All.Finance, getparams=Earth4All.Finance.getparameters, getinits=Earth4All.Finance.getinitialisations, pars_kw=:fin_pars, inits_kw=:fin_inits),
    "foodland" => (mod=Earth4All.FoodLand, getparams=Earth4All.FoodLand.getparameters, getinits=Earth4All.FoodLand.getinitialisations, pars_kw=:foo_pars, inits_kw=:foo_inits),
    "inventory" => (mod=Earth4All.Inventory, getparams=Earth4All.Inventory.getparameters, getinits=Earth4All.Inventory.getinitialisations, pars_kw=:inv_pars, inits_kw=:inv_inits),
    "labourmarket" => (mod=Earth4All.LabourMarket, getparams=Earth4All.LabourMarket.getparameters, getinits=Earth4All.LabourMarket.getinitialisations, pars_kw=:lab_pars, inits_kw=:lab_inits),
    "other" => (mod=Earth4All.Other, getparams=Earth4All.Other.getparameters, getinits=Earth4All.Other.getinitialisations, pars_kw=:oth_pars, inits_kw=:oth_inits),
    "output" => (mod=Earth4All.Output, getparams=Earth4All.Output.getparameters, getinits=Earth4All.Output.getinitialisations, pars_kw=:out_pars, inits_kw=:out_inits),
    "population" => (mod=Earth4All.Population, getparams=Earth4All.Population.getparameters, getinits=Earth4All.Population.getinitialisations, pars_kw=:pop_pars, inits_kw=:pop_inits),
    "public" => (mod=Earth4All.Public, getparams=Earth4All.Public.getparameters, getinits=Earth4All.Public.getinitialisations, pars_kw=:pub_pars, inits_kw=:pub_inits),
    "wellbeing" => (mod=Earth4All.Wellbeing, getparams=Earth4All.Wellbeing.getparameters, getinits=Earth4All.Wellbeing.getinitialisations, pars_kw=:wel_pars, inits_kw=:wel_inits),
)

function run_simulation(input::Dict)
    t_start = time()

    param_overrides = get(input, "parameters", Dict())
    init_overrides = get(input, "initialisations", Dict())

    kwargs, warnings = build_sector_kwargs(SECTOR_MAP, param_overrides, init_overrides)

    # Build and solve the model
    system = Earth4All.run_e4a(; kwargs...)
    sol = Earth4All.run_e4a_solution(; kwargs...)

    solve_time = time() - t_start

    # Extract dashboard variables at milestone years
    @named pop = Earth4All.Population.population()
    @named cli = Earth4All.Climate.climate()
    @named dem = Earth4All.Demand.demand()
    @named wel = Earth4All.Wellbeing.wellbeing()

    dashboard = []

    for year in MILESTONE_YEARS
        # Find the index closest to the target year
        idx = argmin(abs.(sol.t .- year))
        push!(dashboard, Dict(
            "year" => year,
            "population_mp" => sol[pop.POP][idx],
            "gdp_per_person_k" => sol[pop.GDPP][idx],
            "warming_degC" => sol[cli.OW][idx],
            "inequality" => sol[dem.INEQ][idx],
            "wellbeing_index" => sol[wel.AWBI][idx],
            "social_tension" => sol[wel.STE][idx],
        ))
    end

    # Extract time series for key variables
    timeseries = Dict()

    variable_map = Dict(
        "pop.POP" => pop.POP,
        "pop.GDPP" => pop.GDPP,
        "cli.OW" => cli.OW,
        "dem.INEQ" => dem.INEQ,
        "wel.AWBI" => wel.AWBI,
        "wel.STE" => wel.STE,
    )

    # If specific variables requested, use those; otherwise use defaults
    requested_vars = get(input, "variables", collect(keys(variable_map)))

    for var_name in requested_vars
        if haskey(variable_map, var_name)
            var_sym = variable_map[var_name]
            timeseries[var_name] = Dict(
                "times" => collect(sol.t),
                "values" => collect(sol[var_sym]),
            )
        end
    end

    return format_success_result(dashboard, timeseries, solve_time, warnings)
end

# Main execution
try
    result = run_simulation(input)
    println(JSON.json(result))
catch e
    result = format_error_result(
        "Simulation failed: $(sprint(showerror, e))";
        warnings=[sprint(showerror, e, catch_backtrace())],
    )
    println(JSON.json(result))
    exit(1)
end
