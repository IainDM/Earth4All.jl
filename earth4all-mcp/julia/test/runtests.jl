# Unit tests for Earth4All MCP Julia code.
# Run with: julia test/runtests.jl  (from the julia/ directory)
#      or:  julia --project=. test/runtests.jl

using Test

# Load the shared pure-logic module under test
include(joinpath(@__DIR__, "..", "src", "common.jl"))

# ─────────────────────────────────────────────────────────────────────────────
# Constants
# ─────────────────────────────────────────────────────────────────────────────

@testset "SECTOR_KW_MAP" begin
    @testset "contains all 12 sectors" begin
        expected = [
            "climate", "demand", "energy", "finance", "foodland",
            "inventory", "labourmarket", "other", "output",
            "population", "public", "wellbeing",
        ]
        @test sort(collect(keys(SECTOR_KW_MAP))) == sort(expected)
        @test length(SECTOR_KW_MAP) == 12
    end

    @testset "each sector has unique pars_kw and inits_kw" begin
        pars_kws  = [v.pars_kw  for v in values(SECTOR_KW_MAP)]
        inits_kws = [v.inits_kw for v in values(SECTOR_KW_MAP)]
        @test length(unique(pars_kws))  == 12
        @test length(unique(inits_kws)) == 12
    end

    @testset "keyword symbols follow naming convention" begin
        for (sector, info) in SECTOR_KW_MAP
            @test endswith(string(info.pars_kw), "_pars")
            @test endswith(string(info.inits_kw), "_inits")
            # The prefix before _pars and _inits should match
            pars_prefix  = replace(string(info.pars_kw),  "_pars"  => "")
            inits_prefix = replace(string(info.inits_kw), "_inits" => "")
            @test pars_prefix == inits_prefix
        end
    end

    @testset "specific sector keyword mappings" begin
        @test SECTOR_KW_MAP["climate"].pars_kw    == :cli_pars
        @test SECTOR_KW_MAP["climate"].inits_kw   == :cli_inits
        @test SECTOR_KW_MAP["population"].pars_kw  == :pop_pars
        @test SECTOR_KW_MAP["population"].inits_kw == :pop_inits
        @test SECTOR_KW_MAP["wellbeing"].pars_kw   == :wel_pars
        @test SECTOR_KW_MAP["wellbeing"].inits_kw  == :wel_inits
        @test SECTOR_KW_MAP["energy"].pars_kw      == :ene_pars
        @test SECTOR_KW_MAP["energy"].inits_kw     == :ene_inits
        @test SECTOR_KW_MAP["foodland"].pars_kw    == :foo_pars
        @test SECTOR_KW_MAP["foodland"].inits_kw   == :foo_inits
    end
end

@testset "EXPECTED_SECTORS" begin
    @test length(EXPECTED_SECTORS) == 12
    @test "climate" in EXPECTED_SECTORS
    @test "population" in EXPECTED_SECTORS
    @test "wellbeing" in EXPECTED_SECTORS
    @test issorted(EXPECTED_SECTORS)
end

@testset "MILESTONE_YEARS" begin
    @test MILESTONE_YEARS == [2025, 2050, 2075, 2100]
    @test length(MILESTONE_YEARS) == 4
    @test issorted(MILESTONE_YEARS)
    @test all(y -> 1980 <= y <= 2200, MILESTONE_YEARS)
end

@testset "DASHBOARD_KEYS" begin
    @test "year" in DASHBOARD_KEYS
    @test "population_mp" in DASHBOARD_KEYS
    @test "gdp_per_person_k" in DASHBOARD_KEYS
    @test "warming_degC" in DASHBOARD_KEYS
    @test "inequality" in DASHBOARD_KEYS
    @test "wellbeing_index" in DASHBOARD_KEYS
    @test "social_tension" in DASHBOARD_KEYS
    @test length(DASHBOARD_KEYS) == 7
end

