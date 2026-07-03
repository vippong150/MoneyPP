$verPath = "F:\PONMONEY\WebServer\version.json"
$v = Get-Content $verPath -Raw | ConvertFrom-Json
$v.version = [int]$v.version + 1
$v | ConvertTo-Json -Compress | Set-Content $verPath -NoNewline

Set-Location "F:\PONMONEY\WebServer"
git add deploy.ps1 version.json index.html public/
git commit -m "deploy v$($v.version)"
git push
Write-Host "✅ Deployed v$($v.version)"
Write-Host "🌍 https://vippong150.github.io/MoneyPP/"
