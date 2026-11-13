import type { Locale } from './i18n.svelte';

/** General documentation shown above the instruction list, in every language. */
export type GuideId = 'registers' | 'syntax' | 'addressing' | 'memory' | 'io' | 'labels' | 'programs';

export interface GuideTable {
  readonly head: readonly string[];
  readonly rows: readonly (readonly string[])[];
}

export interface GuideSection {
  readonly id: GuideId;
  readonly title: string;
  readonly paragraphs: readonly string[];
  readonly table?: GuideTable;
  readonly examples?: readonly { readonly code: string; readonly note: string }[];
}

type SectionText = Omit<GuideSection, 'id'>;

const ORDER: readonly GuideId[] = ['registers', 'syntax', 'addressing', 'memory', 'io', 'labels', 'programs'];

const EN: Record<GuideId, SectionText> = {
  registers: {
    title: 'Registers and flags',
    paragraphs: [
      'The CPU has four general-purpose 8-bit registers, A, B, C and D. Each holds a value from 0 to 255; arithmetic that goes past 255 or below 0 wraps around.',
      'SP is the stack pointer and IP the instruction pointer. Every register starts at 0 except SP, which starts at 0xE7.',
      'Arithmetic, logic and CMP update the flags; MOV, jumps and stack instructions leave them alone.',
    ],
    table: {
      head: ['Name', 'Meaning'],
      rows: [
        ['A', 'Accumulator: MUL and DIV always work on it.'],
        ['B, C, D', 'General purpose; often counters and pointers.'],
        ['SP', 'Next free stack byte. Starts at 0xE7 (231).'],
        ['IP', 'Address of the next instruction. Starts at 0.'],
        ['Z', 'Zero: the last result was 0 (or CMP found equal values).'],
        ['C', 'Carry: the result went past 255 or below 0 (or CMP found a smaller register).'],
        ['F', 'Fault: a runtime error stopped the program. Reset to continue.'],
      ],
    },
  },
  syntax: {
    title: 'Numbers and characters',
    paragraphs: [
      'Every value is a byte from 0 to 255. Negative numbers cannot be written: use 255 for −1, 254 for −2 and so on.',
      "A character in single quotes is its code: 'A' is 65 and '0' is 48. A string in double quotes is only allowed with DB.",
      'Instruction and register names can be written in any case. Text after ; is a comment.',
    ],
    table: {
      head: ['Format', 'Example', 'Value'],
      rows: [
        ['Decimal', '200 or 200d', '200'],
        ['Hexadecimal', '0xC8', '200'],
        ['Octal', '0o310', '200'],
        ['Binary', '11001000b', '200'],
        ['Character', "'A'", '65'],
      ],
    },
    examples: [
      { code: "MOV A, 0x41\nMOV B, 'A'\nCMP A, B\t; equal: Z is set", note: 'Two ways to write 65.' },
    ],
  },
  addressing: {
    title: 'Addressing modes',
    paragraphs: [
      'An operand can be a constant, a register, a byte in memory at a fixed address, or a byte at the address held in a register, optionally plus or minus an offset from −16 to +15.',
      'Not every instruction accepts every mode: the Forms table of each instruction lists the ones it has. Only one operand of an instruction can be in memory.',
    ],
    table: {
      head: ['Mode', 'Example', 'Reads'],
      rows: [
        ['Constant', 'MOV A, 5', 'the value 5'],
        ['Register', 'MOV A, B', 'the value in B'],
        ['Direct', 'MOV A, [0x80]', 'the byte at address 0x80'],
        ['Indirect', 'MOV A, [C]', 'the byte at the address in C'],
        ['Indexed', 'MOV A, [C+2]', 'the byte at the address C + 2'],
        ['Stack', 'MOV A, [SP+1]', 'the byte on top of the stack'],
      ],
    },
    examples: [
      {
        code: 'MOV C, 0x80\nMOV [C], 7\nMOV A, [0x80]\t; A = 7',
        note: 'Write through a pointer, read back directly.',
      },
    ],
  },
  memory: {
    title: 'Memory map',
    paragraphs: [
      'Memory has 256 bytes, from 0x00 to 0xFF, and starts filled with 0. The program is copied to address 0 and runs from there, so it can be at most 256 bytes long.',
      'The stack starts at 0xE7 and grows down towards the program. The last 24 bytes, 0xE8 to 0xFF, are the display: each byte shows as one character.',
    ],
    table: {
      head: ['Addresses', 'Use'],
      rows: [
        ['0x00 …', 'Program and data (DB), from address 0 up.'],
        ['… 0xE7', 'Stack: SP starts at 0xE7 and grows down.'],
        ['0xE8 – 0xFF', 'Display: 24 character cells.'],
      ],
    },
  },
  io: {
    title: 'Input and output',
    paragraphs: [
      'OUT reg prints the register as a character in the Console; code 10 starts a new line. IN reg waits for a key typed in the Console and stores its code; while it waits the status shows Waiting for a key.',
      'Enter is read as 10, Backspace as 8 and Escape as 27. There are no I/O ports: IN and OUT only take a register.',
      'The Display shows memory 0xE8–0xFF: write characters there with MOV.',
    ],
    examples: [
      { code: "MOV A, 'O'\nOUT A\nMOV A, 'K'\nOUT A", note: 'Print OK in the Console.' },
      { code: "MOV D, 0xE8\nMOV [D], 'O'\nINC D\nMOV [D], 'K'", note: 'Show OK on the Display.' },
    ],
  },
  labels: {
    title: 'Labels, data and comments',
    paragraphs: [
      'A label is a name followed by a colon at the start of a line, such as loop: or .next:. It stands for the address of what follows, so it can be a jump target, a constant (MOV C, msg) or an address ([count]).',
      'Label names are unique in the whole file (a leading dot does not make them local) and A, B, C and D cannot be used. A label that is never used gets a warning.',
      'DB places data where it is written. Jump over it, or put it after HLT, so the CPU never runs it.',
    ],
    examples: [
      {
        code: 'JMP start\ncount: DB 3\nstart:\n\tMOV A, [count]\t; A = 3\n\tHLT',
        note: 'Store a byte with DB and read it through its label.',
      },
    ],
  },
  programs: {
    title: 'Example programs',
    paragraphs: ['Complete programs. Open one in the editor to read it, run it and change it.'],
  },
};

