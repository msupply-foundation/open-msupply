use std::{ffi::OsStr, fs, path::PathBuf};

use base64::{prelude::BASE64_STANDARD, Engine};
use repository::{BackendPluginRow, PluginTypes, PluginVariantType};
use serde::Deserialize;
use service::backend_plugin::plugin_provider::PluginBundle;
use thiserror::Error as ThisError;

#[derive(ThisError, Debug)]
pub(super) enum Error {
    #[error("Failed to read dir {0}")]
    FailedToReadDir(PathBuf, #[source] std::io::Error),
    #[error("Failed to get file or dir {0}")]
    FailedToGetFileOrDir(PathBuf, #[source] std::io::Error),
    #[error("Failed to open manifest file {0}")]
    CannotOpenManifestFile(PathBuf, #[source] std::io::Error),
    #[error("Failed to parse manifest file {0}")]
    CannotReadManifestFile(PathBuf, #[source] serde_json::Error),
    #[error("Path does not have parent {0}")]
    PathDoesNotHaveParent(PathBuf),
    #[error("Failed to read bundle file {0}")]
    FailedToReadBundleFile(PathBuf, #[source] std::io::Error),
    #[error("Failed to serialize bundle file")]
    FailedToSerializeBundle(#[source] serde_json::Error),
    #[error("Failed to write bundle file {0}")]
    FailedToWriteBundleFile(PathBuf, #[source] std::io::Error),
}

#[derive(clap::Parser, Debug)]
pub(super) struct GeneratePluginBundle {
    /// Directory in which to search for plugins
    #[clap(short, long)]
    in_dir: PathBuf,
    /// Output bundle json file
    #[clap(short, long)]
    out_file: PathBuf,
}

#[derive(Deserialize)]
struct ManifestJson {
    code: String,
    types: PluginTypes,
    variant_type: PluginVariantType,
    bundle_path: PathBuf,
}

pub(crate) fn generate_plugin_bundle(
    GeneratePluginBundle { in_dir, out_file }: GeneratePluginBundle,
) -> Result<(), Error> {
    let ignore_paths = vec![OsStr::new("node_modules"), OsStr::new("target")];
    let manifest_name = OsStr::new("plugin_manifest.json");

    let mut bundle = PluginBundle {
        backend_plugins: Vec::new(),
    };

    generate_bundle_recursive(&mut bundle, &ignore_paths, manifest_name, &in_dir)?;
    fs::write(
        &out_file,
        serde_json::to_string_pretty(&bundle).map_err(Error::FailedToSerializeBundle)?,
    )
    .map_err(|e| Error::FailedToWriteBundleFile(out_file.clone(), e))?;

    Ok(())
}

fn generate_bundle_recursive(
    bundle: &mut PluginBundle,
    ignore_paths: &Vec<&OsStr>,
    manifest_name: &OsStr,
    path: &PathBuf,
) -> Result<(), Error> {
    if let Some(_) = ignore_paths.iter().find(|p| Some(**p) == path.file_name()) {
        return Ok(());
    }

    if path.is_file() && Some(manifest_name) == path.file_name() {
        return process_manifest(bundle, path);
    }

    if !path.is_dir() {
        return Ok(());
    }

    let files_and_folders =
        fs::read_dir(path).map_err(|e| Error::FailedToReadDir(path.clone(), e))?;

    for file_or_folder in files_and_folders {
        let next_path = file_or_folder
            .map_err(|e| Error::FailedToGetFileOrDir(path.clone(), e))?
            .path();
        generate_bundle_recursive(bundle, &ignore_paths, manifest_name, &next_path)?;
    }

    Ok(())
}

fn process_manifest(bundle: &mut PluginBundle, path: &PathBuf) -> Result<(), Error> {
    let ManifestJson {
        code,
        types,
        variant_type,
        bundle_path,
    } = serde_json::from_reader(
        fs::File::open(path).map_err(|e| Error::CannotOpenManifestFile(path.clone(), e))?,
    )
    .map_err(|e| Error::CannotReadManifestFile(path.clone(), e))?;

    let bundle_path = path
        .parent()
        .ok_or(Error::PathDoesNotHaveParent(path.clone()))?
        .join(bundle_path);

    let bundle_base64 = BASE64_STANDARD
        .encode(fs::read(bundle_path).map_err(|e| Error::FailedToReadBundleFile(path.clone(), e))?);

    bundle.backend_plugins.push(BackendPluginRow {
        // TODO for now id = code in the future id = code + version (similar to reports)
        id: code.clone(),
        bundle_base64,
        variant_type,
        types,
        code,
    });

    Ok(())
}
