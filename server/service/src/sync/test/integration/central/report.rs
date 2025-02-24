use crate::sync::{
    test::integration::{
        central_server_configurations::NewSiteProperties, SyncRecordTester, TestStepData,
    },
    translations::IntegrationOperation,
};
use repository::{ContextType, ReportRow, ReportRowDelete, ReportType};
use serde_json::json;
use util::{inline_init, uuid::uuid};

pub(crate) struct ReportTester;

impl SyncRecordTester for ReportTester {
    fn test_step_data(&self, _: &NewSiteProperties) -> Vec<TestStepData> {
        let mut result = Vec::new();
        // STEP 1 - insert
        let report_1_id = uuid();
        let report_row1 = ReportRow {
            id: report_1_id.clone(),
            name: uuid(),
            template: "".to_string(),
            context: ContextType::InboundShipment,
            comment: Some(uuid()),
            sub_context: None,
            argument_schema_id: None,
            is_custom: true,
            version: "1.0".to_string(),
            code: report_1_id,
        };
        let report_json1 = json!({
            "ID": report_row1.id,
            "report_name":  report_row1.name,
            "editor": "omsupply",
            "context": "Supplier Invoice",
            "Comment": report_row1.comment.as_ref().unwrap(),
        });

        let report_2_id = uuid();
        let report_row2 = inline_init(|r: &mut ReportRow| {
            r.id = report_2_id.clone();
            r.context = ContextType::OutboundShipment;
            r.code = report_2_id;
            r.is_custom = true;
            r.version = "1.0".to_string();
        });
        let report_json2 = json!({
            "ID": report_row2.id,
            "editor": "omsupply",
            "context": "Customer Invoice",
        });

        let report_3_id = uuid();
        let report_row3 = inline_init(|r: &mut ReportRow| {
            r.id = report_3_id.clone();
            r.context = ContextType::Requisition;
            r.code = report_3_id;
            r.is_custom = true;
            r.version = "1.0".to_string();
        });
        let report_json3 = json!({
            "ID": report_row3.id,
            "editor": "omsupply",
            "context": "Requisition",
        });

        let report_4_id = uuid();
        let report_row4 = inline_init(|r: &mut ReportRow| {
            r.id = report_4_id.clone();
            r.context = ContextType::Stocktake;
            r.code = report_4_id;
            r.is_custom = true;
            r.version = "1.0".to_string();
        });
        let report_json4 = json!({
            "ID": report_row4.id,
            "editor": "omsupply",
            "context": "Stock Take",
        });

        // TODO Resource ? There is not translations for it

        result.push(TestStepData {
            central_upsert: json!({
                "report": [report_json1,report_json2,report_json3,report_json4],
            }),
            integration_records: vec![
                IntegrationOperation::upsert(report_row1.clone()),
                IntegrationOperation::upsert(report_row2),
                IntegrationOperation::upsert(report_row3),
                IntegrationOperation::upsert(report_row4),
            ],
            ..Default::default()
        });

        // STEP 2 - deletes
        result.push(TestStepData {
            central_delete: json!({ "report": [report_row1.id] }),
            integration_records: vec![IntegrationOperation::delete(ReportRowDelete(
                report_row1.id,
            ))],
            ..Default::default()
        });
        result
    }
}
