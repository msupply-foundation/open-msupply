use std::{fs, io::Error, path::PathBuf, str::FromStr};

#[derive(Debug, PartialEq)]
pub struct PluginFile {
    pub config: String,
    pub name: String,
    pub path: String,
}

const PLUGIN_FILE_DIR: &'static str = "plugins";

pub struct PluginFileService {
    pub dir: PathBuf,
}

impl PluginFileService {
    pub fn new(base_dir: &Option<String>) -> anyhow::Result<Self> {
        let file_dir = match base_dir {
            Some(file_dir) => PathBuf::from_str(file_dir)?.join(PLUGIN_FILE_DIR),
            None => PathBuf::from_str(PLUGIN_FILE_DIR)?,
        };

        Ok(PluginFileService { dir: file_dir })
    }

    pub fn find_file(
        &self,
        plugin: &str,
        filename: Option<&str>,
    ) -> anyhow::Result<Option<PluginFile>> {
        fs::create_dir_all(&self.dir).unwrap();

        let filename = match filename {
            Some(filename) => filename.to_string(),
            None => format!("{}.js", plugin).clone(),
        };
        let file_path = match find_file(&self.dir, plugin, &filename)? {
            Some(path) => path,
            None => return Ok(None),
        };

        Ok(Some(PluginFile {
            name: plugin.to_string(),
            path: file_path.to_string_lossy().to_string(),
            config: fs::read_to_string(file_path.parent().unwrap().join("plugin.json"))?,
        }))
    }

    pub fn find_files(&self) -> anyhow::Result<Vec<PluginFile>> {
        fs::create_dir_all(&self.dir).unwrap();

        let mut files = Vec::new();
        let paths = fs::read_dir(&self.dir)?;
        for entry in paths {
            let path = entry?.path();
            if path.is_file() {
                continue;
            }
            let file_path = path.join("plugin.json");
            if file_path.clone().exists() {
                files.push(PluginFile {
                    config: fs::read_to_string(file_path.clone())?,
                    name: path.file_name().unwrap().to_string_lossy().to_string(),
                    path: file_path.to_string_lossy().to_string(),
                });
            }
        }

        Ok(files)
    }
}

fn find_file(file_dir: &PathBuf, plugin: &str, filename: &str) -> Result<Option<PathBuf>, Error> {
    let paths = fs::read_dir(file_dir)?;
    for entry in paths {
        let path = entry?.path();
        if path.is_file() {
            continue;
        }
        if path.file_name().unwrap().to_string_lossy() != plugin {
            continue;
        }
        let file_path = path.join(filename);
        if file_path.exists() {
            return Ok(Some(file_path));
        }
    }

    Ok(None)
}
