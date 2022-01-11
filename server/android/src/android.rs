#[allow(non_snake_case)]
pub mod android {
    extern crate jni;

    use std::thread;

    use jni::sys::jchar;
    use repository::database_settings::DatabaseSettings;

    use server::settings::{AuthSettings, ServerSettings, Settings, SyncSettings};
    use server::start_server;

    use self::jni::objects::{JClass, JString};
    use self::jni::sys::{jshort, jstring};
    use self::jni::JNIEnv;

    use android_logger::Config;
    use log::Level;

    #[no_mangle]
    pub unsafe extern "C" fn Java_org_openmsupply_client_RemoteServer_rustHelloWorld(
        env: JNIEnv,
        _: JClass,
        name: JString,
    ) -> jstring {
        let name: String = env.get_string(name).unwrap().into();
        let response = format!("Hello {}!", name);
        env.new_string(response).unwrap().into_inner()
    }

    #[no_mangle]
    pub unsafe extern "C" fn Java_org_openmsupply_client_RemoteServer_startServer(
        env: JNIEnv,
        _: JClass,
        port: jchar,
        db_path: JString,
    ) -> jshort {
        android_logger::init_once(Config::default().with_min_level(Level::Trace));

        let db_path: String = env.get_string(db_path).unwrap().into();
        // run server in background thread
        thread::spawn(move || {
            actix_web::rt::System::new("remote server runtime").block_on(async move {
                let settings = Settings {
                    server: ServerSettings {
                        host: "127.0.0.1".to_string(),
                        port,
                    },
                    database: DatabaseSettings {
                        username: "n/a".to_string(),
                        password: "n/a".to_string(),
                        port: 0,
                        host: "n/a".to_string(),
                        database_name: db_path,
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
