cd backend

# Use astral's ultra-fast 'uv' to explicitly provision a stable Python 3.12 environment
# This bypasses the Python 3.14.3 wheel compilation errors (like pydantic-core rust failures)
if (Get-Command uv -errorAction SilentlyContinue) {
    uv venv --python 3.12 venv
    . .\venv\Scripts\Activate.ps1
    uv pip install -r requirements.txt
} else {
    # Fallback if uv is not on path
    if (Test-Path "venv\Scripts\Activate.ps1") {
        . .\venv\Scripts\Activate.ps1
    }
    pip install -r requirements.txt
}

python -m uvicorn main:app --reload --port 8000
