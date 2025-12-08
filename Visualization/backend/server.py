#!/usr/bin/env python3
"""
Y86-64 CPU Backend Server
Wraps the C++ CPU simulator and provides REST API for frontend
"""

import os
import sys
import json
import uuid
import subprocess
import tempfile
from flask import Flask, request, jsonify
from flask_cors import CORS

app = Flask(__name__)
CORS(app)  # Enable CORS for frontend to access

# Global storage for execution sessions
# Format: { session_id: { "states": [...], "current_step": 0 } }
sessions = {}

# Path to C++ CPU executable (relative to this file)
CPU_EXECUTABLE = os.path.join(os.path.dirname(__file__), '..', 'PJ-Y86-64-Simulator', 'cpu')


def run_cpu_simulator(yo_content):
    """
    Run the C++ CPU simulator with .yo file content
    Returns: List of states (JSON array from CPU output)
    """
    try:
        # Run the CPU simulator with .yo content as stdin
        print(f"DEBUG: Running CPU with input:\n{yo_content[:200]}...", flush=True)
        result = subprocess.run(
            [CPU_EXECUTABLE],
            input=yo_content,
            capture_output=True,
            text=True,
            timeout=5
        )

        print(f"DEBUG: CPU return code: {result.returncode}", flush=True)
        print(f"DEBUG: CPU stdout: {result.stdout[:500]}", flush=True)
        print(f"DEBUG: CPU stderr: {result.stderr[:500]}", flush=True)

        if result.returncode != 0:
            return {"error": f"CPU execution failed: {result.stderr}"}

        if not result.stdout.strip():
            return {"error": "CPU produced no output"}

        # Parse JSON output
        states = json.loads(result.stdout)
        print(f"DEBUG: Successfully parsed {len(states)} states", flush=True)
        return states

    except subprocess.TimeoutExpired:
        return {"error": "CPU execution timeout"}
    except json.JSONDecodeError as e:
        return {"error": f"Invalid JSON output from CPU: {e}. Output was: {result.stdout[:200]}"}
    except Exception as e:
        return {"error": f"Execution error: {str(e)}"}


@app.route('/api/health', methods=['GET'])
def health_check():
    """Health check endpoint"""
    return jsonify({"status": "ok", "message": "Y86-64 CPU Backend is running"})


@app.route('/api/load', methods=['POST'])
def load_program():
    """
    Load a Y86-64 program (.yo format) and execute it completely
    Store all execution states in session

    Request body: { "program": ".yo format content" }
    Response: { "session_id": "...", "initial_state": {...}, "total_steps": N }
    """
    try:
        data = request.get_json()
        print(f"DEBUG: Received request data: {data}")

        if not data or 'program' not in data:
            return jsonify({"error": "Missing 'program' field"}), 400

        yo_content = data['program']

        # Execute the program with C++ CPU
        states = run_cpu_simulator(yo_content)

        if isinstance(states, dict) and 'error' in states:
            return jsonify(states), 500

        # Create new session
        session_id = str(uuid.uuid4())
        sessions[session_id] = {
            "states": states,
            "current_step": 0,
            "total_steps": len(states)
        }

        # Return initial state
        initial_state = states[0] if len(states) > 0 else None

        return jsonify({
            "session_id": session_id,
            "initial_state": initial_state,
            "total_steps": len(states)
        })

    except Exception as e:
        import traceback
        error_msg = f"{str(e)}\n{traceback.format_exc()}"
        print(f"ERROR in load_program: {error_msg}")
        return jsonify({"error": str(e)}), 500


@app.route('/api/step/<session_id>', methods=['POST'])
def step(session_id):
    """
    Execute one step (return next state from cached execution)

    Response: { "state": {...}, "current_step": N, "done": false }
    """
    if session_id not in sessions:
        return jsonify({"error": "Invalid session ID"}), 404

    session = sessions[session_id]
    current_step = session["current_step"]
    states = session["states"]

    # Check if we've reached the end
    if current_step >= len(states) - 1:
        return jsonify({
            "state": states[-1],
            "current_step": current_step,
            "done": True
        })

    # Move to next step
    session["current_step"] += 1
    next_step = session["current_step"]

    return jsonify({
        "state": states[next_step],
        "current_step": next_step,
        "done": next_step >= len(states) - 1
    })


@app.route('/api/reset/<session_id>', methods=['POST'])
def reset(session_id):
    """
    Reset execution to step 0

    Response: { "state": {...}, "current_step": 0 }
    """
    if session_id not in sessions:
        return jsonify({"error": "Invalid session ID"}), 404

    session = sessions[session_id]
    session["current_step"] = 0

    return jsonify({
        "state": session["states"][0],
        "current_step": 0
    })


@app.route('/api/state/<session_id>', methods=['GET'])
def get_current_state(session_id):
    """
    Get current state without advancing

    Response: { "state": {...}, "current_step": N, "total_steps": M }
    """
    if session_id not in sessions:
        return jsonify({"error": "Invalid session ID"}), 404

    session = sessions[session_id]
    current_step = session["current_step"]

    return jsonify({
        "state": session["states"][current_step],
        "current_step": current_step,
        "total_steps": session["total_steps"]
    })


@app.route('/api/continue/<session_id>', methods=['POST'])
def continue_execution(session_id):
    """
    Continue execution to completion (return all remaining states)

    Response: { "final_state": {...}, "total_steps": N }
    """
    if session_id not in sessions:
        return jsonify({"error": "Invalid session ID"}), 404

    session = sessions[session_id]
    states = session["states"]

    # Jump to final state
    session["current_step"] = len(states) - 1

    return jsonify({
        "final_state": states[-1],
        "current_step": session["current_step"],
        "total_steps": len(states)
    })


@app.route('/api/session/<session_id>', methods=['DELETE'])
def delete_session(session_id):
    """Delete a session to free memory"""
    if session_id in sessions:
        del sessions[session_id]
        return jsonify({"message": "Session deleted"})
    return jsonify({"error": "Session not found"}), 404


@app.route('/api/history/<session_id>', methods=['GET'])
def get_history(session_id):
    """
    Get complete execution history for a session

    Response: {
        "states": [...],  # All states from execution
        "current_step": N,
        "total_steps": M
    }
    """
    if session_id not in sessions:
        return jsonify({"error": "Invalid session ID"}), 404

    session = sessions[session_id]

    return jsonify({
        "states": session["states"],
        "current_step": session["current_step"],
        "total_steps": session["total_steps"]
    })


if __name__ == '__main__':
    # Check if CPU executable exists
    if not os.path.exists(CPU_EXECUTABLE):
        print(f"ERROR: CPU executable not found at {CPU_EXECUTABLE}")
        print("Please ensure PJ-Y86-64-Simulator/cpu is compiled")
        sys.exit(1)

    print(f"Starting Y86-64 CPU Backend Server...")
    print(f"Using CPU executable: {CPU_EXECUTABLE}")
    print(f"Server running on http://localhost:5005")

    app.run(host='0.0.0.0', port=5005, debug=True)
