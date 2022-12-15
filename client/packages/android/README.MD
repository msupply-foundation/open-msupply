# Mobile App with Discovery

It's bundled with server, server always start and allows for one app for both client and client/server. Mobile app will broadcast via dns sd and will be reachable by both Mobile and Electron clients on local network. We are using Capacitor to make use of existing optimisations and large library of nativ plugins. All UI is served by bundled server, including discovery.

## Getting started

First of all, need to make sure that you can build [server binaries](../../../server/android/README.md)

When you are confident they are building, can use `yarn build:server` form this directoy, this builds `libremote_server_lib.so` binaries and relocated them to `app/src/main/jniLibs`, see `RemoteServer.java` for more details of how these libs are loaded. It's important to note that web app is bundled in the remote server binary, and web app needs to be built from `client` directory with `yarn build` command, so it's best to use `yarn android:build:server` from client directory as it does both (builds web app and then build android remote server).

Next step is to open this directory in Android Studio, this will engage gradle sync process (initialising pre-requisites etc.), if you get an error during 'sync' process Android Studio should outline the issue with suggested fix. Usually you will need to either set `ANDROID_SDK_ROOT` or add `sdk.dir` in `local.properties` file, and skd is usually located in `/Users/{user}/Library/Android/sdk/`. Pressing play (run) should restart sync process.

## Debugging

It's recommended to use Android Studio for debuggin and running Android App, there is a lot of functionality that cannot be replicated in Visual Studio Code (although there are some extensions for Visual Studio Code they are quite limited).

Debugging native code is straight forward, breakpoint in Android Studio and press debug. 

Debuggin web app code is done by opening `chrome://inspect`, you should see Web View when app is running in emulator. When bundled is served from remote server (default setup), js bunlde is minimised and this makes debugging very hard, however we can run the bundle from webpack server by commenting out plugins section in `capacitor.config.ts` and entering your local ip in the debugUrl field and running `yarn apply-config`. Please make sure that you start front end server with `yarn start-local` from 'client' directory for this to work.

Please note that when debuggin with life reload, connections to a discovered server will always go through to the webpack server (regardless of which server is being selected).

When running android app in emulator, service discovery will not work outside of the emulator network, to test this you will need to run on a device.

## Scripts

The following scripts are available 

```bash
# Builds remote server binaries for android and copies them to android package
yarn build:server
# Assembles android apk
yarn android:build:debug
# Assembles android release apk, requires key store information, see below
yarn android:build:release
# Copies over configurations and other assets
yarn apply-config
```

As per earlier comment, please make sure to build front end with `yarn build` from client directory prior to runner the above or run `yarn android:{command here}` from client directory to do both with one command. 

## Release build

Make sure you have an Android keystore for signing the release apk.
Create a file `local.properties` and add the required key store parameters:

```
storeFile=path/to/key/store.jks
keyAlias={mykey}
storePassword={password}
keyPassword={password}
```

and run:

```
yarn build:release
```

The apk will be located in `app/build/outputs/apk/release`.

It's best to run `yarn android:build:release` from client directory to make sure front end is bundled correctly in the server

## Adding plugins

Apart from usual local/packaged plugin setup for Capacitor, make sure to add plugin name to `onPageStarted` method in `ExtendedWebViewClient.java` (you can see what plugin names are available by using Android Studio debug and inspecting `bridge.plugins`).

Example of expanding local native functionality.

## Capacitor modifications

A few configuration/modifications were made to make sure we can serve Android bundle from the server rather then static bundle with the app (this allows upgrades to server to reflect in the android app when android app is connected as a client to external server, we would still need to upgrade android app when native functionality is added).

1. capacitor.config.ts (see comment in that file)
2. Capacitor `proxies` fetches and tries to modify html files to include pre-requisite <scripts>, since this proxy is done manually using java.net.URL and our servers generate self signe certs, and error is thrown and pre requisite scripts are not inserted, `ExtendedWebViewClient` was created for that reason. [Discussion](https://github.com/ionic-team/capacitor/discussions/6166) was made on capacitor github to see if there is another way to overcome this.
3. Base url is loaded manually in `handleOnStart()` method in `NativeApi.java` 

## Extra

The cert plugin (`app/src/main/java/org/openmsupply/client/certplugin/CertPlugin.java`) allows the web client to make https request to the remote-server using a self signed certificate. It needs to extend `ExtendedWebViewClient` rathern then `WebViewClient` to allow for Capacitor Modification 2. to work.

`RemoteServer.java` is jni mapping to functions defined in `server/android/src/android.rs`

## CAP

Capacitor comes with cli, we mainly use `npx cap copy` (or `yarn apply-config`), this moves bundled assets to app/src/main/assets/public. Usually capacitor would bundle web app within the APK, since we are serving front end bundle with server we don't need to move them (you will not that in capacitor.config.ts `webDir` is pointed to a notexistet directory). Capacitor also moves pre requisites to cordova plugins to that folder, which is automatically injected into served `html`. Another taks of `npx cap copy` is to copy configuration files `capacition.config.ts` is translated to JSON file and moved to app/src/main/assets


`app/src/main/assets/public` directory is typically not commited, but since it's only going to have cordova artifacts, it is in our case (to reduce setup). 


`npx cap copy` or `yarn apply-config` should only be run when cordova plugins are added or updated or when updating capacitor.config.ts