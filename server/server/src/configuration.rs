use clap::Args;
use config::{Config, ConfigError, Environment, File, FileFormat, FileSourceFile};
use repository::{KeyType, KeyValueStoreRepository, StorageConnection};
use service::settings::{is_develop, Settings};
use std::{
    env::{self, VarError},
    fmt::{Debug, Display, Formatter, Result as FmtResult},
    fs,
    io::Error as IoError,
    path::PathBuf,
};
use util::uuid::uuid;

use crate::environment::{AppEnvironment, EnvironmentVariable};

const CONFIGURATION_DIRECTORY_PATH: &str = "configuration";
const CONFIGURATION_BASE_FILE_PATH: &str = "base.yaml";
const CONFIGURATION_EXAMPLE_FILE_PATH: &str = "example.yaml";

const CONFIGURATION_ENVIRONMENT_PREFIX: &str = "app";
const CONFIGURATION_ENVIRONMENT_SEPARATOR: &str = "__";

/// Config argument
#[derive(Args)]
pub struct ConfigArgs {
    #[clap(long)]
    /// File path for .yaml config file - expects base.yaml file to exist in same directory
    pub config_path: Option<PathBuf>,
}

pub enum SettingsError {
    Config(ConfigError),
    Environment(VarError),
    File(IoError),
}

struct ConfigFilePaths {
    base: File<FileSourceFile, FileFormat>,
    app: File<FileSourceFile, FileFormat>,
}

/// Gets directory storing configuration files.
///
/// All configuration files should be stored in the same directory.
pub fn get_configuration_directory() -> Result<PathBuf, SettingsError> {
    let configuration_directory = env::current_dir()?.join(CONFIGURATION_DIRECTORY_PATH);
    Ok(configuration_directory)
}

/// Gets base configuration file.
///
/// The base configuration file stores configuration properties which are common between local and
/// production environments.
pub fn get_configuration_base_file() -> Result<File<FileSourceFile, FileFormat>, SettingsError> {
    let configuration_directory = get_configuration_directory()?;
    let base_file = File::from(get_configuration_base_file_path(configuration_directory));
    Ok(base_file)
}
/// Gets base configuration file path
///
/// The base configuration file stores configuration properties which are common between local and
/// production environments.
pub fn get_configuration_base_file_path(configuration_directory: PathBuf) -> PathBuf {
    configuration_directory.join(CONFIGURATION_BASE_FILE_PATH)
}

/// Gets application configuration file.
///
/// The application configuration file stores environment-specific configuration properties. Valid
/// environments are `local` and `production`.
pub fn get_configuration_app_file() -> Result<File<FileSourceFile, FileFormat>, SettingsError> {
    let configuration_directory = get_configuration_directory()?;
    let app_file = File::from(get_configuration_app_file_path(configuration_directory));
    Ok(app_file)
}

/// Gets application configuration filepath
///
/// The application configuration file stores environment-specific configuration properties. Valid
/// environments are `local` and `production`.
pub fn get_configuration_app_file_path(configuration_directory: PathBuf) -> PathBuf {
    configuration_directory
        .join(AppEnvironment::get())
        .with_extension("yaml")
}

/// Gets example filepath from filepath
///
pub fn get_example_file_path(configuration_directory: PathBuf) -> PathBuf {
    configuration_directory.join(CONFIGURATION_EXAMPLE_FILE_PATH)
}

/// Gets environment configuration values.
///
/// In some instances it may be desirable to override the `local` and `production` defaults with
/// custom values. These can be defined using environment variables with the `app_` prefix and
/// with the `__` separator in place of dot notation.
///
/// For example, the following runs the application using the `local` configuration with the
/// `database.port` value set to `5433`:
///
/// APP__ENVIRONMENT=local APP__DATABASE__PORT=5433 cargo run
///
pub fn get_configuration_environment() -> Environment {
    Environment::with_prefix(CONFIGURATION_ENVIRONMENT_PREFIX)
        .separator(CONFIGURATION_ENVIRONMENT_SEPARATOR)
}

