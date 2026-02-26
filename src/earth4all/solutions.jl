using ModelingToolkit
using DifferentialEquations

# Use Rodas5 instead of Euler — newer ModelingToolkit generates DAE systems
# with mass matrices, which Euler cannot handle. Rodas5 is the solver
# recommended by WorldDynamics and handles mass matrices natively.
#
# initializealg=NoInit() is needed because the newer ModelingToolkit generates
# an overdetermined initialization system (52 equations for 5 unknowns) that
# fails to solve. Euler bypassed initialization entirely; NoInit() replicates
# that behavior while using a proper DAE-capable solver.

function run_tltl_solution(; excel::Bool=false, excel_filename::String="earth4all_tltl.xlsx", excel_open::Bool=true)
    sol = WorldDynamics.solve(run_tltl(), (1980, 2100), solver=Rodas5(), initializealg=NoInit())
    if excel
        export_excel(sol; filename=excel_filename, open_file=excel_open)
    end
    return sol
end

function run_gl_solution(; excel::Bool=false, excel_filename::String="earth4all_gl.xlsx", excel_open::Bool=true)
    sol = WorldDynamics.solve(run_gl(), (1980, 2100), solver=Rodas5(), initializealg=NoInit())
    if excel
        export_excel(sol; filename=excel_filename, open_file=excel_open)
    end
    return sol
end

function run_e4a_solution(; excel::Bool=false, excel_filename::String="earth4all_results.xlsx", excel_open::Bool=true, kwargs...)
    sol = WorldDynamics.solve(run_e4a(; kwargs...), (1980, 2100), solver=Rodas5(), initializealg=NoInit())
    if excel
        export_excel(sol; filename=excel_filename, open_file=excel_open)
    end
    return sol
end
