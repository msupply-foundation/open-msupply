# App-specific R8/ProGuard keep rules. Capacitor core and its plugins ship
# their own consumer rules (bridge, @PluginMethod, Plugin subclasses), so only
# this app's reflection/JNI surface needs listing here.

# JNI: the prebuilt libremote_server_android.so binds its symbols to this
# class's fully qualified name (Java_org_openmsupply_client_RemoteServer_*),
# and the Rust side may look the class up at runtime — never rename or strip.
-keep class org.openmsupply.client.RemoteServer { *; }

# Readable release stack traces (class names stay obfuscated; the mapping file
# under app/build/outputs/mapping/release/ de-obfuscates the rest).
-keepattributes SourceFile,LineNumberTable
