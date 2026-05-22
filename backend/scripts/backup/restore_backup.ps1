# ============================================================
# LocalReview — Restore Cassandra Backup
# ============================================================
# Restores a previously taken nodetool snapshot.
#
# Usage:
#   .\backend\scripts\backup\restore_backup.ps1 -tag "20250522_120000"

param(
    [Parameter(Mandatory=$true)]
    [string]$tag
)

$KEYSPACE = "localreview"
$TABLES   = @("reviews", "reviews_by_business", "reviews_by_user", "comments", "comments_by_review")

Write-Host ""
Write-Host "=== LocalReview Cassandra Restore ===" -ForegroundColor Cyan
Write-Host "Snapshot tag : $tag"
Write-Host ""

foreach ($table in $TABLES) {
    Write-Host "Refreshing $table on cassandra1..." -ForegroundColor Yellow
    docker exec localreview-cassandra1 nodetool refresh $KEYSPACE $table
    Write-Host "Refreshing $table on cassandra2..." -ForegroundColor Yellow
    docker exec localreview-cassandra2 nodetool refresh $KEYSPACE $table
}

Write-Host ""
Write-Host "Restore complete!" -ForegroundColor Green
