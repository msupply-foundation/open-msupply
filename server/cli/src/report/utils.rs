use base64::{prelude::BASE64_STANDARD, Engine};
use repository::{schema_from_row, FormSchemaRow, RepositoryError};
use service::{
    report::definition::ConvertDataType,
    standard_reports::{ReportData, ReportsData},
};
use std::{ffi::OsStr, fs, path::PathBuf, process::Command};
use thiserror::Error as ThisError;

use super::build::{build_report_definition, Manifest};
use crate::{
    helpers::{run_command_with_error, CommandError},
    YARN_COMMAND,
};

#[derive(ThisError, Debug)]
pub enum ReportError {
    #[error("Failed to read dir {0}")]
    FailedToReadDir(PathBuf, #[source] std::io::Error),
    #[error("Failed to get file or dir {0}")]
    FailedToGetFileOrDir(PathBuf, #[source] std::io::Error),
    #[error("Failed to open report manifest file {0}")]
    CannotOpenManifestFile(PathBuf, #[source] std::io::Error),
    #[error("Failed to parse manifest file {0}")]
    CannotReadManifestFile(PathBuf, #[source] serde_json::Error),
    #[error("Path does not have parent {0}")]
    PathDoesNotHaveParent(PathBuf),
    #[error("Failed to find package json {0}")]
    FailedToFindPackageJson(PathBuf),
    #[error("Failed to yarn install {0}")]
    FailedToYarnInstall(PathBuf, #[source] CommandError),
    #[error("Failed to buid convert data {0}")]
    FailedToBuildConvertData(PathBuf, #[source] CommandError),
    #[error("Failed to build report {0}")]
    FailedToBuildReport(PathBuf, #[source] anyhow::Error),
    #[error("Repository error on existing report validation")]
    RepositoryError(PathBuf, #[source] RepositoryError),
    #[error("Cannot generate schema struct")]
    CannotGenerateSchemaFile(PathBuf, #[source] RepositoryError),
    #[error("Failed to argument schema file {0}")]
    CannotReadSchemaFile(PathBuf, #[source] std::io::Error),
    #[error("Failed to read excel template file {0}")]
    CannotReadExcelTemplateFile(PathBuf, #[source] std::io::Error),
    #[error("Failure to generate argument schema {0}")]
    FailedToGenerateArgumentSchema(PathBuf),
    #[error("Failed to write reports json {0}")]
    FailedToWriteReportsFile(PathBuf, #[source] std::io::Error),
    #[error("Failed to open test-config file in the {0} directory. Does the file exist?")]
    CannotOpenTestConfigFile(PathBuf, #[source] std::io::Error),
    #[error("Failed to read test-config file in the {0} directory")]
    CannotReadTestConfigFile(PathBuf, #[source] serde_json::Error),
    #[error("Failed to generate report {0} {1}")]
    FailedToGenerateReport(PathBuf, anyhow::Error),
}

use ReportError as Error;

pub fn generate_reports_recursive(
    reports_data: &mut ReportsData,
    ignore_paths: &Vec<&OsStr>,
    manifest_name: &OsStr,
    path: &PathBuf,
) -> Result<(), Error> {
    if ignore_paths.iter().any(|p| Some(*p) == path.file_name()) {
        return Ok(());
    }
    if path.is_file() && Some(manifest_name) == path.file_name() {
        let parent_path = path
            .parent()
            .ok_or(Error::PathDoesNotHaveParent(path.clone()))?
            .to_owned();
        return process_report(reports_data, &parent_path);
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
        generate_reports_recursive(reports_data, ignore_paths, manifest_name, &next_path)?;
    }
    Ok(())
}

fn process_report(reports_data: &mut ReportsData, path: &PathBuf) -> Result<(), Error> {
    let report_data = generate_report_data(path)?;
    reports_data.reports.push(report_data);
    Ok(())
}

pub fn generate_report_data(path: &PathBuf) -> Result<ReportData, Error> {
    let manifest_file = fs::File::open(path.join("report-manifest.json"))
        .map_err(|e| Error::CannotOpenManifestFile(path.clone(), e))?;

    let manifest: Manifest = serde_json::from_reader(manifest_file)
        .map_err(|e| Error::CannotReadManifestFile(path.clone(), e))?;

    let convert_data = generate_convert_data(path, &manifest)?;

    let mut report_definition = build_report_definition(&manifest, &path.join("src"))
        .map_err(|e| Error::FailedToBuildReport(path.clone(), e))?;

    report_definition.index.convert_data = convert_data;
    report_definition.index.convert_data_type = manifest.convert_data_type;

    let code = manifest.code;
    let version = manifest.version;
    let id_version = str::replace(&version, ".", "_");
    let context = manifest.context;
    let report_name = manifest.name;
    let is_custom = manifest.is_custom;
    let id = format!("{code}_{id_version}_{is_custom}");
    let sub_context: Option<String> = manifest.sub_context;
    let arguments_path = manifest
        .arguments
        .clone()
        .and_then(|a| a.schema)
        .map(|schema| path.join(schema));
    let arguments_ui_path = manifest
        .arguments
        .and_then(|a| a.ui)
        .map(|ui| path.join(ui));

    let form_schema_json = match (arguments_path, arguments_ui_path) {
        (Some(_), None) | (None, Some(_)) => {
            return Err(Error::FailedToGenerateArgumentSchema(path.to_path_buf()))
        }
        (Some(arguments_path), Some(arguments_ui_path)) => Some(
            schema_from_row(FormSchemaRow {
                id: (format!("for_report_{id}")),
                r#type: "reportArgument".to_string(),
                json_schema: fs::read_to_string(arguments_path)
                    .map_err(|e| Error::CannotReadSchemaFile(path.clone(), e))?,
                ui_schema: fs::read_to_string(arguments_ui_path)
                    .map_err(|e| Error::CannotReadSchemaFile(path.clone(), e))?,
            })
            .map_err(|e| Error::CannotGenerateSchemaFile(path.clone(), e))?,
        ),
        (None, None) => None,
    };

    let excel_template_buffer = manifest
        .excel_template
        .as_ref()
        .map(|excel_template_path| {
            let file_path = path.join(excel_template_path);
            fs::read(&file_path).map_err(|err| Error::CannotReadExcelTemplateFile(file_path, err))
        })
        .transpose()?;

    Ok(ReportData {
        id,
        name: report_name,
        template: report_definition,
        context,
        sub_context,
        argument_schema_id: form_schema_json.clone().map(|r| r.id.clone()),
        comment: None,
        is_custom,
        version: version.to_string(),
        code,
        form_schema: form_schema_json,
        excel_template_buffer,
    })
}

fn generate_convert_data(path: &PathBuf, manifest: &Manifest) -> Result<Option<String>, Error> {
    let Some(convert_data) = &manifest.convert_data else {
        return Ok(None);
    };

    let convert_dir = path.join(convert_data);
    run_command_with_error(
        Command::new(YARN_COMMAND)
            .args(["install", "--cwd"])
            .arg(&convert_dir),
    )
    .map_err(|e| Error::FailedToYarnInstall(convert_dir.clone(), e))?;

    run_command_with_error(Command::new(YARN_COMMAND).arg("build").current_dir(&convert_dir))
        .map_err(|e| Error::FailedToBuildConvertData(convert_dir.clone(), e))?;

    let bundle_path: PathBuf = convert_dir
        .join("dist")
        .join(match manifest.convert_data_type {
            ConvertDataType::BoaJs => "convert_data.js",
            ConvertDataType::Extism => "plugin.wasm",
        });

    Ok(Some(BASE64_STANDARD.encode(fs::read(bundle_path).unwrap())))
}
