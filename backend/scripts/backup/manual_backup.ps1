# ============================================================
# LocalReview — Manual Cassandra Backup (nodetool snapshot)
# ============================================================
# Creates a point-in-time snapshot on both Cassandra nodes.
# Run this script from the project root.
#
# Usage:
#   .\backend\scripts\backup\manual_backup.ps1
#   .\backend\scripts\backup\manual_backup.ps1 -tag "before_migration"

param(
    [string]$tag = (Get-Date -Format "yyyyMMdd_HHmmss")
)

$KEYSPACE = "localreview"

Write-Host ""
Write-Host "=== LocalReview Cassandra Manual Backup ===" -ForegroundColor Cyan
Write-Host "Snapshot tag : $tag"
Write-Host "Keyspace     : $KEYSPACE"
Write-Host ""

# ── Node 1 ──────────────────────────────────────────────────
Write-Host "[1/4] Taking snapshot on cassandra1..." -ForegroundColor Yellow
docker exec localreview-cassandra1 nodetool snapshot -t $tag $KEYSPACE
if ($LASTEXITCODE -ne 0) {
    Write-Host "ERROR: snapshot on cassandra1 failed" -ForegroundColor Red
    exit 1
}
Write-Host "      OK" -ForegroundColor Green

# ── Node 2 ──────────────────────────────────────────────────
Write-Host "[2/4] Taking snapshot on cassandra2..." -ForegroundColor Yellow
docker exec localreview-cassandra2 nodetool snapshot -t $tag $KEYSPACE
if ($LASTEXITCODE -ne 0) {
    Write-Host "ERROR: snapshot on cassandra2 failed" -ForegroundColor Red
    exit 1
}
Write-Host "      OK" -ForegroundColor Green

# ── Copy snapshots out of the containers ────────────────────
$localDir = ".\backups\cassandra\$tag"
New-Item -ItemType Directory -Force -Path "$localDir\node1" | Out-Null
New-Item -ItemType Directory -Force -Path "$localDir\node2" | Out-Null

Write-Host "[3/4] Copying node1 snapshots to $localDir\node1 ..." -ForegroundColor Yellow
$snapshotPath1 = "/var/lib/cassandra/data/$KEYSPACE"
docker cp "localreview-cassandra1:$snapshotPath1" "$localDir\node1"
Write-Host "      OK" -ForegroundColor Green

Write-Host "[4/4] Copying node2 snapshots to $localDir\node2 ..." -ForegroundColor Yellow
docker cp "localreview-cassandra2:$snapshotPath1" "$localDir\node2"
Write-Host "      OK" -ForegroundColor Green

Write-Host ""
Write-Host "Backup complete!" -ForegroundColor Green
Write-Host "Location : $localDir"
Write-Host ""
Write-Host "To restore, use:"
Write-Host "  docker exec localreview-cassandra1 nodetool refresh $KEYSPACE <table>"
Write-Host ""

# ── List all existing snapshots ─────────────────────────────
Write-Host "Existing snapshots on cassandra1:" -ForegroundColor Cyan
docker exec localreview-cassandra1 nodetool listsnapshots
