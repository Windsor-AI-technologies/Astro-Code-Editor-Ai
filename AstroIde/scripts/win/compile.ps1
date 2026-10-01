    $scriptDir = Split-Path -Parent $PSScriptRoot
    Push-Location $scriptDir
    try {
        npx tsc --noEmit
    } finally {
        Pop-Location
    }