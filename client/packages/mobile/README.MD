# Mobile App with Discovery

It's bundled with server, which will always start and allows for one app for both client and client/server. Mobile app will broadcast via dns sd and will be reachable by both Mobile and Electron clients on local network. Uses web view to display content and binds certain native functionality to JS. All UI is served by bundled server, including discovery.

## Getting started

First of all, need to make sure that you can build [server binaries](../../../server/android/README.md)

When you are confident they are building, can use `yarn server:build` form this directoy or `yarn mobile:server:build` from `repo root/client` directory. This builds `libremote_server_lib.so` binaries and relocated them to `app/src/main/jniLibs`, see `RemoteServer.java` for more details of how these libs are loaded.

After this just open `mobile` direcotory in Android Studio, connect your device in development mode and press play (if configuration is not available, right click on `MainActivity.java` and `run`).

## Dev notes

If you make any changes to front end or server, you will need to clear data for the app, you can go to `run` menue in Android Studio and `edit configurations`, you should be able to see option to clear data, which will be cleared whenever you restart the app. Also you would need to re run yarn script to build server before re-running app.

Although app runs in emulator, it's not directly conencted to local network (todo add adb command for this)

Here is an example of how [Native API can be expanded](https://github.com/openmsupply/open-msupply/pull/804)
