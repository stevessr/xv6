#!/usr/bin/env sh
# Install Python requirements using the 'uv' tool.
# Usage (POSIX sh):
#   . .venv/bin/activate   # optional
#   ./scripts/install_requirements_uv.sh

REQ="$(pwd)/scripts/requirements.txt"
echo "Running: uv pip install -r $REQ"
uv pip install -r "$REQ"
