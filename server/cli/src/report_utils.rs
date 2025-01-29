use log::info;
use report_builder::{build::build_report_definition, BuildArgs};
use repository::{
    schema_from_row, ContextType, EqualFilter, FormSchemaRow, ReportFilter, ReportRepository,
    RepositoryError, StorageConnection,
};
use service::standard_reports::{ReportData, ReportsData};
use std::{
    ffi::OsStr,
    fs,
    path::PathBuf,
    process::{Command, Stdio},
};

use thiserror::Error as ThisError;

#[derive(ThisError, Debug)]
pub enum Error {
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
    #[error("Failed to find esbuild module {0}")]
    FailedToFindEsbuildModule(PathBuf),
    #[error("Failed to install yarn {0}")]
    FailedToInstallYarn(PathBuf, #[source] std::io::Error),
    #[error("Failed to build report {0}")]
    FailedToBuildReport(PathBuf, #[source] anyhow::Error),
    #[error("Repository error on existing report validation")]
    RepositoryError(PathBuf, #[source] RepositoryError),
    #[error("Cannot generate schema struct")]
    CannotGenerateSchemaFile(PathBuf, #[source] RepositoryError),
    #[error("Failed to argument schema file {0}")]
    CannotReadSchemaFile(PathBuf, #[source] std::io::Error),
    #[error("Failure to generate argument schema {0}")]
    FailedToGenerateArgumentSchema(PathBuf),
    #[error("Failed to write reports json {0}")]
    FailedToWriteReportsFile(PathBuf, #[source] std::io::Error),
}

pub fn generate_reports_recursive(
    reports_data: &mut ReportsData,
    ignore_paths: &Vec<&OsStr>,
    manifest_name: &OsStr,
    path: &PathBuf,
    con: &StorageConnection,
) -> Result<(), Error> {
    if let Some(_) = ignore_paths.iter().find(|p| Some(**p) == path.file_name()) {
        return Ok(());
    }
    if path.is_file() && Some(manifest_name) == path.file_name() {
        let parent_path = path
            .parent()
            .ok_or(Error::PathDoesNotHaveParent(path.clone()))?
            .to_owned();
        return process_report(reports_data, &parent_path, &con);
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
        generate_reports_recursive(reports_data, &ignore_paths, manifest_name, &next_path, &con)?;
    }
    Ok(())
}

fn process_report(
    reports_data: &mut ReportsData,
    path: &PathBuf,
    con: &StorageConnection,
) -> Result<(), Error> {
    // install esbuild depedencies

    if let Err(e) = run_yarn_install(&path) {
        eprintln!("Failed to run yarn install in {}: {}", path.display(), e);
    }
    // read manifest file
    let manifest_file = fs::File::open(path.join("report-manifest.json"))
        .map_err(|e| Error::CannotOpenManifestFile(path.clone(), e))?;

    let manifest: Manifest = serde_json::from_reader(manifest_file)
        .map_err(|e| Error::CannotReadManifestFile(path.clone(), e))?;
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
        .and_then(|schema| Some(path.join(schema)));
    let arguments_ui_path = manifest
        .arguments
        .and_then(|a| a.ui)
        .and_then(|ui| Some(path.join(ui)));
    let graphql_query = manifest.queries.clone().and_then(|q| q.gql);
    let sql_queries = manifest.queries.clone().and_then(|q| q.sql);
    let convert_data = manifest.convert_data.and_then(|cd| Some(path.join(cd)));
    let custom_wasm_function = manifest.custom_wasm_function;
    let query_default = manifest.query_default;

    let args = BuildArgs {
        dir: path.join("src"),
        output: Some(path.join("generated").join("built_report.json")),
        template: "template.html".to_string(),
        header: manifest.header,
        footer: manifest.footer,
        query_gql: graphql_query,
        query_default: query_default,
        query_sql: sql_queries,
        convert_data,
        custom_wasm_function,
    };

    let report_definition =
        build_report_definition(&args).map_err(|e| Error::FailedToBuildReport(path.clone(), e))?;

    let filter = ReportFilter::new().id(EqualFilter::equal_to(&id));
    let existing_report = ReportRepository::new(&con)
        .query_by_filter(filter)
        .map_err(|e| Error::RepositoryError(path.clone(), e))?
        .pop();

    let argument_schema_id =
        existing_report.and_then(|r| r.argument_schema.as_ref().map(|r| r.id.clone()));

    let form_schema_json = match (arguments_path, arguments_ui_path) {
        (Some(_), None) | (None, Some(_)) => {
            return Err(Error::FailedToGenerateArgumentSchema(path.to_path_buf()))
        }
        (Some(arguments_path), Some(arguments_ui_path)) => Some(
            schema_from_row(FormSchemaRow {
                id: argument_schema_id.unwrap_or(format!("for_report_{}", id)),
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

    let report_data = ReportData {
        id,
        name: report_name,
        r#type: repository::ReportType::OmSupply,
        template: report_definition,
        context,
        sub_context,
        argument_schema_id: form_schema_json.clone().map(|r| r.id.clone()),
        comment: None,
        is_custom,
        version: version.to_string(),
        code,
        form_schema: form_schema_json,
    };

    reports_data.reports.push(report_data);

    Ok(())
}

fn run_yarn_install(directory: &PathBuf) -> Result<(), Error> {
    let convert_dir = directory.join("convert_data_js");

    if !convert_dir.exists() {
        info!(
            "No conversion function for {}. Skipping esbuild install.",
            convert_dir.display().to_string()
        );
        return Ok(());
    }

    let node_modules_path = convert_dir.join("node_modules");

    let package_json = convert_dir.join("package.json");
    if !package_json.exists() {
        return Err(Error::FailedToFindPackageJson(convert_dir));
    }

    let esbuild = convert_dir.join("esbuild.js");
    if !esbuild.exists() {
        return Err(Error::FailedToFindEsbuildModule(convert_dir));
    }

    if !node_modules_path.exists() {
        Command::new("yarn")
            .args(["install", "--cwd"])
            .arg(convert_dir.clone())
            .args(["--no-lockfile", "--check-files"])
            .stdout(Stdio::inherit())
            .stderr(Stdio::inherit())
            .status()
            .map_err(|e| Error::FailedToInstallYarn(convert_dir.clone(), e))?;
    } else {
        info!("Dependencies up to date");
    }

    Ok(())
}

#[derive(serde::Deserialize, Clone)]
pub struct Manifest {
    pub is_custom: bool,
    pub version: String,
    pub code: String,
    pub context: ContextType,
    pub sub_context: Option<String>,
    pub name: String,
    pub header: Option<String>,
    pub footer: Option<String>,
    pub queries: Option<ManifestQueries>,
    pub default_query: Option<String>,
    pub arguments: Option<Arguments>,
    pub test_arguments: Option<TestReportArguments>,
    pub convert_data: Option<String>,
    pub custom_wasm_function: Option<String>,
    pub query_default: Option<String>,
}

#[derive(serde::Deserialize, Clone)]
pub struct ManifestQueries {
    pub gql: Option<String>,
    pub sql: Option<Vec<String>>,
}

#[derive(serde::Deserialize, Clone)]
pub struct Arguments {
    pub schema: Option<String>,
    pub ui: Option<String>,
}

#[derive(serde::Deserialize, Clone)]
pub struct TestReportArguments {
    pub arguments: Option<String>,
    pub reference_data: Option<String>,
    pub data_id: Option<String>,
}
