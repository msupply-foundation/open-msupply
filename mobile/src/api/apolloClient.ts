import {
  ApolloClient,
  InMemoryCache,
  ApolloLink,
  Observable,
} from "@apollo/client";
import { onError } from "@apollo/client/link/error";
import { print } from "graphql";
import { invoke } from "@tauri-apps/api/core";

let serverUrl = "";
let onAuthError: (() => void) | null = null;

export function setServerUrl(url: string) {
  serverUrl = url;
}

export function getServerUrl(): string {
  return serverUrl;
}

export function setOnAuthError(callback: () => void) {
  onAuthError = callback;
}

// ─── Custom link that routes all requests through Rust (bypasses CORS) ──────

interface GraphqlProxyResponse {
  status: number;
  body: string;
}

const tauriLink = new ApolloLink((operation, _forward) => {
  return new Observable((observer) => {
    (async () => {
      try {
        const context = operation.getContext();
        const headers: Record<string, string> = {
          "Content-Type": "application/json",
          ...((context.headers as Record<string, string>) ?? {}),
        };

        // Attach auth token
        try {
          const creds = await invoke<{ token: string } | null>("get_token");
          if (creds?.token) {
            headers["Authorization"] = `Bearer ${creds.token}`;
          }
        } catch {
          // No token available
        }

        const body = JSON.stringify({
          operationName: operation.operationName,
          query: print(operation.query),
          variables: operation.variables,
        });

        const url = `${serverUrl}/graphql`;

        const response = await invoke<GraphqlProxyResponse>(
          "graphql_proxy",
          {
            request: { url, body, headers },
          }
        );

        if (response.status === 401) {
          onAuthError?.();
          observer.error(new Error("Unauthorized"));
          return;
        }

        const result = JSON.parse(response.body);
        observer.next(result);
        observer.complete();
      } catch (err) {
        observer.error(err);
      }
    })();
  });
});

const errorLink = onError(({ networkError }) => {
  if (
    networkError &&
    "statusCode" in networkError &&
    networkError.statusCode === 401
  ) {
    onAuthError?.();
  }
});

export const apolloClient = new ApolloClient({
  link: ApolloLink.from([errorLink, tauriLink]),
  cache: new InMemoryCache(),
  defaultOptions: {
    watchQuery: { fetchPolicy: "network-only" },
    query: { fetchPolicy: "network-only" },
  },
});
