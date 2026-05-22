"""
LocalReview — Third-Party Cassandra Backup Tool
================================================
Uses the cassandra-driver to export all rows from the LocalReview keyspace
to newline-delimited JSON files (one per table).  This provides a
third-party, application-level backup that is:

  * Storage-independent (no Docker volume access required)
  * Human-readable (JSON, not SSTables)
  * Easily restored via the companion restore script

Usage
-----
  python third_party_backup.py [--output ./backups/cassandra]
  python third_party_backup.py --output /mnt/nas/backups --host 127.0.0.1

Restore
-------
  python third_party_backup.py --restore --input ./backups/cassandra/2025-05-22T12-00-00
"""
from __future__ import annotations

import argparse
import json
import os
import sys
import uuid
from datetime import datetime, timezone
from pathlib import Path

# ── cassandra-driver ─────────────────────────────────────────────────────────
try:
    from cassandra.cluster import Cluster
    from cassandra.policies import DCAwareRoundRobinPolicy
    from cassandra.query import dict_factory
except ImportError:
    print("ERROR: cassandra-driver not installed. Run: pip install cassandra-driver")
    sys.exit(1)

KEYSPACE = "localreview"
TABLES = [
    "reviews",
    "reviews_by_business",
    "reviews_by_user",
    "comments",
    "comments_by_review",
]


# ─── Helpers ─────────────────────────────────────────────────────────────────

def _json_default(obj):
    """JSON serialiser for types not handled by default."""
    if isinstance(obj, (datetime,)):
        return obj.isoformat()
    if isinstance(obj, uuid.UUID):
        return str(obj)
    if isinstance(obj, (set, frozenset)):
        return list(obj)
    if isinstance(obj, bytes):
        return obj.hex()
    raise TypeError(f"Object of type {type(obj)} is not JSON serialisable")


def connect(host: str, port: int):
    cluster = Cluster(
        contact_points=[host],
        port=port,
        load_balancing_policy=DCAwareRoundRobinPolicy(local_dc="datacenter1"),
    )
    session = cluster.connect(KEYSPACE)
    session.row_factory = dict_factory
    return cluster, session


# ─── Backup ──────────────────────────────────────────────────────────────────

def backup(host: str, port: int, output_dir: Path) -> None:
    ts = datetime.now(timezone.utc).strftime("%Y-%m-%dT%H-%M-%S")
    dest = output_dir / ts
    dest.mkdir(parents=True, exist_ok=True)

    print(f"\n=== LocalReview Cassandra Backup ===")
    print(f"Host     : {host}:{port}")
    print(f"Keyspace : {KEYSPACE}")
    print(f"Output   : {dest}\n")

    cluster, session = connect(host, port)
    try:
        for table in TABLES:
            outfile = dest / f"{table}.jsonl"
            rows = list(session.execute(f"SELECT * FROM {table}"))
            with open(outfile, "w", encoding="utf-8") as fh:
                for row in rows:
                    fh.write(json.dumps(row, default=_json_default) + "\n")
            print(f"  {table:30s} → {len(rows):>6} rows  [{outfile.name}]")
    finally:
        cluster.shutdown()

    # Write manifest
    manifest = {
        "timestamp": ts,
        "keyspace": KEYSPACE,
        "tables": TABLES,
        "host": host,
        "port": port,
    }
    (dest / "manifest.json").write_text(json.dumps(manifest, indent=2))
    print(f"\nBackup complete → {dest}\n")


# ─── Restore ─────────────────────────────────────────────────────────────────

def restore(host: str, port: int, input_dir: Path) -> None:
    manifest_path = input_dir / "manifest.json"
    if not manifest_path.exists():
        print(f"ERROR: no manifest.json in {input_dir}")
        sys.exit(1)

    print(f"\n=== LocalReview Cassandra Restore ===")
    print(f"Source : {input_dir}\n")

    cluster, session = connect(host, port)
    try:
        for table in TABLES:
            src = input_dir / f"{table}.jsonl"
            if not src.exists():
                print(f"  SKIP {table} (file not found)")
                continue

            lines = src.read_text(encoding="utf-8").splitlines()
            count = 0
            for line in lines:
                if not line.strip():
                    continue
                row = json.loads(line)
                # Build INSERT from the row dict
                cols = ", ".join(row.keys())
                placeholders = ", ".join(["%s"] * len(row))
                vals = []
                for v in row.values():
                    if isinstance(v, str):
                        # Try UUID parse
                        try:
                            vals.append(uuid.UUID(v))
                            continue
                        except ValueError:
                            pass
                        # Try datetime parse
                        try:
                            vals.append(datetime.fromisoformat(v))
                            continue
                        except ValueError:
                            pass
                    vals.append(v)
                session.execute(
                    f"INSERT INTO {table} ({cols}) VALUES ({placeholders})",
                    vals,
                )
                count += 1
            print(f"  {table:30s} ← {count:>6} rows restored")
    finally:
        cluster.shutdown()

    print("\nRestore complete.\n")


# ─── CLI ─────────────────────────────────────────────────────────────────────

if __name__ == "__main__":
    parser = argparse.ArgumentParser(description="LocalReview Cassandra Backup/Restore Tool")
    parser.add_argument("--host",    default="127.0.0.1", help="Cassandra host")
    parser.add_argument("--port",    default=9042, type=int, help="Cassandra CQL port")
    parser.add_argument("--output",  default="./backups/cassandra", help="Backup output directory")
    parser.add_argument("--restore", action="store_true", help="Restore mode")
    parser.add_argument("--input",   help="Backup directory to restore from (required with --restore)")
    args = parser.parse_args()

    if args.restore:
        if not args.input:
            parser.error("--input is required when using --restore")
        restore(args.host, args.port, Path(args.input))
    else:
        backup(args.host, args.port, Path(args.output))
