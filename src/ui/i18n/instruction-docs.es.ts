import type {
  CatalogEntry,
  InstructionDoc,
  InstructionExample,
  InstructionGroup,
  Mnemonic,
} from '@core/isa/catalog';
import { t, type Locale, type MessageKey } from './i18n.svelte';

/** One translated string per element of a catalog tuple (same length, checked by TypeScript). */
type Each<T extends readonly unknown[]> = { readonly [I in keyof T]: string };
type EntryOf<M extends Mnemonic> = Extract<CatalogEntry, { readonly mnemonic: M }>;

export interface InstructionDocEs<M extends Mnemonic = Mnemonic> {
  readonly summary: string;
  readonly details: string;
  readonly flags: string;
  readonly notes: Each<EntryOf<M>['notes']>;
  /** Notes of `examples`, in order. The code itself is not translated. */
  readonly examples: Each<EntryOf<M>['examples']>;
}

/** Every mnemonic, text field, note and example note of the catalog must appear here. */
export type InstructionDocsEs = { readonly [M in Mnemonic]: InstructionDocEs<M> };

const FLAGS_ARITH = 'Z si el resultado es 0. C si pasó de 255 o bajó de 0 (el resultado da la vuelta).';
const FLAGS_NONE = 'Sin cambios.';
const FLAGS_LOGIC = 'Z si el resultado es 0. C se borra.';

