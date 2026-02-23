use anyhow::anyhow;
use log::info;
use repository::{
    get_storage_connection_manager, schema_from_row, ContextType, EqualFilter, FormSchemaRow,
    FormSchemaRowRepository, ReportFilter, ReportRepository, ReportRow, ReportRowRepository,
};
use service::{
    settings::Settings,
    standard_reports::{ReportsData, StandardReports},
};
use std::{
    env::current_dir,
    ffi::OsStr,
    fs,
    path::{Path, PathBuf},
    process::Command,
};

use super::{
    generate_report_data, generate_report_inner, generate_reports_recursive, Config, Format,
    ReportError, ReportGenerateData,
};

#[derive(serde::Deserialize, Clone)]
pub struct TestConfig {
    pub data_id: String,
    pub store_id: String,
    pub url: String,
    pub username: String,
    pub password: String,
    pub arguments: serde_json::Value,
    pub _locale: Option<String>,
    pub output_filename: String,
}

#[derive(clap::Args)]
pub struct UpsertReportArgs {
    /// Report id (any user defined id)
    #[clap(short, long)]
    pub id: String,

    /// Path to the report
    #[clap(short, long)]
    pub report_path: PathBuf,

    /// Path to the arguments json form schema
    #[clap(long)]
    pub arguments_path: Option<PathBuf>,

    /// Path to the arguments json form UI schema
    #[clap(long)]
    pub arguments_ui_path: Option<PathBuf>,

    /// Path to the excel template
    #[clap(long)]
    pub excel_template_path: Option<PathBuf>,

    /// Report name
    #[clap(short, long)]
    pub name: String,

    /// Report type/context
    #[clap(short, long)]
    pub context: ContextType,

    /// Report sub context
    #[clap(short, long)]
    pub sub_context: Option<String>,
}

#[derive(clap::Args)]
pub struct ShowReportArgs {
    /// Path to report source files which will be built and displayed
    #[clap(short, long)]
    pub path: PathBuf,

    /// Optional path to dir containing test-config.json file
    #[clap(short, long)]
    pub config: Option<PathBuf>,

    /// Output format
    #[clap(long)]
    pub format: Option<Format>,
}

pub fn build_reports(path: Option<Vec<PathBuf>>) -> anyhow::Result<()> {
    let dir_list = match path.clone() {
        Some(path) => path,
        None => vec![
            PathBuf::new().join("../standard_reports"),
            PathBuf::new().join("../standard_forms"),
        ],
    };

    for base_dir in dir_list {
        let mut reports_data = ReportsData { reports: vec![] };
        let ignore_paths = vec![OsStr::new("node_modules")];
        let manifest_name = OsStr::new("report-manifest.json");

        generate_reports_recursive(&mut reports_data, &ignore_paths, manifest_name, &base_dir)?;

        let output_name = if path.is_some() {
            "reports.json"
        } else {
            // Name the output after the base_dir
            // standard_reports.json and standard_forms.json
            &format!("{}.json", base_dir.file_stem().unwrap().to_str().unwrap())
        };

        let output_path = base_dir.join("generated").join(output_name);

        fs::create_dir_all(output_path.parent().ok_or(anyhow::Error::msg(format!(
            "Invalid output path: {:?}",
            output_path
        )))?)?;

        fs::write(&output_path, serde_json::to_string_pretty(&reports_data)?).map_err(|_| {
            anyhow::Error::msg(format!(
                "Failed to write to {:?}. Does output dir exist?",
                output_path
            ))
        })?;

        if path.is_some() {
            info!("All reports built in custom path {:?}", base_dir.display());
        } else {
            info!(
                "All standard reports built in path {:?}",
                base_dir.display()
            )
        };
    }

    Ok(())
}

pub fn upsert_reports(
    path: Option<Vec<PathBuf>>,
    overwrite: bool,
    settings: &Settings,
) -> anyhow::Result<()> {
    let standard_reports_dir = Path::new("../standard_reports")
        .join("generated")
        .join("standard_reports.json");
    let standard_forms_dir = Path::new("../standard_forms")
        .join("generated")
        .join("standard_forms.json");

    let file_list = match path {
        Some(path) => path,
        None => vec![standard_reports_dir, standard_forms_dir],
    };

    for file_path in file_list {
        let json_file = fs::File::open(file_path.clone())
            .unwrap_or_else(|_| panic!("{} not found for report", file_path.display()));
        let reports_data: ReportsData =
            serde_json::from_reader(json_file).expect("json incorrectly formatted for report");

        let connection_manager = get_storage_connection_manager(&settings.database);
        let con = connection_manager.connection()?;

        StandardReports::upsert_reports(reports_data, &con, overwrite)?;
    }

    Ok(())
}

