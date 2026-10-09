# Walkie-Talkie — установщик для Windows.
# Скачивает движок Electron с официального GitHub (или зеркала npmmirror, если GitHub не открывается),
# проверяет контрольную сумму, ставит программу в %LOCALAPPDATA%\Racia, делает ярлыки и запускает.
# Права администратора не нужны.
$ErrorActionPreference = 'Stop'
$ProgressPreference = 'SilentlyContinue'
try { [Console]::OutputEncoding = [Text.Encoding]::UTF8 } catch {}
try { [Net.ServicePointManager]::SecurityProtocol = [Net.ServicePointManager]::SecurityProtocol -bor [Net.SecurityProtocolType]::Tls12 } catch {}

$Ver      = '44.7.0'
$AppVer   = '?'
$ZipName  = "electron-v$Ver-win32-x64.zip"
$Sources  = @(
  @{ Name = 'GitHub';    Base = "https://github.com/electron/electron/releases/download/v$Ver/" },
  @{ Name = 'npmmirror'; Base = "https://npmmirror.com/mirrors/electron/$Ver/" }
)
$Here     = Split-Path -Parent $MyInvocation.MyCommand.Path
$Dest     = Join-Path $env:LOCALAPPDATA 'Racia'
$Engine   = Join-Path $Dest 'engine'
$Exe      = Join-Path $Engine 'WalkieTalkie.exe'
$OldExe   = Join-Path $Engine 'Racia.exe'
$AppDir   = Join-Path $Engine 'resources\app'
$VerFile  = Join-Path $Engine 'racia-engine.txt'

function Say($text, $color = 'Gray') { Write-Host $text -ForegroundColor $color }

function Get-File($url, $path) {
  $req = [Net.HttpWebRequest]::Create($url)
  $req.UserAgent = 'Racia-Installer'
  $req.Timeout = 30000
  $req.ReadWriteTimeout = 60000
  $resp = $req.GetResponse()
  try {
    $total = $resp.ContentLength
    $in = $resp.GetResponseStream()
    $out = [IO.File]::Create($path)
    try {
      $buf = New-Object byte[] 262144
      $done = 0; $last = -1
      while (($n = $in.Read($buf, 0, $buf.Length)) -gt 0) {
        $out.Write($buf, 0, $n)
        $done += $n
        if ($total -gt 0) {
          $pct = [int][Math]::Floor(100 * $done / $total)
          if ($pct -ne $last) {
            Write-Host -NoNewline ("`r   скачано {0}%  ({1} из {2} МБ)   " -f $pct, [int]($done / 1MB), [int]($total / 1MB))
            $last = $pct
          }
        }
      }
      Write-Host ''
    } finally { $out.Close(); $in.Close() }
  } finally { $resp.Close() }
}

function Get-Text($url) {
  $wc = New-Object Net.WebClient
  $wc.Headers.Add('User-Agent', 'Racia-Installer')
  return $wc.DownloadString($url)
}

