# Using uv to install Python packages

This repository prefers using the `uv` tool as the Python package manager frontend.
Instead of `python3 -m pip install -r scripts/requirements.txt`, use:

```
uv pip install -r scripts/requirements.txt
```

Two helper scripts are provided:

- `scripts/install_requirements_uv.fish` — for fish users
- `scripts/install_requirements_uv.sh` — POSIX sh helper

If you prefer to explicitly install into the project virtualenv, activate
it first (for fish):

```
source .venv/bin/activate.fish
```

Then run one of the helper scripts.
