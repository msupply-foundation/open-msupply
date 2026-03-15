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
export var throwServerError = function (response, result, message) {
    var error = new Error(message);
    error.name = "ServerError";
    error.response = response;
    error.statusCode = response.status;
    error.result = result;
    throw error;
};
//# sourceMappingURL=throwServerError.js.map