using Test

# Load the Earth4All module via include (project is not set up as a package)
include(joinpath(@__DIR__, "..", "src", "Earth4All.jl"))

# Solve once and reuse across all tests that need a solution
const SOL_TLTL = Earth4All.run_tltl_solution()

@testset "Earth4All API Tests" begin

    # ──────────────────────────────────────────────────
    # Variable inspection API
    # ──────────────────────────────────────────────────
    @testset "variable_list" begin
        vars = Earth4All.variable_list(SOL_TLTL)

        @test vars isa Vector{Tuple{String,String}}
        @test length(vars) > 0

        # Should be sorted by name
        names = [v[1] for v in vars]
        @test names == sort(names)

        # Known key variables should be present (includes observed/algebraic)
        name_set = Set(names)
        @test "pop₊POP" in name_set
        @test "cli₊OW" in name_set
        @test "dem₊INEQ" in name_set
        @test "wel₊AWBI" in name_set

        # Known stocks should also be present
        @test "pop₊A0020" in name_set
        @test "cli₊CO2A" in name_set

        # Descriptions should be non-empty for key variables
        desc_map = Dict(vars)
        @test !isempty(desc_map["pop₊POP"])
        @test !isempty(desc_map["cli₊OW"])
    end

    @testset "get_timeseries" begin
        # Full namespaced name (observed/algebraic variable)
        ts = Earth4All.get_timeseries(SOL_TLTL, "pop₊POP")
        @test hasproperty(ts, :t)
        @test hasproperty(ts, :values)
        @test length(ts.t) == length(ts.values)
        @test length(ts.t) > 0
        @test ts.t[1] ≈ 1980.0
        @test ts.t[end] ≈ 2100.0

        # Population should be positive and in a reasonable range
        @test all(v -> v > 0, ts.values)

        # Same result via full namespaced name
        ts2 = Earth4All.get_timeseries(SOL_TLTL, "pop₊POP")
        @test ts2.values ≈ ts.values

        # Short name lookup for unambiguous variable (AWBI only in Wellbeing)
        ts_awbi = Earth4All.get_timeseries(SOL_TLTL, "AWBI")
        ts_awbi2 = Earth4All.get_timeseries(SOL_TLTL, "wel₊AWBI")
        @test ts_awbi.values ≈ ts_awbi2.values

        # State variable (stock)
        ts3 = Earth4All.get_timeseries(SOL_TLTL, "pop₊A0020")
        @test length(ts3.t) > 0
        @test all(v -> v > 0, ts3.values)

        # Nonexistent variable should throw
        @test_throws ErrorException Earth4All.get_timeseries(SOL_TLTL, "NONEXISTENT_VAR_XYZ")

        # Ambiguous short name should throw (POP appears in multiple sectors)
        @test_throws ErrorException Earth4All.get_timeseries(SOL_TLTL, "POP")
    end

    # ──────────────────────────────────────────────────
    # SD model structure API
    # ──────────────────────────────────────────────────
    @testset "list_stocks" begin
        stocks = Earth4All.list_stocks()

        @test length(stocks) > 0
        @test all(s -> hasproperty(s, :name), stocks)
        @test all(s -> hasproperty(s, :description), stocks)
        @test all(s -> hasproperty(s, :sector), stocks)
        @test all(s -> hasproperty(s, :equation), stocks)

        # Should be sorted
        names = [s.name for s in stocks]
        @test names == sort(names)

        # Known stocks should be present
        name_set = Set(names)
        @test "pop₊A0020" in name_set   # Aged 0-20 years
        @test "cli₊CO2A" in name_set    # CO2 in Atmosphere
        @test "cli₊EHS" in name_set     # Extra heat in surface

        # Delay buffer variables should be excluded
        @test !any(contains(n, "LV_") for n in names)
        @test !any(contains(n, "RT_") for n in names)

        # Equations should be non-empty strings
        @test all(s -> !isempty(s.equation), stocks)
    end

    @testset "stock_flows" begin
        # Simple stock: A0020 has BIRTHS as inflow and PASS20 as outflow
        sf = Earth4All.stock_flows("A0020")
        @test sf.name == "pop₊A0020"
        @test sf.sector == "Population"
        @test !isempty(sf.equation)
        @test sf.inflows isa Vector{String}
        @test sf.outflows isa Vector{String}
        @test any(contains(f, "BIRTHS") for f in sf.inflows)
        @test any(contains(f, "PASS20") for f in sf.outflows)

        # Full namespaced name should also work
        sf2 = Earth4All.stock_flows("pop₊A0020")
        @test sf2.name == sf.name
        @test sf2.equation == sf.equation

        # Nonexistent stock
        @test_throws ErrorException Earth4All.stock_flows("NOT_A_STOCK_XYZ")
    end

    @testset "list_flows" begin
        flows = Earth4All.list_flows()

        @test length(flows) > 0
        @test all(f -> hasproperty(f, :name), flows)
        @test all(f -> hasproperty(f, :as_inflow_of), flows)
        @test all(f -> hasproperty(f, :as_outflow_of), flows)

        # BIRTHS should be an inflow of pop₊A0020
        births_flows = filter(f -> f.name == "BIRTHS", flows)
        if !isempty(births_flows)
            @test "pop₊A0020" in births_flows[1].as_inflow_of
        end
    end

    @testset "flow_stocks" begin
        fs = Earth4All.flow_stocks("BIRTHS")
        @test fs.name == "BIRTHS"
        @test "pop₊A0020" in fs.as_inflow_of

        # Nonexistent flow
        @test_throws ErrorException Earth4All.flow_stocks("NOT_A_FLOW_XYZ")
    end

    @testset "list_auxiliaries" begin
        auxs = Earth4All.list_auxiliaries()

        @test length(auxs) > 0
        @test all(a -> hasproperty(a, :name), auxs)
        @test all(a -> hasproperty(a, :description), auxs)
        @test all(a -> hasproperty(a, :sector), auxs)

        # Should be sorted
        names = [a.name for a in auxs]
        @test names == sort(names)

        # Known auxiliaries
        name_set = Set(names)
        @test "pop₊POP" in name_set    # POP is algebraic (sum of age groups)
        @test "pop₊GDPP" in name_set   # GDP per person
        @test "wel₊AWBI" in name_set   # Average Wellbeing Index

        # Stocks should NOT appear in auxiliaries
        stock_names = Set(s.name for s in Earth4All.list_stocks())
        for a in auxs
            @test !(a.name in stock_names)
        end
    end

    # ──────────────────────────────────────────────────
    # Auxiliary dependency API
    # ──────────────────────────────────────────────────
    @testset "auxiliary_inputs" begin
        info = Earth4All.auxiliary_inputs("AWBI")
        @test info.name == "wel₊AWBI"
        @test info.sector == "Wellbeing"
        @test !isempty(info.equation)
        @test info.inputs isa Vector

        # AWBI = (0.5*AWBDI + 0.5*AWBPS) * AWBIN * AWBGW * AWBP
        input_names = Set(inp.name for inp in info.inputs)
        @test "wel₊AWBDI" in input_names
        @test "wel₊AWBPS" in input_names
        @test "wel₊AWBIN" in input_names
        @test "wel₊AWBGW" in input_names
        @test "wel₊AWBP" in input_names

        # Full namespaced name should also work
        info2 = Earth4All.auxiliary_inputs("wel₊AWBI")
        @test info2.name == info.name
        @test info2.inputs == info.inputs

        # Nonexistent auxiliary
        @test_throws ErrorException Earth4All.auxiliary_inputs("NOT_AN_AUX_XYZ")
    end

    @testset "auxiliary_effects" begin
        # GDPP is used in multiple places
        info = Earth4All.auxiliary_effects("GDPP")
        @test info.name == "pop₊GDPP"
        @test info.sector == "Population"
        @test length(info.effects) > 0

        # GDPP feeds into EGDPP (in Population: D(EGDPP) ~ (GDPP - EGDPP) / TAHI)
        effect_names = Set(e.name for e in info.effects)
        @test "pop₊EGDPP" in effect_names

        # Nonexistent auxiliary
        @test_throws ErrorException Earth4All.auxiliary_effects("NOT_AN_AUX_XYZ")
    end

    # ──────────────────────────────────────────────────
    # Parameters API
    # ──────────────────────────────────────────────────
    @testset "list_parameters" begin
        params = Earth4All.list_parameters()

        @test length(params) > 0
        @test all(p -> hasproperty(p, :name), params)
        @test all(p -> hasproperty(p, :description), params)
        @test all(p -> hasproperty(p, :sector), params)
        @test all(p -> hasproperty(p, :value), params)

        # Should be sorted
        names = [p.name for p in params]
        @test names == sort(names)

        # Known parameters
        name_set = Set(names)
        @test "cli₊DACCO22100" in name_set   # Direct Air Capture of CO2
        @test "pop₊GEFR" in name_set          # Goal for Extra Fertility Reduction

        # Check a known default value
        dacco2 = filter(p -> p.name == "cli₊DACCO22100", params)
        @test length(dacco2) == 1
        @test dacco2[1].value ≈ 0.0           # TLTL default is 0
        @test !isempty(dacco2[1].description)
        @test dacco2[1].sector == "Climate"

        # All sectors should be represented
        sectors = Set(p.sector for p in params)
        @test "Climate" in sectors
        @test "Population" in sectors
        @test "Wellbeing" in sectors
        @test "Demand" in sectors
        @test "Energy" in sectors

        # Values should be finite numbers
        @test all(p -> isfinite(p.value), params)
    end

    # ──────────────────────────────────────────────────
    # Cross-API consistency
    # ──────────────────────────────────────────────────
    @testset "consistency" begin
        stocks = Earth4All.list_stocks()
        auxs = Earth4All.list_auxiliaries()
        vars = Earth4All.variable_list(SOL_TLTL)

        stock_names = Set(s.name for s in stocks)
        aux_names = Set(a.name for a in auxs)

        # Stocks and auxiliaries should not overlap
        @test isempty(intersect(stock_names, aux_names))

        # Every stock and auxiliary should appear in variable_list
        sol_names = Set(v[1] for v in vars)
        for s in stocks
            @test s.name in sol_names
        end
        for a in auxs
            @test a.name in sol_names
        end

        # get_timeseries should work for any variable from variable_list
        # (test a sample to keep runtime reasonable)
        sample_names = [vars[1][1], vars[end][1], "pop₊POP", "cli₊OW"]
        for name in sample_names
            ts = Earth4All.get_timeseries(SOL_TLTL, name)
            @test length(ts.t) > 0
            @test length(ts.values) > 0
        end
    end
end
