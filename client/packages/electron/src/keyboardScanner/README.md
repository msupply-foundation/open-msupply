## Keyboard Barcode Scanner

Although our preference is to use USB serial mode for barcode scanners, not all scanners support this mode and only allow keyboard emulation over USB.

To mimic existing USB serial barcode scanner implementation with keyboard scanners we have to capture keyboard input and pass through through all input that does not come from scanner.

#### What is scanner input ?

Because scanner scans and sends keyboard events very fast, we can identify scanner input by looking the speed at which keys are entered. Two configurations are used to determine if input is form barcode scanner (at the time of writing these are hardcoded):

`maxMSBetweenScannerKeyInputs` defaults to 50 and `minBarcodeLength` defaults to 5.

Of course it's possible for user to spam keyboard and replicate scanner input, this should be OK because:

- It's highly unlikely
- Our UI is not really catered for operations at this speed (even without barcode scanner these operations are not really considered, as they are unlikely low probably and low impact)
- We actually recommend using USB serial scanner mode

#### How does it work ?

During barcode scanning mode (when keyboard scanner is selected), all keyboard input is captured with `window.webContents.on('before-input-event'` and stored in a buffer.

A processor is triggered every PROCESSOR_INTERVAL (50ms), it will try to find scanner input by iterating over buffer and finding input sequences matching scanner input criteria. Any input not matching scanner input criteria will be passed through (as if it wasn't captured).

If sequence input is not `finalised` (still ongoing while processor is triggered), it will be put back into buffer.

Processor is started (setInterval) when scanning operation is started and will be cleared when scanning operation is stopped (clearInterval)

#### Passing through input

Any control keys (keysToPassThrough array) are passed through automatically (when input is captured). Other input that is identified by processor as not scanner input is passed through by manually calling keyDown and char event (apparently that is what [chromium](https://stackoverflow.com/a/53223619) needs to consider it input entered by keyboard).

Since we are capturing input with `window.webContents.on('before-input-event'` we have to temporary allow this input to go through with `allowEvents` flag which is set in the processor when the input is identified as not being from scanner.

#### Other notes

Only `keyDown` input is captured in buffer to be processed, `keyUp` events are captured but are not appended to buffer.

We also capture and ignore `isAutoRepeat` type input, this is when they key is held down (only the first keyDown even is captured and stored in buffer for processing).

When barcode is created from input sequence, we only keep inputs starting with Digit and Key, and instead of using `key` of input, we use `code` of input, i.e. (Digit1 or KeyA), this means any special characters in barcode are ignored and capitalisation is ignored. This is done to make sure that keyboard OS settings dont' interfere with resulting barcode (i.e. when French AZERTY keyboard mode is on). This should only affect lot/batch number, and from my understanding those are always capital english letters.

In more complex barcodes, as per image below, special character separates lot and [serial number](https://www.databar-barcode.info/application-identifiers/), for Zebra this special character seems to be `Numpad0` + 'alt' + 'iskeypad' and for ZKTeco it was 'F8', this is replaced with charcode `29` (when scanned with USB serial mode this appears as charcode 29):

![complex barcode](./docs/complex_barcode.png)

It is possible for actual keyboard input to be perceived as scanner input or for processor and capture functionality to cause glitches, this is minimised by:

- Only capturing and processing input when scanning mode is turned on.
- Considering that during scanning mode we only entering quantities (simple digits) or searching for item (simple alphanumeric keys)
- We actually recommend using USB serial scanner mode and Zebra scanners, some support is provided for keyboard scanners but it's limited and at TMF discretion
