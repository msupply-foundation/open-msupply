/**
 * @deprecated `itAsync` will be removed with Apollo Client 4.0. Prefer using an
 * `async` callback function or returning a `Promise` from the callback with the
 * `it` or `test` functions.
 */
export declare const itAsync: ((this: unknown, message: string, callback: (resolve: (result?: any) => void, reject: (reason?: any) => void) => any, timeout?: number | undefined) => void) & {
    only: (message: string, callback: (resolve: (result?: any) => void, reject: (reason?: any) => void) => any, timeout?: number) => void;
    skip: (message: string, callback: (resolve: (result?: any) => void, reject: (reason?: any) => void) => any, timeout?: number) => void;
    todo: (message: string, callback: (resolve: (result?: any) => void, reject: (reason?: any) => void) => any, timeout?: number) => void;
};
//# sourceMappingURL=itAsync.d.ts.map