#![allow(where_clauses_object_safety)]

use std::env;

use server::{configuration, start_server};
use service::settings::Settings;
use tokio::sync::oneshot;

#[actix_web::main]
async fn main() -> std::io::Result<()> {
    if env::var("RUST_LOG").is_err() {
        //Default rust log level to info
        env::set_var("RUST_LOG", "info");
    }
    env_logger::init();

    let settings: Settings =
        configuration::get_configuration().expect("Failed to parse configuration settings");

    let (off_switch, off_switch_receiver) = oneshot::channel();
    let result = start_server(settings, off_switch_receiver).await;
    // off_switch is not needed but we need to keep it alive to prevent it from firing
    let _ = off_switch;
    result
}
