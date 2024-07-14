import { BrowserWindow } from 'electron';
import { IPC_MESSAGES } from '../shared';
import { BarcodeScanner } from '@common/hooks';

// Some modifier keys are passed through (no preventDefault)
const keysToPassThrough = [
  'Backspace',
  'Tab',
  'Enter',
  'Shift',
  'Control',
  'Alt',
  'Pause',
  'CapsLock',
  'Escape',
  'Space',
  'PageUp',
  'PageDown',
  'End',
  'Home',
  'ArrowLeft',
  'ArrowUp',
  'ArrowRight',
  'ArrowDown',
  'PrintScreen',
  'Insert',
  'Delete',
  'Clear',
];

// Scan Log
const PROCESSOR_INTERVAL = 50;

type KeyEvent = { input: Electron.Input; ms: number };

// Some keys need to be removed, see README.md
const ignoreKeys = (input: Electron.Input) =>
  // Just focusing on keyDown events
  input.type != 'keyDown' ||
  // When input holding key press
  input.isAutoRepeat;

type KeyboardScannerSettings = {
  maxMSBetweenScannerKeyInputs: number;
  minBarcodeLength: number;
};

const KEYBOARD_SCANNER: BarcodeScanner = {
  vendorId: 1,
  productId: 1,
  connected: true,
};

export class KeyboardScanner {
  window: BrowserWindow;
  interval: NodeJS.Timeout | undefined;
  // Buffer can be written concurrent in event handles and when processing input
  // this lock is to make sure it's edited synchronously
  lockBuffer: boolean;
  // In scanning mode, when non barcode data entry is made, should allow it (no preventDefault())
  allowEvents: boolean;
  scanning: boolean;
  buffer: KeyEvent[];
  settings: KeyboardScannerSettings;

  constructor(window: BrowserWindow) {
    this.window = window;
    this.scanning = false;
    this.lockBuffer = false;
    this.allowEvents = false;
    this.settings = {
      maxMSBetweenScannerKeyInputs: 50,
      minBarcodeLength: 5,
    };
    this.buffer = [];

    this.bindInputEvent();
  }

  start() {
    this.scanning = true;
    // Process input, find sequence of input events that are less then maxMSBetweenScannerKeyInputs apart
    // and at least minBarcodeLength long
    this.interval = setInterval(() => {
      this.processInputs();
    }, PROCESSOR_INTERVAL);
  }

  stop() {
    this.scanning = false;
    if (this.interval) {
      clearInterval(this.interval);
      this.interval = undefined;
    }
  }

  async processInputs() {
    if (this.lockBuffer) return;
    try {
      this.lockBuffer = true;

      let checkSequence: KeyEvent[] = [];
      let passThrough: KeyEvent[] = [];
      let barcode: KeyEvent[] = [];

      this.buffer.forEach((current, index) => {
        // Get ms for next input event or now
        const nextMs = this.buffer[index + 1]?.ms ?? Date.now();
        const diff = nextMs - current.ms;

        checkSequence.push(current);
        // Sequence is still ongoing
        // ms diff between every event is sequence is below  maxMSBetweenScannerKeyInputs
        if (diff < this.settings.maxMSBetweenScannerKeyInputs) return;
        // If exceeding maxMSBetweenScannerKeyInputs and sequence length
        // is not long enough to be barcode, pass all input through
        if (checkSequence.length < this.settings.minBarcodeLength) {
          passThrough = [...passThrough, ...checkSequence];
          checkSequence = [];
        } else {
          // If exceeding maxMSBetweenScannerKeyInputs but sequence length
          // is long enough to be a barcode, record as barcode;
          // Very unlikely that two barcodes will be scanned within PROCESSOR_INTERVAL
          barcode = checkSequence;
          checkSequence = [];
        }
      });

      // Remember left over for next check
      this.buffer = checkSequence;
      if (barcode.length != 0) {
        // This console logging is super useful so we've left it in place deliberately
        const barcodeString = barcode.map(({ input: { key } }) => key).join('');
        this.log(`Full barcode: ${barcodeString}`);
        this.log(barcode);
        this.sendBarcode(barcode);
      }

      if (passThrough.length != 0) {
        // Should allow pass through input events, even if bufferIsLocked
        this.allowEvents = true;

        passThrough.forEach(({ input: { key } }) => {
          this.sendKey(key);
        });

        // Delay slightly to allow above events to go through, before unlocking buffer
        await new Promise(resolve => setTimeout(resolve, 10));
        this.allowEvents = false;
      }
    } catch (e) {
      console.error(e);
    } finally {
      // Make sure lockBuffer is always unlocked
      this.lockBuffer = false;
    }
  }

  log = (something: string | object) => {
    try {
      const js =
        typeof something === 'object'
          ? `console.info(${JSON.stringify(something, null, ' ')});`
          : `console.info('${something.replace("'", "\\'")}');`;
      this.window.webContents.executeJavaScript(js);
    } catch (e) {
      console.error(e);
    }
  };

  bindInputEvent() {
    // Bind keyboard capture on startup (this.scanning is false by default)
    this.window.webContents.on('before-input-event', (event, input) => {
      if (!this.scanning) return;

      if (keysToPassThrough.includes(input.key)) return;

      while (this.lockBuffer) {
        // Buffer will be locked when processing input, and when input is identified as normal keyboard event
        // input keys will be passed through (no preventDefault), allowEvents flag is used for this reason
        if (this.allowEvents) return;
      }

      try {
        this.lockBuffer = true;
        // Capture event
        event.preventDefault();
        if (!ignoreKeys(input)) {
          this.buffer.push({ input, ms: Date.now() });
        }
      } catch (e) {
        console.error(e);
      } finally {
        // Make sure lockBuffer is always unlocked
        this.lockBuffer = false;
      }
    });
  }

  sendKey(key: string) {
    // Need both events, otherwise input is not updated with the key press: https://stackoverflow.com/a/53223619
    this.window.webContents.sendInputEvent({
      type: 'keyDown',
      keyCode: key,
    });
    this.window.webContents.sendInputEvent({
      type: 'char',
      keyCode: key,
    });
  }

  sendBarcode(barcode: KeyEvent[]) {
    // Only send keys and digits to barcode
    const adjusted = barcode.reduce(
      (acc: string[], { input: { code, modifiers } }) => {
        switch (true) {
          case code.startsWith('Key'):
            return [...acc, code.replace('Key', '')];
          case code.startsWith('Digit'):
            return [...acc, code.replace('Digit', '')];
          // Group separator, on Zebra I've noticed it's 'Numpad0', with alt and iskeypad
          case code === 'Numpad0' &&
            modifiers.includes('alt') &&
            modifiers.includes('iskeypad'):
            return [...acc, String.fromCharCode(29)];
          // Group separator, on ZKTeco I've noticed it's 'F8'
          case code === 'F8':
            return [...acc, String.fromCharCode(29)];
          default:
            return acc;
        }
      },
      []
    );

    const asChars = adjusted.map(key => key.charCodeAt(0));
    // parseBarcodeData trims first four numbers of barcode
    const withPrefix = [0, 0, 0, 0, ...asChars];
    this.window.webContents.send(IPC_MESSAGES.ON_BARCODE_SCAN, withPrefix);
  }

  linkedScanner() {
    return KEYBOARD_SCANNER;
  }
}