@testset "DEFAULT_VARIABLES" begin
    @test length(DEFAULT_VARIABLES) == 6
    @test "pop.POP" in DEFAULT_VARIABLES
    @test "pop.GDPP" in DEFAULT_VARIABLES
    @test "cli.OW" in DEFAULT_VARIABLES
    @test "dem.INEQ" in DEFAULT_VARIABLES
    @test "wel.AWBI" in DEFAULT_VARIABLES
    @test "wel.STE" in DEFAULT_VARIABLES
    # All should follow sector.VAR naming convention
    @test all(v -> occursin(".", v), DEFAULT_VARIABLES)
end

# ─────────────────────────────────────────────────────────────────────────────
# apply_overrides!
# ─────────────────────────────────────────────────────────────────────────────

@testset "apply_overrides!" begin
    @testset "applies valid overrides" begin
        target = Dict(:A => 1.0, :B => 2.0, :C => 3.0)
        overrides = Dict("A" => 10, "C" => 30)
        warnings = String[]

        n = apply_overrides!(target, overrides, "test", "parameter", warnings)

        @test n == 2
        @test target[:A] == 10.0
        @test target[:B] == 2.0   # unchanged
        @test target[:C] == 30.0
        @test isempty(warnings)
    end

    @testset "warns on unknown keys" begin
        target = Dict(:A => 1.0)
        overrides = Dict("A" => 10, "UNKNOWN" => 99)
        warnings = String[]

        n = apply_overrides!(target, overrides, "climate", "parameter", warnings)

        @test n == 1
        @test target[:A] == 10.0
        @test !haskey(target, :UNKNOWN)
        @test length(warnings) == 1
        @test occursin("Unknown parameter", warnings[1])
        @test occursin("climate.UNKNOWN", warnings[1])
    end

    @testset "handles empty overrides" begin
        target = Dict(:A => 1.0, :B => 2.0)
        warnings = String[]

        n = apply_overrides!(target, Dict(), "test", "parameter", warnings)

        @test n == 0
        @test target[:A] == 1.0
        @test target[:B] == 2.0
        @test isempty(warnings)
    end

    @testset "handles empty target" begin
        target = Dict{Symbol, Float64}()
        overrides = Dict("X" => 1)
        warnings = String[]

        n = apply_overrides!(target, overrides, "test", "parameter", warnings)

        @test n == 0
        @test isempty(target)
        @test length(warnings) == 1
    end

    @testset "converts integer values to Float64" begin
        target = Dict(:X => 0.0)
        overrides = Dict("X" => 42)
        warnings = String[]

        apply_overrides!(target, overrides, "test", "parameter", warnings)

        @test target[:X] === 42.0
        @test target[:X] isa Float64
    end

    @testset "converts float values correctly" begin
        target = Dict(:X => 0.0)
        overrides = Dict("X" => 3.14)
        warnings = String[]

        apply_overrides!(target, overrides, "test", "parameter", warnings)

        @test target[:X] ≈ 3.14
        @test target[:X] isa Float64
    end

    @testset "records initialisation warnings with correct kind label" begin
        target = Dict(:A => 1.0)
        overrides = Dict("BAD" => 0)
        warnings = String[]

        apply_overrides!(target, overrides, "population", "initialisation", warnings)

        @test length(warnings) == 1
        @test occursin("Unknown initialisation", warnings[1])
        @test occursin("population.BAD", warnings[1])
    end

    @testset "accumulates multiple warnings" begin
        target = Dict(:A => 1.0)
        overrides = Dict("X" => 1, "Y" => 2, "Z" => 3)
        warnings = String[]

        n = apply_overrides!(target, overrides, "test", "parameter", warnings)

        @test n == 0
        @test length(warnings) == 3
    end

    @testset "appends to existing warnings" begin
        target = Dict(:A => 1.0)
        overrides = Dict("BAD" => 0)
        warnings = ["pre-existing warning"]

        apply_overrides!(target, overrides, "test", "parameter", warnings)

        @test length(warnings) == 2
        @test warnings[1] == "pre-existing warning"
    end
