using XLSX
using ZipArchives: ZipReader, ZipWriter, zip_names, zip_readentry, zip_newfile

"""
    export_excel(sol; filename="earth4all_results.xlsx", open_file=true)

Export all simulation variables to an Excel (.xlsx) file.

The spreadsheet uses a transposed layout:
- **Column A:** Full namespaced variable name (e.g., `pop₊POP`)
- **Column B:** Short variable code (e.g., `POP`)
- **Columns C onward:** One column per time point
- **Row 1:** Headers with time values
- **Rows 2+:** One row per variable, sorted alphabetically

An auto-filter is applied to the header row for easy searching and filtering.

# Keyword arguments
- `filename`: output file path (default `"earth4all_results.xlsx"`)
- `open_file`: whether to open the file in Excel after export (default `true`)

# Returns
The absolute path to the created Excel file.

# Example
```julia
sol = Earth4All.run_tltl_solution()
Earth4All.export_excel(sol)                          # export and open
Earth4All.export_excel(sol; open_file=false)          # export only
Earth4All.export_excel(sol; filename="my_results.xlsx") # custom filename
```
"""
function export_excel(sol; filename::String="earth4all_results.xlsx", open_file::Bool=true)
    filepath = abspath(filename)
    vars = variable_list(sol)
    times = sol.t

    XLSX.openxlsx(filepath, mode="w") do xf
        sheet = xf[1]
        XLSX.rename!(sheet, "Results")

        # Row 1: headers — Variable | Code | t1 | t2 | ... | tN
        sheet["A1"] = Any["Variable", "Code", times...]

        # Rows 2+: one row per variable
        for (i, (name, _desc)) in enumerate(vars)
            short = contains(name, "₊") ? split(name, "₊"; limit=2)[2] : name
            ts = get_timeseries(sol, name)
            sheet["A$(i + 1)"] = Any[name, short, ts.values...]
        end
    end

    # Apply auto-filter on the header row
    _apply_autofilter(filepath, length(vars) + 1, length(times) + 2)

    if open_file
        _open_file(filepath)
    end

    return filepath
end

# ── Internal helpers ──────────────────────────────────────────────

"""Convert a 1-based column number to an Excel column letter (1→A, 27→AA, etc.)."""
function _col_letter(n::Int)
    result = ""
    while n > 0
        n, r = divrem(n - 1, 26)
        result = string(Char('A' + r)) * result
    end
    return result
end

"""
Inject an `<autoFilter>` element into the worksheet XML inside the .xlsx file.
XLSX.jl does not support auto-filter natively, so we post-process the ZIP/XML.
Fails silently with a warning if anything goes wrong.
"""
function _apply_autofilter(filepath::String, nrows::Int, ncols::Int)
    try
        data = read(filepath)
        reader = ZipReader(data)

        tmppath = filepath * ".tmp"
        ZipWriter(tmppath) do writer
            for entry_name in zip_names(reader)
                content = zip_readentry(reader, entry_name)
                if entry_name == "xl/worksheets/sheet1.xml"
                    xml_str = String(content)
                    ref = "A1:$(_col_letter(ncols))$(nrows)"
                    xml_str = replace(xml_str,
                        "</sheetData>" => "</sheetData><autoFilter ref=\"$(ref)\"/>")
                    content = Vector{UInt8}(xml_str)
                end
                zip_newfile(writer, entry_name)
                write(writer, content)
            end
        end

        mv(tmppath, filepath, force=true)
    catch e
        @warn "Could not apply auto-filter to Excel file" exception = e
    end
end

"""
Open a file with the system's default application.
On Windows this reuses an existing Excel instance via the shell `start` command.
"""
function _open_file(filepath::String)
    try
        if Sys.iswindows()
            run(`cmd /c start "" $filepath`)
        elseif Sys.isapple()
            run(`open $filepath`)
        else
            run(`xdg-open $filepath`)
        end
    catch e
        @warn "Could not open file in default application" exception = e
    end
end
