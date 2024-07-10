import { IpcRendererEvent } from 'electron';
export const DISCOVERY_TIMEOUT = 7000;
export const DISCOVERED_SERVER_POLL = 2000;

export const DEFAULT_LOCAL_SERVER = {
  protocol: 'https' as 'https' | 'http',
  port: 8000,
  ip: '127.0.0.1',
  clientVersion: '',
  hardwareId: '',
  isLocal: true,
};

export type Preference = {
  key: string;
  value: string;
  error?: string;
};
export type ConnectionResult = {
  success: boolean;
  error?: string;
};
export type FileInfo = {
  content: string;
  filename?: string;
};

export interface NativeAPI {
  // Method used in polling for found servers
  discoveredServers: () => Promise<{ servers: FrontEndHost[] }>;
  // Starts server discovery (connectToServer stops server discovery)
  startServerDiscovery: () => void;
  // Asks client to connect to server (causing window to navigate to server url and stops discovery)
  connectToServer: (server: FrontEndHost) => Promise<ConnectionResult>;
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
  startDeviceScan: () => Promise<void>;
  linkedBarcodeScannerDevice: () => Promise<BarcodeScanner>;
  onDeviceMatched: (
    callback: (event: IpcRendererEvent, scanner: BarcodeScanner) => void
  ) => void;
  setScannerType: (server: ScannerType) => void;
  getScannerType: () => Promise<ScannerType>;
  saveFile: (
    fileInfo: FileInfo
  ) => Promise<{ success: boolean; error?: string }>;
  saveDatabase: () => Promise<{ success: boolean; error?: string }>;
}

export enum NativeMode {
  None = 'none',
  Client = 'client',
  Server = 'server',
}

export type Protocol = 'http' | 'https';

export const isProtocol = (value: string): value is Protocol =>
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

export type BarcodeScanner = {
  vendorId: number;
  productId: number;
  path?: string;
  serialNumber?: string;
  manufacturer?: string;
  product?: string;
  connected: boolean;
};

export type ScannerType = 'usb_serial' | 'usb_keyboard';
