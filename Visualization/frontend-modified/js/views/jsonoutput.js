var JsonOutputView = Backbone.View.extend({
	initialize: function () {
		this.template = _.template($('#tmpl_json_output').html());
		this.listenTo(Backbone.Events, 'app:redraw', this.render);
		this.render();
	},

	render: function () {
		try {
			var jsonStr;

			// Only show output when execution is complete (STAT == HLT or cannot continue)
			var isComplete = (STAT === 'HLT' || STAT === 'ADR' || STAT === 'INS');

			// Check if we have execution history
			if (isComplete && typeof executionHistory !== 'undefined' && executionHistory.length > 0) {
				// Display complete execution history when done
				jsonStr = this.formatExecutionHistory(executionHistory, currentStep);
			} else {
				// Show blank or waiting message during execution
				jsonStr = '';
			}

			this.$el.html(this.template({
				json: jsonStr
			}));
		} catch (error) {
			console.error('JsonOutputView render error:', error);
			// Display error message
			this.$el.html(this.template({
				json: 'Error: ' + error.message
			}));
		}
	},

	formatExecutionHistory: function(history, currentIdx) {
		// Format as array with comments marking current step
		var lines = ['['];

		history.forEach(function(state, idx) {
			var stateJson = JSON.stringify(state, null, 4);
			// Indent each line by 4 spaces
			var indentedState = stateJson.split('\n').map(function(line) {
				return '    ' + line;
			}).join('\n');

			// Add comma except for last element
			var comma = (idx < history.length - 1) ? ',' : '';

			// Add comment if this is the current step
			var comment = (idx === currentIdx) ? ' // <- Current Step' : '';

			lines.push(indentedState + comma + comment);
		});

		lines.push(']');
		return lines.join('\n');
	},

	getCurrentState: function () {
		// Build state object from global CPU variables
		var state = {
			PC: PC.toString(10),
			STAT: STAT,
			CC: {
				ZF: ZF,
				SF: SF,
				OF: OF
			},
			REG: {},
			MEM: {}
		};

		// Add registers
		var regNames = ['rax', 'rcx', 'rdx', 'rbx', 'rsp', 'rbp', 'rsi', 'rdi',
		                'r8', 'r9', 'r10', 'r11', 'r12', 'r13', 'r14'];
		for (var i = 0; i < 15; i++) {
			state.REG[regNames[i]] = REG[i].toString(10);
		}

		// Add non-zero memory (sparse representation)
		for (var addr = 0; addr < MEMORY.length; addr += 8) {
			// Read 8 bytes as a 64-bit value (little-endian)
			var value = 0;
			for (var j = 0; j < 8 && addr + j < MEMORY.length; j++) {
				value += MEMORY[addr + j] * Math.pow(256, j);
			}
			if (value !== 0) {
				state.MEM[addr] = value;
			}
		}

		return state;
	}
});
