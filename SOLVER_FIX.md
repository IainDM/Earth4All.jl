# Earth4All.jl Solver Compatibility Fix

## Problem

Earth4All.jl uses `solver=Euler()` in all solve calls (`src/earth4all/solutions.jl`). With newer versions of ModelingToolkit and DifferentialEquations, the model's structural transformation produces a DAE (differential-algebraic equation) system with mass matrices. Two issues arise:

1. **Euler can't handle mass matrices** — every simulation fails with:
   > This solver is not able to use mass matrices.

2. **Initialization system is overdetermined** — newer ModelingToolkit generates 52 initialization equations for 5 unknowns. Solvers like Rodas5 attempt to solve this initialization system and fail with `retcode: InitialFailure`, producing a solution with only the initial time point (t=1980).

## Fix

Replace `Euler()` with `Rodas5()` and add `initializealg=NoInit()` in `src/earth4all/solutions.jl`:

```julia
# Before (broken with newer ModelingToolkit)
solver=Euler(), dt=0.015625, dtmax=0.015625

# After (works with mass matrices, skips broken initialization)
solver=Rodas5(), initializealg=NoInit()
```

All three functions need updating: `run_tltl_solution`, `run_gl_solution`, `run_e4a_solution`.

The `dt=0.015625, dtmax=0.015625` parameters should also be removed — they were tuned for Euler's fixed-step method and are unnecessary for Rodas5's adaptive stepping.

### Why Rodas5?

- WorldDynamics itself defaults to `AutoVern9(Rodas5())` in its own `solve` function
- Rodas5 is a Rosenbrock method that natively handles mass matrices / DAE systems
- It's recommended in the DifferentialEquations.jl documentation for stiff DAE problems

### Why NoInit()?

- Euler bypassed the initialization system entirely (it just uses initial conditions directly)
- Rodas5 attempts to solve the initialization system, which is overdetermined and fails
- `initializealg=NoInit()` tells the solver to skip initialization and use the provided initial conditions, replicating Euler's behavior
- Without this, the solution has `retcode: InitialFailure` and only contains t=1980

## Trade-offs

- Euler is a fixed-step explicit method (very fast, ~0s solve time)
- Rodas5 is an implicit method (~113s first run due to JIT compilation, faster on subsequent runs on the same worker)
- First-run compilation overhead can be mitigated by baking Rodas5 code paths into a custom sysimage via PackageCompiler.jl

## Verified output (TLTL baseline, default parameters)

```
year=2025  pop=7980M  warming=1.40°C  gdp=$16.3k/p  wellbeing=0.975
year=2050  pop=8772M  warming=1.84°C  gdp=$23.1k/p  wellbeing=0.781
year=2075  pop=8437M  warming=2.15°C  gdp=$33.4k/p  wellbeing=0.662
year=2100  pop=7277M  warming=2.35°C  gdp=$46.0k/p  wellbeing=0.685
```

90 time points from 1980 to 2100. Population peaks mid-century then declines.

## Affected versions

- **Works:** ModelingToolkit < ~9.x with DifferentialEquations < ~7.x (older versions that don't generate mass matrices)
- **Broken:** ModelingToolkit ~9.x+ with DifferentialEquations ~7.x+ (current versions as of Feb 2026)

## Upstream

This should ideally be fixed in the upstream Earth4All.jl repository: https://github.com/worlddynamics/Earth4All.jl
