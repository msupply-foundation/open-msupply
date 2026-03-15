import type { Observer } from "../../utilities/index.js";
import { Observable } from "../../utilities/index.js";
import type { NextLink, Operation, RequestHandler, FetchResult, GraphQLRequest } from "./types.js";
export declare class ApolloLink {
    static empty(): ApolloLink;
    static from(links: (ApolloLink | RequestHandler)[]): ApolloLink;
    static split(test: (op: Operation) => boolean, left: ApolloLink | RequestHandler, right?: ApolloLink | RequestHandler): ApolloLink;
    static execute(link: ApolloLink, operation: GraphQLRequest): Observable<FetchResult>;
    static concat(first: ApolloLink | RequestHandler, second: ApolloLink | RequestHandler): ApolloLink;
    constructor(request?: RequestHandler);
    split(test: (op: Operation) => boolean, left: ApolloLink | RequestHandler, right?: ApolloLink | RequestHandler): ApolloLink;
    concat(next: ApolloLink | RequestHandler): ApolloLink;
    request(operation: Operation, forward?: NextLink): Observable<FetchResult> | null;
    /**
     * @deprecated `onError` will be removed with Apollo Client 4.0. Please
     * discontinue using this method.
     */
    protected onError(error: any, observer?: Observer<FetchResult>): false | void;
    /**
     * @deprecated `setOnError` will be removed with Apollo Client 4.0. Please
     * discontinue using this method.
     */
    setOnError(fn: ApolloLink["onError"]): this;
    /**
     * @internal
     * Used to iterate through all links that are concatenations or `split` links.
     */
    readonly left?: ApolloLink;
    /**
     * @internal
     * Used to iterate through all links that are concatenations or `split` links.
     */
    readonly right?: ApolloLink;
    /**
     * @internal
     * Can be provided by a link that has an internal cache to report it's memory details.
     */
    getMemoryInternals?: () => unknown;
}
//# sourceMappingURL=ApolloLink.d.ts.map