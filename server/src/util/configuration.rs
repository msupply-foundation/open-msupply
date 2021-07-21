use crate::util::settings::Settings;
use crate::util::environment::{Environment, LOCAL as LOCAL_ENVIRONMENT, PRODUCTION as PRODUCTION_ENVIRONMENT};

use config::{Config, ConfigError, File};
use std::borrow::Cow;

static CONFIGURATION_DIRECTORY_PATH: &str = "configuration";
static BASE_CONFIGURATION_FILE_PATH: &str = "base";
static LOCAL_CONFIGURATION_FILE_PATH: &str = LOCAL_ENVIRONMENT;
static PRODUCTION_CONFIGURATION_FILE_PATH: &str = PRODUCTION_ENVIRONMENT;

static APP_ENVIRONMENT_VAR: &str = "APP_ENVIRONMENT";
static DEFAULT_APP_ENVIRONMENT: &str = LOCAL_ENVIRONMENT;

pub fn get_configuration() -> Result<Settings, ConfigError> {
    let mut configuration = Config::default();

    let current_directory_path = std::env::current_dir().map_err(|err| ConfigError::Message(err.to_string()))?;

    let configuration_directory = current_directory_path.join(CONFIGURATION_DIRECTORY_PATH);

    configuration.merge(File::from(configuration_directory.join(BASE_CONFIGURATION_FILE_PATH)).required(true))?;

    let environment: Environment = std::env::var(APP_ENVIRONMENT_VAR)
        .map(Cow::from)
        .unwrap_or_else(|_| DEFAULT_APP_ENVIRONMENT.into())
        .parse().map_err(|err: String| ConfigError::Message(err))?;

    let app_environment_file_path = match environment {
        Environment::Local => LOCAL_CONFIGURATION_FILE_PATH,
        Environment::Production => PRODUCTION_CONFIGURATION_FILE_PATH,
    };

    configuration.merge(File::from(configuration_directory.join(app_environment_file_path)).required(true))?;

    configuration.try_into()
}
