$ErrorActionPreference = "Stop"
$root = [System.IO.Path]::GetFullPath($PSScriptRoot)
$rootPrefix = $root.TrimEnd([System.IO.Path]::DirectorySeparatorChar) + [System.IO.Path]::DirectorySeparatorChar
$listener = [System.Net.Sockets.TcpListener]::new([System.Net.IPAddress]::Loopback, 8765)

function Send-Response($stream, [int]$status, [string]$contentType, [byte[]]$body, [bool]$headOnly) {
    $reason = switch ($status) {
        200 { "OK" }
        403 { "Forbidden" }
        404 { "Not Found" }
        405 { "Method Not Allowed" }
        default { "Internal Server Error" }
    }
    $header = "HTTP/1.1 $status $reason`r`nContent-Type: $contentType`r`nContent-Length: $($body.Length)`r`nCache-Control: no-store`r`nConnection: close`r`nX-Content-Type-Options: nosniff`r`n`r`n"
    $headerBytes = [System.Text.Encoding]::ASCII.GetBytes($header)
    $stream.Write($headerBytes, 0, $headerBytes.Length)
    if (-not $headOnly -and $body.Length -gt 0) {
        $stream.Write($body, 0, $body.Length)
    }
}

try {
    $listener.Start()
} catch {
    Write-Host "Could not start the offline server. Port 8765 may already be in use."
    exit 1
}

$url = "http://127.0.0.1:8765/"
Write-Host "Offline guide is running at $url"
Write-Host "Close this window to stop the local server."
$chromePaths = @()
if ($env:ProgramFiles) { $chromePaths += (Join-Path $env:ProgramFiles "Google\Chrome\Application\chrome.exe") }
if (${env:ProgramFiles(x86)}) { $chromePaths += (Join-Path ${env:ProgramFiles(x86)} "Google\Chrome\Application\chrome.exe") }
if ($env:LOCALAPPDATA) { $chromePaths += (Join-Path $env:LOCALAPPDATA "Google\Chrome\Application\chrome.exe") }
$chromePath = $chromePaths | Where-Object { Test-Path -LiteralPath $_ } | Select-Object -First 1
if ($chromePath) {
    Start-Process -FilePath $chromePath -ArgumentList $url
} else {
    Start-Process $url
}

try {
    while ($true) {
        $client = $listener.AcceptTcpClient()
        try {
            $stream = $client.GetStream()
            $reader = [System.IO.StreamReader]::new($stream, [System.Text.Encoding]::ASCII)
            $requestLine = $reader.ReadLine()
            if (-not $requestLine) {
                $client.Close()
                continue
            }

            $parts = $requestLine.Split(" ")
            $method = $parts[0]
            $requestedPath = [Uri]::UnescapeDataString(($parts[1] -split "\?")[0]).TrimStart("/")
            while ($null -ne ($headerLine = $reader.ReadLine()) -and $headerLine.Length -gt 0) { }

            if ($method -notin @("GET", "HEAD")) {
                Send-Response $stream 405 "text/plain; charset=utf-8" ([byte[]]@()) ($method -eq "HEAD")
                continue
            }
            if ([string]::IsNullOrWhiteSpace($requestedPath)) { $requestedPath = "index.html" }

            $filePath = [System.IO.Path]::GetFullPath((Join-Path $root $requestedPath))
            if (-not $filePath.StartsWith($rootPrefix, [System.StringComparison]::OrdinalIgnoreCase)) {
                Send-Response $stream 403 "text/plain; charset=utf-8" ([byte[]]@()) ($method -eq "HEAD")
                continue
            }
            if (-not (Test-Path -LiteralPath $filePath -PathType Leaf)) {
                Send-Response $stream 404 "text/plain; charset=utf-8" ([byte[]]@()) ($method -eq "HEAD")
                continue
            }

            $contentType = switch ([System.IO.Path]::GetExtension($filePath).ToLowerInvariant()) {
                ".html" { "text/html; charset=utf-8" }
                ".css" { "text/css; charset=utf-8" }
                ".js" { "text/javascript; charset=utf-8" }
                ".svg" { "image/svg+xml; charset=utf-8" }
                ".png" { "image/png" }
                default { "application/octet-stream" }
            }
            $body = [System.IO.File]::ReadAllBytes($filePath)
            Send-Response $stream 200 $contentType $body ($method -eq "HEAD")
        } catch {
            try { Send-Response $stream 500 "text/plain; charset=utf-8" ([byte[]]@()) $false } catch { }
        } finally {
            $client.Close()
        }
    }
} finally {
    $listener.Stop()
}
