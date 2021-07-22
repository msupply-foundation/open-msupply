use crate::util::environment::{AppEnvironment, EnvironmentVariable};
use crate::util::settings::{Settings, SettingsError};

use config::{Config, Environment, File, FileSourceFile};
use std::{env, path::PathBuf};

const CONFIGURATION_DIRECTORY_PATH: &str = "configuration";
const CONFIGURATION_BASE_FILE_PATH: &str = "base";

const CONFIGURATION_ENVIRONMENT_PREFIX: &str = "app";
const CONFIGURATION_ENVIRONMENT_SEPARATOR: &str = "__";

pub fn get_configuration_directory() -> Result<PathBuf, SettingsError> {
    let configuration_directory = env::current_dir()?.join(CONFIGURATION_DIRECTORY_PATH);
    Ok(configuration_directory)
}

pub fn get_configuration_base_file() -> Result<File<FileSourceFile>, SettingsError> {
    let configuration_directory = get_configuration_directory()?;
    let base_file =
        File::from(configuration_directory.join(CONFIGURATION_BASE_FILE_PATH)).required(true);
    Ok(base_file)
}

pub fn get_configuration_app_file() -> Result<File<FileSourceFile>, SettingsError> {
    let configuration_directory = get_configuration_directory()?;
    let app_file =
        File::from(configuration_directory.join(AppEnvironment::try_get()?)).required(true);
    Ok(app_file)
}

pub fn get_configuration_environment() -> Environment {
    Environment::with_prefix(CONFIGURATION_ENVIRONMENT_PREFIX)
        .separator(CONFIGURATION_ENVIRONMENT_SEPARATOR)
}

pub fn get_configuration() -> Result<Settings, SettingsError> {
    let mut configuration = Config::default();
    configuration
        .merge(get_configuration_base_file()?)?
        .merge(get_configuration_app_file()?)?
        .merge(get_configuration_environment())?;
    configuration
        .try_into()
        .map_err(|err| SettingsError::Config(err))
}
