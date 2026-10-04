param(
	[int]$Port = 5173
)

$root = Split-Path -Parent $PSScriptRoot
Set-Location $root

# free the port if something is already listening on it
$listeners = Get-NetTCPConnection -LocalPort $Port -State Listen -ErrorAction SilentlyContinue
if ($listeners) {
	$listeners | ForEach-Object { Stop-Process -Id $_.OwningProcess -Force -ErrorAction SilentlyContinue }
	Start-Sleep -Milliseconds 500
}

$log = Join-Path $root "dev.log"
$err = Join-Path $root "dev-err.log"
$vite = Join-Path $root "node_modules" "vite" "bin" "vite.js"

# NOTE: Start-Process -RedirectStandardOutput/ -RedirectStandardError keep the caller's
# pipes open for the lifetime of the child, so let cmd do the redirection instead.
$cmdLine = "node `"$vite`" --port $Port --strictPort > `"$log`" 2> `"$err`""
Start-Process -FilePath "cmd.exe" -ArgumentList "/c $cmdLine" -WindowStyle Hidden -WorkingDirectory $root

# wait until the port is listening (vite may bind ::1 only, so don't probe 127.0.0.1 with a
# synchronous socket connect - that hangs for ~21s per attempt on this box)
$ready = $false
for ($i = 0; $i -lt 50; $i++) {
	Start-Sleep -Milliseconds 200
	if (Get-NetTCPConnection -LocalPort $Port -State Listen -ErrorAction SilentlyContinue) {
		$ready = $true
		break
	}
}

if ($ready) {
	Write-Host "vite running at http://localhost:$Port (logs: dev.log / dev-err.log)"
} else {
	Write-Host "vite did not start; last errors:" -ForegroundColor Red
	Get-Content $err -Tail 20 -ErrorAction SilentlyContinue
	exit 1
}
