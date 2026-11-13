import type { Translation } from './types';

/** Words shared by several areas. Plurals use `.one` / `.other` keys and `{n}`. */
export const en = {
  'common.cancel': 'Cancel',
  'common.close': 'Close',
  'common.save': 'Save',
  'common.back': 'Back',
  'common.reset': 'Reset',
  'common.steps.one': '{n} step',
  'common.steps.other': '{n} steps',
} as const;

export const es: Translation<typeof en> = {
  'common.cancel': 'Cancelar',
  'common.close': 'Cerrar',
  'common.save': 'Guardar',
  'common.back': 'Volver',
  'common.reset': 'Reiniciar',
  'common.steps.one': '{n} paso',
  'common.steps.other': '{n} pasos',
};
