use repository::{
    ContextType, FormSchemaJson, FormSchemaRowRepository, ReportRow, ReportRowRepository,
    StorageConnection,
};
use rust_embed::RustEmbed;
use thiserror::Error;

use crate::report::definition::ReportDefinition;
use log::info;
use serde::{Deserialize, Serialize};

#[derive(RustEmbed)]
// Relative to server/Cargo.toml
#[folder = "../reports/generated"]
#[exclude = "*.DS_Store"]
pub struct EmbeddedStandardReports;

#[derive(Debug, Error)]
#[error("No standard reports found")]
pub struct StandardReportsError;

#[derive(Clone)]
pub struct StandardReports;

impl StandardReports {
    // Load embedded reports
    pub fn load_reports(con: &StorageConnection) -> Result<(), anyhow::Error> {
        info!("upserting standard reports...");
        for file in EmbeddedStandardReports::iter() {
            if let Some(content) = EmbeddedStandardReports::get(&file) {
                let json_data = content.data;
                let reports_data: ReportsData = serde_json::from_slice(&json_data)?;
                StandardReports::upsert_reports(reports_data, con)?;
            }
        }
        Ok(())
    }

    pub fn upsert_reports(
        reports_data: ReportsData,
        con: &StorageConnection,
    ) -> Result<(), anyhow::Error> {
        let mut num_std_reports = 0;
        for report in reports_data.reports {
            num_std_reports += 1;
            let existing_report = ReportRowRepository::new(con)
                .find_one_by_code_and_version(&report.code, &report.version)?;

            // Use the existing ID if already defined for that report
            let id = existing_report.map_or_else(|| report.clone().id, |r| r.id.clone());
            info!("Upserting Report {} v{}", report.code, report.version);

            if let Some(form_schema_json) = &report.form_schema {
                // TODO: Look up existing json schema and use it's ID to be safe...
                FormSchemaRowRepository::new(con).upsert_one(form_schema_json)?;
            }

            ReportRowRepository::new(con).upsert_one(&ReportRow {
                id,
                name: report.name,
                r#type: repository::ReportType::OmSupply,
                template: serde_json::to_string_pretty(&report.template)?,
                context: report.context,
                sub_context: report.sub_context,
                argument_schema_id: report.argument_schema_id,
                comment: report.comment,
                is_custom: report.is_custom,
                version: report.version,
                code: report.code,
            })?;
        }
        info!("Upserted {} standard reports", num_std_reports);
        Ok(())
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
    pub r#type: repository::ReportType,
    pub template: ReportDefinition,
    pub context: ContextType,
    pub sub_context: Option<String>,
    pub argument_schema_id: Option<String>,
    pub comment: Option<String>,
    pub is_custom: bool,
    pub version: String,
    pub code: String,
    pub form_schema: Option<FormSchemaJson>,
}
