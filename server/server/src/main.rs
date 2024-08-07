use server::{configuration, logging_init, start_server};
use service::settings::Settings;
// use std::sync::mpsc;

#[actix_web::main]
async fn main() -> std::io::Result<()> {
    let settings: Settings =
        configuration::get_configuration().expect("Failed to parse configuration settings");

    logging_init(settings.logging.clone(), None);

    let off_switch = tokio::sync::mpsc::channel(1).1;
    start_server(settings, off_switch).await
}
