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
        let report_row1 = ReportRow {
            id: uuid(),
            name: uuid(),
            r#type: ReportType::OmSupply,
            template: "".to_string(),
            context: ContextType::InboundShipment,
            comment: Some(uuid()),
            sub_context: None,
            argument_schema_id: None,
        };
        let report_json1 = json!({
            "ID": report_row1.id,
            "report_name":  report_row1.name,
            "editor": "omsupply",
            "context": "Supplier Invoice",
            "Comment": report_row1.comment.as_ref().unwrap()
        });

        let report_row2 = inline_init(|r: &mut ReportRow| {
            r.id = uuid();
            r.context = ContextType::OutboundShipment
        });
        let report_json2 = json!({
            "ID": report_row2.id,
            "editor": "omsupply",
            "context": "Customer Invoice",
        });

        let report_row3 = inline_init(|r: &mut ReportRow| {
            r.id = uuid();
            r.context = ContextType::Requisition
        });
        let report_json3 = json!({
            "ID": report_row3.id,
            "editor": "omsupply",
            "context": "Requisition",
        });

        let report_row4 = inline_init(|r: &mut ReportRow| {
            r.id = uuid();
            r.context = ContextType::Stocktake
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
