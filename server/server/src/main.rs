#![allow(where_clauses_object_safety)]

use std::env;

use server::{configuration, start_server};
use service::app_data::*;
use service::settings::Settings;
use tokio::sync::oneshot;
use util::uuid::uuid;

#[actix_web::main]
async fn main() -> std::io::Result<()> {
    env::set_var("RUST_LOG", "info");
    env_logger::init();

    let settings: Settings =
        configuration::get_configuration().expect("Failed to parse configuration settings");

    let app_data_directory = env::current_dir()?;
    let app_data_file = app_data_directory.join("settings_app_data.yaml");
    let hardware_id = uuid();
    let app_data =
        AppData::load_from_file(&app_data_file, hardware_id).expect("Failed to load app data");
    if app_data.is_empty() {
        return Err(std::io::Error::new(
            std::io::ErrorKind::Other,
            "Failed to load app data",
        ));
    }

    let (off_switch, off_switch_receiver) = oneshot::channel();
    let result = start_server(settings, off_switch_receiver).await;
    // off_switch is not needed but we need to keep it alive to prevent it from firing
    let _ = off_switch;
    result
}
