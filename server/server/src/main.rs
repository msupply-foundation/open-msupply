#![allow(where_clauses_object_safety)]

use std::env;

use server::{configuration, settings::Settings, start_server};
use tokio::sync::oneshot;

#[actix_web::main]
async fn main() -> std::io::Result<()> {
    env::set_var("RUST_LOG", "info");
    env_logger::init();

    let settings: Settings =
        configuration::get_configuration().expect("Failed to parse configuration settings");

    let (_, off_switch) = oneshot::channel();
    start_server(settings, off_switch).await
}
