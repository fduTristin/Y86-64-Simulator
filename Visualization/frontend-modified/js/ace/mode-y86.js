define("ace/mode/y86_highlight_rules",
		["require","exports","module","ace/lib/oop","ace/mode/text_highlight_rules"],
		function(require, exports, module) {
	"use strict";

	var oop = require("../lib/oop");
	var TextHighlightRules = require("./text_highlight_rules").TextHighlightRules;

	var Y86HighlightRules = function() {
		
		this.$rules = {
			"start" : [{
				"token": "comment",
				"regex": /#.*|;./
			}, {
				"token": ["storage.type", "directive"],
				"regex": /\.(?:pos|align|quad|long|double|byte)/
			}, {
				"token": ["entity.name.function", "symbol"],
				"regex": /\w+:/
			}, {
				"token": "keyword.control",
				"regex": /halt|nop|rrmovq|cmovle|cmovl|cmove|cmovne|cmovge|cmovg|irmovq|rmmovq|mrmovq|addq|subq|xorq|andq|jmp|jle|jl|je|jne|jge|jg|call|ret|pushq|popq|iaddq|isubq|iandq|ixorq|brk|brkle|brkl|brke|brkne|brkge|brkg/
			}, {
				"token": ["variable.language", "register"],
				"regex": /%(?:rax|rbx|rcx|rdx|rbp|rsp|rsi|rdi|r8|r9|r10|r11|r12|r13|r14)/
			}, {
				"token": "constant.number",
				"regex": /\$?\-?([0-9]+|\0\x[0-9a-fA-F]+)/
			}]

		};
	};
	oop.inherits(Y86HighlightRules, TextHighlightRules);

	exports.Y86HighlightRules = Y86HighlightRules;

});

define("ace/mode/y86",
		["require","exports","module","ace/lib/oop","ace/mode/text","ace/mode/y86_highlight_rules"],
		function(require, exports, module) {
	"use strict";

	var oop = require("../lib/oop");
	var TextMode = require("./text").Mode;
	var Y86HighlightRules = require("./y86_highlight_rules").Y86HighlightRules;
	var WorkerClient = require("../worker/worker_client").WorkerClient;

	var Mode = function() {
		this.HighlightRules = Y86HighlightRules;
	};
	oop.inherits(Mode, TextMode);

	Mode.prototype.$id = "ace/mode/y86";

	exports.Mode = Mode;
});
