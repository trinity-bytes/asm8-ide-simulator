import type { Locale } from './i18n.svelte';

interface ExampleText {
  /** Short name (Welcome list, docs). */
  readonly title: string;
  /** What the program shows (docs). */
  readonly description: string;
}

/** Titles and descriptions of the built-in examples (`@app/workspace/examples`), per language. */
export const EXAMPLE_TEXT: Readonly<Record<string, Record<Locale, ExampleText>>> = {
  'hello.asm': {
    en: {
      title: 'Print a string',
      description: 'Copies "Hello World!" to the Display from 0xE8 in a subroutine that saves A and B.',
    },
    es: {
      title: 'Imprimir una cadena',
      description: 'Copia "Hello World!" a la Pantalla desde 0xE8 en una subrutina que guarda A y B.',
    },
  },
  'fibonacci.asm': {
    en: {
      title: 'Loops, carry',
      description:
        'Writes the Fibonacci numbers below 256 to memory from 0x80; stops when an addition sets the carry flag.',
    },
    es: {
      title: 'Bucles, acarreo',
      description:
        'Escribe los números de Fibonacci menores que 256 en memoria desde 0x80; se detiene cuando una suma activa la bandera de acarreo.',
    },
  },
  'bubble-sort.asm': {
    en: {
      title: 'Memory, CMP',
      description: 'Sorts 8 bytes in memory with nested loops and CMP.',
    },
    es: {
      title: 'Memoria, CMP',
      description: 'Ordena 8 bytes en memoria con bucles anidados y CMP.',
    },
  },
  'keyboard-echo.asm': {
    en: {
      title: 'IN / OUT',
      description: 'Waits for keys with IN and prints each one with OUT until Enter.',
    },
    es: {
      title: 'IN / OUT',
      description: 'Espera teclas con IN e imprime cada una con OUT hasta Enter.',
    },
  },
  'print-string.asm': {
    en: {
      title: 'OUT, zero-terminated text',
      description: 'Walks a zero-terminated string with a pointer in C and prints each character with OUT.',
    },
    es: {
      title: 'OUT, texto terminado en 0',
      description: 'Recorre una cadena terminada en 0 con un puntero en C e imprime cada carácter con OUT.',
    },
  },
  'count.asm': {
    en: {
      title: 'Loop with a counter',
      description: 'A loop with a counter in B: turns each number into a digit and prints it.',
    },
    es: {
      title: 'Bucle con contador',
      description: 'Un bucle con un contador en B: convierte cada número en un dígito y lo imprime.',
    },
  },
  'subroutines.asm': {
    en: {
      title: 'CALL / RET, PUSH / POP',
      description:
        'Two routines: one squares A, the other prints it as a digit. Each saves the registers it changes.',
    },
    es: {
      title: 'CALL / RET, PUSH / POP',
      description:
        'Dos rutinas: una eleva A al cuadrado y la otra lo imprime como dígito. Cada una guarda los registros que cambia.',
    },
  },
};
