# Build a custom Julia sysimage containing pre-compiled heavy packages.
# This eliminates the slow startup caused by --pkgimages=no.
#
# Usage: julia julia/build_sysimage.jl
#
# The sysimage is output to julia/earth4all_sysimage.{dll,so,dylib}
# depending on platform. Build takes ~5-15 minutes (one-time cost).
# After building, the MCP server automatically detects and uses it.

using Pkg

# Ensure PackageCompiler is available
if !haskey(Pkg.project().dependencies, "PackageCompiler")
    println("Installing PackageCompiler...")
    Pkg.add("PackageCompiler")
end

using PackageCompiler

const SCRIPT_DIR = @__DIR__

# Platform-appropriate sysimage extension
const SYSIMAGE_EXT = if Sys.iswindows()
    "dll"
elseif Sys.isapple()
    "dylib"
else
    "so"
end

const SYSIMAGE_PATH = joinpath(SCRIPT_DIR, "earth4all_sysimage.$SYSIMAGE_EXT")

# Packages to bake into the sysimage
const PACKAGES = [
    :ModelingToolkit,
    :DifferentialEquations,
    :WorldDynamics,
    :JSON,
    :IfElse,
    :PlotlyJS,
]

# Write a temporary precompile execution script.
# PackageCompiler runs this during the build to capture compilation traces,
# so that commonly-used code paths are compiled into the sysimage.
const PRECOMPILE_SCRIPT = joinpath(SCRIPT_DIR, "_precompile_exec.jl")

open(PRECOMPILE_SCRIPT, "w") do f
    write(f, """
    # Auto-generated precompile execution script — do not edit
    using ModelingToolkit
    using DifferentialEquations
    using WorldDynamics
    using JSON
    using IfElse
    using PlotlyJS

    # Exercise JSON round-trip (common hot path in worker protocol)
    let d = Dict("command" => "ping", "value" => 42.0)
        s = JSON.json(d)
        JSON.parse(s)
    end
    """)
end

println("Building sysimage with packages: $(join(string.(PACKAGES), ", "))")
println("Output: $SYSIMAGE_PATH")
println("This will take several minutes...")
println()

try
    create_sysimage(
        PACKAGES;
        sysimage_path=SYSIMAGE_PATH,
        precompile_execution_file=PRECOMPILE_SCRIPT,
    )
    println()
    println("Sysimage built successfully: $SYSIMAGE_PATH")
    println("Size: $(round(filesize(SYSIMAGE_PATH) / 1024 / 1024; digits=1)) MB")
finally
    # Clean up temporary precompile script
    rm(PRECOMPILE_SCRIPT; force=true)
end
