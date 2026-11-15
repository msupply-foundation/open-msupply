use service::standard_reports::ReportData;
use std::{
    fs,
    path::{Path, PathBuf},
    process::Command,
};
use thiserror::Error as ThisError;

use crate::helpers::{CommandError, run_command_with_error};

#[derive(ThisError, Debug)]
pub enum ReportError {
    #[error("Failed to build report {0} with {1} - is node installed?")]
    FailedToBuildReport(PathBuf, PathBuf, #[source] CommandError),
    #[error("Failed to read the built report {0}")]
    CannotReadBuiltReport(PathBuf, #[source] std::io::Error),
    #[error("Failed to parse the built report {0}")]
    CannotParseBuiltReport(PathBuf, #[source] serde_json::Error),
    #[error("Failed to open test-config file in the {0} directory. Does the file exist?")]
    CannotOpenTestConfigFile(PathBuf, #[source] std::io::Error),
    #[error("Failed to read test-config file in the {0} directory")]
    CannotReadTestConfigFile(PathBuf, #[source] serde_json::Error),
    #[error("Failed to generate report {0} {1}")]
    FailedToGenerateReport(PathBuf, anyhow::Error),
}

/// Reports are built by scripts/reports/build-reports.mjs, in the checkout this
/// CLI was compiled from.
fn report_bundler() -> PathBuf {
    Path::new(env!("CARGO_MANIFEST_DIR")).join("../../scripts/reports/build-reports.mjs")
}

/// Builds the report in `path` (the directory holding its report-manifest.json)
/// with the report bundler, which is what builds reports for installing too.
pub fn build_report(path: &Path) -> Result<ReportData, ReportError> {
    let bundler = report_bundler();
    let output =
        std::env::temp_dir().join(format!("omsupply-show-report-{}.json", std::process::id()));

    run_command_with_error(
        Command::new("node")
            .arg(&bundler)
            .arg("--report")
            .arg(path)
            .arg("--output")
            .arg(&output),
    )
    .map_err(|e| ReportError::FailedToBuildReport(path.to_path_buf(), bundler, e))?;

    let json = fs::read_to_string(&output)
        .map_err(|e| ReportError::CannotReadBuiltReport(output.clone(), e))?;
    let _ = fs::remove_file(&output);
    serde_json::from_str(&json).map_err(|e| ReportError::CannotParseBuiltReport(output, e))
}
