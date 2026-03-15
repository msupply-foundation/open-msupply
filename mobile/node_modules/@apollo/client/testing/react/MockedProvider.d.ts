import * as React from "react";
import type { DefaultOptions } from "../../core/index.js";
import { ApolloClient } from "../../core/index.js";
import type { MockedResponse } from "../core/index.js";
import type { ApolloLink } from "../../link/core/index.js";
import type { Resolvers } from "../../core/index.js";
import type { ApolloCache } from "../../cache/index.js";
import type { DevtoolsOptions } from "../../core/ApolloClient.js";
export interface MockedProviderProps<TSerializedCache = {}> {
    mocks?: ReadonlyArray<MockedResponse<any, any>>;
    /**
     * @deprecated `addTypename` will be removed in Apollo Client 4.0.
     *
     * **Recommended now**
     *
     * Please set `addTypename` to `true` or remove the prop entirely to use the
     * default. It is recommended to add `__typename` to your mock objects if it is
     * not already defined. This ensures the cache more closely resembles the
     * production environment.
     */
    addTypename?: boolean;
    defaultOptions?: DefaultOptions;
    cache?: ApolloCache<TSerializedCache>;
    resolvers?: Resolvers;
    childProps?: object;
    children?: any;
    link?: ApolloLink;
    showWarnings?: boolean;
    /**
     * If set to true, the MockedProvider will try to connect to the Apollo DevTools.
     * Defaults to false.
     *
     * @deprecated `connectToDevTools` will be removed in Apollo Client 4.0.
     *
     * **Recommended now**
     *
     * Use the `devtools.enabled` option instead.
     *
     * ```ts
     * <MockedProvider devtools={{ enabled: true }} />
     * ```
     */
    connectToDevTools?: boolean;
    /**
     * Configuration used by the [Apollo Client Devtools extension](https://www.apollographql.com/docs/react/development-testing/developer-tooling/#apollo-client-devtools) for this client.
     *
     * @since 3.14.0
     */
    devtools?: DevtoolsOptions;
}
export interface MockedProviderState {
    client: ApolloClient<any>;
}
export declare class MockedProvider extends React.Component<MockedProviderProps, MockedProviderState> {
    constructor(props: MockedProviderProps);
    render(): React.JSX.Element | null;
    componentWillUnmount(): void;
}
//# sourceMappingURL=MockedProvider.d.ts.map