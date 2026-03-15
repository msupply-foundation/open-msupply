import type { DocumentNode } from "graphql";
import { ApolloClient } from "../../../core/index.js";
import type { NormalizedCacheObject } from "../../../cache/index.js";
/**
 * @deprecated `createMockClient` will be removed in Apollo Client 4.0. Please
 * instantiate a client using `new ApolloClient()` using a `MockLink`.
 */
export declare function createMockClient<TData>(data: TData, query: DocumentNode, variables?: {}): ApolloClient<NormalizedCacheObject>;
//# sourceMappingURL=mockClient.d.ts.map