declare module 'main' {
  // Extism exports take no params and return an I32
  export function suggested_quantity(): I32;
}

declare module 'extism:host' {
  interface user {
    sql(ptr: I64): I64;
  }
}
