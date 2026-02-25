using ModelingToolkit

"""
    _sector_systems()

Build all 12 sector ODE systems for model structure analysis.
Returns a vector of `(prefix, sector_name, system)` tuples.
"""
function _sector_systems()
    @named cli = Climate.climate()
    @named dem = Demand.demand()
    @named ene = Energy.energy()
    @named fin = Finance.finance()
    @named foo = FoodLand.foodland()
    @named inv = Inventory.inventory()
    @named lab = LabourMarket.labour_market()
    @named oth = Other.other()
    @named out = Output.output()
    @named pop = Population.population()
    @named pub = Public.public()
    @named wel = Wellbeing.wellbeing()
    return [
        (:cli, "Climate", cli),
        (:dem, "Demand", dem),
        (:ene, "Energy", ene),
        (:fin, "Finance", fin),
        (:foo, "FoodLand", foo),
        (:inv, "Inventory", inv),
        (:lab, "LabourMarket", lab),
        (:oth, "Other", oth),
        (:out, "Output", out),
        (:pop, "Population", pop),
        (:pub, "Public", pub),
        (:wel, "Wellbeing", wel),
    ]
end

"""
    _description_map(unknowns)

Build a Dict mapping variable name (without `(t)`) to its description string.
"""
function _description_map(unknowns)
    result = Dict{String,String}()
    for v in unknowns
        name = replace(string(v), "(t)" => "")
        desc = try
            ModelingToolkit.getdescription(v)
        catch
            ""
        end
        result[name] = desc
    end
    return result
end

# Check whether a variable name belongs to a delay buffer (internal to delay_n!)
function _is_delay_buffer(name::String)
    return contains(name, "LV_") || contains(name, "RT_")
end

"""
    _build_model_structure()

Analyze all sector systems and return the full SD model structure:
stocks, auxiliaries, and the stock-flow graph.
"""
function _build_model_structure()
    sectors = _sector_systems()

    stocks = NamedTuple{(:name, :short_name, :description, :sector, :equation),
                        NTuple{5,String}}[]
    described_vars = NamedTuple{(:name, :short_name, :description, :sector),
                                NTuple{4,String}}[]
    stock_set = Set{String}()

    for (prefix, sector_name, sys) in sectors
        eqs = ModelingToolkit.get_eqs(sys)
        unknowns = ModelingToolkit.get_unknowns(sys)
        descs = _description_map(unknowns)

        # Collect endogenous variables (those with non-empty descriptions,
        # excluding delay-buffer internals)
        for v in unknowns
            vname = replace(string(v), "(t)" => "")
            d = get(descs, vname, "")
            if !isempty(d) && !startswith(d, "LV functions") && !startswith(d, "RT functions")
                push!(described_vars, (name="$(prefix)₊$(vname)",
                                       short_name=vname,
                                       description=d,
                                       sector=sector_name))
            end
        end

        # Find stocks: equations whose LHS is a Differential term
        for eq in eqs
            lhs_str = string(eq.lhs)
            if !startswith(lhs_str, "Differential(t)")
                continue
            end
            # Extract variable name from "Differential(t)(VAR(t))"
            inner = lhs_str[length("Differential(t)(")+1 : end-1]
            var_name = replace(inner, "(t)" => "")
            if _is_delay_buffer(var_name)
                continue
            end
            full_name = "$(prefix)₊$(var_name)"
            d = get(descs, var_name, "")
            rhs_str = replace(string(eq.rhs), "(t)" => "")
            push!(stocks, (name=full_name, short_name=var_name,
                           description=d, sector=sector_name,
                           equation=rhs_str))
            push!(stock_set, full_name)
        end
    end

    auxiliaries = filter(v -> !(v.name in stock_set), described_vars)
    return (stocks=sort(stocks, by=x -> x.name),
            auxiliaries=sort(auxiliaries, by=x -> x.name))
end

"""
    _try_decompose_flows(equation_str::String)

Best-effort decomposition of a stock's rate equation into inflow and outflow
terms. Splits on top-level `+` / `-` operators (tracking parenthesis depth).

Returns `(inflows::Vector{String}, outflows::Vector{String})`.
When the expression cannot be cleanly split (e.g. `(OW - PWA) / PD`),
the entire expression is returned as a single inflow.
"""
function _try_decompose_flows(equation_str::String)
    s = strip(equation_str)
    inflows  = String[]
    outflows = String[]

    if isempty(s)
        return inflows, outflows
    end

    # Split into top-level additive terms by tracking parenthesis depth.
    # A `+` or `-` at depth 0 preceded by a space is treated as a binary operator.
    depth = 0
    buf = Char[]
    tokens = String[]   # each token keeps its leading sign (if any)

    for (i, c) in enumerate(s)
        if c == '('
            depth += 1
            push!(buf, c)
        elseif c == ')'
            depth -= 1
            push!(buf, c)
        elseif depth == 0 && (c == '+' || c == '-') && i > 1 && s[prevind(s, i)] == ' '
            push!(tokens, String(buf))
            buf = Char[c]  # start new token with its sign
        else
            push!(buf, c)
        end
    end
    push!(tokens, String(buf))

    # Classify each token by its leading sign
    for token in tokens
        t = strip(token)
        isempty(t) && continue
        if startswith(t, "- ")
            push!(outflows, strip(t[3:end]))
        elseif startswith(t, "-") && length(t) > 1 && t[2] != ' '
            # e.g. "-VAR" without space
            push!(outflows, strip(t[2:end]))
        else
            # Strip optional leading "+"
            if startswith(t, "+ ")
                t = strip(t[3:end])
            elseif startswith(t, "+")
                t = strip(t[2:end])
            end
            push!(inflows, t)
        end
    end

    return inflows, outflows
