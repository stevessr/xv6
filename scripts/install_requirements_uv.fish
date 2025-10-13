#!/usr/bin/env fish
# Install Python requirements using the 'uv' tool.
# Usage (fish):
#   source .venv/bin/activate.fish    # optional, if you want to activate venv
#   ./scripts/install_requirements_uv.fish

set REQ (pwd)/scripts/requirements.txt
echo "Running: uv pip install -r $REQ"
uv pip install -r "$REQ"
