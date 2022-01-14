# Open mSupply Client

Welcome! This is the front end application for open mSupply.

This is a multi-lingual, responsive web application making use of the open mSupply [remote-server API](https://github.com/openmsupply/remote-server).

It is built using React, with typescript, and a heavy reliance on hooks. The component framework is material-ui and we're using [storybook](https://storybook.js.org/) to demonstrate the usage and functionality of custom components.

The test framework is jest; functional areas are separated into packages and managed with [lerna](https://lerna.js.org/)

The API is a GraphQL server and internally we are running a mock server to backfill functionality in the API while that is being developed. The local GraphQL server is running on Apollo and we're making use of a mock service worker to handle specific requests.

To see it in action, check out the [demo server](https://demo-open.msupply.org/) which is running from the current `develop` branch.

## Usage

- Install dependencies (Using node v16+ and using yarn):

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

### Build the remote server lib

The Android app needs the remote server build as a shared lib.

To build the shared lib the cross compiler needs to be build:
Make sure the Android NDK is installed and the env var `NDK_HOME` is set.
Then build the cross compilers using:

```
./setup-ndk.sh
```

Building the remote server lib:

```
cd rust
git clone git@github.com:openmsupply/remote-server.git
```

Note, unfortunately the remote server source directory can't be linked into the rust directory since otherwise `cargo` will not find the NDK directory.

Unsolved issued that will hopefully be fixed at some point:

1. The intel build fails at the moment. For this reason, in `rust/makefile`, change the line:

   `ARCHS_ANDROID = aarch64-linux-android armv7-linux-androideabi i686-linux-android`

   to:

   `ARCHS_ANDROID = aarch64-linux-android armv7-linux-androideabi`

2. in `rust/remote-server/Cargo.toml` add the "vendored" feature to openssl by changing the line:

   `openssl = { version = "0.10", features = ["v110"] }`

   to:

   `openssl = { version = "0.10", features = ["v110", "vendored"] }`

Then run:

```
make android
```

### Run the Android app

In `packages/host/public/config.js` change `API_URL` to `API_URL: 'http://localhost:8082/graphql'` to use the remotes server running on Android.

After building the web app the output needs to be copied to the android project:

```
npm run build
npx cap copy
```

Enable clear text traffic in `android/app/src/main/AndroidManifest.xml`:

```xml
<?xml version="1.0" encoding="utf-8"?>
<manifest xmlns:android="http://schemas.android.com/apk/res/android"
    package="org.openmsupply.client">

    <application
      android:usesCleartextTraffic="true"
      android:allowBackup="true"
      ...
```

Open the `android` folder in Android studio and start the app.

### Java bits

The remote server is started and stopped in: `android/app/src/main/java/org/openmsupply/client/MainActivity.java`