end

# ────────────────────────────────────────────────────────────────────
# Public API
# ────────────────────────────────────────────────────────────────────

"""
    list_stocks()

List every stock (state) variable in the Earth4All model.
Stocks are variables governed by differential equations (`D(x) = …`).
Internal delay-buffer variables (LV\\_, RT\\_) are excluded.

Returns a sorted vector of NamedTuples with fields:
`name`, `description`, `sector`, `equation`.

# Example
```julia
for s in Earth4All.list_stocks()
    println(s.sector, "  ", s.name, " — ", s.description)
    println("   rate = ", s.equation)
end
```
"""
function list_stocks()
    ms = _build_model_structure()
    return [(name=s.name, description=s.description,
             sector=s.sector, equation=s.equation) for s in ms.stocks]
end

"""
    stock_flows(stock_name::String)

Show the inflows and outflows for a given stock variable.
`stock_name` may be the full namespaced name (e.g. `"pop₊A0020"`) or the
short name (e.g. `"A0020"`) when unambiguous.

Returns a NamedTuple with fields:
`name`, `description`, `sector`, `equation`, `inflows`, `outflows`.

For simple rate equations like `BIRTHS - PASS20` the decomposition is exact.
For complex expressions (e.g. exponential smoothing `(OW - PWA) / PD`) the
full expression is returned as a single inflow term.

# Example
```julia
sf = Earth4All.stock_flows("A0020")
println("Inflows:  ", sf.inflows)
println("Outflows: ", sf.outflows)
```
"""
function stock_flows(stock_name::String)
    ms = _build_model_structure()

    # Try exact match first, then short-name match
    matches = typeof(ms.stocks[1])[]
    for s in ms.stocks
        if s.name == stock_name
            inflows, outflows = _try_decompose_flows(s.equation)
            return (name=s.name, description=s.description, sector=s.sector,
                    equation=s.equation, inflows=inflows, outflows=outflows)
        end
        if s.short_name == stock_name
            push!(matches, s)
        end
    end

    if length(matches) == 1
        s = matches[1]
        inflows, outflows = _try_decompose_flows(s.equation)
        return (name=s.name, description=s.description, sector=s.sector,
                equation=s.equation, inflows=inflows, outflows=outflows)
    elseif length(matches) > 1
        names = join([m.name for m in matches], ", ")
        error("Ambiguous stock name '$stock_name'. Matches: $names. Use the full namespaced name.")
    end

    error("Stock '$stock_name' not found. Use list_stocks() to see available stocks.")
end

"""
    list_auxiliaries()

List every auxiliary (non-stock) variable in the Earth4All model.
These are algebraic variables computed each time step from stocks
and parameters. Exogenous coupling variables (those without descriptions)
and delay-buffer internals are excluded.

Returns a sorted vector of NamedTuples with fields:
`name`, `description`, `sector`.

# Example
```julia
for a in Earth4All.list_auxiliaries()
    println(a.sector, "  ", a.name, " — ", a.description)
end
```
"""
function list_auxiliaries()
    ms = _build_model_structure()
    return [(name=a.name, description=a.description, sector=a.sector)
            for a in ms.auxiliaries]
end

"""
    list_flows()

List every flow variable that appears as an inflow or outflow of at least one
stock. Each entry indicates which stock(s) the flow feeds into or drains from.

Returns a sorted vector of NamedTuples with fields:
`name`, `as_inflow_of` (vector of stock names), `as_outflow_of` (vector of stock names).

# Example
```julia
for f in Earth4All.list_flows()
    println(f.name)
    isempty(f.as_inflow_of)  || println("   inflow of:  ", f.as_inflow_of)
    isempty(f.as_outflow_of) || println("   outflow of: ", f.as_outflow_of)
end
```
"""
function list_flows()
    ms = _build_model_structure()

    # Build flow → stock mapping by decomposing every stock equation
    inflow_map  = Dict{String,Vector{String}}()  # flow_term → [stock_names…]
    outflow_map = Dict{String,Vector{String}}()

    for s in ms.stocks
        inflows, outflows = _try_decompose_flows(s.equation)
        for term in inflows
            push!(get!(inflow_map, term, String[]), s.name)
        end
        for term in outflows
            push!(get!(outflow_map, term, String[]), s.name)
        end
    end

    all_terms = sort(collect(union(keys(inflow_map), keys(outflow_map))))
    return [(name=term,
             as_inflow_of  = get(inflow_map, term, String[]),
             as_outflow_of = get(outflow_map, term, String[]))
            for term in all_terms]
end

"""
    flow_stocks(flow_name::String)

Show which stock(s) a particular flow term feeds into or drains from.
The `flow_name` must match exactly one of the terms returned by [`list_flows`](@ref).

Returns a NamedTuple with fields:
`name`, `as_inflow_of`, `as_outflow_of`.

# Example
```julia
Earth4All.flow_stocks("BIRTHS")
# (name = "BIRTHS", as_inflow_of = ["pop₊A0020"], as_outflow_of = String[])
```
"""
function flow_stocks(flow_name::String)
    flows = list_flows()

    # Exact match
    for f in flows
        if f.name == flow_name
            return f
        end
    end

    # Substring / partial match hint
    partials = [f.name for f in flows if contains(f.name, flow_name)]
    if !isempty(partials)
        hint = join(partials[1:min(5, length(partials))], ", ")
        error("Flow '$flow_name' not found. Did you mean one of: $hint? Use list_flows() to see all flows.")
    end

    error("Flow '$flow_name' not found. Use list_flows() to see available flows.")
end