const ES: Record<GuideId, SectionText> = {
  registers: {
    title: 'Registros y banderas',
    paragraphs: [
      'La CPU tiene cuatro registros de propósito general de 8 bits: A, B, C y D. Cada uno guarda un valor de 0 a 255; la aritmética que pasa de 255 o baja de 0 da la vuelta.',
      'SP es el puntero de pila e IP el puntero de instrucción. Todos los registros empiezan en 0 salvo SP, que empieza en 0xE7.',
      'La aritmética, la lógica y CMP actualizan las banderas; MOV, los saltos y las instrucciones de pila no las tocan.',
    ],
    table: {
      head: ['Nombre', 'Significado'],
      rows: [
        ['A', 'Acumulador: MUL y DIV siempre trabajan sobre él.'],
        ['B, C, D', 'Propósito general; suelen usarse como contadores y punteros.'],
        ['SP', 'Siguiente byte libre de la pila. Empieza en 0xE7 (231).'],
        ['IP', 'Dirección de la siguiente instrucción. Empieza en 0.'],
        ['Z', 'Cero: el último resultado fue 0 (o CMP encontró valores iguales).'],
        ['C', 'Acarreo: el resultado pasó de 255 o bajó de 0 (o CMP encontró un registro menor).'],
        ['F', 'Error: un error de ejecución detuvo el programa. Reinicia para continuar.'],
      ],
    },
  },
  syntax: {
    title: 'Números y caracteres',
    paragraphs: [
      'Cada valor es un byte de 0 a 255. No se pueden escribir números negativos: usa 255 para −1, 254 para −2, etc.',
      "Un carácter entre comillas simples es su código: 'A' es 65 y '0' es 48. Una cadena entre comillas dobles solo se permite con DB.",
      'Los nombres de instrucciones y registros se pueden escribir en mayúsculas o minúsculas. El texto después de ; es un comentario.',
    ],
    table: {
      head: ['Formato', 'Ejemplo', 'Valor'],
      rows: [
        ['Decimal', '200 o 200d', '200'],
        ['Hexadecimal', '0xC8', '200'],
        ['Octal', '0o310', '200'],
        ['Binario', '11001000b', '200'],
        ['Carácter', "'A'", '65'],
      ],
    },
    examples: [
      {
        code: "MOV A, 0x41\nMOV B, 'A'\nCMP A, B\t; iguales: se activa Z",
        note: 'Dos formas de escribir 65.',
      },
    ],
  },
  addressing: {
    title: 'Modos de direccionamiento',
    paragraphs: [
      'Un operando puede ser una constante, un registro, un byte de memoria en una dirección fija o un byte en la dirección que contiene un registro, opcionalmente con un desplazamiento de −16 a +15.',
      'No todas las instrucciones aceptan todos los modos: la tabla Formas de cada instrucción muestra los que tiene. Solo un operando de una instrucción puede estar en memoria.',
    ],
    table: {
      head: ['Modo', 'Ejemplo', 'Lee'],
      rows: [
        ['Constante', 'MOV A, 5', 'el valor 5'],
        ['Registro', 'MOV A, B', 'el valor de B'],
        ['Directo', 'MOV A, [0x80]', 'el byte en la dirección 0x80'],
        ['Indirecto', 'MOV A, [C]', 'el byte en la dirección que contiene C'],
        ['Indexado', 'MOV A, [C+2]', 'el byte en la dirección C + 2'],
        ['Pila', 'MOV A, [SP+1]', 'el byte en la cima de la pila'],
      ],
    },
    examples: [
      {
        code: 'MOV C, 0x80\nMOV [C], 7\nMOV A, [0x80]\t; A = 7',
        note: 'Escribe a través de un puntero y vuelve a leer directamente.',
      },
    ],
  },
  memory: {
    title: 'Mapa de memoria',
    paragraphs: [
      'La memoria tiene 256 bytes, de 0x00 a 0xFF, y empieza llena de 0. El programa se copia en la dirección 0 y se ejecuta desde ahí, así que puede ocupar como máximo 256 bytes.',
      'La pila empieza en 0xE7 y crece hacia abajo, hacia el programa. Los últimos 24 bytes, de 0xE8 a 0xFF, son la pantalla: cada byte se muestra como un carácter.',
    ],
    table: {
      head: ['Direcciones', 'Uso'],
      rows: [
        ['0x00 …', 'Programa y datos (DB), desde la dirección 0 hacia arriba.'],
        ['… 0xE7', 'Pila: SP empieza en 0xE7 y crece hacia abajo.'],
        ['0xE8 – 0xFF', 'Pantalla: 24 celdas de caracteres.'],
      ],
    },
  },
  io: {
    title: 'Entrada y salida',
    paragraphs: [
      'OUT reg imprime el registro como carácter en la Consola; el código 10 empieza una nueva línea. IN reg espera una tecla escrita en la Consola y guarda su código; mientras espera, el estado muestra Esperando una tecla.',
      'Enter se lee como 10, Retroceso como 8 y Escape como 27. No hay puertos de E/S: IN y OUT solo aceptan un registro.',
      'La Pantalla muestra la memoria 0xE8–0xFF: escribe caracteres ahí con MOV.',
    ],
    examples: [
      { code: "MOV A, 'O'\nOUT A\nMOV A, 'K'\nOUT A", note: 'Imprime OK en la Consola.' },
      { code: "MOV D, 0xE8\nMOV [D], 'O'\nINC D\nMOV [D], 'K'", note: 'Muestra OK en la Pantalla.' },
    ],
  },
  labels: {
    title: 'Etiquetas, datos y comentarios',
    paragraphs: [
      'Una etiqueta es un nombre seguido de dos puntos al inicio de una línea, como loop: o .next:. Representa la dirección de lo que sigue, así que puede ser un destino de salto, una constante (MOV C, msg) o una dirección ([count]).',
      'Los nombres de etiqueta son únicos en todo el archivo (un punto inicial no las hace locales) y no se pueden usar A, B, C ni D. Una etiqueta que nunca se usa genera una advertencia.',
      'DB coloca datos donde está escrito. Salta sobre ellos, o ponlos después de HLT, para que la CPU nunca los ejecute.',
    ],
    examples: [
      {
        code: 'JMP start\ncount: DB 3\nstart:\n\tMOV A, [count]\t; A = 3\n\tHLT',
        note: 'Guarda un byte con DB y léelo a través de su etiqueta.',
      },
    ],
  },
  programs: {
    title: 'Programas de ejemplo',
    paragraphs: ['Programas completos. Abre uno en el editor para leerlo, ejecutarlo y modificarlo.'],
  },
};

/** Guide sections per language, in reading order. */
export const GUIDE: Record<Locale, readonly GuideSection[]> = {
  en: ORDER.map((id) => ({ id, ...EN[id] })),
  es: ORDER.map((id) => ({ id, ...ES[id] })),
};
