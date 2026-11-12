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

export const EXAMPLES: readonly Example[] = [
  { file: 'hello.asm', summary: 'Print a string', source: HELLO },
  { file: 'fibonacci.asm', summary: 'Loops, carry', source: FIBONACCI },
  { file: 'bubble-sort.asm', summary: 'Memory, CMP', source: BUBBLE_SORT },
  { file: 'keyboard-echo.asm', summary: 'IN / OUT ports', source: KEYBOARD_ECHO },
];

export const DEFAULT_PROGRAM = HELLO;
