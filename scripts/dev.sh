#!/usr/bin/env bash
# Construye el sitio (silver -> gold) y lo sirve en http://localhost:8000
set -euo pipefail
cd "$(dirname "$0")/.."
python3 scripts/build.py
echo "Sirviendo en http://localhost:8000 (Ctrl+C para salir)"
python3 -m http.server 8000 -d gold