/// Copies example configuration files into place if the 'real' files don't exist
pub fn copy_example_environment_configuration_file_if_required() -> Result<(), SettingsError> {
    let configuration_directory = get_configuration_directory()?;
    let app = get_configuration_app_file_path(configuration_directory.clone());
    if !app.exists() && is_develop() {
        //Config file doesn't exist, Try to copy example file over
        let example_path = get_example_file_path(configuration_directory);
        if let Err(err) = fs::copy(example_path.clone(), app.clone()) {
            return Err(SettingsError::Config(ConfigError::Message(format!(
                "Unable to copy example configuration file from {} Error: {}",
                example_path.as_path().display(),
                err
            ))));
        }
    }

    Ok(())
}

/// Gets app configuration.
///
/// App configuration varies based on whether the app is being run in a `local` or `production`
/// environment. Configuration files should be stored in a unique configuration directory, and
/// should define setting values for `base`, `local` and `production` environments.
///
/// Individual settings properties can be also manually defined as environment variables: see
/// `get_configuration_environment` for details.
pub fn get_configuration(config_args: ConfigArgs) -> Result<Settings, SettingsError> {
    copy_example_environment_configuration_file_if_required()?;

    let file_paths = derive_file_paths(config_args.config_path)?;

    let mut builder = Config::builder();
    builder = builder.add_source(file_paths.base);
    builder = builder.add_source(file_paths.app);
    builder = builder.add_source(get_configuration_environment());

    let configuration = builder.build()?;
    let settings: Settings = configuration.try_deserialize()?;

    Ok(settings)
}

fn derive_file_paths(config_file: Option<PathBuf>) -> Result<ConfigFilePaths, SettingsError> {
    let file_paths: ConfigFilePaths = match config_file {
        Some(file) => ConfigFilePaths {
            base: File::from(file.parent().unwrap().join(CONFIGURATION_BASE_FILE_PATH)),
            app: File::from(file),
        },
        None => ConfigFilePaths {
            base: get_configuration_base_file()?,
            app: get_configuration_app_file()?,
        }
    };

    Ok(file_paths)
}

impl Debug for SettingsError {
    fn fmt(&self, f: &mut Formatter<'_>) -> FmtResult {
        match self {
            SettingsError::Config(err) => write!(f, "{:?}", err),
            SettingsError::Environment(err) => write!(f, "{:?}", err),
            SettingsError::File(err) => write!(f, "{:?}", err),
        }
    }
}

impl Display for SettingsError {
    fn fmt(&self, f: &mut Formatter<'_>) -> FmtResult {
        match self {
            SettingsError::Config(err) => write!(f, "{}", err),
            SettingsError::Environment(err) => write!(f, "{}", err),
            SettingsError::File(err) => write!(f, "{}", err),
        }
    }
}

impl From<ConfigError> for SettingsError {
    fn from(err: ConfigError) -> SettingsError {
        SettingsError::Config(err)
    }
}

impl From<IoError> for SettingsError {
    fn from(err: IoError) -> SettingsError {
        SettingsError::File(err)
    }
}

impl From<VarError> for SettingsError {
    fn from(err: VarError) -> SettingsError {
        SettingsError::Environment(err)
    }
}

pub fn get_or_create_token_secret(connection: &StorageConnection) -> String {
    //Get Token Secret from DB if available
    let kv_repo = KeyValueStoreRepository::new(connection);
    let token_secret_option = kv_repo.get_string(KeyType::SettingsTokenSecret).unwrap();
    if let Some(token_secret) = token_secret_option {
        log::debug!("Using token_secret from DB");
        return token_secret;
    }
    log::debug!("Generating new token_secret");
    let token_secret = uuid();
    if let Err(err) = kv_repo.set_string(KeyType::SettingsTokenSecret, Some(token_secret.clone())) {
        log::error!(
            "Unable to save token secret to key value store, it will not be persisted across restarts : {}",
            err
        )
    }

    token_secret
}
