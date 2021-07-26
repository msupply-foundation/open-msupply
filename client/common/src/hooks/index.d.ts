export interface RemoteScriptStatus {
  ready: boolean;
  failed: boolean;
}
export interface RemoteFunctionStatus extends RemoteScriptStatus {
  fn?: () => void;
}

export function useRemoteScript(url: string): RemoteScriptStatus;
export function useRemoteFn(
  url: string,
  scope: any,
  module: any
): RemoteFunctionStatus;
