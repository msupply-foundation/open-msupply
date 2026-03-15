import type { Operation, GraphQLRequest, FetchResult } from "../../../link/core/index.js";
import { ApolloLink } from "../../../link/core/index.js";
import { Observable } from "../../../utilities/index.js";
import type { Unmasked } from "../../../masking/index.js";
/** @internal */
type CovariantUnaryFunction<out Arg, out Ret> = {
    fn(arg: Arg): Ret;
}["fn"];
export type ResultFunction<T, V = Record<string, any>> = CovariantUnaryFunction<V, T>;
export type VariableMatcher<V = Record<string, any>> = CovariantUnaryFunction<V, boolean>;
export interface MockedResponse<out TData = Record<string, any>, out TVariables = Record<string, any>> {
    request: GraphQLRequest<TVariables>;
    maxUsageCount?: number;
    result?: FetchResult<Unmasked<TData>> | ResultFunction<FetchResult<Unmasked<TData>>, TVariables>;
    error?: Error;
    delay?: number;
    variableMatcher?: VariableMatcher<TVariables>;
    /**
     * @deprecated `newData` will be removed in Apollo Client 4.0. Please use the
     * `result` option with a callback function instead and provide a
     * `maxUsageCount` of `Number.POSITIVE_INFINITY` to get the same behavior.
     */
    newData?: ResultFunction<FetchResult<Unmasked<TData>>, TVariables>;
}
export interface MockLinkOptions {
    showWarnings?: boolean;
}
export declare class MockLink extends ApolloLink {
    operation: Operation;
    addTypename: Boolean;
    showWarnings: boolean;
    private mockedResponsesByKey;
    constructor(mockedResponses: ReadonlyArray<MockedResponse<any, any>>, addTypename?: Boolean, options?: MockLinkOptions);
    addMockedResponse(mockedResponse: MockedResponse): void;
    request(operation: Operation): Observable<FetchResult> | null;
    private normalizeMockedResponse;
    private normalizeVariableMatching;
}
export interface MockApolloLink extends ApolloLink {
    operation?: Operation;
}
/**
 * @deprecated `mockSingleLink` will be removed in Apollo Client 4.0. Please
 * initialize `MockLink` directly. Note that `addTypename` has been removed so
 * please remove the final boolean argument if it is set.
 */
export declare function mockSingleLink(...mockedResponses: Array<any>): MockApolloLink;
export declare function stringifyForDebugging(value: any, space?: number): string;
export {};
//# sourceMappingURL=mockLink.d.ts.map