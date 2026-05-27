# Shared pure logic for Earth4All MCP Julia scripts.
# This module contains functions and constants that are independent of
# the Earth4All.jl model and can be unit-tested without it.

using JSON

# ── Constants ────────────────────────────────────────────────────────────────

"""
Mapping of sector names to their corresponding keyword-argument symbols
used when calling Earth4All simulation functions.
"""
const SECTOR_KW_MAP = Dict(
    "climate"      => (pars_kw=:cli_pars,  inits_kw=:cli_inits),
    "demand"       => (pars_kw=:dem_pars,  inits_kw=:dem_inits),
    "energy"       => (pars_kw=:ene_pars,  inits_kw=:ene_inits),
    "finance"      => (pars_kw=:fin_pars,  inits_kw=:fin_inits),
    "foodland"     => (pars_kw=:foo_pars,  inits_kw=:foo_inits),
    "inventory"    => (pars_kw=:inv_pars,  inits_kw=:inv_inits),
    "labourmarket" => (pars_kw=:lab_pars,  inits_kw=:lab_inits),
    "other"        => (pars_kw=:oth_pars,  inits_kw=:oth_inits),
    "output"       => (pars_kw=:out_pars,  inits_kw=:out_inits),
    "population"   => (pars_kw=:pop_pars,  inits_kw=:pop_inits),
    "public"       => (pars_kw=:pub_pars,  inits_kw=:pub_inits),
    "wellbeing"    => (pars_kw=:wel_pars,  inits_kw=:wel_inits),
)

const EXPECTED_SECTORS = sort(collect(keys(SECTOR_KW_MAP)))

const MILESTONE_YEARS = [2025, 2050, 2075, 2100]

const DASHBOARD_KEYS = [
    "year", "population_mp", "gdp_per_person_k",
    "warming_degC", "inequality", "wellbeing_index", "social_tension",
]

const DEFAULT_VARIABLES = [
    "pop.POP", "pop.GDPP", "cli.OW", "dem.INEQ", "wel.AWBI", "wel.STE",
]

# ── Parameter override logic ─────────────────────────────────────────────────

"""
    apply_overrides!(target, overrides, sector_name, kind, warnings)

Apply parameter/initialisation overrides from a `Dict{String,Any}` onto a
`Dict{Symbol,<:Real}` of defaults. Unknown keys produce a warning message
in `warnings`. Returns the number of overrides successfully applied.
"""
function apply_overrides!(
    target::AbstractDict{Symbol},
    overrides::AbstractDict,
    sector_name::AbstractString,
    kind::AbstractString,
    warnings::Vector{String},
)
    applied = 0
    for (k, v) in overrides
        sym = Symbol(k)
        if haskey(target, sym)
            target[sym] = Float64(v)
            applied += 1
        else
            push!(warnings, "Unknown $kind $sector_name.$k — skipped")
        end
    end
    return applied
end

"""
    build_sector_kwargs(sector_map, param_overrides, init_overrides)

Build the keyword-arguments dictionary for an Earth4All simulation call.
`sector_map` maps sector names to named tuples with fields:
  `getparams`, `getinits`, `pars_kw`, `inits_kw`.
Returns `(kwargs::Dict{Symbol,Any}, warnings::Vector{String})`.
"""
function build_sector_kwargs(sector_map, param_overrides::AbstractDict, init_overrides::AbstractDict)
    kwargs = Dict{Symbol, Any}()
    warnings = String[]

    for (sector_name, sector_info) in sector_map
        # Parameters
        pars = sector_info.getparams()
        if haskey(param_overrides, sector_name)
            apply_overrides!(pars, param_overrides[sector_name], sector_name, "parameter", warnings)
        end
        kwargs[sector_info.pars_kw] = pars

        # Initialisations
        inits = sector_info.getinits()
        if haskey(init_overrides, sector_name)
            apply_overrides!(inits, init_overrides[sector_name], sector_name, "initialisation", warnings)
        end
        kwargs[sector_info.inits_kw] = inits
    end

    return kwargs, warnings
end

# ── Worker protocol ──────────────────────────────────────────────────────────

"""
    handle_command(input, run_fn)

Route a worker-protocol command dictionary. Returns a `Dict` response for
the client, or `nothing` to signal the worker should exit.
`run_fn(input)` is invoked for `"run"` commands.
"""
function handle_command(input::AbstractDict, run_fn::Function)
    command = get(input, "command", "run")

    if command == "ping"
        return Dict("status" => "ok", "message" => "pong")
    elseif command == "exit"
        return nothing
    elseif command == "run"
        return run_fn(input)
    else
        return Dict("status" => "error", "message" => "Unknown command: $command")
    end
end

# ── Response formatting ──────────────────────────────────────────────────────

"""
    format_error_result(message; warnings=String[])

Create a standardised error-response dictionary.
"""
function format_error_result(message::AbstractString; warnings::Vector{String}=String[])
    return Dict(
        "success"            => false,
        "message"            => message,
        "solve_time_seconds" => 0,
        "dashboard"          => [],
        "timeseries"         => Dict(),
        "warnings"           => warnings,
    )
end

"""
    format_success_result(dashboard, timeseries, solve_time, warnings)

Create a standardised success-response dictionary.
"""
function format_success_result(dashboard, timeseries, solve_time::Real, warnings::Vector{String})
    return Dict(
        "success"            => true,
        "message"            => "Simulation completed successfully",
        "solve_time_seconds" => solve_time,
        "dashboard"          => dashboard,
        "timeseries"         => timeseries,
        "warnings"           => warnings,
    )
end
