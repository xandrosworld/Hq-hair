$ErrorActionPreference = 'Stop'
$projectRoot = Split-Path -Parent $PSScriptRoot
$pythonExe = (& python -c 'import sys; print(sys.executable)').Trim()
$pythonWindowless = Join-Path (Split-Path -Parent $pythonExe) 'pythonw.exe'
if (-not (Test-Path -LiteralPath $pythonWindowless)) { throw 'pythonw.exe is required for a hidden backup task.' }
$backupScript = Join-Path $PSScriptRoot 'vps-backup.py'
$backupFolder = Join-Path $projectRoot 'data\offsite-backups'
New-Item -ItemType Directory -Path $backupFolder -Force | Out-Null
$identity = [System.Security.Principal.WindowsIdentity]::GetCurrent()
$taskSid = $identity.User.Value
& icacls.exe $backupFolder /inheritance:r /grant:r "*${taskSid}:(OI)(CI)F" '*S-1-5-18:(OI)(CI)F' | Out-Null
if ($LASTEXITCODE -ne 0) { throw 'Cannot restrict backup directory access.' }
$action = New-ScheduledTaskAction -Execute $pythonWindowless -Argument ('-X utf8 "' + $backupScript + '"') -WorkingDirectory $projectRoot
$triggers = @((New-ScheduledTaskTrigger -Daily -At '09:30'), (New-ScheduledTaskTrigger -AtLogOn -User $identity.Name))
$settings = New-ScheduledTaskSettingsSet -StartWhenAvailable -ExecutionTimeLimit (New-TimeSpan -Minutes 20) -MultipleInstances IgnoreNew -RestartCount 2 -RestartInterval (New-TimeSpan -Minutes 15) -AllowStartIfOnBatteries -DontStopIfGoingOnBatteries
$principal = New-ScheduledTaskPrincipal -UserId $identity.Name -LogonType Interactive -RunLevel Limited
Register-ScheduledTask -TaskName 'HQHair-OutsideVPS-Backup' -Action $action -Trigger $triggers -Settings $settings -Principal $principal -Description 'Copy verified HQ Hair snapshots outside VPS to this operator PC. Requires logged-in user, network, repository and .env.' -Force | Select-Object TaskName,State
