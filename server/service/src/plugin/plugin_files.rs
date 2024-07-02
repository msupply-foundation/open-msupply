use std::{fs, path::PathBuf, str::FromStr, sync::Mutex};

use serde::Deserialize;

use crate::settings::is_develop;

use super::{validation::ValidatedPluginBucket, PLUGIN_FILE, PLUGIN_FILE_DIR};

#[derive(Debug, PartialEq)]
pub struct PluginFile {
    /// Content of the plugin file (plugin.json)
    pub config: String,
    /// Name of the plugin dir, e.g. `Dashboard`
    pub name: String,
    /// Path of the plugin file relative to the plugin dir, e.g. `Dashboard/plugin.json`
    pub path: String,
}

pub struct PluginFileService {
    pub dir: PathBuf,
}

#[derive(Deserialize)]
pub struct PluginInfo {
    plugin: String,
    filename: String,
}

impl PluginFileService {
    /// Returns the path to the file
    pub fn find_file(
        plugin_bucket: &Mutex<ValidatedPluginBucket>,
        base_dir: &Option<String>,
        PluginInfo { plugin, filename }: &PluginInfo,
    ) -> anyhow::Result<Option<PathBuf>> {
        let plugin_base_dir = get_plugin_dir(base_dir)?;
        let plugin_dir = plugin_base_dir.join(plugin);
        let file_path = plugin_dir.join(filename);

        let Some(_) = read_plugin_file(plugin_bucket, &plugin_dir, filename, &file_path)? else {
            return Ok(None);
        };

        Ok(Some(file_path))
    }

    pub fn plugin_files(
        plugin_bucket: &Mutex<ValidatedPluginBucket>,
        base_dir: &Option<String>,
    ) -> anyhow::Result<Vec<PluginFile>> {
        let mut files = Vec::new();
        let plugin_base_dir = get_plugin_dir(base_dir)?;
        if let Ok(false) = plugin_base_dir.clone().try_exists() {
            log::warn!("no plugin dir found in base_dir");
            return Ok(files);
        }
        let paths = fs::read_dir(plugin_base_dir)?;

        for plugin_dir in paths {
            let plugin_dir = plugin_dir?.path();
            if !plugin_dir.is_dir() {
                continue;
            }
            let file_path = plugin_dir.join(PLUGIN_FILE);
            if !file_path.clone().exists() {
                continue;
            }

            let Some(config) =
                read_plugin_file(plugin_bucket, &plugin_dir, PLUGIN_FILE, &file_path)?
            else {
                continue;
            };

            let plugin_name = match plugin_dir.file_name() {
                Some(name) => name.to_string_lossy().to_string(),
                None => continue,
            };

            files.push(PluginFile {
                config,
                path: format!("{}/{}", plugin_name, PLUGIN_FILE),
                name: plugin_name,
            });
        }

        Ok(files)
    }
}

fn get_plugin_dir(base_dir: &Option<String>) -> Result<PathBuf, anyhow::Error> {
    Ok(match base_dir {
        Some(file_dir) => PathBuf::from_str(file_dir)?.join(PLUGIN_FILE_DIR),
        None => PathBuf::from_str(PLUGIN_FILE_DIR)?,
    })
}

fn read_plugin_file(
    plugin_bucket: &Mutex<ValidatedPluginBucket>,
    plugin_dir: &PathBuf,
    filename: &str,
    file_path: &PathBuf,
) -> anyhow::Result<Option<String>> {
    let mut validated_plugins = plugin_bucket.lock().unwrap();
    let validated_plugin = match validated_plugins.validate_plugin(plugin_dir) {
        Ok(validated_plugin) => validated_plugin,
        Err(err) => {
            log::warn!("{}", err);
            if !is_develop() || !file_path.exists() {
                return Ok(None);
            }
            log::warn!("Continue serving plugin file in dev mode: {:?}", file_path);
            return Ok(Some(fs::read_to_string(file_path)?));
        }
    };
    let plugin_manifest = validated_plugin.manifest;
    let Some(content) = plugin_manifest.read_and_validate_file(filename, file_path)? else {
        log::warn!("Plugin file not in manifest: {}", filename);
        return Ok(None);
    };
    Ok(Some(content))
}
