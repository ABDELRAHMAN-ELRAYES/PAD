#!/bin/bash
# setup_deep_research.sh - Setup script for local_deep_research dependencies

# Exit immediately if a command exits with a non-zero status
set -e

echo "=== Setting up local_deep_research virtual environment ==="

# Navigate to the script's directory
cd "$(dirname "$0")"

# Create virtual environment
if [ ! -d ".venv" ]; then
    echo "Creating virtual environment..."
    python3 -m venv .venv
else
    echo "Virtual environment already exists."
fi

# Activate virtual environment
echo "Activating virtual environment..."
source .venv/bin/activate

# Upgrade pip
echo "Upgrading pip..."
pip install --upgrade pip

# Install dependencies in editable mode
echo "Installing dependencies..."
pip install -e .

echo "=== Setup completed successfully! ==="