end

# ─────────────────────────────────────────────────────────────────────────────
# build_sector_kwargs
# ─────────────────────────────────────────────────────────────────────────────

@testset "build_sector_kwargs" begin
    # Create a mock sector map with two sectors
    mock_sector_map = Dict(
        "alpha" => (
            getparams = () -> Dict(:P1 => 1.0, :P2 => 2.0),
            getinits  = () -> Dict(:I1 => 10.0),
            pars_kw   = :alpha_pars,
            inits_kw  = :alpha_inits,
        ),
        "beta" => (
            getparams = () -> Dict(:Q1 => 100.0),
            getinits  = () -> Dict(:J1 => 200.0, :J2 => 300.0),
            pars_kw   = :beta_pars,
            inits_kw  = :beta_inits,
        ),
    )

    @testset "no overrides returns defaults" begin
        kwargs, warnings = build_sector_kwargs(mock_sector_map, Dict(), Dict())

        @test isempty(warnings)
        @test kwargs[:alpha_pars][:P1] == 1.0
        @test kwargs[:alpha_pars][:P2] == 2.0
        @test kwargs[:alpha_inits][:I1] == 10.0
        @test kwargs[:beta_pars][:Q1] == 100.0
        @test kwargs[:beta_inits][:J1] == 200.0
        @test kwargs[:beta_inits][:J2] == 300.0
    end

    @testset "produces kwargs for every sector" begin
        kwargs, _ = build_sector_kwargs(mock_sector_map, Dict(), Dict())

        @test haskey(kwargs, :alpha_pars)
        @test haskey(kwargs, :alpha_inits)
        @test haskey(kwargs, :beta_pars)
        @test haskey(kwargs, :beta_inits)
        @test length(kwargs) == 4  # 2 sectors * 2 (pars + inits)
    end

    @testset "applies parameter overrides" begin
        param_overrides = Dict("alpha" => Dict("P1" => 999))
        kwargs, warnings = build_sector_kwargs(mock_sector_map, param_overrides, Dict())

        @test isempty(warnings)
        @test kwargs[:alpha_pars][:P1] == 999.0
        @test kwargs[:alpha_pars][:P2] == 2.0     # unchanged
        @test kwargs[:beta_pars][:Q1]  == 100.0   # unchanged
    end

    @testset "applies initialisation overrides" begin
        init_overrides = Dict("beta" => Dict("J2" => 777))
        kwargs, warnings = build_sector_kwargs(mock_sector_map, Dict(), init_overrides)

        @test isempty(warnings)
        @test kwargs[:beta_inits][:J2] == 777.0
        @test kwargs[:beta_inits][:J1] == 200.0   # unchanged
    end

    @testset "applies both parameter and initialisation overrides" begin
        param_overrides = Dict("alpha" => Dict("P2" => 22))
        init_overrides  = Dict("alpha" => Dict("I1" => 11))
        kwargs, warnings = build_sector_kwargs(mock_sector_map, param_overrides, init_overrides)

        @test isempty(warnings)
        @test kwargs[:alpha_pars][:P2]  == 22.0
        @test kwargs[:alpha_inits][:I1] == 11.0
    end

    @testset "collects warnings for unknown parameters" begin
        param_overrides = Dict("alpha" => Dict("NOPE" => 1))
        kwargs, warnings = build_sector_kwargs(mock_sector_map, param_overrides, Dict())

        @test length(warnings) == 1
        @test occursin("alpha.NOPE", warnings[1])
        @test occursin("parameter", warnings[1])
    end

    @testset "collects warnings for unknown initialisations" begin
        init_overrides = Dict("beta" => Dict("NOPE" => 1))
        kwargs, warnings = build_sector_kwargs(mock_sector_map, Dict(), init_overrides)

        @test length(warnings) == 1
        @test occursin("beta.NOPE", warnings[1])
        @test occursin("initialisation", warnings[1])
    end

    @testset "ignores overrides for sectors not in the map" begin
        param_overrides = Dict("gamma" => Dict("X" => 1))
        kwargs, warnings = build_sector_kwargs(mock_sector_map, param_overrides, Dict())

        @test isempty(warnings)
        @test !haskey(kwargs, :gamma_pars)
    end

    @testset "calls getparams and getinits fresh each time" begin
        call_count = Ref(0)
        counting_sector_map = Dict(
            "s" => (
                getparams = () -> begin call_count[] += 1; Dict(:P => 1.0) end,
                getinits  = () -> begin call_count[] += 1; Dict(:I => 2.0) end,
                pars_kw   = :s_pars,
                inits_kw  = :s_inits,
            ),
        )

        call_count[] = 0
        build_sector_kwargs(counting_sector_map, Dict(), Dict())
        @test call_count[] == 2  # once for getparams, once for getinits
    end
