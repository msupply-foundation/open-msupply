use clap::Parser;
use server::{configuration, logging_init, start_server};
use service::settings::Settings;
// use std::sync::mpsc;

#[derive(clap::Parser)]
#[clap(version, about)]
struct Args {
    #[clap(flatten)]
    config_args: configuration::ConfigArgs,
}

#[actix_web::main]
async fn main() -> std::io::Result<()> {
    let args = Args::parse();

    let settings: Settings =
        configuration::get_configuration(args.config_args.config_path).expect("Failed to parse configuration settings");

    logging_init(settings.logging.clone(), None);
    log_panics::init();

    let off_switch = tokio::sync::mpsc::channel(1).1;
    start_server(settings, off_switch).await
}
