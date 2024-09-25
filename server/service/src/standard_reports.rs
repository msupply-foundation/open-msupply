use repository::{
    ContextType, FormSchemaJson, FormSchemaRowRepository, ReportRow, ReportRowRepository,
    StorageConnection, StorageConnectionManager,
};
use rust_embed::RustEmbed;
use thiserror::Error;

use crate::report::definition::ReportDefinition;
use log::info;
use serde::{Deserialize, Serialize};

#[derive(RustEmbed)]
// Relative to server/Cargo.toml
#[folder = "../reports/generated"]

pub struct EmbeddedStandardReports;

#[derive(Debug, Error)]
#[error("No standard reports found")]
pub struct StandardReportsError;

#[derive(Clone)]
pub struct StandardReports;

// impl Default for StandardReports {
//     fn default() -> StandardReports {
//         let _ = StandardReports::load_reports();
//         StandardReports
//     }
// }

impl StandardReports {
    // Load embedded reports
    pub fn load_reports(connection_manager: StorageConnectionManager) -> Result<(), anyhow::Error> {
        let con = connection_manager.connection()?;

        for file in EmbeddedStandardReports::iter() {
            if let Some(content) = EmbeddedStandardReports::get(&file) {
                let json_data = content.data;
                let reports_data: ReportsData = serde_json::from_slice(&json_data)?;
                let _ = StandardReports::upsert_reports(reports_data, &con)?;
            }
        }
        Ok(())
    }

    pub fn upsert_reports(
        reports_data: ReportsData,
        con: &StorageConnection,
    ) -> Result<(), anyhow::Error> {
        for report in reports_data.reports {
            if let Some(form_schema_json) = &report.form_schema {
                FormSchemaRowRepository::new(con).upsert_one(form_schema_json)?;
            }

            ReportRowRepository::new(&con).upsert_one(&ReportRow {
                id: report.id.clone(),
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

            info!("Report {} upserted", report.id);
        }
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
