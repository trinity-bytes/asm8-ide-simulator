/** A Spanish (or any other) table must translate every English key. */
export type Translation<T> = { readonly [K in keyof T]: string };
