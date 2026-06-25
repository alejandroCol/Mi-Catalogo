$ErrorActionPreference = 'SilentlyContinue'
Get-Printer | Select-Object -ExpandProperty Name | ForEach-Object { $_.Trim() } | Where-Object { $_ }
