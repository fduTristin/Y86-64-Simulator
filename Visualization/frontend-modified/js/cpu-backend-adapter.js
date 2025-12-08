/**
 * Y86-64 CPU Backend Adapter
 * Replaces the JavaScript CPU with backend API calls
 */

// Backend API configuration
const API_BASE_URL = 'http://localhost:5005/api';

// Session state
var currentSessionId = null;
var currentStep = 0;
var totalSteps = 0;
var executionHistory = [];  // Complete execution history

// CPU State (mirrors the original y86.js global variables)
// Use Long objects from long.js library
var PC = new Long(0, 0, true);
var REG = [];
var STAT = 'AOK';
var MEMORY = new Uint8Array(0x2000);
var SF = 0, ZF = 0, OF = 0;
var ERR = '';

// Initialize register array with Long objects
for (let i = 0; i < 15; i++) {
    REG[i] = new Long(0, 0, true);
}

/**
 * Convert backend register format to Long object
 */
function toLongObject(value) {
    if (typeof value === 'number') {
        // Create proper Long object from number
        return Long.fromNumber(value, true);
    } else if (typeof value === 'object' && value !== null) {
        // If already an object, create Long from low/high parts
        return new Long(value.low || 0, value.high || 0, true);
    }
    return new Long(0, 0, true);
}

/**
 * Update CPU state from backend response
 */
function updateStateFromBackend(state) {
    // Update PC
    PC = toLongObject(state.PC || 0);

    // Update registers
    const regNames = ['rax', 'rcx', 'rdx', 'rbx', 'rsp', 'rbp', 'rsi', 'rdi',
                      'r8', 'r9', 'r10', 'r11', 'r12', 'r13', 'r14'];
    regNames.forEach((name, idx) => {
        REG[idx] = toLongObject(state.REG[name] || 0);
    });

    // Update condition codes
    SF = state.CC.SF || 0;
    ZF = state.CC.ZF || 0;
    OF = state.CC.OF || 0;

    // Update memory (backend returns sparse memory object)
    MEMORY = new Uint8Array(0x2000);
    if (state.MEM) {
        for (let addr in state.MEM) {
            const address = parseInt(addr);
            const value = state.MEM[addr];
            // Store 64-bit value in little-endian
            for (let i = 0; i < 8; i++) {
                MEMORY[address + i] = (value >> (i * 8)) & 0xFF;
            }
        }
    }

    // Update status
    const statusMap = {
        1: 'AOK',
        2: 'HLT',
        3: 'ADR',
        4: 'INS'
    };
    STAT = statusMap[state.STAT] || 'AOK';
}

// Note: generateYoFormat is not needed because ASSEMBLE() already returns
// the object code in .yo format (obj.obj is the .yo format string)

/**
 * INIT - Initialize CPU with assembled program
 */
async function INIT(obj) {
    try {
        // obj is the .yo format string (from ASSEMBLE().obj)
        const yoContent = obj;

        // Load program via backend API
        const response = await fetch(`${API_BASE_URL}/load`, {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({ program: yoContent })
        });

        const data = await response.json();

        if (!response.ok) {
            ERR = data.error || 'Failed to load program';
            STAT = 'INS';
            throw new Error(ERR);
        }

        // Store session ID
        currentSessionId = data.session_id;
        currentStep = 0;
        totalSteps = data.total_steps;

        // Fetch complete execution history
        const historyResponse = await fetch(`${API_BASE_URL}/history/${currentSessionId}`);
        const historyData = await historyResponse.json();
        executionHistory = historyData.states || [];

        // Update state from initial state
        updateStateFromBackend(data.initial_state);

        ERR = '';
        return true;

    } catch (error) {
        console.error('INIT error:', error);
        ERR = error.message;
        STAT = 'INS';
        return false;
    }
}

/**
 * STEP - Execute one instruction
 */
async function STEP() {
    if (!currentSessionId) {
        ERR = 'No program loaded';
        return false;
    }

    try {
        const response = await fetch(`${API_BASE_URL}/step/${currentSessionId}`, {
            method: 'POST'
        });

        const data = await response.json();

        if (!response.ok) {
            ERR = data.error || 'Step failed';
            return false;
        }

        currentStep = data.current_step;

        // Update state
        updateStateFromBackend(data.state);

        return true;

    } catch (error) {
        console.error('STEP error:', error);
        ERR = error.message;
        return false;
    }
}

/**
 * RESET - Reset CPU to initial state
 */
async function RESET() {
    if (!currentSessionId) {
        // If no session, just reset local state
        PC = { low: 0, high: 0, unsigned: true };
        for (let i = 0; i < 15; i++) {
            REG[i] = { low: 0, high: 0, unsigned: true };
        }
        STAT = 'AOK';
        SF = 0; ZF = 0; OF = 0;
        ERR = '';
        currentStep = 0;
        return true;
    }

    try {
        const response = await fetch(`${API_BASE_URL}/reset/${currentSessionId}`, {
            method: 'POST'
        });

        const data = await response.json();

        if (!response.ok) {
            ERR = data.error || 'Reset failed';
            return false;
        }

        currentStep = 0;
        updateStateFromBackend(data.state);

        return true;

    } catch (error) {
        console.error('RESET error:', error);
        ERR = error.message;
        return false;
    }
}

/**
 * RUN - Continue execution to completion
 */
let RUN_INTERVAL = null;
let RUN_CALLBACK = null;

async function RUN(callback) {
    RUN_CALLBACK = callback;

    // Resume from breakpoint if applicable
    if (STAT === 'DBG') {
        STAT = 'AOK';
    }

    // Simulate continuous execution by stepping repeatedly
    RUN_INTERVAL = setInterval(async () => {
        if (STAT === 'AOK' || STAT === 'DBG') {
            await STEP();
            if (RUN_CALLBACK) {
                RUN_CALLBACK();
            }
        } else {
            PAUSE();
        }
    }, 50); // 50ms interval for visual feedback
}

/**
 * PAUSE - Stop continuous execution
 */
function PAUSE() {
    if (RUN_INTERVAL) {
        clearInterval(RUN_INTERVAL);
        RUN_INTERVAL = null;
    }
}

/**
 * IS_RUNNING - Check if CPU is running
 */
function IS_RUNNING() {
    return RUN_INTERVAL !== null;
}

// Export functions for compatibility with original code
window.INIT = INIT;
window.STEP = STEP;
window.RESET = RESET;
window.RUN = RUN;
window.PAUSE = PAUSE;
window.IS_RUNNING = IS_RUNNING;