end

# ─────────────────────────────────────────────────────────────────────────────
# handle_command
# ─────────────────────────────────────────────────────────────────────────────

@testset "handle_command" begin
    mock_run = input -> Dict("success" => true, "ran" => true)

    @testset "ping returns pong" begin
        result = handle_command(Dict("command" => "ping"), mock_run)
        @test result["status"] == "ok"
        @test result["message"] == "pong"
    end

    @testset "exit returns nothing" begin
        result = handle_command(Dict("command" => "exit"), mock_run)
        @test result === nothing
    end

    @testset "run delegates to run_fn" begin
        result = handle_command(Dict("command" => "run", "parameters" => Dict()), mock_run)
        @test result["success"] == true
        @test result["ran"] == true
    end

    @testset "default command is run when key missing" begin
        result = handle_command(Dict{String,Any}(), mock_run)
        @test result["ran"] == true
    end

    @testset "unknown command returns error" begin
        result = handle_command(Dict("command" => "foobar"), mock_run)
        @test result["status"] == "error"
        @test occursin("Unknown command", result["message"])
        @test occursin("foobar", result["message"])
    end

    @testset "run_fn receives the full input dict" begin
        captured = Ref{Dict}()
        spy_run = input -> begin captured[] = input; Dict("ok" => true) end

        handle_command(Dict("command" => "run", "parameters" => Dict("x" => 1)), spy_run)
        @test captured[]["parameters"]["x"] == 1
    end

    @testset "run_fn errors propagate" begin
        bad_run = input -> error("boom")
        @test_throws ErrorException handle_command(Dict("command" => "run"), bad_run)
    end
end

# ─────────────────────────────────────────────────────────────────────────────
# format_error_result
# ─────────────────────────────────────────────────────────────────────────────

@testset "format_error_result" begin
    @testset "basic error" begin
        result = format_error_result("something broke")

        @test result["success"] == false
        @test result["message"] == "something broke"
        @test result["solve_time_seconds"] == 0
        @test result["dashboard"] == []
        @test result["timeseries"] == Dict()
        @test result["warnings"] == String[]
    end

    @testset "error with warnings" begin
        result = format_error_result("fail"; warnings=["w1", "w2"])
        @test result["warnings"] == ["w1", "w2"]
        @test result["success"] == false
    end

    @testset "has all required response keys" begin
        result = format_error_result("err")
        required_keys = ["success", "message", "solve_time_seconds", "dashboard", "timeseries", "warnings"]
        for key in required_keys
            @test haskey(result, key)
        end
    end
end

# ─────────────────────────────────────────────────────────────────────────────
# format_success_result
# ─────────────────────────────────────────────────────────────────────────────

