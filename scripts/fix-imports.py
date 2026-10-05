#!/usr/bin/env python3
"""Fix relative imports to @/ alias for Next.js migration."""
import re
from pathlib import Path

SRC = Path('/home/z/my-project/src')

# Patterns: replace '../types/game' -> '@/types/game', etc.
patterns = [
    (r"from '\.\./types/(.+)'", r"from '@/types/\1'"),
    (r'from "\.\./types/(.+)"', r'from "@/types/\1"'),
    (r"from '\.\./game/(.+)'", r"from '@/game/\1'"),
    (r'from "\.\./game/(.+)"', r'from "@/game/\1"'),
    (r"from '\.\./audio/(.+)'", r"from '@/audio/\1'"),
    (r'from "\.\./audio/(.+)"', r'from "@/audio/\1"'),
    # Components inside game/ referencing siblings: './HeaderBar' -> '@/components/game/HeaderBar'
    (r"from '\./(HeaderBar|TerraformToolbar|TowerBuildPanel|TileInspector|RelicDraftModal|CodexModal|LevelEditorModal|SavesModal|GameOverModal)'", r"from '@/components/game/\1'"),
    (r'from "\./(HeaderBar|TerraformToolbar|TowerBuildPanel|TileInspector|RelicDraftModal|CodexModal|LevelEditorModal|SavesModal|GameOverModal)"', r'from "@/components/game/\1"'),
]

count = 0
for path in SRC.rglob('*.ts*'):
    if path.name == 'AetheriaApp.tsx':
        continue  # already fixed
    text = path.read_text(encoding='utf-8')
    orig = text
    for pat, rep in patterns:
        text = re.sub(pat, rep, text)
    if text != orig:
        path.write_text(text, encoding='utf-8')
        count += 1
        print(f"Fixed: {path.relative_to(SRC)}")

print(f"\nTotal files updated: {count}")
