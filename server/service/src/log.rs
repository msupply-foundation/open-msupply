use anyhow::Error;
use std::{fs, path::Path};

pub trait LogServiceTrait: Send + Sync {
    fn get_log_file_names(&self) -> Result<Vec<String>, Error>;
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
}
