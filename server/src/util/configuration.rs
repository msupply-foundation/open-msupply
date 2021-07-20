use crate::util::settings::Settings;
use config::{Config, ConfigError, File};

static CONFIGURATION_FOLDER: &str = "configuration";
static BASE_FILE: &str = "base";
static DEFAULT_EXTRA_FILE: &str = "local";

pub fn get_configuration() -> Result<Settings, ConfigError> {
    let mut settings = Config::default();
    let base_path = std::env::current_dir().map_err(|err| ConfigError::Message(err.to_string()))?;
    let configuration_directory = base_path.join(CONFIGURATION_FOLDER);

    settings.merge(File::from(configuration_directory.join(BASE_FILE)).required(true))?;

    let extra_file = std::env::var("APP_ENVIRONMENT").unwrap_or_else(|_| DEFAULT_EXTRA_FILE.into());

    settings.merge(File::from(configuration_directory.join(extra_file)).required(true))?;

    settings.try_into()
}
