use std::{
    convert::TryInto,
    ffi::OsStr,
    fs,
    path::PathBuf,
    process::{Command, ExitStatus, Stdio},
};

use base64::{prelude::BASE64_STANDARD, Engine};
use cli::{queries_mutations::INSTALL_PLUGINS, Api, ApiError};
use log::{info, warn};
use repository::{BackendPluginRow, BackendPluginTypes, BackendPluginVariantType};
use reqwest::Url;
use serde::Deserialize;
use serde_json::json;
use service::backend_plugin::plugin_provider::{
    FrontEndPluginRow, FrontendPluginFile, PluginBundle,
};

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
    #[error(transparent)]
    GqlError(#[from] ApiError),
    #[error("Failed to remove temp file {1}")]
    FiledToRemoveTempFile(std::io::Error, PathBuf),
    #[error("Failed to yarn install {0}")]
    FailedToYarnInstall(PathBuf, #[source] CommandError),
    #[error("Failed to build plugin {0}")]
    FailedToBuildPlugin(PathBuf, #[source] CommandError),
    #[error("Cannot find entry in dist folder starting with code, code: {0}, plugin_path: {1}")]
    CannotFindEntry(String, PathBuf),
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

#[derive(clap::Parser, Debug)]
pub(super) struct InstallPluginBundle {
    /// Path to bundle
    #[clap(short, long)]
    path: PathBuf,
    /// Server url
    #[clap(short, long)]
    url: Url,
    /// Username
    #[clap(long)]
    username: String,
    /// Password
    #[clap(long)]
    password: String,
}

#[derive(clap::Parser, Debug)]
pub(super) struct GenerateAndInstallPluginBundle {
    /// Directory in which to search for plugins
    #[clap(short, long)]
    in_dir: PathBuf,
    /// Server url
    #[clap(short, long)]
    url: Url,
    /// Username
    #[clap(long)]
    username: String,
    /// Password
    #[clap(long)]
    password: String,
}
#[derive(Deserialize)]
struct BackendManifestJson {
    code: String,
    types: BackendPluginTypes,
    variant_type: BackendPluginVariantType,
    bundle_path: PathBuf,
}

#[derive(Deserialize)]
#[serde(rename_all = "camelCase")]
struct FrontendManifestJson {
    #[serde(rename = "name")]
    code: String,
    is_open_msupply_plugin: bool,
}

struct ManifestNames<'a> {
    backend: &'a OsStr,
    frontend: &'a OsStr,
}

pub(crate) fn generate_plugin_bundle(
    GeneratePluginBundle { in_dir, out_file }: GeneratePluginBundle,
) -> Result<(), Error> {
    let ignore_paths = vec![OsStr::new("node_modules"), OsStr::new("target")];
    let manifest_names = ManifestNames {
        backend: OsStr::new("plugin_manifest.json"),
        frontend: OsStr::new("package.json"),
    };

    let mut bundle = PluginBundle {
        backend_plugins: Vec::new(),
        frontend_plugins: Vec::new(),
    };

    generate_bundle_recursive(&mut bundle, &ignore_paths, &manifest_names, &in_dir)?;
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
    manifest_names: &ManifestNames,
    path: &PathBuf,
) -> Result<(), Error> {
    if let Some(_) = ignore_paths.iter().find(|p| Some(**p) == path.file_name()) {
        return Ok(());
    }

    if path.is_file() && Some(manifest_names.backend) == path.file_name() {
        return process_backend_manifest(bundle, path);
    }

    if path.is_file() && Some(manifest_names.frontend) == path.file_name() {
        return process_frontend_manifest(bundle, path);
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
        generate_bundle_recursive(bundle, &ignore_paths, manifest_names, &next_path)?;
    }

    Ok(())
}

fn process_backend_manifest(bundle: &mut PluginBundle, path: &PathBuf) -> Result<(), Error> {
    let BackendManifestJson {
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
        bundle_base64: bundle_base64,
        variant_type,
        types,
        code,
    });

    Ok(())
}

fn process_frontend_manifest(bundle: &mut PluginBundle, path: &PathBuf) -> Result<(), Error> {
    let Ok(FrontendManifestJson {
        code,
        is_open_msupply_plugin,
    }) = serde_json::from_reader(
        fs::File::open(path).map_err(|e| Error::CannotOpenManifestFile(path.clone(), e))?,
    )
    else {
        warn!("Ignoring manifest file: isOpenMsupplyPlugin is missing from {path:#?}");
        return Ok(());
    };

    if !is_open_msupply_plugin {
        warn!("Ignoring manifest file: isOpenMsupplyPlugin flag is false in {path:#?}");
        return Ok(());
    }

    let plugin_root = path
        .parent()
        .ok_or(Error::PathDoesNotHaveParent(path.clone()))?;

    info!("Building plugin: {path:#?}");

    // Yarn install
    run_command_with_error(
        Command::new("yarn")
            .args(["install", "--cwd"])
            .arg(&plugin_root),
    )
    .map_err(|e| Error::FailedToYarnInstall(plugin_root.to_path_buf(), e))?;

    // Yarn build plugin
    run_command_with_error(
        Command::new("yarn")
            .arg("--cwd")
            .arg(&plugin_root)
            .arg("build-plugin"),
    )
    .map_err(|e| Error::FailedToBuildPlugin(plugin_root.to_path_buf(), e))?;

    let dist_folder = plugin_root.join("dist");

    let dist_files =
        fs::read_dir(&dist_folder).map_err(|e| Error::FailedToReadDir(dist_folder.clone(), e))?;

    let mut entry = None;
    let mut files = Vec::new();

    for file_or_folder in dist_files {
        let next_path = file_or_folder
            .map_err(|e| Error::FailedToGetFileOrDir(path.clone(), e))?
            .path();
        if !next_path.is_file() {
            continue;
        }

        let file_name = next_path.file_name().unwrap().to_str().unwrap().to_string();
        // Ignore 'main' entrypoint
        if file_name.starts_with("main") {
            continue;
        }

        let file = FrontendPluginFile {
            file_name,
            file_content_base64: BASE64_STANDARD.encode(
                fs::read(&next_path)
                    .map_err(|e| Error::FailedToReadBundleFile(next_path.clone(), e))?,
            ),
        };

        if file.file_name.starts_with(&code) {
            entry = Some(file.file_name.clone())
        }

        if file.file_name.starts_with(&code) {
            entry = Some(file.file_name.clone())
        }

        files.push(file);
    }

    let Some(entry_point) = entry else {
        return Err(Error::CannotFindEntry(
            code.clone(),
            plugin_root.to_path_buf(),
        ));
    };

    bundle.frontend_plugins.push(FrontEndPluginRow {
        code,
        entry_point,
        files,
    });

    // Clean up

    // let bundle_base64 = BASE64_STANDARD
    //     .encode(fs::read(bundle_path).map_err(|e| Error::FailedToReadBundleFile(path.clone(), e))?);

    // bundle.backend_plugins.push(BackendPluginRow {
    //     // TODO for now id = code in the future id = code + version (similar to reports)
    //     id: code.clone(),
    //     bundle_base64,
    //     variant_type,
    //     types,
    //     code,
    // });

    Ok(())
}

#[derive(ThisError, Debug)]
pub(super) enum CommandError {
    #[error(transparent)]
    FailedToRunCommand(#[from] std::io::Error),
    #[error("Exited with non ok status {0}")]
    StatusNotOk(ExitStatus),
}

pub fn run_command_with_error(command: &mut Command) -> Result<(), CommandError> {
    let status = command
        .stdout(Stdio::inherit())
        .stderr(Stdio::inherit())
        .status()?;

    if status.success() {
        return Ok(());
    }
    return Err(CommandError::StatusNotOk(status));
}

/// username, password, url should come from config, like in reports (in the new show command)
pub(super) async fn install_plugin_bundle(
    InstallPluginBundle {
        path,
        url,
        username,
        password,
    }: InstallPluginBundle,
) -> Result<(), Error> {
    let api = Api::new_with_token(url.clone(), username, password).await?;

    let uploaded_file = api.upload_file(path).await?;

    let upload_result = api
        .gql(
            INSTALL_PLUGINS,
            json!( { "fileId": uploaded_file.file_id} ),
            Some("CentralServerMutationNode"),
        )
        .await?;

    println!(
        "Result:{}",
        serde_json::to_string_pretty(&upload_result).unwrap()
    );

    Ok(())
}

/// username and password should come from config, like in reports (and url too)
pub(super) async fn generate_and_install_plugin_bundle(
    GenerateAndInstallPluginBundle {
        in_dir,
        url,
        username,
        password,
    }: GenerateAndInstallPluginBundle,
) -> Result<(), Error> {
    let out_file = PathBuf::from("report_temp.json");

    generate_plugin_bundle(GeneratePluginBundle {
        in_dir,
        out_file: out_file.clone(),
    })?;

    let api = Api::new_with_token(url.clone(), username, password).await?;

    let uploaded_file = api.upload_file(out_file.clone()).await?;

    fs::remove_file(out_file.clone()).map_err(|e| Error::FiledToRemoveTempFile(e, out_file))?;

    let upload_result = api
        .gql(
            INSTALL_PLUGINS,
            json!( { "fileId": uploaded_file.file_id} ),
            Some("CentralServerMutationNode"),
        )
        .await?;

    info!(
        "Result:{}",
        serde_json::to_string_pretty(&upload_result).unwrap()
    );

    Ok(())
}
