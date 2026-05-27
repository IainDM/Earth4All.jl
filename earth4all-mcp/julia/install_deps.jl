# Install Julia dependencies needed for Earth4All.jl
# Run: julia install_deps.jl

using Pkg

println("Installing Earth4All.jl dependencies...")

# Core dependencies
Pkg.add([
    "ModelingToolkit",
    "DifferentialEquations",
    "WorldDynamics",
    "JSON",
    "IfElse",
    "PlotlyJS",
    "XLSX",
    "ZipArchives",
    "PackageCompiler",
])

println("Dependencies installed successfully.")
println()
println("The Earth4All.jl model source is colocated at ../src relative to this script.")
println("No clone is required. To override the source path, set:")
println("  export EARTH4ALL_SRC=/path/to/alternate/src")
println()
println("To speed up Julia startup, build a custom sysimage:")
println("  julia julia/build_sysimage.jl")