export const INSTRUCTION_DOCS_ES: InstructionDocsEs = {
  MOV: {
    summary: 'Copia un valor en un registro o en memoria.',
    details:
      'El primer operando es el destino y el segundo la fuente. Registros A–D y SP, una dirección, un puntero en registro [B] o [B+3], o una constante.',
    flags: FLAGS_NONE,
    examples: [
      'Carga una constante en A.',
      'Escribe un carácter directamente en la primera celda de la pantalla.',
      'Lee el byte en la dirección B + 2, es decir 0x82.',
    ],
    notes: [
      'No se puede copiar de memoria a memoria: pasa por un registro (MOV A, [x] y luego MOV [y], A).',
      'MOV nunca cambia las banderas.',
      'El desplazamiento en [reg+n] debe estar entre -16 y +15.',
      'Mover a SP un valor mayor que 0xE7 (231) produce el error "Stack underflow".',
    ],
  },
  DB: {
    summary: 'Define bytes: coloca un número, un carácter o una cadena en memoria.',
    details:
      'No es una instrucción: los bytes se guardan donde está la línea. Usa una etiqueta para referirte a ellos.',
    flags: FLAGS_NONE,
    examples: [
      'Una cadena seguida de un 0 que marca el final.',
      'Un solo carácter: guarda 65.',
      'Salta sobre los datos para que nunca se ejecuten como código; la etiqueta da su dirección.',
    ],
    notes: [
      'Un operando por línea: un número, un carácter entre comillas simples o una cadena entre comillas dobles.',
      'Cada carácter necesita un código entre 0 y 255.',
      'La cadena no se termina sola: agrega DB 0 si tu bucle busca el final.',
      'La CPU no distingue datos de código: salta sobre los datos o colócalos después de HLT.',
    ],
  },
  ADD: {
    summary: 'Suma la fuente a un registro.',
    details: 'reg = reg + fuente.',
    flags: FLAGS_ARITH,
    examples: [
      'A = A + 5.',
      'Suma dos registros: A pasa a valer 5.',
      'Suma el byte guardado en la dirección que contiene C.',
    ],
    notes: [
      'Por encima de 255 el resultado da la vuelta (255 + 1 = 0) y se activa C; en ese caso Z queda apagada aunque el resultado sea 0.',
      'El destino puede ser SP: ADD SP, 2 descarta dos bytes de la pila.',
    ],
  },
  SUB: {
    summary: 'Resta la fuente de un registro.',
    details: 'reg = reg − fuente.',
    flags: FLAGS_ARITH,
    examples: [
      'A = A − 1.',
      'Por debajo de 0 el resultado da la vuelta: A pasa a 254 y se activa C.',
      'Pone A en 0 y activa Z.',
    ],
    notes: [
      'Bajar de 0 da la vuelta (0 − 1 = 255) y activa C; compruébalo con JC.',
      'El destino puede ser SP: SUB SP, 3 reserva tres bytes en la pila.',
    ],
  },
  INC: {
    summary: 'Suma 1 a un registro.',
    details: 'reg = reg + 1.',
    flags: FLAGS_ARITH,
    examples: [
      'A = A + 1.',
      'Da la vuelta a 0 con C activa (Z queda apagada).',
      'Cuenta C hacia arriba hasta llegar a 10.',
    ],
    notes: [
      'Solo registros (A–D o SP). Para incrementar un byte de memoria, cárgalo, aplícale INC y guárdalo de nuevo.',
    ],
  },
  DEC: {
    summary: 'Resta 1 a un registro.',
    details: 'reg = reg − 1.',
    flags: FLAGS_ARITH,
    examples: [
      'A = A − 1.',
      'Repite un bucle 5 veces: termina cuando C llega a 0 y se activa Z.',
      'Da la vuelta a 255 con C activa.',
    ],
    notes: [
      'Llegar exactamente a 0 activa Z, por eso DEC seguido de JNZ forma un bucle compacto.',
      'Solo registros (A–D o SP).',
    ],
  },
  MUL: {
    summary: 'Multiplica A por el operando.',
    details: 'A = A × operando. El resultado da la vuelta en 256.',
    flags: FLAGS_ARITH,
    examples: ['A = 42.', 'Multiplica A por un registro.', 'Multiplica A por el byte en la dirección 0x80.'],
    notes: [
      'MUL siempre trabaja sobre A; el operando es solo el multiplicador.',
      'Solo se conserva el byte bajo: 16 × 16 = 256 deja A = 0 con C activa y Z apagada.',
      'MUL 0 da 0 y activa Z.',
    ],
  },
  DIV: {
    summary: 'Divide A entre el operando (división entera).',
    details: 'A = A ÷ operando, redondeado hacia abajo. Dividir entre 0 es un error de ejecución.',
    flags: 'Z si el cociente es 0. C se borra.',
    examples: [
      'A = 3: el resto se pierde.',
      'Divide A entre un registro.',
      'Divide A entre el byte en la dirección 0x80.',
    ],
    notes: [
      'Dividir entre 0 detiene el programa con el error "Division by 0"; usa Reiniciar para volver a ejecutarlo.',
      'Para obtener el resto, guarda una copia de A y calcula A − (A ÷ n) × n.',
    ],
  },
  AND: {
    summary: 'AND bit a bit sobre un registro.',
    details: 'reg = reg & fuente.',
    flags: FLAGS_LOGIC,
    examples: [
      'Conserva los 4 bits bajos de A y borra el resto.',
      'Prueba el bit 0: Z se activa cuando A es par.',
      'Deja en B solo los bits que también están activos en C.',
    ],
    notes: [
      'Usa una máscara con 0 donde haya que borrar bits.',
      'El destino y la fuente en registro deben ser A–D (no SP).',
    ],
  },
  OR: {
    summary: 'OR bit a bit sobre un registro.',
    details: 'reg = reg | fuente.',
    flags: FLAGS_LOGIC,
    examples: [
      'Activa el bit 7.',
      'Convierte el número 5 en el carácter "5" (0x35).',
      'Activa Z si A es 0, sin cambiar A.',
    ],
    notes: [
      'Usa una máscara con 1 donde haya que activar bits.',
      'El destino y la fuente en registro deben ser A–D (no SP).',
    ],
  },
  XOR: {
    summary: 'OR exclusivo bit a bit sobre un registro.',
    details: 'reg = reg ^ fuente. XOR A, A pone A en 0.',
    flags: FLAGS_LOGIC,
    examples: [
      'Pone A en 0 y activa Z.',
      'Invierte todos los bits, como NOT pero con C borrada.',
      'Invierte los bits de B que están activos en el byte de la dirección D.',
    ],
    notes: [
      'Aplicar XOR dos veces con el mismo valor devuelve el valor original.',
      'El destino y la fuente en registro deben ser A–D (no SP).',
    ],
  },
  NOT: {
    summary: 'Invierte todos los bits de un registro.',
    details: 'reg = ~reg.',
    flags: 'C se activa. Z nunca se activa.',
    examples: ['B = 255 − B.', 'A pasa a 0xF0.', 'A pasa a 0, C se activa y Z queda apagada.'],
    notes: [
      'Como Z nunca se activa, no uses JZ después de NOT para comprobar si es 0: usa CMP A, 0.',
      'Solo registros (A–D).',
    ],
  },
  SHL: {
    summary: 'Desplaza un registro a la izquierda.',
    details: 'reg = reg << cantidad. Los bits que salen del byte activan C.',
    flags: FLAGS_ARITH,
    examples: [
      'Multiplica A por 2.',
      'El bit 7 se cae: A = 0x02 y se activa C.',
      'Desplaza tantas posiciones como indica un registro (A × 8).',
    ],
    notes: [
      'Desplazar n posiciones a la izquierda multiplica por 2ⁿ mientras el resultado quepa en un byte.',
      'Cuando salen todos los bits, Z no se activa: 0x80 desplazado 1 a la izquierda da 0 con C activa.',
    ],
  },
  SHR: {
    summary: 'Desplaza un registro a la derecha.',
    details: 'reg = reg >> cantidad (entran ceros).',
    flags: 'Z si el resultado es 0. C se borra: los bits que salen se pierden.',
    examples: [
      'Divide A entre 2, redondeando hacia abajo.',
      'A = 0x0F.',
      'A = 0 y se activa Z; C queda apagada.',
    ],
    notes: [
      'Siempre entran ceros por la izquierda: SAR es el mismo desplazamiento lógico, no conserva el bit de signo.',
    ],
  },
  CMP: {
    summary: 'Compara un registro con un valor (resta sin guardar).',
    details: 'Ajusta las banderas como lo haría reg − fuente. Después usa un salto condicional.',
    flags: 'Z si son iguales. C si reg es menor que la fuente.',
    examples: [
      'Salta cuando A vale 10.',
      'Salta cuando A es menor que B.',
      'Compara B con el byte en la dirección que contiene C.',
    ],
    notes: [
      'Solo cambian las banderas; el registro conserva su valor.',
      'Las comparaciones no tienen signo: 200 es mayor que 10.',
      'Después de CMP: JZ igual, JNZ distinto, JC menor, JNC mayor o igual, JA mayor, JNA menor o igual.',
    ],
  },
  JMP: {
    summary: 'Salta a una dirección o etiqueta.',
    details: 'IP = destino. Con un registro salta a la dirección que contiene.',
    flags: FLAGS_NONE,
    examples: [
      'Un bucle infinito.',
      'Vuelve a empezar desde la dirección 0.',
      'Salta a la dirección que contiene un registro.',
    ],
    notes: [
      'Al ensamblar, cada etiqueta se reemplaza por su dirección.',
      'Saltar a datos hace que la CPU los ejecute como instrucciones.',
    ],
  },
  JZ: {
    summary: 'Salta si es cero / igual.',
    details: 'Salta cuando Z está activa.',
    flags: FLAGS_NONE,
    examples: ['Salta cuando A es 0.', 'Salta cuando el contador llega a 0.'],
    notes: [
      'JE es la misma instrucción; léela como "salta si es igual" después de CMP.',
      'Un resultado que da la vuelta de 255 a 0 activa C pero no Z.',
    ],
  },
  JNZ: {
    summary: 'Salta si no es cero / distinto.',
    details: 'Salta cuando Z está apagada.',
    flags: FLAGS_NONE,
    examples: ['Repite un bucle 3 veces.', 'Salta cuando A no es el carácter q.'],
    notes: [
      'JNE es la misma instrucción.',
      'Las etiquetas que empiezan con punto, como .loop, no son locales: cada nombre de etiqueta debe ser único en el archivo.',
    ],
  },
  JC: {
    summary: 'Salta si hay acarreo / menor.',
    details: 'Salta cuando C está activa.',
    flags: FLAGS_NONE,
    examples: ['Detecta una suma mayor que 255.', 'Salta cuando A es menor que 10.'],
    notes: ['JB y JNAE son la misma instrucción.'],
  },
  JNC: {
    summary: 'Salta si no hay acarreo / mayor o igual.',
    details: 'Salta cuando C está apagada.',
    flags: FLAGS_NONE,
    examples: ['Salta cuando A es 10 o más.', 'Continúa solo si A no bajó de 0.'],
    notes: ['JNB y JAE son la misma instrucción.'],
  },
  JA: {
    summary: 'Salta si es mayor.',
    details: 'Salta cuando C y Z están apagadas.',
    flags: FLAGS_NONE,
    examples: [
      'Salta cuando A es mayor que el carácter z (122).',
      'Salta cuando A es estrictamente mayor que B.',
    ],
    notes: ['Estrictamente mayor: con valores iguales no salta.', 'JNBE es la misma instrucción.'],
  },
  JNA: {
    summary: 'Salta si no es mayor (menor o igual).',
    details: 'Salta cuando C o Z está activa.',
    flags: FLAGS_NONE,
    examples: ['Salta cuando A es 9 o menos.', 'Salta cuando B es menor o igual que A.'],
    notes: ['JBE es la misma instrucción.'],
  },
  PUSH: {
    summary: 'Apila un valor.',
    details: 'Guarda el valor en SP y luego SP − 1. La pila empieza en 0xE7 y crece hacia abajo.',
    flags: FLAGS_NONE,
    examples: ['Guarda A en la pila.', 'Apila una constante.', 'Intercambia A y B usando la pila.'],
    notes: [
      'La pila crece hacia tu programa y nada impide que sobrescriba el código.',
      'Apilar cuando SP es 0 produce el error "Stack overflow".',
      'Un operando de registro debe ser A–D; PUSH también acepta [reg], [dirección] y una constante.',
    ],
  },
  POP: {
    summary: 'Desapila el valor superior en un registro.',
    details: 'SP + 1 y luego lee el byte en SP.',
    flags: FLAGS_NONE,
    examples: ['Recupera A de la pila.', 'C = 7.'],
    notes: [
      'Desapila en el orden inverso al que apilaste.',
      'Desapilar con la pila vacía (SP = 0xE7) produce el error "Stack underflow".',
      'Solo registros (A–D).',
    ],
  },
  CALL: {
    summary: 'Llama a una rutina.',
    details: 'Apila la dirección de retorno y luego salta. Vuelve con RET.',
    flags: FLAGS_NONE,
    examples: [
      'Llama a una rutina que imprime A y luego se detiene.',
      'Llama a la dirección que contiene un registro.',
    ],
    notes: [
      'La dirección de retorno ocupa un byte de la pila.',
      'Pasa los argumentos en registros (por ejemplo C = texto, D = destino) y guarda con PUSH y POP los registros que la rutina cambia.',
    ],
  },
  RET: {
    summary: 'Vuelve de una rutina.',
    details: 'Desapila la dirección de retorno que guardó CALL y salta a ella.',
    flags: FLAGS_NONE,
    examples: ['Una rutina que eleva A al cuadrado.', 'Vuelve a quien hizo la llamada.'],
    notes: [
      'Cada PUSH dentro de la rutina necesita su POP antes de RET, o RET salta a una dirección equivocada.',
      'RET con la pila vacía produce el error "Stack underflow".',
    ],
  },
  HLT: {
    summary: 'Detiene el programa.',
    details: 'Su código de operación es 0, así que llegar a memoria vacía también lo detiene.',
    flags: FLAGS_NONE,
    examples: ['Se detiene aquí.', 'Se detiene antes si A es 0.'],
    notes: ['La memoria empieza llena de 0, así que un programa sin HLT se detiene al pasar de su final.'],
  },
  IN: {
    summary: 'Lee en un registro una tecla escrita en la consola.',
    details: 'Si aún no se escribió nada, el programa espera en esta línea hasta que escribas.',
    flags: FLAGS_NONE,
    examples: [
      'Espera una tecla y guarda su código de carácter en A.',
      'Eco: imprime la tecla escrita.',
      'Lee teclas hasta Enter (código 10).',
    ],
    notes: [
      'Enter se lee como 10, Retroceso como 8 y Escape como 27.',
      'Las teclas escritas antes de que IN se ejecute se guardan y se leen una por cada IN, en orden.',
      'Solo registros (A–D).',
    ],
  },
  OUT: {
    summary: 'Escribe un registro en la consola como carácter.',
    details: 'La consola conserva todas las líneas; la pantalla de 24 bytes en 0xE8 también funciona.',
    flags: FLAGS_NONE,
    examples: [
      'Imprime la letra A.',
      'Empieza una nueva línea en la consola (código 10).',
      'Imprime el dígito 7.',
    ],
    notes: [
      'Los códigos fuera del ASCII imprimible (32–126) se muestran como ·, salvo el salto de línea (10) y el tabulador (9).',
      'Solo registros (A–D): para imprimir una constante, cárgala antes en un registro con MOV.',
    ],
  },
};

