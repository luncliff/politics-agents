"""Lint YAML frontmatter in .claude/agents/ and .agents/skills/.

규칙:
- 모든 .claude agent markdown과 SKILL.md는 YAML frontmatter로 시작.
- 필수 키: description.
- agent/SKILL은 추가로 name 키를 가져야 한다.
"""
from __future__ import annotations

import pathlib
import sys

import yaml

ROOT = pathlib.Path(__file__).resolve().parents[1]

TARGETS = [
    (".claude/agents/*.md",      ["description", "name"]),
    (".agents/skills/*/SKILL.md", ["description", "name"]),
]


def parse_frontmatter(text: str):
    if not text.startswith("---"):
        return None
    end = text.find("\n---", 3)
    if end == -1:
        return None
    return yaml.safe_load(text[3:end])


def main() -> int:
    errors: list[str] = []
    checked = 0
    for pattern, required in TARGETS:
        for path in ROOT.glob(pattern):
            checked += 1
            text = path.read_text(encoding="utf-8")
            data = parse_frontmatter(text)
            if data is None:
                errors.append(f"{path}: missing or invalid YAML frontmatter")
                continue
            for key in required:
                if key not in data or data[key] in (None, ""):
                    errors.append(f"{path}: missing required key '{key}'")
    if errors:
        print(f"checked {checked} files, {len(errors)} error(s):")
        for e in errors:
            print("  -", e)
        return 1
    print(f"ok: {checked} files")
    return 0


if __name__ == "__main__":
    sys.exit(main())
