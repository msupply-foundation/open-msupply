use std::path::{Path, PathBuf};
use std::{collections::HashMap, fs};

use serde::{Deserialize, Serialize};
use sha2::{Digest, Sha256};
use walkdir::WalkDir;

use super::{MANIFEST_FILE, MANIFEST_SIGNATURE_FILE};

/// Various details about how the manifest is signed
#[derive(Clone, Serialize, Deserialize)]
pub struct ManifestSignatureInfo {
    /// PEM encoded certificate containing the public key for the signature validation
    pub cert: String,
    pub algo: String,
    pub hash: String,
}

#[derive(Clone, Serialize, Deserialize)]
pub struct Manifest {
    pub files: HashMap<String, String>,
    pub signature: ManifestSignatureInfo,
}

impl Manifest {
    /// Validates that the file matches the file in the manifest and returns its content
    /// # Arguments:
    /// * `filename`: filename as listed in the manifest
    /// * `file_path`: path to the matching file
    pub(crate) fn read_and_validate_file(
        &self,
        filename: &str,
        file_path: &PathBuf,
    ) -> anyhow::Result<Option<String>> {
        let Some(manifest_file_hash) = self.files.get(filename) else {
            return Ok(None);
        };

        let content = fs::read_to_string(file_path)?;
        let mut hasher = Sha256::new();
        hasher.update(content.as_bytes());
        let file_hash = hex::encode(hasher.finalize());

        if manifest_file_hash != &file_hash {
            return Ok(None);
        }
        Ok(Some(content))
    }
}

pub(crate) fn create_manifest(
    plugin_path: &Path,
    signature: ManifestSignatureInfo,
) -> anyhow::Result<String> {
    let plugin_path = PathBuf::from(plugin_path);
    if !plugin_path.exists() {
        return Err(anyhow::Error::msg("Plugin dir does not exist"));
    }
    let plugin_json_path = plugin_path.join("plugin.json");
    if !plugin_json_path.exists() {
        return Err(anyhow::Error::msg("Invalid plugin dir (no plugin.json)"));
    }

    // collect all files + hashes of the plugin
    let mut files = HashMap::<String, String>::new();
    let mut walker = WalkDir::new(&plugin_path).into_iter();
    loop {
        let entry = match walker.next() {
            None => break,
            Some(entry) => entry,
        }?;
        let file_name = entry.file_name().to_string_lossy().to_string();
        if file_name.starts_with('.') {
            continue;
        }
        let metadata = entry.metadata()?;
        if metadata.is_dir() {
            // ignore dirs
            if ["node_modules"].contains(&file_name.as_str()) {
                walker.skip_current_dir();
            }
            continue;
        }

        // ignore files
        if [MANIFEST_FILE, MANIFEST_SIGNATURE_FILE].contains(&file_name.as_str()) {
            continue;
        }

        // calculate file hash
        let mut hasher = Sha256::new();
        let file_data = fs::read_to_string(entry.path())?;
        hasher.update(file_data.as_bytes());
        let file_hash = hasher.finalize();

        files.insert(
            entry
                .path()
                .strip_prefix(&plugin_path)?
                .to_string_lossy()
                .to_string(),
            hex::encode(file_hash),
        );
    }
    let manifest = Manifest { files, signature };
    Ok(serde_json::to_string_pretty(&manifest)?)
}
