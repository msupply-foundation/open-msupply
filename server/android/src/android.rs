/// This module exports some "C" methods that can directly be called from the Java runtime.
#[allow(non_snake_case)]
pub mod android {
    extern crate jni;

    use std::io::Write;
    use std::path::PathBuf;
    use std::thread::{self, JoinHandle};
    use std::{collections::HashMap, sync::Mutex};

    use jni::sys::{jchar, jshort};
    use rcgen::generate_simple_self_signed;
    use repository::database_settings::DatabaseSettings;

    use server::self_signed_certs::{PRIVATE_CERT_FILE, PUBLIC_CERT_FILE};
    use server::start_server;
    use service::settings::{ServerSettings, Settings};
    use tokio::sync::oneshot;

    use self::jni::objects::{JClass, JString};
    use self::jni::sys::{jlong, jstring};
    use self::jni::JNIEnv;

    use android_logger::Config;
    use log::Level;

    use once_cell::sync::Lazy;

    /// Handle for a running remote_server instance
    struct RunningServerHandle {
        /// Channel to signal the remote_server to exit
        off_switch: oneshot::Sender<()>,
        /// JoinHandle for the running remote_server thread
        thread: JoinHandle<()>,
    }

    /// Manages a set of RunningServerHandle
    /// Each running server is associated with an integer handle which can be passed to the Java
    /// world, e.g. the handle can be used to shutdown the server from Java.
    struct ServerBucket {
        // next handle ready to be used
        next_handle: i64,
        map: HashMap<i64, RunningServerHandle>,
    }

    impl ServerBucket {
        /// Returns an integer handle to the running server
        fn insert(&mut self, server: RunningServerHandle) -> i64 {
            let handle = self.next_handle;
            self.next_handle = handle + 1;
            self.map.insert(handle, server);
            handle
        }
    }

    static SERVER_BUCKET: Lazy<Mutex<ServerBucket>> = Lazy::new(|| {
        Mutex::new(ServerBucket {
            next_handle: 1,
            map: HashMap::new(),
        })
    });

    fn generate_certs(cert_dir: &PathBuf) {
        let subject_alt_names = vec!["localhost".to_string()];
        let cert = generate_simple_self_signed(subject_alt_names).unwrap();

        std::fs::create_dir_all(cert_dir).unwrap();
        let mut file = std::fs::File::create(cert_dir.join(PRIVATE_CERT_FILE)).unwrap();
        file.write_all(cert.serialize_private_key_pem().as_bytes())
            .unwrap();

        let mut file = std::fs::File::create(cert_dir.join(PUBLIC_CERT_FILE)).unwrap();
        file.write_all(cert.serialize_pem().unwrap().as_bytes())
            .unwrap();
    }

    /// Bindings test method. TODO: remove when not needed anymore
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
        files_dir: JString,
        cache_dir: JString,
        android_id: JString,
    ) -> jlong {
        android_logger::init_once(Config::default().with_min_level(Level::Trace));

        let (off_switch, off_switch_receiver) = oneshot::channel();
        let files_dir: String = env.get_string(files_dir).unwrap().into();
        let files_dir = PathBuf::from(&files_dir);
        let db_path = files_dir.join("omsupply-database");

        let cache_dir: String = env.get_string(cache_dir).unwrap().into();

        let cert_path = files_dir.join("certs");
        if !cert_path.join(PRIVATE_CERT_FILE).exists() {
            generate_certs(&cert_path);
        }

        // run server in background thread
        let thread = thread::spawn(move || {
            actix_web::rt::System::new().block_on(async move {
                let settings = Settings {
                    server: ServerSettings {
                        port,
                        danger_allow_http: true,
                        debug_no_access_control: false,
                        cors_origins: vec!["http://localhost".to_string()],
                        base_dir: Some(files_dir.to_str().unwrap().to_string()),
                    },
                    database: DatabaseSettings {
                        username: "n/a".to_string(),
                        password: "n/a".to_string(),
                        port: 0,
                        host: "n/a".to_string(),
                        database_name: db_path.to_string_lossy().to_string(),
                        // See https://github.com/openmsupply/remote-server/issues/1076
                        init_sql: Some(format!("PRAGMA temp_store_directory = '{}';", cache_dir)),
                    },
                    // sync settings need to be configured at runtime
                    sync: None,
                };
                let _ = start_server(settings, off_switch_receiver).await;
            });
        });

        let mut bucket = SERVER_BUCKET.lock().unwrap();
        bucket.insert(RunningServerHandle { thread, off_switch })
    }

    #[no_mangle]
    pub unsafe extern "C" fn Java_org_openmsupply_client_RemoteServer_stopServer(
        _: JNIEnv,
        _: JClass,
        handle: jlong,
    ) -> jshort {
        let mut bucket = SERVER_BUCKET.lock().unwrap();
        let handle = match bucket.map.remove(&handle) {
            Some(handle) => handle,
            None => return -1,
        };
        match handle.off_switch.send(()) {
            Ok(_) => {}
            Err(_) => return -1,
        }
        match handle.thread.join() {
            Ok(_) => {}
            Err(_) => return -1,
        }

        0
    }
}
