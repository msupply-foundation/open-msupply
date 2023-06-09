use crate::settings::Level;
use anyhow::Error;
use std::{fs, path::Path};

pub trait LogServiceTrait: Send + Sync {
    fn get_log_file_names(&self) -> Result<Vec<String>, Error>;
    fn get_log_content(&self, file_name: Option<String>) -> Result<(String, Vec<String>), Error>;
}

pub struct LogService {}

impl LogServiceTrait for LogService {
    fn get_log_file_names(&self) -> Result<Vec<String>, Error> {
        let log_dir = Path::new("log");
        let mut log_file_names = Vec::new();

        for entry in fs::read_dir(log_dir)? {
            let path = entry?.path();
            log_file_names.push(path.file_name().unwrap().to_string_lossy().to_string());
        }

        Ok(log_file_names)
    }

    fn get_log_content(&self, file_name: Option<String>) -> Result<(String, Vec<String>), Error> {
        let log_dir = Path::new("log");
        let default_log_file = "remote_server.log".to_string();

        let file_name = match file_name {
            Some(file_name) => file_name,
            None => default_log_file,
        };

        let log_file_path = log_dir.join(&file_name);
        let log_file_content = fs::read_to_string(log_file_path)?;

        let log_file_content = log_file_content
            .split("\n")
            .map(|s| s.to_string())
            .collect::<Vec<String>>();

        Ok((file_name, log_file_content))
    }
}
