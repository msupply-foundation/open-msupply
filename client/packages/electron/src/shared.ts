export const IPC_MESSAGES = {
  DISCOVERED_SERVERS: 'discovered-servers',
  START_SERVER_DISCOVERY: 'start-server-discovery',
  CONNECT_TO_SERVER: 'connect-to-server',
  CONNECTED_SERVER: 'connected-server',
  START_BARCODE_SCAN: 'start-barcode-scan',
  STOP_BARCODE_SCAN: 'stop-barcode-scan',
  ON_BARCODE_SCAN: 'on-barcode-scan',
  GO_BACK_TO_DISCOVERY: 'go-back-to-discovery',
  READ_LOG: 'read-log',
  GET_PREFERENCE: 'get-preference',
  SET_PREFERENCE: 'set-preference',
  LINKED_BARCODE_SCANNER_DEVICE: 'linked-barcode-scanner-device',
  START_DEVICE_SCAN: 'start-device-scan',
  ON_DEVICE_MATCHED: 'on-device-matched',
  SET_SCANNER_TYPE: 'set-scanner-type',
  GET_SCANNER_TYPE: 'get-scanner-type',
  SAVE_DATABASE: 'save-database',
  SAVE_FILE: 'save-file',
  // The new front end's discovery host contract
  // (frontend/src/discovery/hostContract.ts). Separate channels from the
  // fused CONNECT_TO_SERVER above, which the old front end still uses: the
  // page drives probe -> record -> navigate itself.
  DISCOVERY_HOST_INFO: 'discovery:host-info',
  DISCOVERY_START: 'discovery:start',
  DISCOVERY_ANNOUNCEMENTS: 'discovery:announcements',
  DISCOVERY_PROBE: 'discovery:probe',
  DISCOVERY_NAVIGATE: 'discovery:navigate',
  // The new front end's native HID scanner
  // (frontend/src/platform/barcodeSources/desktopHid.ts; ./hidScanner).
  // Separate from the *_BARCODE_SCAN / *_DEVICE_SCAN channels above, which
  // the old front end still uses and which are left as they are.
  HID_SCANNER_STATUS: 'hid-scanner:status',
  HID_SCANNER_CANDIDATES: 'hid-scanner:candidates',
  HID_SCANNER_PAIR: 'hid-scanner:pair',
  HID_SCANNER_PAIR_DEVICE: 'hid-scanner:pair-device',
  HID_SCANNER_CANCEL_PAIR: 'hid-scanner:cancel-pair',
  HID_SCANNER_FORGET: 'hid-scanner:forget',
  HID_SCANNER_START: 'hid-scanner:start',
  HID_SCANNER_STOP: 'hid-scanner:stop',
  HID_SCANNER_REPORT: 'hid-scanner:report',
  HID_SCANNER_CHANGED: 'hid-scanner:changed',
};
