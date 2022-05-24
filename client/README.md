# Open mSupply Client

Welcome! This is the front end application for open mSupply.

This is a multi-lingual, responsive web application making use of the open mSupply [remote-server API](https://github.com/openmsupply/remote-server).

It is built using React, with typescript, and a heavy reliance on hooks. The component framework is material-ui and we're using [storybook](https://storybook.js.org/) to demonstrate the usage and functionality of custom components.

The test framework is jest; functional areas are separated into packages and managed with [lerna](https://lerna.js.org/)

The API is a GraphQL server and internally we are running a mock server to backfill functionality in the API while that is being developed. The local GraphQL server is running on Apollo and we're making use of a mock service worker to handle specific requests.

To see it in action, check out the [demo server](https://demo-open.msupply.org/) which is running from the current `develop` branch.

## Usage

- Install dependencies (Using node v16+ and using yarn):

Make sure that the URL for the `remote-server` is set properly here `packages/host/public/config.js`

`yarn install`

- Run on development mode:

`yarn start`

- Bundle for production:

`yarn build`

- Test:

`yarn test`

## Development

- `main` branch - is the (un?)stable release branch

When developing, create an issue first then a branch based on the issue number. Current practice is to use the format `#[issue number]-some-description` for the branch name. When ready, create a PR which targets `main` and when approved, merge to `main`. We aim to review PRs promptly and keep the PR list as low as possible as a kindness to other developers ( and reduce merge hell! )

When creating a new component, please create a story in storybook. For functional areas, please add a test or two - just check the current examples of tests and stories to see how things works now.

Code is separated into functional areas, so that we can isolate bundles to these areas. These are not the same as areas in the site; there is a separation between code organisation and UI organisation - for example the site has `Distribution > Outbound Shipments` and `Replenishment > Inbound Shipments` and both of these are found in the `invoices` package in the code, as they are functionally very similar while being logically different.

Within each area you'll see a similar pattern of this for tabular data, which is pretty much everything:

```
.
├── [package name]
│   └── src
│        └── [functional area]
│            ├── DetailView
│            │   ├── api.ts
│            │   ├── DetailView.tsx
│            │   └── [other components]
│            └── ListView
│                ├── api.ts
│                ├── ListView.tsx
│                └── [other components]
├── [package name]
│   └── src
```

Couple of things to note:

- There is a pre-commit hook ( thanks husky ) which will run a typescript compilation and a linter to ensure that your changes will compile
- When you create a PR, there is a GitHub webhook which uses the webpack bundle size analyzer plugin and will create a comment on your PR telling you the size difference introduced by your change
- When merging to `main` there is another webhook which will deploy your change to the demo server

Once we are through the initial development phase, we'll move to a `develop` branch and keep `main` as a stable release branch. We're not there yet!

## Queries

We're using [React Query](https://react-query.tanstack.com/overview) to query the server and manage a local cache of queries.

Check out the existing implementation using `api.ts` files and integration with the `DataTable` component.

## Localisation

We're using [react-i18next](https://react.i18next.com/) for localisations. Collections of translatable items are grouped into namespaces so that we can reduce bundle sizes and keep files contained to specific areas. The namespace files are json files - kept separate from the main bundles and downloaded on demand. These are also cached locally in the browser.

When using translations in your code, you may need to specify the namespace to use e.g.

```
import { useTranslation } from '@openmsupply-client/common';

...

const t = useTranslation('common');

...
<ModalLabel label={t('label.code')} />
```

You can also specify multiple namespaces when using the hook:

```
  const t = useTranslation(['common', 'distribution']);
```

## Android App
Short version to build an Android apk (if everything is already set up correctly):

```bash
# Compile the remote server and copy libs over:
yarn android:build-remote_server
# Create the apk
yarn android:build:debug
```

### Pre requisites

This is using capacitor, and the `cordova-android` plugin. These are in `package.json`, so you'll install when you `yarn install`.
However, capacitor would also like you to

```
npx cap sync
```

after the cordova plugin is installed.. this will create the `./packages/android/capacitor-cordova-android-plugins` dir, which you'll need.

### Build the remote server lib

The Android app needs the remote server build as a shared lib.

Make sure the Android NDK is installed and the env var `NDK_HOME` is set, for example to `~Android/Sdk/ndk/22.1.7171670`.
Currently the build script requires the Android API 26, make sure this version is installed.

For Mac OS, the version of NDK installed by Android Studio does not have all of the required linkers prebuilt: instead use:

`~/Library/Android/sdk/tools/bin/sdkmanager "ndk-bundle"`

and set the `NDK_HOME` to `$ANDROID_SDK_ROOT/ndk-bundle`

You may need to install `armv7` i.e. `rustup target add armv7-linux-androideabi`

```bash
# Compile the remote server and copy libs over:
yarn android:build-remote_server
```

#### MacOS

Have been unable to build the aarch64-linux-android target of remote-server on macOS running on apple silicon. Configuration when using an x86 based macOS is also difficult and we recommend building on a linux host if at all possible. 

Here are some issues encountered when building on macOS:

1. If you have the error: `fatal error: 'stdio.h' file not found`. If so, specify a location for the headers using the`CPATH`env var, for example`/Applications/Xcode.app/Contents/Developer/Platforms/MacOSX.platform/Developer/SDKs/MacOSX.sdk/usr/include/`or`/Library/Developer/CommandLineTools/SDKs/MacOSX.sdk/usr/include/`

2. If the `C_INCLUDE_PATH` env var is set, that may cause compilation issues, as it will include the macOS headers and give you `warning: #error architecture not supported` and `warning: fatal error: too many errors emitted, stopping now [-ferror-limit=]`. In which case `unset C_INCLUDE_PATH`


3. `thread 'rustc' panicked at 'called `Option::unwrap()` on a `None` value', compiler/rustc_codegen_llvm/src/back/archive.rs:358:67`: Install openssl (`brew install openssl`) and set the env var for `OPENSSL_DIR` e.g. `export OPENSSL_DIR=/usr/local/opt/openssl@3`

#### Unsolved issue that will hopefully be fixed at some point:

1. The x86 target seem to be broken and crashes when loading the server lib
2. On Mac OS the `armv7-linux-androideabi` target fails to build, you may need to comment out from the makefile and build script

### Run the Android app

Run:
```
yarn android:build:debug
```

This will:
- build the react app
- copy the built files for capacitor
- build the apk

The steps, if you need to run them manually are:

```
yarn build-local
npx cap copy
```

Open the `android` folder in Android Studio and start the app.
Note that the `build-local` script will set the `API_HOST` to `API_HOST: 'https://localhost:8000'` in  `packages/host/public/config.js` which is required when running the remote server running on Android.



### Release build
Make sure you have an Android keystore for signing the release apk.
Create a file `packages/android/local.properties` and add the required key store parameters:

```
storeFile=path/to/key/store.jks
keyAlias={mykey}
storePassword={password}
keyPassword={password}
```

and run:

```
yarn android:build:release
```

The apk will be located in `packages/android/app/build/outputs/apk/release`.

### Java bits

The remote server is started and stopped in: `android/app/src/main/java/org/openmsupply/client/MainActivity.java`

The cert plugin (`packages/android/app/src/main/java/org/openmsupply/client/certplugin/CertPlugin.java`) allows the web client to make https request to the remote-server using a self signed certificate.