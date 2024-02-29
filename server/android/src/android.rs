/// This module exports some "C" methods that can directly be called from the Java runtime.
#[allow(non_snake_case)]
pub mod android {
    extern crate jni;
    use std::path::PathBuf;
    use std::sync::Mutex;
    use std::thread::{self, JoinHandle};

    use jni::sys::jchar;
    use repository::database_settings::DatabaseSettings;
    use server::{logging_init, start_server};
    use service::settings::{LogMode, LoggingSettings, ServerSettings, Settings};
    use tokio::sync::mpsc;

    use self::jni::objects::{JClass, JString};
    use self::jni::JNIEnv;

    struct ServerBucket {
        off_switch: mpsc::Sender<()>,
        thread: JoinHandle<()>,
    }

    static SERVER_BUCKET: Mutex<Option<ServerBucket>> = Mutex::new(None);

    #[no_mangle]
    pub unsafe extern "C" fn Java_org_openmsupply_client_RemoteServer_startServer(
        env: JNIEnv,
        _: JClass,
        port: jchar,
        files_dir: JString,
        cache_dir: JString,
        android_id: JString,
    ) {
        let (off_switch, off_switch_receiver) = mpsc::channel(1);
        let files_dir: String = env.get_string(files_dir).unwrap().into();
        let files_dir = PathBuf::from(&files_dir);
        let android_id: String = env.get_string(android_id).unwrap().into();
        let db_path = files_dir.join("omsupply-database");
        let cache_dir: String = env.get_string(cache_dir).unwrap().into();

        let settings = Settings {
            server: ServerSettings {
                port,
                danger_allow_http: false,
                debug_no_access_control: false,
                cors_origins: vec!["http://localhost".to_string()],
                base_dir: Some(files_dir.to_str().unwrap().to_string()),
                machine_uid: Some(android_id),
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
                    .with_directory(files_dir.to_string_lossy().to_string()),
            ),
        };

        logging_init(settings.logging.clone(), None);
        log_panics::init();
        log::info!("omSupply server starting...");

        // run server in background thread
        let thread = thread::spawn(move || {
            actix_web::rt::System::new()
                .block_on(start_server(settings, off_switch_receiver))
                .unwrap();
        });

        let mut bucket = SERVER_BUCKET.lock().unwrap();
        *bucket = Some(ServerBucket { off_switch, thread });
    }

    #[no_mangle]
    pub unsafe extern "C" fn Java_org_openmsupply_client_RemoteServer_stopServer(
        _: JNIEnv,
        _: JClass,
    ) {
        let ServerBucket { off_switch, thread } = SERVER_BUCKET.lock().unwrap().take().unwrap();
        futures::executor::block_on(off_switch.send(())).unwrap();
        thread.join().unwrap();
    }
}
