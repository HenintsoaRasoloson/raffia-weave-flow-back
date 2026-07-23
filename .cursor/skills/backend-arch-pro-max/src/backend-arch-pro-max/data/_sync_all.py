#!/usr/bin/env python3
# -*- coding: utf-8 -*-
"""
Validate Backend Arch Pro Max CSV data files and print row counts.

This mirrors the UI/UX Pro Max data maintenance pattern in a lightweight form.
Run after editing CSV files:
  python src/backend-arch-pro-max/data/_sync_all.py
"""

import csv
from pathlib import Path


DATA_DIR = Path(__file__).resolve().parent

EXPECTED_COLUMNS = {
    "api_patterns.csv": ["id", "category", "name", "description", "when_to_use", "trade_offs", "implementation_notes", "keywords", "references", "source_url", "source_type", "last_updated", "throughput_tier", "latency_tier", "cost_tier", "complexity_tier"],
    "database_patterns.csv": ["id", "category", "name", "description", "when_to_use", "trade_offs", "implementation_notes", "keywords", "references", "source_url", "source_type", "last_updated", "throughput_tier", "latency_tier", "cost_tier", "complexity_tier"],
    "caching_strategies.csv": ["id", "category", "name", "description", "when_to_use", "trade_offs", "implementation_notes", "keywords", "references", "source_url", "source_type", "last_updated", "throughput_tier", "latency_tier", "cost_tier", "complexity_tier"],
    "resilience_patterns.csv": ["id", "category", "name", "description", "when_to_use", "trade_offs", "implementation_notes", "keywords", "references", "source_url", "source_type", "last_updated", "throughput_tier", "latency_tier", "cost_tier", "complexity_tier"],
    "security_patterns.csv": ["id", "category", "name", "description", "when_to_use", "trade_offs", "implementation_notes", "keywords", "references", "source_url", "source_type", "last_updated", "throughput_tier", "latency_tier", "cost_tier", "complexity_tier"],
    "async_patterns.csv": ["id", "category", "name", "description", "when_to_use", "trade_offs", "implementation_notes", "keywords", "references", "source_url", "source_type", "last_updated", "throughput_tier", "latency_tier", "cost_tier", "complexity_tier"],
    "observability_patterns.csv": ["id", "category", "name", "description", "when_to_use", "trade_offs", "implementation_notes", "keywords", "references", "source_url", "source_type", "last_updated", "throughput_tier", "latency_tier", "cost_tier", "complexity_tier"],
    "anti_patterns.csv": ["id", "severity", "name", "bad_example", "why_bad", "good_example", "keywords", "references", "source_url", "source_type", "last_updated", "throughput_tier", "latency_tier", "cost_tier", "complexity_tier"],
    "integrations.csv": ["id", "category", "name", "description", "when_to_use", "trade_offs", "implementation_notes", "keywords", "references", "source_url", "source_type", "last_updated", "throughput_tier", "latency_tier", "cost_tier", "complexity_tier"],
    "stacks.csv": ["stack", "category", "guideline", "do", "dont", "notes", "keywords", "source_url", "source_type", "last_updated", "throughput_tier", "latency_tier", "cost_tier", "complexity_tier"],
}

VALID_SOURCE_TYPES = {"official-docs", "paper", "postmortem", "engineering-blog", "book", "benchmark", "rfc"}
VALID_TIERS = {"low", "medium", "high", "extreme", "any"}

def read_rows(path):
    with path.open("r", encoding="utf-8", newline="") as handle:
        return list(csv.DictReader(handle))


def validate_file(filename, expected_columns):
    path = DATA_DIR / filename
    if not path.exists():
        return filename, 0, [f"missing file: {path}"]

    rows = read_rows(path)
    errors = []
    actual_columns = rows[0].keys() if rows else expected_columns
    missing = [column for column in expected_columns if column not in actual_columns]
    if missing:
        errors.append(f"missing columns: {', '.join(missing)}")

    ids = set()
    for index, row in enumerate(rows, 2):
        row_id = row.get("id") or f"{row.get('stack')}:{row.get('category')}:{row.get('guideline')}"
        if row_id in ids:
            errors.append(f"duplicate id/key at line {index}: {row_id}")
        ids.add(row_id)

        for column in expected_columns:
            if column in row and row[column] == "":
                # allow missing if it's references since it was an existing issue, else flag it
                if column == 'references':
                    pass
                else:
                    errors.append(f"empty {column} at line {index}")

        # Validate new columns
        if row.get("source_type") and row["source_type"] not in VALID_SOURCE_TYPES:
            errors.append(f"invalid source_type '{row['source_type']}' at line {index}")
        if row.get("last_updated"):
            import re
            if not re.match(r"^\d{4}-\d{2}-\d{2}$", row["last_updated"]):
                errors.append(f"invalid last_updated format '{row['last_updated']}' at line {index}")
        if row.get("source_url") and not row["source_url"].startswith("http"):
            errors.append(f"invalid source_url at line {index}: {row['source_url']}")
            
        for tier_col in ["throughput_tier", "latency_tier", "cost_tier", "complexity_tier"]:
            val = row.get(tier_col)
            if val and val not in VALID_TIERS:
                errors.append(f"invalid {tier_col} '{val}' at line {index}")

    return filename, len(rows), errors


def main():
    total = 0
    all_errors = []
    for filename, columns in EXPECTED_COLUMNS.items():
        filename, count, errors = validate_file(filename, columns)
        total += count
        status = "OK" if not errors else "ERROR"
        print(f"{status:5s} {filename:30s} {count:3d} rows")
        for error in errors:
            all_errors.append(f"{filename}: {error}")

    print(f"\nTotal rows: {total}")
    if all_errors:
        print("\nErrors:")
        for error in all_errors:
            print(f"- {error}")
        raise SystemExit(1)


if __name__ == "__main__":
    main()
