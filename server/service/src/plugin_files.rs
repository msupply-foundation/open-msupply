use std::{fs, io::Error, path::PathBuf, str::FromStr};

#[derive(Debug, PartialEq)]
pub struct PluginFile {
    pub config: String,
    pub name: String,
    pub path: String,
}

const PLUGIN_FILE_DIR: &'static str = "plugins";
const PLUGIN_FILE_NAME: &'static str = "plugin.json";

pub struct PluginFileService {
    pub dir: PathBuf,
}

impl PluginFileService {
    pub fn find_file(
        base_dir: &Option<String>,
        plugin: &str,
        filename: Option<&str>,
    ) -> anyhow::Result<Option<PluginFile>> {
        let (plugin_dir_path, _plugin_dir) = get_plugin_dir(base_dir)?;

        let filename = match filename {
            Some(filename) => filename.to_string(),
            None => format!("{}.js", plugin).clone(),
        };
        let file_path = match find_file(&plugin_dir_path, plugin, &filename)? {
            Some(path) => path,
            None => return Ok(None),
        };
        Ok(Some(PluginFile {
            name: plugin.to_string(),
            path: file_path.to_string_lossy().to_string(),
            config: fs::read_to_string(plugin_dir_path.join(plugin).join(PLUGIN_FILE_NAME))?,
        }))
    }

    pub fn find_files(base_dir: &Option<String>) -> anyhow::Result<Vec<PluginFile>> {
        let mut files = Vec::new();
        let (plugin_dir_path, plugin_dir) = get_plugin_dir(base_dir)?;
        let paths = fs::read_dir(&plugin_dir_path)?;

        for entry in paths {
            let entry_path = entry?.path();
            if entry_path.is_file() {
                continue;
            }
            let file_path = entry_path.join(PLUGIN_FILE_NAME);
            if file_path.clone().exists() {
                let path = file_path
                    .to_string_lossy()
                    .to_string()
                    .replace(&plugin_dir, "");
                let name = match entry_path.file_name() {
                    Some(name) => name.to_string_lossy().to_string(),
                    None => continue,
                };

                match fs::read_to_string(file_path.clone()) {
                    Ok(config) => files.push(PluginFile { config, name, path }).to_owned(),
                    Err(e) => log::error!("Error reading plugin '{}' config file: {:?}", name, e),
                };
            }
        }

        Ok(files)
    }
}

fn get_plugin_dir(base_dir: &Option<String>) -> Result<(PathBuf, String), anyhow::Error> {
    let plugin_dir_path = match base_dir {
        Some(file_dir) => PathBuf::from_str(&file_dir)?.join(PLUGIN_FILE_DIR),
        None => PathBuf::from_str(PLUGIN_FILE_DIR)?,
    };
    Ok((
        plugin_dir_path.clone(),
        plugin_dir_path.to_string_lossy().to_string(),
    ))
}

fn find_file(file_dir: &PathBuf, plugin: &str, filename: &str) -> Result<Option<PathBuf>, Error> {
    let paths = fs::read_dir(file_dir)?;
    for entry in paths {
        let path = entry?.path();
        if path.is_file() {
            continue;
        }
        match path.file_name() {
            Some(name) => {
                if name != plugin {
                    continue;
                }
            }
            None => continue,
        };

        let file_path = path.join(filename);
        if file_path.exists() {
            return Ok(Some(file_path));
        }
    }

    Ok(None)
}
