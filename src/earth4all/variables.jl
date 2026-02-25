using ModelingToolkit

"""
    variable_list(sol)

Return a sorted list of `(name, description)` tuples for all variables available
in the solution `sol`. The `name` string can be passed to [`get_timeseries`](@ref)
to extract values.

# Example
```julia
sol = Earth4All.run_tltl_solution()
vars = Earth4All.variable_list(sol)
for (name, desc) in vars
    println(name, " — ", desc)
end
```
"""
function variable_list(sol)
    sys = sol.prob.f.sys
    result = Tuple{String,String}[]
    seen = Set{String}()

    # State variables (unknowns)
    for v in ModelingToolkit.get_unknowns(sys)
        name = replace(string(v), "(t)" => "")
        name in seen && continue
        push!(seen, name)
        desc = try ModelingToolkit.getdescription(v) catch; "" end
        push!(result, (name, desc))
    end

    # Observed (algebraic) variables
    for eq in ModelingToolkit.observed(sys)
        v = eq.lhs
        name = replace(string(v), "(t)" => "")
        name in seen && continue
        push!(seen, name)
        desc = try ModelingToolkit.getdescription(v) catch; "" end
        push!(result, (name, desc))
    end

    return sort(result, by=first)
end

"""
    get_timeseries(sol, name::String)

Extract the time series for variable `name` from the solution `sol`.
Returns a `NamedTuple` with fields `t` (time points) and `values` (variable values).

The `name` can be either:
- A full namespaced name as returned by [`variable_list`](@ref), e.g. `"pop₊POP"`
- Just the variable name, e.g. `"POP"`, if it is unambiguous across sectors

# Example
```julia
sol = Earth4All.run_tltl_solution()

# Using full namespaced name
ts = Earth4All.get_timeseries(sol, "pop₊POP")

# Using short name (if unambiguous)
ts = Earth4All.get_timeseries(sol, "GDPP")

# Access time points and values
ts.t       # Vector of time points
ts.values  # Vector of variable values
```
"""
function get_timeseries(sol, name::String)
    sys = sol.prob.f.sys

    # Collect all accessible variables: unknowns + observed
    all_vars = collect(ModelingToolkit.get_unknowns(sys))
    for eq in ModelingToolkit.observed(sys)
        push!(all_vars, eq.lhs)
    end

    # Build a lookup from name (without "(t)") to symbolic variable
    matches = []
    for v in all_vars
        vname = replace(string(v), "(t)" => "")
        if vname == name
            return (t=sol.t, values=sol[v])
        end
        # Also check for short name match (without sector prefix)
        short = contains(vname, "₊") ? split(vname, "₊"; limit=2)[2] : vname
        if short == name
            push!(matches, (vname, v))
        end
    end

    if length(matches) == 1
        return (t=sol.t, values=sol[matches[1][2]])
    elseif length(matches) > 1
        names = join([m[1] for m in matches], ", ")
        error("Ambiguous variable name '$name'. Matches: $names. Use the full namespaced name.")
    end

    error("Variable '$name' not found. Use variable_list(sol) to see available variables.")
end
