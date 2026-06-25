param(
  [Parameter(Mandatory=$true)]
  [string]$PrinterName,
  [Parameter(Mandatory=$true)]
  [string]$FilePath
)

$ErrorActionPreference = 'Stop'

function Get-PrinterNames {
  @(Get-Printer -ErrorAction SilentlyContinue | Select-Object -ExpandProperty Name)
}

function Resolve-PrinterName([string]$Requested) {
  $all = Get-PrinterNames
  if ($all.Count -eq 0) { return $null }

  if ($all -contains $Requested) { return $Requested }

  foreach ($p in $all) {
    if ($p -ieq $Requested) { return $p }
  }

  $tokens = @('jal', '58', 'pos', 'term', 'ticket', 'tm-', 'epson')
  $matches = @()
  foreach ($p in $all) {
    $lower = $p.ToLowerInvariant()
    foreach ($t in $tokens) {
      if ($lower.Contains($t)) {
        $matches += $p
        break
      }
    }
  }
  $matches = @($matches | Select-Object -Unique)
  if ($matches.Count -eq 1) { return $matches[0] }

  return $null
}

$resolved = Resolve-PrinterName $PrinterName
if (-not $resolved) {
  $list = (Get-PrinterNames) -join ' | '
  if (-not $list) { $list = '(ninguna detectada — revisa driver USB)' }
  throw "MORNING_PRINTER_NOT_FOUND|$PrinterName|$list"
}

$bytes = [System.IO.File]::ReadAllBytes($FilePath)

Add-Type -TypeDefinition @"
using System;
using System.Runtime.InteropServices;
public class MorningRawPrinter {
  [StructLayout(LayoutKind.Sequential, CharSet=CharSet.Unicode)]
  public class DOCINFO {
    public string pDocName;
    public string pOutputFile;
    public string pDataType;
  }
  [DllImport("winspool.drv", CharSet=CharSet.Unicode, SetLastError=true)]
  public static extern bool OpenPrinter(string pPrinterName, out IntPtr phPrinter, IntPtr pDefault);
  [DllImport("winspool.drv", SetLastError=true)]
  public static extern bool ClosePrinter(IntPtr hPrinter);
  [DllImport("winspool.drv", CharSet=CharSet.Unicode, SetLastError=true)]
  public static extern bool StartDocPrinter(IntPtr hPrinter, int Level, [In] DOCINFO di);
  [DllImport("winspool.drv", SetLastError=true)]
  public static extern bool EndDocPrinter(IntPtr hPrinter);
  [DllImport("winspool.drv", SetLastError=true)]
  public static extern bool StartPagePrinter(IntPtr hPrinter);
  [DllImport("winspool.drv", SetLastError=true)]
  public static extern bool EndPagePrinter(IntPtr hPrinter);
  [DllImport("winspool.drv", SetLastError=true)]
  public static extern bool WritePrinter(IntPtr hPrinter, byte[] pBytes, int dwCount, out int dwWritten);
  public static bool Send(string printer, byte[] bytes) {
    IntPtr h;
    if (!OpenPrinter(printer, out h, IntPtr.Zero)) return false;
    try {
      var di = new DOCINFO { pDocName = "Morning POS", pDataType = "RAW" };
      if (!StartDocPrinter(h, 1, di)) return false;
      try {
        StartPagePrinter(h);
        int written;
        WritePrinter(h, bytes, bytes.Length, out written);
        EndPagePrinter(h);
      } finally {
        EndDocPrinter(h);
      }
      return true;
    } finally {
      ClosePrinter(h);
    }
  }
}
"@ -ErrorAction Stop

if (-not [MorningRawPrinter]::Send($resolved, $bytes)) {
  $list = (Get-PrinterNames) -join ' | '
  throw "MORNING_PRINT_FAILED|$resolved|$list"
}

Write-Output "OK|$resolved"
