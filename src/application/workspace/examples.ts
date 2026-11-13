/** Built-in example programs (Welcome screen and the Examples workspace). */
export interface Example {
  readonly file: string;
  readonly summary: string;
  readonly source: string;
}

const HELLO = `; Simple example
; Writes Hello World to the output

\tJMP start
hello: DB "Hello World!" ; Variable
       DB 0\t; String terminator

start:
\tMOV C, hello    ; Point to var
\tMOV D, 232\t; Point to output
\tCALL print
        HLT             ; Stop execution

print:\t\t\t; print(C:*from, D:*to)
\tPUSH A
\tPUSH B
\tMOV B, 0
.loop:
\tMOV A, [C]\t; Get char from var
\tMOV [D], A\t; Write to output
\tINC C
\tINC D
\tCMP B, [C]\t; Check if end
\tJNZ .loop\t; jump if not

\tPOP B
\tPOP A
\tRET
`;

const FIBONACCI = `; Fibonacci numbers below 256
; Each number is written to memory from 0x80 and printed as a byte.

\tMOV A, 0        ; previous
\tMOV B, 1        ; current
\tMOV D, 0x80     ; where to store
next:
\tMOV [D], B      ; store current
\tINC D
\tMOV C, B        ; C = current
\tADD B, A        ; current = current + previous
\tJC done         ; stop when the sum passes 255
\tMOV A, C        ; previous = old current
\tJMP next
done:
\tHLT
`;

const BUBBLE_SORT = `; Bubble sort of 8 bytes, in place
; Watch the Memory writes tab while it runs.

\tJMP start
data: DB 7
\tDB 3
\tDB 9
\tDB 1
\tDB 8
\tDB 2
\tDB 6
last: DB 4       ; last element

start:
\tMOV D, 0        ; swapped flag
\tMOV C, data
pass:
\tMOV A, [C]
\tMOV B, [C+1]
\tCMP A, B
\tJNA noswap      ; A <= B: in order
\tMOV [C], B
\tMOV [C+1], A
\tMOV D, 1
noswap:
\tINC C
\tCMP C, last     ; compared up to the last pair?
\tJNZ pass
\tCMP D, 0
\tJNZ start       ; repeat until a pass makes no swap
\tHLT
`;

const KEYBOARD_ECHO = `; Keyboard echo — uses the new IN and OUT instructions
; Run it, then type in the console: every key is printed back.
; Press Enter to stop.

loop:
\tIN A            ; wait for a key
\tCMP A, 10       ; Enter?
\tJZ done
\tOUT A           ; print it
\tJMP loop
done:
\tHLT
`;

const PRINT_STRING = `; Print a zero-terminated string with OUT
\tJMP start
msg:\tDB "Hello!"
\tDB 0\t\t; end of the string

start:
\tMOV C, msg\t; C points to the text
next:
\tMOV A, [C]\t; load a character
\tCMP A, 0\t; end of the string?
\tJZ done
\tOUT A\t\t; print it
\tINC C
\tJMP next
done:
\tHLT
`;

const COUNT = `; Print the digits 0 to 9
\tMOV B, 0\t; counter
loop:
\tMOV A, B
\tADD A, '0'\t; number to character
\tOUT A
\tINC B
\tCMP B, 10\t; done after 9
\tJNZ loop
\tMOV A, 10\t; new line
\tOUT A
\tHLT
`;

const SUBROUTINES = `; Square a number and print it
\tMOV A, 3
\tCALL square\t; A = 3 x 3 = 9
\tCALL digit\t; prints 9
\tHLT

square:\t\t\t; A = A x A
\tPUSH B
\tMOV B, A
\tMUL B
\tPOP B
\tRET

digit:\t\t\t; print A (0-9) as a character
\tPUSH A
\tADD A, '0'
\tOUT A
\tPOP A
\tRET
`;

export const EXAMPLES: readonly Example[] = [
  { file: 'hello.asm', summary: 'Print a string', source: HELLO },
  { file: 'fibonacci.asm', summary: 'Loops, carry', source: FIBONACCI },
  { file: 'bubble-sort.asm', summary: 'Memory, CMP', source: BUBBLE_SORT },
  { file: 'keyboard-echo.asm', summary: 'IN / OUT', source: KEYBOARD_ECHO },
  { file: 'print-string.asm', summary: 'OUT, zero-terminated text', source: PRINT_STRING },
  { file: 'count.asm', summary: 'Loop with a counter', source: COUNT },
  { file: 'subroutines.asm', summary: 'CALL / RET, PUSH / POP', source: SUBROUTINES },
];

export const DEFAULT_PROGRAM = HELLO;
