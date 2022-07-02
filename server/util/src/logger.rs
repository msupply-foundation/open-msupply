use std::env;

pub fn init_logger() {
    if env::var("RUST_LOG").is_err() {
        //Default rust log level to info
        env::set_var("RUST_LOG", "info");
    }
    env_logger::init();
}
