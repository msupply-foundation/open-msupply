import { IpcRendererEvent } from 'electron';
export const DISCOVERY_TIMEOUT = 7000;
export const DISCOVERED_SERVER_POLL = 2000;

export type Preference = {
  key: string;
  value: string;
  error?: string;
};
export interface NativeAPI {
  // Method used in polling for found servers
  discoveredServers: () => Promise<{ servers: FrontEndHost[] }>;
  // Starts server discovery (connectToServer stops server discovery)
  startServerDiscovery: () => void;
  // Asks client to connect to server (causing window to navigate to server url and stops discovery)
  connectToServer: (server: FrontEndHost) => void;
  // Will return currently connected client (to display in UI)
  connectedServer: () => Promise<FrontEndHost | null>;
  goBackToDiscovery: () => void;
  advertiseService?: () => void;
  startBarcodeScan: () => Promise<void>;
  stopBarcodeScan: () => Promise<void>;
  // Callback for barcode scan result
  onBarcodeScan: (
    callback: (event: IpcRendererEvent, data: number[]) => void
  ) => void;
  readLog: () => Promise<{ log: string; error: string }>;
}

export enum NativeMode {
  None = 'none',
  Client = 'client',
  Server = 'server',
}

export type Protocol = 'http' | 'https';

export const isProtocol = (value: any): value is Protocol =>
  value === 'http' || value === 'https';

// Should match server/server/src/discovery.rs (FrontEndHost)
export type FrontEndHost = {
  protocol: Protocol;
  port: number;
  ip: string;
  // Below come from TXT record
  clientVersion: string;
  hardwareId: string;
  // This one is set by NativeClient
  isLocal: boolean;
  // Allows specifying a path to use when connecting
  path?: string;
};