try {
  try { $AppVer = [string]((Get-Content (Join-Path $Here 'app\version.json') -Raw | ConvertFrom-Json).version) } catch {}
  Say ''
  Say ("  WALKIE-TALKIE — установка (версия " + $AppVer + ")") 'Yellow'
  Say ''

  if (-not [Environment]::Is64BitOperatingSystem) { throw 'Для Walkie-Talkie нужна 64-битная Windows 10 или 11.' }
  if (-not (Test-Path (Join-Path $Here 'app\main.js'))) { throw 'Рядом с установщиком нет папки app. Распакуй архив целиком и запусти install.bat из распакованной папки.' }

  # Файлы из скачанного архива Windows помечает как «из интернета» — снимаем пометку.
  Get-ChildItem -Path $Here -Recurse -File | Unblock-File -ErrorAction SilentlyContinue

  # Закрыть программу, если она открыта.
  $running = Get-Process -Name 'WalkieTalkie', 'Racia' -ErrorAction SilentlyContinue
  if ($running) {
    Say '  Закрываю открытый Walkie-Talkie…'
    $running | Stop-Process -Force
    Start-Sleep -Seconds 2
  }
  Get-Process -Name 'RaciaKeys' -ErrorAction SilentlyContinue | Stop-Process -Force -ErrorAction SilentlyContinue

  New-Item -ItemType Directory -Force -Path $Dest | Out-Null

  # Старое название программы (Рация) — переименовываем, качать заново не нужно.
  if ((Test-Path $OldExe) -and -not (Test-Path $Exe)) { Rename-Item $OldExe 'WalkieTalkie.exe' }

  # 1. Движок (Electron). Если нужная версия уже стоит, второй раз не качаем.
  $haveEngine = (Test-Path $Exe) -and (Test-Path $VerFile) -and ((Get-Content $VerFile -Raw).Trim() -eq $Ver)
  if ($haveEngine) {
    Say "  [1/4] Движок уже установлен (Electron $Ver)." 'Green'
  } else {
    Say "  [1/4] Скачиваю движок программы (Electron $Ver, около 115 МБ)…"
    $zip = Join-Path $env:TEMP "racia-$ZipName"
    $ok = $false
    $lastError = ''
    foreach ($src in $Sources) {
      try {
        Say "        откуда: $($src.Name)"
        $sums = Get-Text ($src.Base + 'SHASUMS256.txt')
        $line = ($sums -split "`n") | Where-Object { $_ -match ([regex]::Escape($ZipName) + '\s*$') } | Select-Object -First 1
        if (-not $line) { throw 'нет контрольной суммы' }
        $want = ($line.Trim() -split '\s+')[0].ToLower()
        if (-not ((Test-Path $zip) -and ((Get-FileHash $zip -Algorithm SHA256).Hash.ToLower() -eq $want))) {
          Get-File ($src.Base + $ZipName) $zip
        }
        $got = (Get-FileHash $zip -Algorithm SHA256).Hash.ToLower()
        if ($got -ne $want) { Remove-Item $zip -Force -ErrorAction SilentlyContinue; throw 'файл скачался с ошибкой (контрольная сумма не совпала)' }
        Say '        контрольная сумма совпала' 'Green'
        $ok = $true
        break
      } catch {
        $lastError = $_.Exception.Message
        Say "        не получилось: $lastError" 'DarkYellow'
      }
    }
    if (-not $ok) { throw "Не удалось скачать движок. Проверь интернет (или включи VPN) и запусти установку ещё раз. Ошибка: $lastError" }

    Say '        распаковываю…'
    $tmp = Join-Path $Dest 'engine-new'
    if (Test-Path $tmp) { Remove-Item $tmp -Recurse -Force }
    Add-Type -AssemblyName System.IO.Compression.FileSystem
    [IO.Compression.ZipFile]::ExtractToDirectory($zip, $tmp)
    Rename-Item (Join-Path $tmp 'electron.exe') 'WalkieTalkie.exe'
    Remove-Item (Join-Path $tmp 'resources\default_app.asar') -Force -ErrorAction SilentlyContinue
    Set-Content -Path (Join-Path $tmp 'racia-engine.txt') -Value $Ver -Encoding ASCII
    if (Test-Path $Engine) { Remove-Item $Engine -Recurse -Force }
    Rename-Item $tmp 'engine'
    Remove-Item $zip -Force -ErrorAction SilentlyContinue
  }

  # 2. Сама программа.
  Say '  [2/4] Копирую Walkie-Talkie…'
  if (Test-Path $AppDir) { Remove-Item $AppDir -Recurse -Force }
  Copy-Item -Path (Join-Path $Here 'app') -Destination $AppDir -Recurse -Force
  Copy-Item -Path (Join-Path $Here 'uninstall.ps1') -Destination (Join-Path $Dest 'uninstall.ps1') -Force

  # 3. Помощник для клавиш поверх игр — собирается встроенным в Windows компилятором.
  Say '  [3/4] Собираю помощника для клавиш поверх игр…'
  $csc = @(
    (Join-Path $env:WINDIR 'Microsoft.NET\Framework64\v4.0.30319\csc.exe'),
    (Join-Path $env:WINDIR 'Microsoft.NET\Framework\v4.0.30319\csc.exe')
  ) | Where-Object { Test-Path $_ } | Select-Object -First 1
  $keysExe = Join-Path $AppDir 'RaciaKeys.exe'
  if ($csc) {
    $ErrorActionPreference = 'Continue'
    $log = (& $csc /nologo /optimize+ /target:exe "/out:$keysExe" (Join-Path $AppDir 'RaciaKeys.cs') 2>&1 | Out-String).Trim()
    $ErrorActionPreference = 'Stop'
    if ($LASTEXITCODE -eq 0 -and (Test-Path $keysExe)) { Say '        готово' 'Green' }
    else { Say "        не собрался — клавиши будут работать только в окне Walkie-Talkie. $log" 'DarkYellow' }
  } else {
    Say '        в Windows нет компилятора .NET — клавиши будут работать только в окне Walkie-Talkie.' 'DarkYellow'
  }

  # 4. Ярлыки и пункт в «Установленных приложениях».
  Say '  [4/4] Делаю ярлыки…'
  $icon = Join-Path $AppDir 'wt.ico'
  if (-not (Test-Path $icon)) { $icon = Join-Path $AppDir 'racia.ico' }
  $shell = New-Object -ComObject WScript.Shell
  foreach ($dir in @([Environment]::GetFolderPath('Desktop'), [Environment]::GetFolderPath('Programs'))) {
    if (-not $dir) { continue }
    Remove-Item (Join-Path $dir 'Рация.lnk') -Force -ErrorAction SilentlyContinue
    $lnk = $shell.CreateShortcut((Join-Path $dir 'Walkie-Talkie.lnk'))
    $lnk.TargetPath = $Exe
    $lnk.WorkingDirectory = $Engine
    $lnk.IconLocation = "$icon,0"
    $lnk.Description = 'Walkie-Talkie — голосовые звонки с друзьями'
    $lnk.Save()
  }
  $key = 'HKCU:\Software\Microsoft\Windows\CurrentVersion\Uninstall\Racia'
  New-Item -Path $key -Force | Out-Null
  $uninstall = 'powershell.exe -NoProfile -ExecutionPolicy Bypass -File "' + (Join-Path $Dest 'uninstall.ps1') + '"'
  Set-ItemProperty -Path $key -Name DisplayName -Value 'Walkie-Talkie'
  Set-ItemProperty -Path $key -Name DisplayVersion -Value $AppVer
  Set-ItemProperty -Path $key -Name Publisher -Value 'ICEING'
  Set-ItemProperty -Path $key -Name DisplayIcon -Value $icon
  Set-ItemProperty -Path $key -Name InstallLocation -Value $Dest
  Set-ItemProperty -Path $key -Name UninstallString -Value $uninstall
  Set-ItemProperty -Path $key -Name NoModify -Value 1 -Type DWord
  Set-ItemProperty -Path $key -Name NoRepair -Value 1 -Type DWord

  Say ''
  Say '  Готово! Walkie-Talkie запускается. Ярлык «Walkie-Talkie» — на рабочем столе и в меню Пуск.' 'Green'
  Say '  Если Windows спросит про доступ к сети — нажми «Разрешить», иначе звонки могут не соединяться.'
  Start-Process -FilePath $Exe -WorkingDirectory $Engine
  Start-Sleep -Seconds 6
  exit 0
} catch {
  Say ''
  Say ('  Ошибка: ' + $_.Exception.Message) 'Red'
  Say '  Сделай скриншот этого окна и пришли его.' 'Red'
  exit 1
}