@testset "format_success_result" begin
    @testset "basic success" begin
        dashboard = [Dict("year" => 2025)]
        ts = Dict("pop.POP" => Dict("times" => [1.0], "values" => [8000.0]))

        result = format_success_result(dashboard, ts, 1.5, ["warn1"])

        @test result["success"] == true
        @test result["message"] == "Simulation completed successfully"
        @test result["solve_time_seconds"] == 1.5
        @test result["dashboard"] == dashboard
        @test result["timeseries"] == ts
        @test result["warnings"] == ["warn1"]
    end

    @testset "has all required response keys" begin
        result = format_success_result([], Dict(), 0.0, String[])
        required_keys = ["success", "message", "solve_time_seconds", "dashboard", "timeseries", "warnings"]
        for key in required_keys
            @test haskey(result, key)
        end
    end

    @testset "empty warnings" begin
        result = format_success_result([], Dict(), 0.0, String[])
        @test result["warnings"] == String[]
    end
end

# ─────────────────────────────────────────────────────────────────────────────
# JSON serialisation round-trips
# ─────────────────────────────────────────────────────────────────────────────

@testset "JSON round-trip for protocol messages" begin
    @testset "ping response" begin
        response = Dict("status" => "ok", "message" => "pong")
        json_str = JSON.json(response)
        parsed = JSON.parse(json_str)
        @test parsed["status"] == "ok"
        @test parsed["message"] == "pong"
    end

    @testset "error result" begin
        result = format_error_result("test error"; warnings=["w1"])
        json_str = JSON.json(result)
        parsed = JSON.parse(json_str)
        @test parsed["success"] == false
        @test parsed["message"] == "test error"
        @test parsed["warnings"] == ["w1"]
    end

    @testset "success result with dashboard" begin
        dashboard = [Dict("year" => 2025, "population_mp" => 8100.0)]
        ts = Dict("pop.POP" => Dict("times" => [2020.0, 2025.0], "values" => [7800.0, 8100.0]))
        result = format_success_result(dashboard, ts, 2.5, String[])

        json_str = JSON.json(result)
        parsed = JSON.parse(json_str)

        @test parsed["success"] == true
        @test parsed["solve_time_seconds"] == 2.5
        @test length(parsed["dashboard"]) == 1
        @test parsed["dashboard"][1]["year"] == 2025
        @test parsed["dashboard"][1]["population_mp"] == 8100.0
        @test parsed["timeseries"]["pop.POP"]["times"] == [2020.0, 2025.0]
        @test parsed["timeseries"]["pop.POP"]["values"] == [7800.0, 8100.0]
    end

    @testset "ready message" begin
        ready = Dict("status" => "ready", "message" => "Earth4All worker ready")
        json_str = JSON.json(ready)
        parsed = JSON.parse(json_str)
        @test parsed["status"] == "ready"
    end
end

# ─────────────────────────────────────────────────────────────────────────────
# Worker protocol simulation
# ─────────────────────────────────────────────────────────────────────────────

