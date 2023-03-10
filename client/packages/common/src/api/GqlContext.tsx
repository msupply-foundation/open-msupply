import React, {
  FC,
  createContext,
  useMemo,
  useEffect,
  useState,
  useCallback,
  PropsWithChildren,
} from 'react';
import {
  GraphQLClient,
  RequestDocument,
  RequestOptions,
  Variables,
} from 'graphql-request';
import { AuthError } from '../authentication/AuthContext';
import { LocalStorage } from '../localStorage';
import { DefinitionNode, DocumentNode, OperationDefinitionNode } from 'graphql';
import { RequestInit } from 'graphql-request/dist/types.dom';

export type SkipRequest = (documentNode: DocumentNode) => boolean;

const permissionExceptions = ['reports', 'stockCounts', 'invoiceCounts'];
interface ResponseError {
  message?: string;
  path?: string[];
  extensions?: { details?: string };
}

const hasError = (errors: ResponseError[], error: AuthError) =>
  errors.some(({ message }: { message?: string }) => message === error);

const hasPermissionException = (errors: ResponseError[]) =>
  errors.every(({ path }: { path?: string[] }) =>
    (path || []).every(p => permissionExceptions.includes(p))
  );

const handleResponseError = (errors: ResponseError[]) => {
  if (hasError(errors, AuthError.Unauthenticated)) {
    LocalStorage.setItem('/auth/error', AuthError.Unauthenticated);
    return;
  }

  if (
    hasError(errors, AuthError.PermissionDenied) &&
    !hasPermissionException(errors)
  ) {
    LocalStorage.setItem('/auth/error', AuthError.PermissionDenied);
    return;
  }

  const error = errors[0];
  const { extensions } = error || {};
  const { details } = extensions || {};
  throw new Error(details || error?.message || 'Unknown error');
};

const ignoredQueries = ['refreshToken', 'syncInfo'];

const shouldIgnoreQuery = (definitionNode: DefinitionNode) => {
  const operationNode = definitionNode as OperationDefinitionNode;
  if (!operationNode) return false;
  if (operationNode.operation !== 'query') return false;

  return ignoredQueries.indexOf(operationNode.name?.value ?? '') !== -1;
};

const shouldSaveRequestTime = (documentNode?: DocumentNode) => {
  return documentNode && !documentNode.definitions.some(shouldIgnoreQuery);
};

class GQLClient extends GraphQLClient {
  private client: GraphQLClient;
  private emptyData: object;
  private skipRequest: SkipRequest;
  private lastRequestTime: Date;

  constructor(
    url: string,
    options?: RequestInit | undefined,
    skipRequest?: SkipRequest
  ) {
    super(url, options);
    this.client = new GraphQLClient(url, options);
    this.emptyData = {};
    this.skipRequest = skipRequest || (() => false);
    this.lastRequestTime = new Date();
  }

  public request<T, V = Variables>(
    documentOrOptions: RequestDocument | RequestOptions<V>,
    variables?: V,
    requestHeaders?: RequestInit['headers']
  ): Promise<T> {
    const options = documentOrOptions as RequestOptions<V>;
    const document = (documentOrOptions as DocumentNode) || options.document;

    if (this.skipRequest(document)) {
      return new Promise(() => this.emptyData);
    }

    if (shouldSaveRequestTime(document)) this.lastRequestTime = new Date();

    const response = options.document
      ? this.client.request(options)
      : this.client.request(
          documentOrOptions as RequestDocument,
          variables,
          requestHeaders
        );
    // returning an empty object in order to give the caller a stable reference
    // without it, the page will re-render continuously
    return response.then(
      data => data ?? this.emptyData,
      ({ response }) => {
        if (response && response.errors) {
          handleResponseError(response.errors);
        } else {
          throw new Error('Unknown error');
        }
      }
    );
  }

  public setHeaders = (headers: RequestInit['headers']): GraphQLClient =>
    this.client.setHeaders(headers);
  public setHeader = (key: string, value: string): GraphQLClient =>
    this.client.setHeader(key, value);
  public setEndpoint = (value: string): GraphQLClient =>
    this.client.setEndpoint(value);
  public setSkipRequest = (skipRequest: SkipRequest) =>
    (this.skipRequest = skipRequest);
  public getLastRequestTime = () => this.lastRequestTime;
}

export const createGql = (
  url: string,
  skipRequest?: SkipRequest
): { client: GQLClient } => {
  const client = new GQLClient(url, { credentials: 'include' }, skipRequest);
  return { client };
};

interface GqlControl {
  client: GQLClient;
  setHeader: (header: string, value: string) => void;
  setUrl: (url: string) => void;
  setSkipRequest: (skipRequest: SkipRequest) => void;
}

const GqlContext = createContext<GqlControl>({
  ...createGql(''),
  setHeader: () => {},
  setUrl: () => {},
  setSkipRequest: () => {},
});

const { Provider } = GqlContext;

interface ApiProviderProps {
  url: string;
  skipRequest?: (documentNode: DocumentNode) => boolean;
}

export const GqlProvider: FC<PropsWithChildren<ApiProviderProps>> = ({
  url,
  skipRequest,
  children,
}) => {
  const [{ client }, setApi] = useState<{
    client: GQLClient;
  }>(() => createGql(url, skipRequest));

  const setUrl = useCallback(
    (newUrl: string) => {
      client.setEndpoint(newUrl);
    },
    [client]
  );

  const setHeader = useCallback(
    (key: string, value: string) => {
      client.setHeader(key, value);
    },
    [client]
  );

  const setSkipRequest = useCallback(
    (skipRequest: (documentNode: DocumentNode) => boolean) => {
      client.setSkipRequest(skipRequest);
    },
    [client]
  );

  useEffect(() => {
    setApi(createGql(url, skipRequest));
  }, [url, skipRequest]);

  const val = useMemo(
    () => ({
      client,
      setUrl,
      setHeader,
      setSkipRequest,
    }),
    [client, setUrl, setHeader, setSkipRequest]
  );

  return <Provider value={val}>{children}</Provider>;
};

export const useGql = (): GqlControl => {
  const graphQLClientControl = React.useContext(GqlContext);
  return graphQLClientControl;
};
