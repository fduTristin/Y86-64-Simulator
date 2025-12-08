#!/bin/bash

# Y86-64 CPU Backend Server Startup Script

echo "===================================="
echo "Y86-64 CPU Backend Server"
echo "===================================="

# Check if Python3 is installed
if ! command -v python3 &> /dev/null; then
    echo "ERROR: python3 is not installed"
    exit 1
fi

# Check if virtual environment exists
if [ ! -d "venv" ]; then
    echo "Creating virtual environment..."
    python3 -m venv venv
fi

# Activate virtual environment
echo "Activating virtual environment..."
source venv/bin/activate

# Install dependencies
echo "Installing dependencies..."
pip install -q -r requirements.txt

# Check if CPU executable exists
CPU_PATH="../PJ-Y86-64-Simulator/cpu"
if [ ! -f "$CPU_PATH" ]; then
    echo "ERROR: CPU executable not found at $CPU_PATH"
    echo "Please build the C++ CPU first:"
    echo "  cd ../PJ-Y86-64-Simulator"
    echo "  make"
    exit 1
fi

# Start server
echo ""
echo "Starting backend server on http://localhost:5000"
echo "Press Ctrl+C to stop"
echo ""

python3 server.py
