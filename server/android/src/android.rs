/// This module exports some "C" methods that can directly be called from the Java runtime.
#[allow(non_snake_case)]
pub mod android {
    extern crate jni;

    use std::thread::{self, JoinHandle};
    use std::{collections::HashMap, sync::Mutex};

    use jni::sys::{jchar, jshort};
    use repository::database_settings::DatabaseSettings;

    use server::settings::{AuthSettings, ServerSettings, Settings};
    use server::start_server;
    use service::sync_settings::SyncSettings;
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
        db_path: JString,
    ) -> jlong {
        android_logger::init_once(Config::default().with_min_level(Level::Trace));

        let (off_switch, off_switch_receiver) = oneshot::channel();
        let db_path: String = env.get_string(db_path).unwrap().into();
        // run server in background thread
        let thread = thread::spawn(move || {
            actix_web::rt::System::new().block_on(async move {
                let settings = Settings {
                    server: ServerSettings {
                        host: "127.0.0.1".to_string(),
                        port,
                        develop: false,
                        debug_no_access_control: false,
                        debug_cors_permissive: false,
                        cors_origins: vec!["http://localhost:3003".to_string()],
                    },
                    database: DatabaseSettings {
                        username: "n/a".to_string(),
                        password: "n/a".to_string(),
                        port: 0,
                        host: "n/a".to_string(),
                        database_name: db_path,
                    },
                    sync: Some(SyncSettings {
                        url: "http://localhost".to_string(),
                        username: "username".to_string(),
                        password_sha256: "password".to_string(),
                        interval_sec: 300,
                        central_server_site_id: 1,
                        site_id: 2,
                        site_hardware_id: "".to_string(),
                    }),
                    auth: AuthSettings {
                        // TODO:
                        token_secret: "Make me configurable".to_string(),
                    },
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
