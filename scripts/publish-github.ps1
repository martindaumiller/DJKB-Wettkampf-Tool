$ErrorActionPreference = 'Stop'
Set-Location (Split-Path $PSScriptRoot -Parent)
$repositoryName = 'martindaumiller/DJKB-Wettkampf-Tool'
if (-not (Get-Command gh -ErrorAction SilentlyContinue)) { throw 'GitHub CLI fehlt. Offizielle GitHub CLI installieren und gh auth login ausführen.' }
gh auth status
if ($LASTEXITCODE -ne 0) { throw 'GitHub-Anmeldung erforderlich.' }
if (-not (Test-Path -LiteralPath '.git')) {
  git init --initial-branch=main
  git add -A
  git -c user.name='Martin Daumiller' -c user.email='118655145+martindaumiller@users.noreply.github.com' commit -m 'Prepare local DJKB tournament tool and public demo'
  if ($LASTEXITCODE -ne 0) { throw 'Initialer Commit fehlgeschlagen.' }
}
$workingChanges = git status --porcelain
if ($workingChanges) { throw 'Uncommittete Änderungen zuerst prüfen und committen.' }
$existingRepository = gh repo view $repositoryName --json name 2>$null
if ($LASTEXITCODE -eq 0) { throw 'Repository existiert bereits. Kein vorhandenes Repository wird überschrieben.' }
gh repo create $repositoryName --public --source . --remote origin --push --description 'Lokales DJKB Wettkampf Tool: Kata, Kumite, Tische, Hallenanzeigen und Streamgrafiken. Betrieb im Hallennetz ohne Internetabhängigkeit.'
if ($LASTEXITCODE -ne 0) { throw 'GitHub-Veröffentlichung fehlgeschlagen. Vor erneutem Aufruf Repositoryzustand prüfen.' }
gh repo view $repositoryName --json url