@testset "Worker protocol simulation" begin
    # Simulate the worker's main loop logic without I/O
    function simulate_worker_loop(lines::Vector{String}, run_fn)
        responses = []
        for line in lines
            stripped = strip(line)
            isempty(stripped) && continue
            input = JSON.parse(stripped)
            result = handle_command(input, run_fn)
            if result === nothing
                push!(responses, :exit)
                break
            end
            push!(responses, result)
        end
        return responses
    end

    mock_run = input -> Dict("success" => true, "message" => "Simulation completed successfully")

    @testset "processes multiple ping commands" begin
        lines = [
            """{"command": "ping"}""",
            """{"command": "ping"}""",
        ]
        responses = simulate_worker_loop(lines, mock_run)
        @test length(responses) == 2
        @test responses[1]["status"] == "ok"
        @test responses[2]["status"] == "ok"
    end

    @testset "stops processing on exit command" begin
        lines = [
            """{"command": "ping"}""",
            """{"command": "exit"}""",
            """{"command": "ping"}""",   # should not be reached
        ]
        responses = simulate_worker_loop(lines, mock_run)
        @test length(responses) == 2
        @test responses[1]["status"] == "ok"
        @test responses[2] === :exit
    end

    @testset "skips empty and whitespace-only lines" begin
        lines = ["", "  ", """{"command": "ping"}""", ""]
        responses = simulate_worker_loop(lines, mock_run)
        @test length(responses) == 1
        @test responses[1]["status"] == "ok"
    end

    @testset "handles run command" begin
        lines = ["""{"command": "run", "parameters": {}}"""]
        responses = simulate_worker_loop(lines, mock_run)
        @test length(responses) == 1
        @test responses[1]["success"] == true
    end

    @testset "handles mixed command sequence" begin
        lines = [
            """{"command": "ping"}""",
            """{"command": "run", "parameters": {}}""",
            """{"command": "ping"}""",
            """{"command": "exit"}""",
        ]
        responses = simulate_worker_loop(lines, mock_run)
        @test length(responses) == 4
        @test responses[1]["status"] == "ok"
        @test responses[2]["success"] == true
        @test responses[3]["status"] == "ok"
        @test responses[4] === :exit
    end

    @testset "unknown commands produce errors but continue" begin
        lines = [
            """{"command": "bad"}""",
            """{"command": "ping"}""",
        ]
        responses = simulate_worker_loop(lines, mock_run)
        @test length(responses) == 2
        @test responses[1]["status"] == "error"
        @test responses[2]["status"] == "ok"
    end
end

# ─────────────────────────────────────────────────────────────────────────────
# Integration: build_sector_kwargs + handle_command
# ─────────────────────────────────────────────────────────────────────────────

@testset "End-to-end: run command with mock sectors" begin
    # Simulate a realistic sector map with mock defaults
    mock_sector_map = Dict(
        "climate" => (
            getparams = () -> Dict(:DACCO22100 => 8.0, :TRSS => 0.5),
            getinits  = () -> Dict(:CO2 => 420.0),
            pars_kw   = :cli_pars,
            inits_kw  = :cli_inits,
        ),
        "population" => (
            getparams = () -> Dict(:FER => 2.1, :MOR => 0.01),
            getinits  = () -> Dict(:POP => 8000.0, :A0020 => 2170.0),
            pars_kw   = :pop_pars,
            inits_kw  = :pop_inits,
        ),
    )

    function mock_handle_run(input)
        param_overrides = get(input, "parameters", Dict())
        init_overrides  = get(input, "initialisations", Dict())
        kwargs, warnings = build_sector_kwargs(mock_sector_map, param_overrides, init_overrides)

        # Verify the kwargs are structured correctly
        dashboard = [Dict("year" => y, "population_mp" => 8000.0) for y in MILESTONE_YEARS]
        return format_success_result(dashboard, Dict(), 0.1, warnings)
    end

    @testset "run with parameter overrides" begin
        input = Dict(
            "command"    => "run",
            "parameters" => Dict("climate" => Dict("DACCO22100" => 12)),
        )
        result = handle_command(input, mock_handle_run)
        @test result["success"] == true
        @test isempty(result["warnings"])
        @test length(result["dashboard"]) == 4
    end

    @testset "run with unknown parameter produces warning" begin
        input = Dict(
            "command"    => "run",
            "parameters" => Dict("climate" => Dict("NONEXISTENT" => 42)),
        )
        result = handle_command(input, mock_handle_run)
        @test result["success"] == true
        @test length(result["warnings"]) == 1
        @test occursin("climate.NONEXISTENT", result["warnings"][1])
    end

    @testset "run with initialisation overrides" begin
        input = Dict(
            "command"         => "run",
            "parameters"      => Dict(),
            "initialisations" => Dict("population" => Dict("POP" => 9000)),
        )
        result = handle_command(input, mock_handle_run)
        @test result["success"] == true
        @test isempty(result["warnings"])
    end

    @testset "run with no overrides" begin
        input = Dict("command" => "run")
        result = handle_command(input, mock_handle_run)
        @test result["success"] == true
        @test isempty(result["warnings"])
    end
end
