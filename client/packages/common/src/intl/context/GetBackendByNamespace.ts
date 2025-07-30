import type {
  BackendModule,
  InitOptions,
  ReadCallback,
  Services,
} from 'i18next';
import HttpApi from 'i18next-http-backend';

interface GetBackendByNamespaceOptions {
  languageVersion: string;
  endpointByNamespace: Record<string, string>;
}

/**
 * Custom backend delegator - requests different backend based on
 * translation namespace
 */
export class GetBackendByNamespace
  implements BackendModule<GetBackendByNamespaceOptions>
{
  static type = 'backend';
  readonly type = 'backend';

  private namespaceBackends: Record<string, BackendModule> = {};

  constructor(
    services?: Services,
    backendOptions?: GetBackendByNamespaceOptions,
    i18NextOptions?: InitOptions
  ) {
    this.init(services, backendOptions, i18NextOptions);
  }

  init(
    services?: Services,
    backendOptions?: GetBackendByNamespaceOptions,
    _i18NextOptions?: InitOptions
  ): void {
    // Create a new HttpApi Backend for each registered namespace
    Object.entries(backendOptions?.endpointByNamespace ?? {}).map(
      ([ns, path]) => {
        const httpBackend = new HttpApi(services, {
          loadPath: path,
          queryStringParams: {
            v: backendOptions?.languageVersion ?? '',
          },
        });
        this.namespaceBackends[ns] = httpBackend;
      }
    );
  }

  // i18n calls read when it tries to load a new namespace, we then
  // delegate to the correct backend
  read(language: string, namespace: string, callback: ReadCallback): void {
    const backend = this.namespaceBackends[namespace];
    if (!backend) {
      callback(
        new Error(`No backend registered for namespace: ${namespace}`),
        false
      );
      return;
    }
    backend.read(language, namespace, callback);
  }
}
