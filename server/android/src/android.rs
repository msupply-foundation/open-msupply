#[allow(non_snake_case)]
pub mod android {
    extern crate jni;

    use std::thread;

    use jni::sys::jchar;
    use repository::database_settings::DatabaseSettings;
    use tokio::runtime::Runtime;

    use server::settings::{AuthSettings, ServerSettings, Settings, SyncSettings};
    use server::start_server;

    use self::jni::objects::{JClass, JString};
    use self::jni::sys::{jshort, jstring};
    use self::jni::JNIEnv;

    #[no_mangle]
    pub unsafe extern "C" fn Java_org_openmsupply_mobile_RemoteServer_rustHelloWorld(
        env: JNIEnv,
        _: JClass,
        name: JString,
    ) -> jstring {
        let name: String = env.get_string(name).unwrap().into();
        let response = format!("Hello {}!", name);
        env.new_string(response).unwrap().into_inner()
    }

    #[no_mangle]
    pub unsafe extern "C" fn Java_org_openmsupply_mobile_RemoteServer_startServer(
        _: JNIEnv,
        _: JClass,
        port: jchar,
    ) -> jshort {
        // run server in background thread
        thread::spawn(move || {
            let mut runtime = Runtime::new().unwrap();
            runtime.block_on(async move {
                let settings = Settings {
                    server: ServerSettings {
                        host: "localhost".to_string(),
                        port,
                    },
                    database: DatabaseSettings {
                        username: "n/a".to_string(),
                        password: "n/a".to_string(),
                        port: 0,
                        host: "n/a".to_string(),
                        database_name: "omsupply-database".to_string(),
                    },
                    sync: SyncSettings {
                        url: "localhost".to_string(),
                        username: "username".to_string(),
                        password: "password".to_string(),
                        interval: 300,
                    },
                    auth: AuthSettings {
                        token_secret: "Make me configurable".to_string(),
                    },
                };
                let _ = start_server(settings).await;
            });
        });

        0
    }
}
