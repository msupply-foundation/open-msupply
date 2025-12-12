use repository::{
    ContextType, EqualFilter, FormSchemaJson, FormSchemaRowRepository, ReportFilter,
    ReportMetaDataRow, ReportRepository, ReportRow, ReportRowRepository, StorageConnection,
};
use rust_embed::RustEmbed;
use thiserror::Error;

use crate::report::definition::ReportDefinition;
use log::info;
use serde::{Deserialize, Serialize};

#[derive(RustEmbed)]
// Relative to server/Cargo.toml
#[folder = "../../standard_reports/generated"]
#[exclude = "*.DS_Store"]
pub struct EmbeddedStandardReports;

#[derive(RustEmbed)]
// Relative to server/Cargo.toml
#[folder = "../../standard_forms/generated"]
#[exclude = "*.DS_Store"]
pub struct EmbeddedStandardForms;

#[derive(Debug, Error)]
#[error("No standard reports found")]
pub struct StandardReportsError;

#[derive(Clone)]
pub struct StandardReports;

impl StandardReports {
    // Load embedded reports
    pub fn load_reports(con: &StorageConnection, overwrite: bool) -> Result<(), anyhow::Error> {
        info!("upserting standard reports...");
        for file in EmbeddedStandardReports::iter() {
            if let Some(content) = EmbeddedStandardReports::get(&file) {
                let json_data = content.data;
                let reports_data: ReportsData = serde_json::from_slice(&json_data)?;
                StandardReports::upsert_reports(reports_data, con, overwrite)?;
            }
        }
        info!("upserting standard forms...");
        for file in EmbeddedStandardForms::iter() {
            if let Some(content) = EmbeddedStandardForms::get(&file) {
                let json_data = content.data;
                let reports_data: ReportsData = serde_json::from_slice(&json_data)?;
                StandardReports::upsert_reports(reports_data, con, overwrite)?;
            }
        }
        Ok(())
    }

    pub fn upsert_reports(
        reports_data: ReportsData,
        con: &StorageConnection,
        overwrite: bool,
    ) -> Result<Vec<ReportMetaDataRow>, anyhow::Error> {
        let mut upserted_reports: Vec<ReportMetaDataRow> = vec![];
        for report in reports_data.reports {
            let report_versions = ReportRepository::new(con)
                .query_by_filter(ReportFilter::new().code(EqualFilter::equal_to(report.code.to_owned())))?;

            let existing_report = report_versions
                .iter()
                .find(|r| r.report_row.id == report.id);
            let set_active = match &existing_report {
                Some(report) => report.report_row.is_active,
                None => {
                    report_versions.len() == 0
                        || report_versions.iter().any(|r| r.report_row.is_active)
                }
            };

            if existing_report.is_none() || overwrite {
                if let Some(form_schema_json) = &report.form_schema {
                    // TODO: Look up existing json schema and use it's ID to be safe...
                    FormSchemaRowRepository::new(con).upsert_one(form_schema_json)?;
                }
                ReportRowRepository::new(con).upsert_one(&ReportRow {
                    id: report.id.clone(),
                    name: report.name,
                    template: serde_json::to_string_pretty(&report.template)?,
                    context: report.context,
                    sub_context: report.sub_context,
                    argument_schema_id: report.argument_schema_id,
                    comment: report.comment,
                    is_custom: report.is_custom,
                    version: report.version.clone(),
                    code: report.code.clone(),
                    is_active: set_active,
                    excel_template_buffer: report.excel_template_buffer,
                })?;
                upserted_reports.push(ReportMetaDataRow {
                    id: report.id,
                    is_custom: report.is_custom,
                    version: report.version,
                    code: report.code,
                    is_active: true,
                });
            }
        }
        info!("Upserted {} reports", upserted_reports.len());

        Ok(upserted_reports)
    }
}

#[derive(Debug, Serialize, Deserialize, PartialEq, Clone)]
pub struct ReportsData {
    pub reports: Vec<ReportData>,
}

#[derive(Debug, Serialize, Deserialize, PartialEq, Clone)]
pub struct ReportData {
    pub id: String,
    pub name: String,
    pub template: ReportDefinition,
    pub context: ContextType,
    pub sub_context: Option<String>,
    pub argument_schema_id: Option<String>,
    pub comment: Option<String>,
    pub is_custom: bool,
    pub version: String,
    pub code: String,
    pub form_schema: Option<FormSchemaJson>,
    pub excel_template_buffer: Option<Vec<u8>>,
}
