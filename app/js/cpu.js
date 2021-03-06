import { read } from 'fs';

const fs = require('fs');

class Opcode {
	constructor(opcodeFunction, addrMode, instructionSize, cycles, pageCycle) {
		this.opcodeFunction = opcodeFunction;
		this.addrMode = addrMode;
		this.instructionSize = instructionSize;
		this.cycles = cycles;
		this.pageCycle = pageCycle;
	}
};

class Bit8 {

}

class Bit16 {

}

class CPU {
	constructor(acc, x, y, sp, sf, pc, c, z, i, d, b, u, o, s) {
	  this.acc = acc;
	  this.x = x;
	  this.y = y;
	  this.sp = sp;
	  this.sf = sf;
	  this.pc = pc;
	  this.c = c; //Carry flag
	  this.z = z; //Zero flag
	  this.i = i; //Interrupt flag
	  this.d = d; //Decimal flag
	  this.b = b; //Break flag
	  this.u = u; //Unused flag
	  this.o = o; //Overflow flag
	  this.s = s; //Sign flag
	}

	getBit(value, position) {
		return (value >> position) & 1;
	}

	setBit(value, position) {
		return value | (1 << position)
	}

	clearBit(value, position) {
		return value & ~(1 << position)
	}
}

(function CPU() {
	var acc = 0x00, // Accumulator
		x = 0x00, // X register
		y = 0x00, // Y register
		sp = 0x00, // Stack pointer

		// Flags
		fc = 0, // Carry
		fz = 0, // Zero
		fi = 0, // Interrupt
		fd = 0, // Decimal
		fb = 0, // Break,
		fu = 0, // Unused bit, presumably it is set sometimes
		fo = 0, // Overflow
		fn = 0, // Negative sign

		pc = 0x0000, // Program counter - 16 bit
		memory = new Uint8Array(65535), // 0xFFFF,
		tmp = 0, // helper var
		cycles = 0;

	const Mode = {
		ACC: 0,
		IMMEDIATE: 1,
		ZERO_PAGE: 2,
		ZERO_PAGE_X: 3,
		ZERO_PAGE_Y: 4,
		ABSOLUTE: 5,
		ABSOLUTE_X: 6,
		ABSOLUTE_Y: 7,
		IMPLIED: 8,
		RELATIVE: 9,
		INDIRECT_X: 10,
		INDIRECT_Y: 11,
		ABSOLUTE_INDIRECT: 12,
	};

	var mem_read = function(addr) {
		if (addr < 0x800) {
			return memory[addr];
		} else {
			return mem_read_other(addr);
		}
	};

	var mem_read_other = function(addr) {
		if (addr < 0x2000) {
			return ram[addr & 0x7FF];
		} else if (addr <= 0x3FFF) {
			return ppu_read(addr);
		} else if (addr >= 0x4000 && addr <= 0x4017) {
			return apu_read(addr);
		} else {
			return memory[addr];
			//return mem_read_fp[addr >> 12](addr);
		}
	};

	var write = function(addr, value) {
		if (addr < 0x800) {
			this.memory[addr] = value;
		} else if (addr < 0x2000) {
			this.memory[addr & 0x7FF] = value;
		} else {
			assert(false, "Not implemented yet");
		}
	}

	var pop = function() {
		this.sp += 1;
		mem_read(0x100 | this.sp);
	}

	var push = function(value) {
		write(0x100 | this.sp, value);
		this.sp -= 1;
	};

	var pop16 = function() {
		var lByte = pop();
		var hByte = pop();
		return hByte << 8 | lByte;
	}

	var push16 = function(value) {
		var hByte = value >> 8;
		var lByte = value & 0xFF;
		push(hByte);
		push(lByte);		
	}

	var read16 = function(addr) {
		var lByte = mem_read(addr);
		var hByte = mem_read(addr+1);
		return hByte << 8 | lByte;
	}

	var statusRegisters = function() {
		// Bit No.       7   6   5   4   3   2   1   0
		// 			     S   V       B   D   I   Z   C
		var registers = 0x00;

		registers |= this.fc << 0;
		registers |= this.fz << 1;	
		registers |= this.fi << 2;
		registers |= this.fd << 3;
		registers |= this.fb << 4;
		registers |= this.fu << 5;
		registers |= this.fo << 6;
		registers |= this.fn << 7;

		return registers;
	};

	var setStatusRegisters = function(value) {
		this.fc = (value >> 0) & 1;
		this.fz = (value >> 1) & 1;
		this.fi = (value >> 2) & 1;
		this.fd = (value >> 3) & 1;
		this.fb = (value >> 4) & 1;
		this.fu = (value >> 5) & 1;
		this.fo = (value >> 6) & 1;
		this.fn = (value >> 7) & 1;
	};

	var bigCycle = function() {
		var opcode = mem_read(this.pc);
		var op = opcodes[opcode];

		var addrMode = op.addrMode;
		var address = 0;

		switch (addrMode) {
			case Mode.ACC:
				address = 0;
				brea;
			case Mode.IMMEDIATE:
				address = this.pc + 1;
				break;
			case Mode.ZERO_PAGE:
				break;
			case Mode.ZERO_PAGE_X:
				break;
			case Mode.ZERO_PAGE_Y:
				break;
			case Mode.ABSOLUTE:
				 break;
			case Mode.ABSOLUTE_X:
				break;
			case Mode.ABSOLUTE_Y:
				 break;
			case Mode.IMPLIED:
				address = 0;
				break;
			case Mode.RELATIVE:
				break;
			case Mode.INDIRECT_X:
				break;
			case Mode.INDIRECT_Y:
				break;
			case Mode.ABSOLUTE_INDIRECT:
				break;
			default:
				break;
		}
	};

	var setZero = function(value) {
		this.fz = value == 0 ? 1 : 0;
	};

	var setNegative = function(value) {
		this.fn = value & 0x80 != 0 ? 1 : 0;	
	}

	var setCarry = function(value) {
		this.fc = value > 0xff;
	}

	var setBreak = function(value) {
		this.fb = value;
	}

	var setInterrupt = function(value) {
		this.fi = value;
	}

	var setOverflow = function(value) {
		if (value) {
			this.fo = 1;
		} else { 
			this.fo = 0;
		}
	}
	
	var adc = function (mem) {
		// unsigned int temp = src + AC + (IF_CARRY() ? 1 : 0);
		// SET_ZERO(temp & 0xff);	/* This is not valid in decimal mode */
		// SET_SIGN(temp);
		// SET_OVERFLOW(!((AC ^ src) & 0x80) && ((AC ^ temp) & 0x80));
		// SET_CARRY(temp > 0xff
		// AC = ((BYTE) temp);

		var tmp = this.acc + mem + this.fc;
		setZero(tmp);
		setNegative(tmp);
		setCarry(tmp);
		// this.fz = tmp == 0 ? 1 : 0;
		// this.fn = tmp & 0x80 != 0 ? 1 : 0;
		// this.fc = tmp > 0xff;
		this.fo = !(((this.acc ^ mem) & 0x80) && ((this.acc ^ tmp) & 0x80));

		this.acc = tmp;

		// this.fo = (tmp ^ this.acc) & (tmp ^ mem) & 0x80;
		// this.fc = (tmp & 0x100) > 8;
		// this.fz = this.fn = this.acc = tmp & 0xFF;
		// this.fz = !this.fz;
	};

	var ahx = function () {
		assert(false, "ahx is an illegal opcode");
	};

	var alr = function () {
		assert(false, "alr is an illegal opcode");
	};

	var anc = function () {
		assert(false, "anc is an illegal opcode");
	};

	var and = function (mem) {
		mem = this.acc & mem;
		setZero(mem);
		setNegative(mem);
		// this.fz = mem == 0 ? 1 : 0;
		// this.fn = tmp & 0x80 != 0 ? 1 : 0;
		this.acc = mem	
	};

	var arr = function () {
		assert(false, "arr is an illegal opcode");
	};

	var asl = function (mem, mode) {
		setCarry(mem & 0x80);
		mem <<= 1;
		mem &= 0xFF;
		setNegative(mem);
		setZero(mem);
		
		if (mode == Mode.ACC) {
			this.acc = mem
		} else {
// ????
		}
	};

	var axs = function () {
		assert(false, "axs is an illegal opcode");
	};

	var bcc = function (mem) {
		if (!this.fc) {
// ????
			var rel_addr = this.pc + mem;
			var a = this.pc & 0xFF00 != rel_addr & 0xFF00;
			this.cycles += 1;
			if (a) {
				this.cycles += 1;
			}
			this.pc = mem;
		}	
	};

	var bcs = function (mem) {
		if (this.fc) {
// ????
			var rel_addr = this.pc + mem;
			var a = this.pc & 0xFF00 != rel_addr & 0xFF00;
			this.cycles += 1;
			if (a) {
				this.cycles += 1;
			}
			this.pc = mem;
		}	
	};
	var beq = function (mem) {
		if (this.fz) {
// ????
			var rel_addr = this.pc + mem;
			var a = this.pc & 0xFF00 != rel_addr & 0xFF00;
			this.cycles += 1;
			if (a) {
				this.cycles += 1;
			}
			this.pc = mem;
		}	
		
	};

	var bit = function (mem) {
		setNegative(mem);	
		setOverflow(0x40 & mem);
		setZero(mem & this.acc);
	};

	var bmi = function (mem) {
		if (this.fn) {
// ????
			var rel_addr = this.pc + mem;
			var a = this.pc & 0xFF00 != rel_addr & 0xFF00;
			this.cycles += 1;
			if (a) {
				this.cycles += 1;
			}
			this.pc = mem;
		}	
	};

	var bne = function (mem) {
		if (!this.fz) {
// ????
			var rel_addr = this.pc + mem;
			var a = this.pc & 0xFF00 != rel_addr & 0xFF00;
			this.cycles += 1;
			if (a) {
				this.cycles += 1;
			}
			this.pc = mem;
		}	
	};

	var bpl = function (mem) {
		if (!this.fn) {
// ????
			var rel_addr = this.pc + mem;
			var a = this.pc & 0xFF00 != rel_addr & 0xFF00;
			this.cycles += 1;
			if (a) {
				this.cycles += 1;
			}
			this.pc = mem;
		}	
	};

	var brk = function () {
		this.pc += 1;
		push16(this.pc);
		setBreak(1);
		setInterrupt(1);
		this.pc = read16(0xFFFE); 
	};

	var bvc = function (mem) {
		// if (!IF_OVERFLOW()) {
		// 	clk += ((PC & 0xFF00) != (REL_ADDR(PC, src) & 0xFF00) ? 2 : 1);
		// 	PC = REL_ADDR(PC, src);
		// }
		if (!this.fo) {
			var rel_addr = this.pc + mem;
			var a = this.pc & 0xFF00 != rel_addr & 0xFF00;
			this.cycles += 1;
			if (a) {
				this.cycles += 1;
			}
			this.pc = mem;	
		}
	};

	var bvs = function (mem) {
		if (this.fo) {
			var rel_addr = this.pc + mem;
			var a = this.pc & 0xFF00 != rel_addr & 0xFF00;
			this.cycles += 1;
			if (a) {
				this.cycles += 1;
			}
			this.pc = mem;
		}
	};

	var clc = function () {
		this.fc = 0;
	};
	var cld = function () {
		this.fd = 0;
	};

	var cli = function () {
		this.fi = 0;
	};

	var clv = function () {
		this.fo = 0;
	};

	var cmp = function (mem) {
		var tmp = this.acc - mem;
		setCarry(tmp < 0x100);
		setNegative(tmp);
		setZero(tmp &= 0xFF);	
	};

	var cpx = function (mem) {
		var tmp = this.x - mem;
		setCarry(tmp < 0x100);
		setNegative(tmp);
		setZero(tmp &= 0xFF);		
	};

	var cpy = function (mem) {
		var tmp = this.y - mem;
		setCarry(tmp < 0x100);
		setNegative(tmp);
		setZero(tmp &= 0xFF);	
	};

	var dcp = function () {
		assert(false, "dcp is an illegal opcode");	
	};

	var dec = function (addr) {
		// src = (src - 1) & 0xff;
		// SET_SIGN(src);
		// SET_ZERO(src);
		// STORE(address, (src));
		var src = (addr - 1) & 0xFF;
		setNegative(src);
		setZero(src);
		write(addr, src);
	};

	var dex = function () {
		var src = (this.x - 1) & 0xFF;
		setNegative(src);
		setZero(src);
		this.x = src;
	};

	var dey = function () {
		var src = (this.y - 1) & 0xFF;
		setNegative(src);
		setZero(src);
		this.y = src;
	};

	var eor = function (addr) {
		// src ^= AC;
		// SET_SIGN(src);
		// SET_ZERO(src);
		// AC = src;

		var src = mem_read(add);
		this.acc = this.acc ^ src;
		setNegative(this.acc);
		setZero(this.acc);
	};

	var inc = function (addr) {
		// src = (src + 1) & 0xff;
		// SET_SIGN(src);
		// SET_ZERO(src);
		// STORE(address, (src));

		var src = (addr + 1) & 0xFF;
		setNegative(src);
		setZero(src);
		write(addr, src);
	};

	var inx = function () {
		var src = (this.x + 1) & 0xFF;
		setNegative(src);
		setZero(src);
		this.x = src;
	};

	var iny = function () {
		var src = (this.y + 1) & 0xFF;
		setNegative(src);
		setZero(src);
		this.y = src;
	};

	var isc = function () {
		assert(false, "isc is an illegal opcode");
	};

	var jmp = function (addr) {
		this.pc = addr; 
	};

	var jsr = function (addr) {
		// PC--;
		// PUSH((PC >> 8) & 0xff);	/* Push return address onto the stack. */
		// PUSH(PC & 0xff);
		// PC = (src);
		this.pc -= 1;
		push16(this.pc);
		this.pc = addr;
	};

	var kil = function () {
		assert(false, "kil is an illegal opcode");
	};

	var las = function () {
		assert(false, "las is an illegal opcode");
	};

	var lax = function () {
		assert(false, "lax is an illegal opcode");
	};

	var lda = function (addr) {
		var src = mem_read(addr);
		setNegative(src);
		setZero(src);
		this.acc = src;
	};

	var ldx = function (addr) {
		var src = mem_read(addr);
		setNegative(src);
		setZero(src);
		this.x = src;
	};

	var ldy = function (addr) {
		var src = mem_read(addr);
		setNegative(src);
		setZero(src);
		this.y = src;
	};

	var lsr = function (addr, mode) {
		// SET_CARRY(src & 0x01);
		// src >>= 1;
		// SET_SIGN(src);
		// SET_ZERO(src);
		// STORE src in memory or accumulator depending on addressing mode.

		var src = mem_read(addr);
		setCarry(src & 0x01);
		src >>= 1;
		setNegative(src);
		setZero(src);

		//??????
		if (mode == Mode.ACC) {
			this.acc = src;
		} else {
			write(addr, src);
		}
	};

	var nop = function () {
		// Simplest opcode ever, basically nothing.
	};

	var ora = function (addr) {
		// src |= AC;
		// SET_SIGN(src);
		// SET_ZERO(src);
		// AC = src;
		var src = mem_read(addr);
		src = src | this.acc;
		setNegative(src);
		setZero(src);
		this.acc = src;
	};

	var pha = function () {
		var value = this.acc;
		push(value);
	};

	var php = function () {
		var src = statusRegisters();
		push(src);
	};

	var pla = function () {
		this.acc = pop();
		setNegative(this.acc);
		setZero(this.acc);
	};

	var plp = function () {
		var src = pop();
		setStatusRegisters(src);
	};

	var rla = function () {
		assert(false, "rla is an illegal opcode");
	};

	var rol = function (addr, mode) {
		// src <<= 1;
		// if (IF_CARRY()) src |= 0x1;
		// SET_CARRY(src > 0xff);
		// src &= 0xff;
		// SET_SIGN(src);
		// SET_ZERO(src);
		// STORE src in memory or accumulator depending on addressing mode.

		if (mode == Mode.ACC) {
			
			var src = mem_read(addr);
			src <<= 1;
			if (this.fc) {
				src |= 0x1;
			}
			setCarry(src > 0xFF);
			src &= 0xFF;
			setNegative(src);
			setZero(src);

			this.acc = src;
		} else {
			var src = mem_read(addr);
			src <<= 1;
			if (this.fc) {
				src |= 0x1;
			}
			setCarry(src > 0xFF);
			src &= 0xFF;
			setNegative(src);
			setZero(src);
			write(addr, src);
		}
	};

	var ror = function (addr, mode) {
		// if (IF_CARRY()) src |= 0x100;
		// SET_CARRY(src & 0x01);
		// src >>= 1;
		// SET_SIGN(src);
		// SET_ZERO(src);
		// STORE src in memory or accumulator depending on addressing mode.
		var src = mem_read(addr);
		if (this.fc) {
			src |= 0x100;
		}
		setCarry(src & 0x01);
		src >>= 1;
		setNegative(src);
		setZero(src);

		if (mode == Mode.ACC) {
			this.acc = src;
		} else {
			write(addr, src);
		}
	};

	var rra = function () {
		assert(false, "rra is an illegal opcode");
	};

	var rti = function () {
		// src = PULL();
		// SET_SR(src);
		// src = PULL();
		// src |= (PULL() << 8);	/* Load return address from stack. */
		// PC = (src);
		var src = pop();
		setStatusRegisters(src);
		src = pop();
		src |= (pop() << 8);
		this.pc = src;
	};

	var rts = function () {
		// src = PULL();
		// src += ((PULL()) << 8) + 1;	/* Load return address from stack and add 1. */
		// PC = (src);
		var src = pop16();
		this.pc = src + 1;
	};

	var sax = function () {
		assert(false, "sax is an illegal opcode");
	};

	var sbc = function (addr) {
		// unsigned int temp = AC - src - (IF_CARRY() ? 0 : 1);
		// SET_SIGN(temp);
		// SET_ZERO(temp & 0xff);	/* Sign and Zero are invalid in decimal mode */
		// SET_OVERFLOW(((AC ^ temp) & 0x80) && ((AC ^ src) & 0x80));
		// if (IF_DECIMAL()) {
		// 	if ( ((AC & 0xf) - (IF_CARRY() ? 0 : 1)) < (src & 0xf)) /* EP */ temp -= 6;
		// 	if (temp > 0x99) temp -= 0x60;
		// }
		// SET_CARRY(temp < 0x100);
		// AC = (temp & 0xff);
		var src = mem_read(addr);
		var tmp = this.acc - src - (this.fc ? 0 : 1);
		setNegative(tmp);
		setZero(tmp & 0xFF);
		
		if (((this.acc ^ tmp) & 0x80) && ((this.acc ^ src) & 0x80)) {
			this.fo = 1;
		}  else {
			this.fo = 0;
		}
		
		setCarry(tmp < 0x100);
		this.acc = tmp & 0xFF;
	};

	var sec = function () {
		this.fc = 1;
	};

	var sed = function () {
		this.fd = 1;
	};

	var sei = function () {
		this.fi = 1;
	};

	var shx = function () {
		assert(false, "shx is an illegal opcode");
	};

	var shy = function () {
		assert(false, "shy is an illegal opcode");
	};

	var slo = function () {
		assert(false, "slo is an illegal opcode");
	};

	var sre = function () {
		assert(false, "sre is an illegal opcode");
	};

	var sta = function (addr) {
		write(addr, this.acc);
	};

	var stx = function (addr) {
		write(addr, this.x);
	};

	var sty = function () {
		write(addr, this.y);
	};

	var tas = function () {
		assert(false, "tas is an illegal opcode");
	};

	var tax = function () {
		var src = this.acc;
		setNegative(src);
		setZero(src);
		this.x = src;
	};

	var tay = function () {
		var src = this.acc;
		setNegative(src);
		setZero(src);
		this.y = src;
	};

	var tsx = function () {
		var src = this.sp;
		setNegative(src);
		setZero(src);
		this.x = src;
	};

	var txa = function () {
		var src = this.x;
		setNegative(src);
		setZero(src);
		this.acc = src;
	};

	var txs = function () {
		this.sp = this.x;
	};

	var tya = function () {
		var src = this.y;
		setNegative(src);
		setZero(src);
		this.acc = src;
	};

	var xaa = function () {
		assert(false, "xaa is an illegal opcode");
	};

	var opcodes = [
		new Opcode(brk, Mode.IMPLIED, 1, 7, 0),
		new Opcode(ora, Mode.INDIRECT_X, 2, 6, 0),
		new Opcode(kil, Mode.IMPLIED, 0, 2, 0),
		new Opcode(slo, Mode.INDIRECT_X, 0, 8, 0),
		new Opcode(nop, Mode.ZERO_PAGE, 2, 3, 0),
		new Opcode(ora, Mode.ZERO_PAGE, 2, 3, 0),
		new Opcode(asl, Mode.ZERO_PAGE, 2, 5, 0),
		new Opcode(slo, Mode.ZERO_PAGE, 0, 5, 0),
		new Opcode(php, Mode.IMPLIED, 1, 3, 0),
		new Opcode(ora, Mode.IMMEDIATE, 2, 2, 0),
		new Opcode(asl, Mode.ACC, 1, 2, 0),
		new Opcode(anc, Mode.IMMEDIATE, 0, 2, 0),
		new Opcode(nop, Mode.ABSOLUTE, 3, 4, 0),
		new Opcode(ora, Mode.ABSOLUTE, 3, 4, 0),
		new Opcode(asl, Mode.ABSOLUTE, 3, 6, 0),
		new Opcode(slo, Mode.ABSOLUTE, 0, 6, 0),
		new Opcode(bpl, Mode.RELATIVE, 2, 2, 1),
		new Opcode(ora, Mode.INDIRECT_Y, 2, 5, 1),
		new Opcode(kil, Mode.IMPLIED, 0, 2, 0),
		new Opcode(slo, Mode.INDIRECT_Y, 0, 8, 0),
		new Opcode(nop, Mode.ZERO_PAGE_X, 2, 4, 0),
		new Opcode(ora, Mode.ZERO_PAGE_X, 2, 4, 0),
		new Opcode(asl, Mode.ZERO_PAGE_X, 2, 6, 0),
		new Opcode(slo, Mode.ZERO_PAGE_X, 0, 6, 0),
		new Opcode(clc, Mode.IMPLIED, 1, 2, 0),
		new Opcode(ora, Mode.ABSOLUTE_Y, 3, 4, 1),
		new Opcode(nop, Mode.IMPLIED, 1, 2, 0),
		new Opcode(slo, Mode.ABSOLUTE_Y, 0, 7, 0),
		new Opcode(nop, Mode.ABSOLUTE_X, 3, 4, 1),
		new Opcode(ora, Mode.ABSOLUTE_X, 3, 4, 1),
		new Opcode(asl, Mode.ABSOLUTE_X, 3, 7, 0),
		new Opcode(slo, Mode.ABSOLUTE_X, 0, 7, 0),
		new Opcode(jsr, Mode.ABSOLUTE, 3, 6, 0),
		new Opcode(and, Mode.INDIRECT_X, 2, 6, 0),
		new Opcode(kil, Mode.IMPLIED, 0, 2, 0),
		new Opcode(rla, Mode.INDIRECT_X, 0, 8, 0),
		new Opcode(bit, Mode.ZERO_PAGE, 2, 3, 0),
		new Opcode(and, Mode.ZERO_PAGE, 2, 3, 0),
		new Opcode(rol, Mode.ZERO_PAGE, 2, 5, 0),
		new Opcode(rla, Mode.ZERO_PAGE, 0, 5, 0),
		new Opcode(plp, Mode.IMPLIED, 1, 4, 0),
		new Opcode(and, Mode.IMMEDIATE, 2, 2, 0),
		new Opcode(rol, Mode.ACC, 1, 2, 0),
		new Opcode(anc, Mode.IMMEDIATE, 0, 2, 0),
		new Opcode(bit, Mode.ABSOLUTE, 3, 4, 0),
		new Opcode(and, Mode.ABSOLUTE, 3, 4, 0),
		new Opcode(rol, Mode.ABSOLUTE, 3, 6, 0),
		new Opcode(rla, Mode.ABSOLUTE, 0, 6, 0),
		new Opcode(bmi, Mode.RELATIVE, 2, 2, 1),
		new Opcode(and, Mode.INDIRECT_Y, 2, 5, 1),
		new Opcode(kil, Mode.IMPLIED, 0, 2, 0),
		new Opcode(rla, Mode.INDIRECT_Y, 0, 8, 0),
		new Opcode(nop, Mode.ZERO_PAGE_X, 2, 4, 0),
		new Opcode(and, Mode.ZERO_PAGE_X, 2, 4, 0),
		new Opcode(rol, Mode.ZERO_PAGE_X, 2, 6, 0),
		new Opcode(rla, Mode.ZERO_PAGE_X, 0, 6, 0),
		new Opcode(sec, Mode.IMPLIED, 1, 2, 0),
		new Opcode(and, Mode.ABSOLUTE_Y, 3, 4, 1),
		new Opcode(nop, Mode.IMPLIED, 1, 2, 0),
		new Opcode(rla, Mode.ABSOLUTE_Y, 0, 7, 0),
		new Opcode(nop, Mode.ABSOLUTE_X, 3, 4, 1),
		new Opcode(and, Mode.ABSOLUTE_X, 3, 4, 1),
		new Opcode(rol, Mode.ABSOLUTE_X, 3, 7, 0),
		new Opcode(rla, Mode.ABSOLUTE_X, 0, 7, 0),
		new Opcode(rti, Mode.IMPLIED, 1, 6, 0),
		new Opcode(eor, Mode.INDIRECT_X, 2, 6, 0),
		new Opcode(kil, Mode.IMPLIED, 0, 2, 0),
		new Opcode(sre, Mode.INDIRECT_X, 0, 8, 0),
		new Opcode(nop, Mode.ZERO_PAGE, 2, 3, 0),
		new Opcode(eor, Mode.ZERO_PAGE, 2, 3, 0),
		new Opcode(lsr, Mode.ZERO_PAGE, 2, 5, 0),
		new Opcode(sre, Mode.ZERO_PAGE, 0, 5, 0),
		new Opcode(pha, Mode.IMPLIED, 1, 3, 0),
		new Opcode(eor, Mode.IMMEDIATE, 2, 2, 0),
		new Opcode(lsr, Mode.ACC, 1, 2, 0),
		new Opcode(alr, Mode.IMMEDIATE, 0, 2, 0),
		new Opcode(jmp, Mode.ABSOLUTE, 3, 3, 0),
		new Opcode(eor, Mode.ABSOLUTE, 3, 4, 0),
		new Opcode(lsr, Mode.ABSOLUTE, 3, 6, 0),
		new Opcode(sre, Mode.ABSOLUTE, 0, 6, 0),
		new Opcode(bvc, Mode.RELATIVE, 2, 2, 1),
		new Opcode(eor, Mode.INDIRECT_Y, 2, 5, 1),
		new Opcode(kil, Mode.IMPLIED, 0, 2, 0),
		new Opcode(sre, Mode.INDIRECT_Y, 0, 8, 0),
		new Opcode(nop, Mode.ZERO_PAGE_X, 2, 4, 0),
		new Opcode(eor, Mode.ZERO_PAGE_X, 2, 4, 0),
		new Opcode(lsr, Mode.ZERO_PAGE_X, 2, 6, 0),
		new Opcode(sre, Mode.ZERO_PAGE_X, 0, 6, 0),
		new Opcode(cli, Mode.IMPLIED, 1, 2, 0),
		new Opcode(eor, Mode.ABSOLUTE_Y, 3, 4, 1),
		new Opcode(nop, Mode.IMPLIED, 1, 2, 0),
		new Opcode(sre, Mode.ABSOLUTE_Y, 0, 7, 0),
		new Opcode(nop, Mode.ABSOLUTE_X, 3, 4, 1),
		new Opcode(eor, Mode.ABSOLUTE_X, 3, 4, 1),
		new Opcode(lsr, Mode.ABSOLUTE_X, 3, 7, 0),
		new Opcode(sre, Mode.ABSOLUTE_X, 0, 7, 0),
		new Opcode(rts, Mode.IMPLIED, 1, 6, 0),
		new Opcode(adc, Mode.INDIRECT_X, 2, 6, 0),
		new Opcode(kil, Mode.IMPLIED, 0, 2, 0),
		new Opcode(rra, Mode.INDIRECT_X, 0, 8, 0),
		new Opcode(nop, Mode.ZERO_PAGE, 2, 3, 0),
		new Opcode(adc, Mode.ZERO_PAGE, 2, 3, 0),
		new Opcode(ror, Mode.ZERO_PAGE, 2, 5, 0),
		new Opcode(rra, Mode.ZERO_PAGE, 0, 5, 0),
		new Opcode(pla, Mode.IMPLIED, 1, 4, 0),
		new Opcode(adc, Mode.IMMEDIATE, 2, 2, 0),
		new Opcode(ror, Mode.ACC, 1, 2, 0),
		new Opcode(arr, Mode.IMMEDIATE, 0, 2, 0),
		new Opcode(jmp, Mode.ABSOLUTE_INDIRECT, 3, 5, 0),
		new Opcode(adc, Mode.ABSOLUTE, 3, 4, 0),
		new Opcode(ror, Mode.ABSOLUTE, 3, 6, 0),
		new Opcode(rra, Mode.ABSOLUTE, 0, 6, 0),
		new Opcode(bvs, Mode.RELATIVE, 2, 2, 1),
		new Opcode(adc, Mode.INDIRECT_Y, 2, 5, 1),
		new Opcode(kil, Mode.IMPLIED, 0, 2, 0),
		new Opcode(rra, Mode.INDIRECT_Y, 0, 8, 0),
		new Opcode(nop, Mode.ZERO_PAGE_X, 2, 4, 0),
		new Opcode(adc, Mode.ZERO_PAGE_X, 2, 4, 0),
		new Opcode(ror, Mode.ZERO_PAGE_X, 2, 6, 0),
		new Opcode(rra, Mode.ZERO_PAGE_X, 0, 6, 0),
		new Opcode(sei, Mode.IMPLIED, 1, 2, 0),
		new Opcode(adc, Mode.ABSOLUTE_Y, 3, 4, 1),
		new Opcode(nop, Mode.IMPLIED, 1, 2, 0),
		new Opcode(rra, Mode.ABSOLUTE_Y, 0, 7, 0),
		new Opcode(nop, Mode.ABSOLUTE_X, 3, 4, 1),
		new Opcode(adc, Mode.ABSOLUTE_X, 3, 4, 1),
		new Opcode(ror, Mode.ABSOLUTE_X, 3, 7, 0),
		new Opcode(rra, Mode.ABSOLUTE_X, 0, 7, 0),
		new Opcode(nop, Mode.IMMEDIATE, 2, 2, 0),
		new Opcode(sta, Mode.INDIRECT_X, 2, 6, 0),
		new Opcode(nop, Mode.IMMEDIATE, 0, 2, 0),
		new Opcode(sax, Mode.INDIRECT_X, 0, 6, 0),
		new Opcode(sty, Mode.ZERO_PAGE, 2, 3, 0),
		new Opcode(sta, Mode.ZERO_PAGE, 2, 3, 0),
		new Opcode(stx, Mode.ZERO_PAGE, 2, 3, 0),
		new Opcode(sax, Mode.ZERO_PAGE, 0, 3, 0),
		new Opcode(dey, Mode.IMPLIED, 1, 2, 0),
		new Opcode(nop, Mode.IMMEDIATE, 0, 2, 0),
		new Opcode(txa, Mode.IMPLIED, 1, 2, 0),
		new Opcode(xaa, Mode.IMMEDIATE, 0, 2, 0),
		new Opcode(sty, Mode.ABSOLUTE, 3, 4, 0),
		new Opcode(sta, Mode.ABSOLUTE, 3, 4, 0),
		new Opcode(stx, Mode.ABSOLUTE, 3, 4, 0),
		new Opcode(sax, Mode.ABSOLUTE, 0, 4, 0),
		new Opcode(bcc, Mode.RELATIVE, 2, 2, 1),
		new Opcode(sta, Mode.INDIRECT_Y, 2, 6, 0),
		new Opcode(kil, Mode.IMPLIED, 0, 2, 0),
		new Opcode(ahx, Mode.INDIRECT_Y, 0, 6, 0),
		new Opcode(sty, Mode.ZERO_PAGE_X, 2, 4, 0),
		new Opcode(sta, Mode.ZERO_PAGE_X, 2, 4, 0),
		new Opcode(stx, Mode.ZERO_PAGE_Y, 2, 4, 0),
		new Opcode(sax, Mode.ZERO_PAGE_Y, 0, 4, 0),
		new Opcode(tya, Mode.IMPLIED, 1, 2, 0),
		new Opcode(sta, Mode.ABSOLUTE_Y, 3, 5, 0),
		new Opcode(txs, Mode.IMPLIED, 1, 2, 0),
		new Opcode(tas, Mode.ABSOLUTE_Y, 0, 5, 0),
		new Opcode(shy, Mode.ABSOLUTE_X, 0, 5, 0),
		new Opcode(sta, Mode.ABSOLUTE_X, 3, 5, 0),
		new Opcode(shx, Mode.ABSOLUTE_Y, 0, 5, 0),
		new Opcode(ahx, Mode.ABSOLUTE_Y, 0, 5, 0),
		new Opcode(ldy, Mode.IMMEDIATE, 2, 2, 0),
		new Opcode(lda, Mode.INDIRECT_X, 2, 6, 0),
		new Opcode(ldx, Mode.IMMEDIATE, 2, 2, 0),
		new Opcode(lax, Mode.INDIRECT_X, 0, 6, 0),
		new Opcode(ldy, Mode.ZERO_PAGE, 2, 3, 0),
		new Opcode(lda, Mode.ZERO_PAGE, 2, 3, 0),
		new Opcode(ldx, Mode.ZERO_PAGE, 2, 3, 0),
		new Opcode(lax, Mode.ZERO_PAGE, 0, 3, 0),
		new Opcode(tay, Mode.IMPLIED, 1, 2, 0),
		new Opcode(lda, Mode.IMMEDIATE, 2, 2, 0),
		new Opcode(tax, Mode.IMPLIED, 1, 2, 0),
		new Opcode(lax, Mode.IMMEDIATE, 0, 2, 0),
		new Opcode(ldy, Mode.ABSOLUTE, 3, 4, 0),
		new Opcode(lda, Mode.ABSOLUTE, 3, 4, 0),
		new Opcode(ldx, Mode.ABSOLUTE, 3, 4, 0),
		new Opcode(lax, Mode.ABSOLUTE, 0, 4, 0),
		new Opcode(bcs, Mode.RELATIVE, 2, 2, 1),
		new Opcode(lda, Mode.INDIRECT_Y, 2, 5, 1),
		new Opcode(kil, Mode.IMPLIED, 0, 2, 0),
		new Opcode(lax, Mode.INDIRECT_Y, 0, 5, 1),
		new Opcode(ldy, Mode.ZERO_PAGE_X, 2, 4, 0),
		new Opcode(lda, Mode.ZERO_PAGE_X, 2, 4, 0),
		new Opcode(ldx, Mode.ZERO_PAGE_Y, 2, 4, 0),
		new Opcode(lax, Mode.ZERO_PAGE_Y, 0, 4, 0),
		new Opcode(clv, Mode.IMPLIED, 1, 2, 0),
		new Opcode(lda, Mode.ABSOLUTE_Y, 3, 4, 1),
		new Opcode(tsx, Mode.IMPLIED, 1, 2, 0),
		new Opcode(las, Mode.ABSOLUTE_Y, 0, 4, 1),
		new Opcode(ldy, Mode.ABSOLUTE_X, 3, 4, 1),
		new Opcode(lda, Mode.ABSOLUTE_X, 3, 4, 1),
		new Opcode(ldx, Mode.ABSOLUTE_Y, 3, 4, 1),
		new Opcode(lax, Mode.ABSOLUTE_Y, 0, 4, 1),
		new Opcode(cpy, Mode.IMMEDIATE, 2, 2, 0),
		new Opcode(cmp, Mode.INDIRECT_X, 2, 6, 0),
		new Opcode(nop, Mode.IMMEDIATE, 0, 2, 0),
		new Opcode(dcp, Mode.INDIRECT_X, 0, 8, 0),
		new Opcode(cpy, Mode.ZERO_PAGE, 2, 3, 0),
		new Opcode(cmp, Mode.ZERO_PAGE, 2, 3, 0),
		new Opcode(dec, Mode.ZERO_PAGE, 2, 5, 0),
		new Opcode(dcp, Mode.ZERO_PAGE, 0, 5, 0),
		new Opcode(iny, Mode.IMPLIED, 1, 2, 0),
		new Opcode(cmp, Mode.IMMEDIATE, 2, 2, 0),
		new Opcode(dex, Mode.IMPLIED, 1, 2, 0),
		new Opcode(axs, Mode.IMMEDIATE, 0, 2, 0),
		new Opcode(cpy, Mode.ABSOLUTE, 3, 4, 0),
		new Opcode(cmp, Mode.ABSOLUTE, 3, 4, 0),
		new Opcode(dec, Mode.ABSOLUTE, 3, 6, 0),
		new Opcode(dcp, Mode.ABSOLUTE, 0, 6, 0),
		new Opcode(bne, Mode.RELATIVE, 2, 2, 1),
		new Opcode(cmp, Mode.INDIRECT_Y, 2, 5, 1),
		new Opcode(kil, Mode.IMPLIED, 0, 2, 0),
		new Opcode(dcp, Mode.INDIRECT_Y, 0, 8, 0),
		new Opcode(nop, Mode.ZERO_PAGE_X, 2, 4, 0),
		new Opcode(cmp, Mode.ZERO_PAGE_X, 2, 4, 0),
		new Opcode(dec, Mode.ZERO_PAGE_X, 2, 6, 0),
		new Opcode(dcp, Mode.ZERO_PAGE_X, 0, 6, 0),
		new Opcode(cld, Mode.IMPLIED, 1, 2, 0),
		new Opcode(cmp, Mode.ABSOLUTE_Y, 3, 4, 1),
		new Opcode(nop, Mode.IMPLIED, 1, 2, 0),
		new Opcode(dcp, Mode.ABSOLUTE_Y, 0, 7, 0),
		new Opcode(nop, Mode.ABSOLUTE_X, 3, 4, 1),
		new Opcode(cmp, Mode.ABSOLUTE_X, 3, 4, 1),
		new Opcode(dec, Mode.ABSOLUTE_X, 3, 7, 0),
		new Opcode(dcp, Mode.ABSOLUTE_X, 0, 7, 0),
		new Opcode(cpx, Mode.IMMEDIATE, 2, 2, 0),
		new Opcode(sbc, Mode.INDIRECT_X, 2, 6, 0),
		new Opcode(nop, Mode.IMMEDIATE, 0, 2, 0),
		new Opcode(isc, Mode.INDIRECT_X, 0, 8, 0),
		new Opcode(cpx, Mode.ZERO_PAGE, 2, 3, 0),
		new Opcode(sbc, Mode.ZERO_PAGE, 2, 3, 0),
		new Opcode(inc, Mode.ZERO_PAGE, 2, 5, 0),
		new Opcode(isc, Mode.ZERO_PAGE, 0, 5, 0),
		new Opcode(inx, Mode.IMPLIED, 1, 2, 0),
		new Opcode(sbc, Mode.IMMEDIATE, 2, 2, 0),
		new Opcode(nop, Mode.IMPLIED, 1, 2, 0),
		new Opcode(sbc, Mode.IMMEDIATE, 0, 2, 0),
		new Opcode(cpx, Mode.ABSOLUTE, 3, 4, 0),
		new Opcode(sbc, Mode.ABSOLUTE, 3, 4, 0),
		new Opcode(inc, Mode.ABSOLUTE, 3, 6, 0),
		new Opcode(isc, Mode.ABSOLUTE, 0, 6, 0),
		new Opcode(beq, Mode.RELATIVE, 2, 2, 1),
	
module.exports = {
	CPU: CPU,
	Opcode: Opcode,
};
