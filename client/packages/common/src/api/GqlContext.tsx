import React, {
  FC,
  useMemo,
  useEffect,
  useState,
  useCallback,
  PropsWithChildren,
} from 'react';
import { createContext } from 'react';
import {
  GraphQLClient,
  RequestDocument,
  RequestOptions,
  Variables,
} from 'graphql-request';
import { AuthError } from '../authentication/AuthContext';
import { LocalStorage } from '../localStorage';

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

class GQLClient extends GraphQLClient {
  private client: GraphQLClient;
  private emptyData: object;

  constructor(url: string, options?: RequestInit) {
    super(url, options);
    this.client = new GraphQLClient(url, options);
    this.emptyData = {};
  }

  public request<T, V = Variables>(
    documentOrOptions: RequestDocument | RequestOptions<V>,
    variables?: V,
    requestHeaders?: RequestInit['headers']
  ): Promise<T> {
    const options = documentOrOptions as RequestOptions<V>;
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
}

export const createGql = (url: string): { client: GQLClient } => {
  const client = new GQLClient(url, { credentials: 'include' });
  return { client };
};

interface GqlControl {
  client: GQLClient;
  setHeader: (header: string, value: string) => void;
  setUrl: (url: string) => void;
}

const GqlContext = createContext<GqlControl>({
  ...createGql(''),
  setHeader: () => {},
  setUrl: () => {},
});

const { Provider } = GqlContext;

interface ApiProviderProps {
  url: string;
}

export const GqlProvider: FC<PropsWithChildren<ApiProviderProps>> = ({
  url,
  children,
}) => {
  const [{ client }, setApi] = useState<{
    client: GQLClient;
  }>(() => createGql(url));

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

  useEffect(() => {
    setApi(createGql(url));
  }, [url]);

  const val = useMemo(
    () => ({
      client,
      setUrl,
      setHeader,
    }),
    [client, setUrl, setHeader]
  );

  return <Provider value={val}>{children}</Provider>;
};

export const useGql = (): GqlControl => {
  const graphQLClientControl = React.useContext(GqlContext);
  return graphQLClientControl;
};
