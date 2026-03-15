export type ServerError = Error & {
    response: Response;
    /**
     * @deprecated `result` will be removed in Apollo Client 4.0.
     *
     * **Recommended now**
     *
     * No action needed
     *
     * **When migrating**
     *
     * `result` has been replaced by `bodyText` which is the raw string body
     * returned in the result. Use `JSON.parse` on the `bodyText` property to get
     * the same value as `result`.
     */
    result: Record<string, any> | string;
    statusCode: number;
};
/**
 * @deprecated `throwServerError` will be removed in Apollo Client 4.0. This is
 * safe to use in Apollo Client 3.x.
 *
 * **Recommended now**
 *
 * No action needed
 *
 * **When migrating**
 *
 * `ServerError` is a subclass of `Error`. To throw a server error, use
 * `throw new ServerError(...)` instead.
 *
 * ```ts
 * throw new ServerError("error message", { response, result });
 * ```
 */
export declare const throwServerError: (response: Response, result: any, message: string) => never;
//# sourceMappingURL=throwServerError.d.ts.map