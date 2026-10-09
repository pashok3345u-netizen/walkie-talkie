# Walkie-Talkie — удаление.
$ErrorActionPreference = 'SilentlyContinue'
try { [Console]::OutputEncoding = [Text.Encoding]::UTF8 } catch {}
$Dest = Join-Path $env:LOCALAPPDATA 'Racia'
Write-Host ''
Write-Host '  Удаляю Walkie-Talkie…' -ForegroundColor Yellow
Get-Process -Name 'WalkieTalkie', 'Racia' | Stop-Process -Force
Get-Process -Name 'RaciaKeys' | Stop-Process -Force
Start-Sleep -Seconds 2
foreach ($dir in @([Environment]::GetFolderPath('Desktop'), [Environment]::GetFolderPath('Programs'))) {
  if ($dir) { Remove-Item (Join-Path $dir 'Walkie-Talkie.lnk') -Force; Remove-Item (Join-Path $dir 'Рация.lnk') -Force }
}
Remove-Item 'HKCU:\Software\Microsoft\Windows\CurrentVersion\Uninstall\Racia' -Recurse -Force
Remove-Item $Dest -Recurse -Force
# Настройки (имя, клавиши, громкости)
Remove-Item (Join-Path $env:APPDATA 'Racia') -Recurse -Force
Write-Host '  Walkie-Talkie удалён.' -ForegroundColor Green
Start-Sleep -Seconds 3
