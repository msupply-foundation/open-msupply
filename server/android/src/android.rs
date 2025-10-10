// This module exports some "C" methods that can directly be called from the Java runtime.
#[allow(non_snake_case)]
pub mod android {
    extern crate jni;
    use std::path::PathBuf;
    use std::sync::Mutex;
    use std::thread::{self, JoinHandle};

    use jni::sys::jchar;
    use repository::database_settings::DatabaseSettings;
    use server::{logging_init, start_server};
    use service::settings::{DiscoveryMode, LogMode, LoggingSettings, ServerSettings, Settings};
    use tokio::sync::mpsc;

    use self::jni::objects::{JClass, JString};
    use self::jni::JNIEnv;

    struct ServerBucket {
        off_switch: mpsc::Sender<()>,
        thread: JoinHandle<()>,
    }

    static SERVER_BUCKET: Mutex<Option<ServerBucket>> = Mutex::new(None);

    #[no_mangle]
    pub extern "C" fn Java_org_openmsupply_client_RemoteServer_startServer(
        mut env: JNIEnv,
        _: JClass,
        port: jchar,
        files_dir: JString,
        cache_dir: JString,
        android_id: JString,
    ) {
        let (off_switch, off_switch_receiver) = mpsc::channel(1);
        let files_dir: String = env.get_string(&files_dir).unwrap().into();
        let files_dir = PathBuf::from(&files_dir);
        let android_id: String = env.get_string(&android_id).unwrap().into();
        let db_path = files_dir.join("omsupply-database");
        let cache_dir: String = env.get_string(&cache_dir).unwrap().into();

        let log_path = files_dir.join("logs");
        std::fs::create_dir_all(&log_path).unwrap();

        let settings = Settings {
            server: ServerSettings {
                port,
                danger_allow_http: false,
                discovery: DiscoveryMode::Disabled,
                debug_no_access_control: false,
                cors_origins: vec!["http://localhost".to_string()],
                base_dir: Some(files_dir.to_str().unwrap().to_string()),
                machine_uid: Some(android_id),
                override_is_central_server: false,
            },
            database: DatabaseSettings {
                username: "n/a".to_string(),
                password: "n/a".to_string(),
                port: 0,
                host: "n/a".to_string(),
                database_name: db_path.to_string_lossy().to_string(),
                database_path: None,
                // See https://github.com/openmsupply/remote-server/issues/1076
                init_sql: Some(format!("PRAGMA temp_store_directory = '{}';", cache_dir)),
            },
            // sync settings need to be configured at runtime
            sync: None,
            logging: Some(
                LoggingSettings::new(LogMode::File, service::settings::Level::Info)
                    .with_directory(log_path.to_string_lossy().to_string()),
            ),
            backup: None,
            // Not supporting mail sending on Android - so cannot be Central Server (does it need to be?)
            mail: None,
            // Feature flags won't work using tablet as a server. Run in client mode and connect to a desktop server instead
            features: None,
        };

        logging_init(settings.logging.clone(), None);
        log_panics::init();
        log::info!("omSupply server starting...");

        // run server in background thread
        let thread = thread::spawn(move || {
            // This code is from expanding macro in main.rs
            actix_web::rt::System::new()
                .block_on(start_server(settings, off_switch_receiver))
                .unwrap();
        });

        let mut bucket = SERVER_BUCKET.lock().unwrap();
        *bucket = Some(ServerBucket { off_switch, thread });
    }

    #[no_mangle]
    pub extern "C" fn Java_org_openmsupply_client_RemoteServer_stopServer(_: JNIEnv, _: JClass) {
        let ServerBucket { off_switch, thread } = SERVER_BUCKET.lock().unwrap().take().unwrap();
        futures::executor::block_on(off_switch.send(())).unwrap();
        thread.join().unwrap();
    }
}
