use crate::util::settings::Settings;
use crate::util::environment::LOCAL as LOCAL_ENVIRONMENT;
use config::{Config, ConfigError, File};

static CONFIGURATION_DIRECTORY_PATH: &str = "configuration";
static BASE_CONFIGURATION_FILE_PATH: &str = "base";

static APP_ENVIRONMENT_VAR: &str = "APP_ENVIRONMENT";
static DEFAULT_APP_ENVIRONMENT: &str = LOCAL_ENVIRONMENT;

pub fn get_configuration() -> Result<Settings, ConfigError> {
    let mut settings = Config::default();
    let base_path = std::env::current_dir().map_err(|err| ConfigError::Message(err.to_string()))?;
    let configuration_directory = base_path.join(CONFIGURATION_DIRECTORY_PATH);

    settings.merge(File::from(configuration_directory.join(BASE_CONFIGURATION_FILE_PATH)).required(true))?;

    let extra_file = std::env::var(APP_ENVIRONMENT_VAR).unwrap_or_else(|_| DEFAULT_APP_ENVIRONMENT.into());

    settings.merge(File::from(configuration_directory.join(extra_file)).required(true))?;

    settings.try_into()
}
