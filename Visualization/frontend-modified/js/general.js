// General constants and functions
var INSTRUCTION_LEN = [ 
		1,		//  0:halt
		1,		//  1:nop
		2,		//  2:rrmov
		10,		//  3:irmov
	    10,		//  4:rmmov
	    10,		//  5:mrmov
	    2,		//  6:op
	    9,		//  7:jxx
	    9,		//  8:call
	    1,		//  9:ret
	    2,		// 10:push
	    2,		// 11:pop
	    10,		// 12:iop
	    1,		// 13:
	    1,		// 14:
	    1		// 15:brk
    ],
	num2reg = [
		'%rax',
		'%rcx',
		'%rdx',
		'%rbx',
		'%rsp',
		'%rbp',
		'%rsi',
		'%rdi',
		'%r8',
		'%r9',
		'%r10',
		'%r11',
		'%r12',
		'%r13',
		'%r14'
	],
	inst2num = {
		'halt': 0,  	//  0
		'nop': 1,		//  1

		'rrmovq': 2,    //  2
		'cmovle': 2,    //  3
		'cmovl': 2,     //  4
		'cmove': 2,     //  5
		'cmovne': 2,    //  6
		'cmovge': 2,    //  7
		'cmovg': 2,     //  8

		'irmovq': 3,    //  9
		'rmmovq': 4,    // 10
		'mrmovq': 5,    // 11

		'addq': 6,      // 12
		'subq': 6,      // 13
		'andq': 6,      // 14
		'xorq': 6,      // 15

		'jmp': 7,       // 16
		'jle': 7,       // 17
		'jl': 7,        // 18
		'je': 7,        // 19
		'jne': 7,       // 20
		'jge': 7,       // 21
		'jg': 7,        // 22

		'call': 8,      // 23
		'ret': 9,       // 24
		'pushq': 10,    // 25
		'popq': 11,     // 26

        'iaddq': 12,    // 27
        'isubq': 12,    // 28
        'iandq': 12,    // 29
        'ixorq': 12,    // 30

		'brk': 15,      // 31
		'brkle': 15,    // 32
		'brkl': 15,     // 33
		'brke': 15,     // 34
		'brkne': 15,    // 35
		'brkge': 15,    // 36
		'brkg': 15      // 37
	},
	inst2fn = {
		'addq': 0,      //  1
		'subq': 1,      //  2
		'andq': 2,      //  3
		'xorq': 3,      //  3

		'rrmovq': 0,    //  4
		'cmovle': 1,    //  5
		'cmovl': 2,     //  6
		'cmove': 3,     //  7
		'cmovne': 4,    //  8
		'cmovge': 5,    //  9
		'cmovg': 6,     // 10

		'jmp': 0,       // 12
		'jle': 1,       // 13
		'jl': 2,        // 14
		'je': 3,        // 15
		'jne': 4,       // 16
		'jge': 5,       // 17
		'jg': 6,        // 18

        'iaddq': 0,     // 19
        'isubq': 1,     // 20
        'iandq': 2,     // 21
        'ixorq': 3,     // 22
	    
		'brk': 0,       // 23
		'brkle': 1,     // 24
		'brkl': 2,      // 25
		'brke': 3,      // 26
		'brkne': 4,     // 27
		'brkge': 5,     // 28
		'brkg': 6       // 29
	};

function print(x){
	return console.log(x);
}

function printRegisters(registers){
	print(reg2str(registers));
}

function reg2str(registers){
	var result = ''
	for (r in registers) {
		if (r.length === 1) {
			result += (num2reg[r] + ': ' + registers[r].toString(16));
		} else {
			result += (r + ': ' + registers[r].toString(16));
		}
		result += '\n';
	}
	return result;
}

function printMemory(){
	var i = 0,
		str = '';
	for(b in MEMORY){
		if (i % 16 === 0 && i > 0) {
			print('PC = ' + (i - 4) + ' | ' + str);
			str = '';
		}
		str += num2hex(MEMORY[b]);
		i++;
	} 
	print(MEMORY);
}

function num2hex(num){
	var result = num.toString(16);
	return result.length % 2 === 1 ? '0' + result : result;
}

function toBigEndian(hexstr){
	var i, result = '';
	if(hexstr.length % 2 === 1){
		hexstr = '0' + hexstr;
	}
	for (i = hexstr.length; i > 0; i -= 2){
		result += hexstr.substr(i - 2, 2);
	}
	return result;
}

function toLittleEndian(hexstr){
	return toBigEndian(hexstr);
}

function hexstr2num(h){
	return parseInt(x, 16);
}

// Parse a number that is either in base 10 or in base 16 with '0x' in front.
function parseNumberLiteral (str) {
	if (isNaN(str))
		throw new Error('Not a number: ' + str);
	else if (str.length > 2 && str.substr(0, 2) === '0x')
		return Long.fromString(str,true,16);
	else
		return Long.fromString(str,true,10);
}

function padHex(num, width){
	var result = num ? num.toString(16) : '0';
	while (result.length < width) {
		result = '0' + result;
	}
	return result;
}