export interface InstructionText {
  readonly summary: string;
  readonly details: string;
  readonly flags: string;
  readonly notes: readonly string[];
  readonly examples: readonly InstructionExample[];
}

/** The text of an instruction's documentation in `locale` (English comes from the catalog). */
export function instructionText(doc: InstructionDoc, locale: Locale): InstructionText {
  const es = locale === 'es' ? INSTRUCTION_DOCS_ES[doc.mnemonic as Mnemonic] : undefined;
  if (!es) return doc;
  const notes: readonly string[] = es.notes;
  const exampleNotes: readonly string[] = es.examples;
  return {
    summary: es.summary,
    details: es.details,
    flags: es.flags,
    notes,
    examples: doc.examples.map((ex, i) => ({ code: ex.code, note: exampleNotes[i] ?? ex.note })),
  };
}

const GROUP_KEY: Record<InstructionGroup, MessageKey> = {
  Data: 'docs.group.data',
  Arithmetic: 'docs.group.arithmetic',
  Logic: 'docs.group.logic',
  'Compare and jump': 'docs.group.compare',
  'Stack and calls': 'docs.group.stack',
  Machine: 'docs.group.machine',
};

/** Group name in the current language (reactive: call it from markup or `$derived`). */
export const groupLabel = (group: InstructionGroup): string => t(GROUP_KEY[group]);
