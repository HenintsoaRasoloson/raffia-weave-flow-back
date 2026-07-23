#!/usr/bin/env python3
"""
Generate platform templates from templates/platforms/source.json.

Usage:
  python scripts/generate_platform_templates.py
  python scripts/generate_platform_templates.py --check
"""

import argparse
import json
from pathlib import Path


ROOT_DIR = Path(__file__).resolve().parent.parent
PLATFORM_DIR = ROOT_DIR / "templates" / "platforms"
SOURCE_FILE = PLATFORM_DIR / "source.json"


def render_json(data):
    return json.dumps(data, indent=2, ensure_ascii=False) + "\n"


def load_source():
    payload = json.loads(SOURCE_FILE.read_text(encoding="utf-8"))
    platforms = payload.get("platforms", [])
    if not isinstance(platforms, list) or not platforms:
        raise ValueError("source.json must contain a non-empty 'platforms' list")
    return platforms


def main():
    parser = argparse.ArgumentParser(description="Generate platform template files")
    parser.add_argument("--check", action="store_true", help="Fail if generated files are out of date")
    args = parser.parse_args()

    platforms = load_source()
    changed = []

    for platform in platforms:
        name = platform.get("platform")
        if not name:
            raise ValueError("Each platform entry must include 'platform'")

        target_file = PLATFORM_DIR / f"{name}.json"
        content = render_json(platform)
        current = target_file.read_text(encoding="utf-8") if target_file.exists() else ""

        if current != content:
            changed.append(str(target_file.relative_to(ROOT_DIR)))
            if not args.check:
                target_file.write_text(content, encoding="utf-8")

    if changed and args.check:
        print("Out-of-date generated platform templates:")
        for file_name in changed:
            print(f"- {file_name}")
        raise SystemExit(1)

    if args.check:
        print("Platform templates are up to date.")
    else:
        print("Generated platform templates:")
        for platform in platforms:
            print(f"- templates/platforms/{platform['platform']}.json")


if __name__ == "__main__":
    main()