pub fn upsert_report(args: UpsertReportArgs, settings: &Settings) -> anyhow::Result<()> {
    let UpsertReportArgs {
        id,
        report_path,
        arguments_path,
        arguments_ui_path,
        excel_template_path,
        name,
        context,
        sub_context,
    } = args;

    let connection_manager = get_storage_connection_manager(&settings.database);
    let con = connection_manager.connection()?;

    let filter = ReportFilter::new().id(EqualFilter::equal_to(id.to_string()));
    let existing_report = ReportRepository::new(&con).query_by_filter(filter)?.pop();

    let argument_schema_id =
        existing_report.and_then(|r| r.argument_schema.as_ref().map(|r| r.id.clone()));

    let form_schema_json = match (arguments_path, arguments_ui_path) {
        (Some(_), None) | (None, Some(_)) => {
            return Err(anyhow!(
                "When arguments path are specified both paths must be present"
            ))
        }
        (Some(arguments_path), Some(arguments_ui_path)) => {
            Some(schema_from_row(FormSchemaRow {
                id: argument_schema_id.unwrap_or(format!("for_report_{}", id)),
                r#type: "reportArgument".to_string(),
                json_schema: fs::read_to_string(arguments_path)?,
                ui_schema: fs::read_to_string(arguments_ui_path)?,
            })?)
        }
        (None, None) => None,
    };

    if let Some(form_schema_json) = &form_schema_json {
        FormSchemaRowRepository::new(&con).upsert_one(form_schema_json)?;
    }

    let excel_template_buffer = excel_template_path
        .map(|path| fs::read(&path))
        .transpose()?;

    ReportRowRepository::new(&con).upsert_one(&ReportRow {
        id: id.clone(),
        name,
        template: fs::read_to_string(report_path)?,
        context,
        sub_context,
        argument_schema_id: form_schema_json.map(|r| r.id.clone()),
        comment: None,
        is_custom: true,
        version: "1.0".to_string(),
        code: id,
        is_active: true,
        excel_template_buffer,
    })?;

    info!("Report upserted");
    Ok(())
}

pub fn reload_embedded_reports(settings: &Settings) -> anyhow::Result<()> {
    let connection_manager = get_storage_connection_manager(&settings.database);
    let con = connection_manager.connection()?;

    StandardReports::load_reports(&con, true)?;
    Ok(())
}

pub async fn show_report(args: ShowReportArgs) -> anyhow::Result<()> {
    let ShowReportArgs {
        path,
        config,
        format,
    } = args;

    let report_data = generate_report_data(&path)?;

    let report_json =
        serde_json::to_value(report_data.template).expect("fail to convert report to json");

    let test_config_path = if let Some(config) = config {
        config
    } else {
        Path::new("../standard_reports").to_path_buf()
    };

    let test_config_file =
        fs::File::open(test_config_path.join("test-config.json")).map_err(|e| {
            ReportError::CannotOpenTestConfigFile(test_config_path.to_path_buf(), e)
        })?;
    let test_config: TestConfig =
        serde_json::from_reader(test_config_file).map_err(|e| {
            ReportError::CannotReadTestConfigFile(test_config_path.clone().to_path_buf(), e)
        })?;

    let config = Config {
        url: test_config.url,
        username: test_config.username,
        password: test_config.password,
    };

    let output_name = match &format {
        Some(Format::Html) | None => format!("{}.html", test_config.output_filename.clone()),
        Some(Format::Excel) => format!("{}.xlsx", test_config.output_filename.clone()),
        Some(_) => {
            return Err(anyhow::Error::msg(
                "Format not supported, use html or excel",
            ));
        }
    };

    let report_generate_data = ReportGenerateData {
        report: report_json,
        config,
        store_id: Some(test_config.store_id),
        store_name: None,
        output_filename: Some(output_name.clone()),
        format: format.unwrap_or(Format::Html),
        data_id: Some(test_config.data_id),
        arguments: Some(test_config.arguments),
        excel_template_buffer: report_data.excel_template_buffer,
    };

    generate_report_inner(report_generate_data)
        .await
        .map_err(|e| ReportError::FailedToGenerateReport(path, e.into()))?;

    let generated_file_path = current_dir()?.join(&output_name);
    #[cfg(windows)]
    Command::new("cmd")
        .args(["/C", "start"])
        .arg(generated_file_path.clone())
        .status()
        .expect(&format!("failed to open file {:?}", generated_file_path));
    #[cfg(not(windows))]
    Command::new("open")
        .arg(generated_file_path.clone())
        .status()
        .expect(&format!("failed to open file {:?}", generated_file_path));

    Ok(())
}

pub fn toggle_report(
    code: String,
    is_custom: Option<bool>,
    enable: bool,
    disable: bool,
    settings: &Settings,
) -> anyhow::Result<()> {
    let connection_manager = get_storage_connection_manager(&settings.database);
    let con = connection_manager.connection()?;

    let mut filter = ReportFilter::new().code(EqualFilter::equal_to(code.to_owned()));
    if let Some(value) = is_custom {
        filter = filter.is_custom(value);
    }

    let report_list = ReportRepository::new(&con).query_by_filter(filter)?;
    let row_repository = ReportRowRepository::new(&con);

    info!("Found {} reports matching code {}", report_list.len(), code);

    for mut report in report_list {
        let initial_value = report.report_row.is_active;
        let updated_value = if enable {
            true
        } else if disable {
            false
        } else {
            !report.report_row.is_active
        };
        report.report_row.is_active = updated_value;
        row_repository.upsert_one(&report.report_row)?;

        info!(
            "{}: {} => {}",
            report.report_row.id,
            if initial_value { "ACTIVE" } else { "INACTIVE" },
            if updated_value { "ACTIVE" } else { "INACTIVE" }
        );
    }

    Ok(())
}
