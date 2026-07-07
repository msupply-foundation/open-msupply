use anyhow::Error;
use flate2::read::GzDecoder;
use repository::{KeyType, KeyValueStoreRepository, RepositoryError};
use std::{
    fs::{self, File},
    io::Read,
    path::Path,
};

use crate::{service_provider::ServiceContext, settings::Level};

pub trait LogServiceTrait: Send + Sync {
    fn get_log_file_names(&self, ctx: &ServiceContext) -> Result<Vec<String>, Error> {
        let log_dir = self.get_log_directory(ctx)?;
        let log_dir_path = Path::new(&log_dir);
        let mut log_file_names = Vec::new();

        for entry in fs::read_dir(log_dir_path)? {
            let path = entry?.path();
            log_file_names.push(path.file_name().unwrap().to_string_lossy().to_string());
        }

        Ok(log_file_names)
    }

    fn get_log_content(
        &self,
        ctx: &ServiceContext,
        file_name: Option<String>,
    ) -> Result<(String, Vec<String>), Error> {
        let log_dir = self.get_log_directory(ctx)?;
        let log_dir_path = Path::new(&log_dir);
        let default_filename = self.get_log_file_name(ctx)?;

        let file_name = match file_name {
            Some(file_name) => file_name,
            None => default_filename,
        };
        let log_file_path = log_dir_path.join(&file_name);

        let log_file_content = if file_name.ends_with(".gz") {
            let mut decompressed: String = Default::default();
            let mut decoder = GzDecoder::new(File::open(log_file_path)?);
            decoder.read_to_string(&mut decompressed)?;

            decompressed
        } else {
            fs::read_to_string(log_file_path)?
        };

        let log_file_content = log_file_content
            .split('\n')
            .map(|s| s.to_string())
            .collect::<Vec<String>>();

        Ok((file_name, log_file_content))
    }

    fn get_log_level(&self, ctx: &ServiceContext) -> Result<Option<Level>, RepositoryError> {
        let key_value_store = KeyValueStoreRepository::new(&ctx.connection);

        let log_level = key_value_store.get_string(KeyType::LogLevel)?;

        let level = match log_level {
            Some(log_level) => match log_level.as_str() {
                "error" => Some(Level::Error),
                "warn" => Some(Level::Warn),
                "info" => Some(Level::Info),
                "debug" => Some(Level::Debug),
                "trace" => Some(Level::Trace),
                _ => None,
            },
            None => None,
        };

        Ok(level)
    }

    fn update_log_level(&self, ctx: &ServiceContext, log_level: Level) {
        let key_value_store = KeyValueStoreRepository::new(&ctx.connection);

        let log_level = match log_level {
            Level::Error => "error",
            Level::Warn => "warn",
            Level::Info => "info",
            Level::Debug => "debug",
            Level::Trace => "trace",
        };

        if let Err(e) = key_value_store.set_string(KeyType::LogLevel, Some(log_level.to_string())) {
            log::warn!(
                "Failed to persist log level setting — storing in-memory — will be persisted on next run: {e:?}"
            );
        }
        simple_log::update_log_level(log_level).expect("Couldn't update log level");
    }

    fn get_log_directory(&self, ctx: &ServiceContext) -> Result<String, RepositoryError> {
        let key_value_store = KeyValueStoreRepository::new(&ctx.connection);

        let log_directory = key_value_store.get_string(KeyType::LogDirectory)?;

        Ok(log_directory.unwrap_or(Default::default()))
    }

    fn set_log_directory(&self, ctx: &ServiceContext, log_directory: Option<String>) {
        let key_value_store = KeyValueStoreRepository::new(&ctx.connection);

        if let Err(e) = key_value_store.set_string(KeyType::LogDirectory, log_directory) {
            log::warn!(
                "Failed to persist log directory setting — storing in-memory — will be persisted on next run: {e:?}"
            );
        }
    }

    fn get_log_file_name(&self, ctx: &ServiceContext) -> Result<String, RepositoryError> {
        let key_value_store = KeyValueStoreRepository::new(&ctx.connection);

        let log_file_name = key_value_store.get_string(KeyType::LogFileName)?;

        Ok(log_file_name.unwrap_or(Default::default()))
    }

    fn set_log_file_name(&self, ctx: &ServiceContext, log_file_name: Option<String>) {
        let key_value_store = KeyValueStoreRepository::new(&ctx.connection);

        if let Err(e) = key_value_store.set_string(KeyType::LogFileName, log_file_name) {
            log::warn!(
                "Failed to persist log file name setting — storing in-memory — will be persisted on next run: {e:?}"
            );
        }
    }
}

pub struct LogService {}

impl LogServiceTrait for LogService {}
