use crate::util::settings::Settings;
use crate::util::environment::LOCAL as LOCAL_ENVIRONMENT;
use config::{Config, ConfigError, File};

static CONFIGURATION_DIRECTORY_PATH: &str = "configuration";
static BASE_CONFIGURATION_FILE_PATH: &str = "base";

static APP_ENVIRONMENT_VAR: &str = "APP_ENVIRONMENT";
static DEFAULT_APP_ENVIRONMENT: &str = LOCAL_ENVIRONMENT;

pub fn get_configuration() -> Result<Settings, ConfigError> {
    let mut configuration = Config::default();

    let current_directory_path = std::env::current_dir().map_err(|err| ConfigError::Message(err.to_string()))?;

    let configuration_directory = current_directory_path.join(CONFIGURATION_DIRECTORY_PATH);

    configuration.merge(File::from(configuration_directory.join(BASE_CONFIGURATION_FILE_PATH)).required(true))?;

    let app_environment_file_path = std::env::var(APP_ENVIRONMENT_VAR).unwrap_or_else(|_| DEFAULT_APP_ENVIRONMENT.into());

    configuration.merge(File::from(configuration_directory.join(app_environment_file_path)).required(true))?;

    configuration.try_into()
}
