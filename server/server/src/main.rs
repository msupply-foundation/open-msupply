#![allow(where_clauses_object_safety)]

use std::env;

use server::{configuration, settings::Settings, start_server};

#[actix_web::main]
async fn main() -> std::io::Result<()> {
    env::set_var("RUST_LOG", "info");
    env_logger::init();

    let settings: Settings =
        configuration::get_configuration().expect("Failed to parse configuration settings");

    start_server(settings).await
}
