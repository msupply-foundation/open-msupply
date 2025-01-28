use std::{path::PathBuf, str::FromStr};

pub fn prepare_file_dir(dir: &str, base_dir: &Option<String>) -> anyhow::Result<PathBuf> {
    let file_dir = match base_dir {
        Some(file_dir) => PathBuf::from_str(file_dir)?.join(dir),
        None => PathBuf::from_str(dir)?,
    };

    std::fs::create_dir_all(&file_dir)?;

    Ok(file_dir)
}
