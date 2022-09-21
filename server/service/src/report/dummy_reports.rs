use std::collections::HashMap;

use repository::{
    ReportContext, ReportRow, ReportRowRepository, ReportType, RepositoryError, StorageConnection,
};

use super::definition::{
    DefaultQuery, ReportDefinition, ReportDefinitionEntry, ReportDefinitionIndex, ReportOutputType,
    TeraTemplate,
};

pub struct DummyReport {
    id: String,
    name: String,
    report: ReportDefinition,
    context: ReportContext,
}

pub fn invoice_report() -> DummyReport {
    let report = ReportDefinition {
        index: ReportDefinitionIndex {
            template: Some("template.html".to_string()),
            header: Some("template_header.html".to_string()),
            footer: Some("template_footer.html".to_string()),
            query: Some("query".to_string()),
        },
        entries: HashMap::from([
            (
                "template.html".to_string(),
                ReportDefinitionEntry::TeraTemplate(TeraTemplate {
                    output: ReportOutputType::Html,
                    template: "Dummy invoice template, invoice id: {{data.invoice.id}}"
                        .to_string(),
                }),
            ),
            (
                "template_header.html".to_string(),
                ReportDefinitionEntry::TeraTemplate(TeraTemplate {
                    output: ReportOutputType::Html,
                    template: r#"<div style="font-size: 10px; padding-top: 8px; text-align: center; width: 100%;"><span>Some header here.</div>"#.to_string(),
                }),
            ),
            (
                "template_footer.html".to_string(),
                ReportDefinitionEntry::TeraTemplate(TeraTemplate {
                    output: ReportOutputType::Html,
                    template: r#"<div style="font-size: 10px; padding-top: 8px; text-align: center; width: 100%;"><span>Some footer here.</div>"#.to_string(),
                }),
            ),
            (
                "query".to_string(),
                ReportDefinitionEntry::DefaultQuery(DefaultQuery::Invoice),
            ),
        ]),
    };
    DummyReport {
        id: "dummy_report_invoice".to_string(),
        name: "Dummy invoice report".to_string(),
        report,
        context: ReportContext::InboundShipment,
    }
}

pub fn stocktake_report() -> DummyReport {
    let report = ReportDefinition {
        index: ReportDefinitionIndex {
            template: Some("template.html".to_string()),
            header: Some("template_header.html".to_string()),
            footer: Some("template_footer.html".to_string()),
            query: Some("query".to_string()),
        },
        entries: HashMap::from([
            (
                "template.html".to_string(),
                ReportDefinitionEntry::TeraTemplate(TeraTemplate {
                    output: ReportOutputType::Html,
                    template: "Dummy stocktake template, stocktake id: {{data.stocktake.id}}"
                        .to_string(),
                }),
            ),
            (
                "template_header.html".to_string(),
                ReportDefinitionEntry::TeraTemplate(TeraTemplate {
                    output: ReportOutputType::Html,
                    template: r#"<div style="font-size: 10px; padding-top: 8px; text-align: center; width: 100%;"><span>Some header here.</div>"#.to_string(),
                }),
            ),
            (
                "template_footer.html".to_string(),
                ReportDefinitionEntry::TeraTemplate(TeraTemplate {
                    output: ReportOutputType::Html,
                    template: r#"<div style="font-size: 10px; padding-top: 8px; text-align: center; width: 100%;"><span>Some footer here.</div>"#.to_string(),
                }),
            ),
            (
                "query".to_string(),
                ReportDefinitionEntry::DefaultQuery(DefaultQuery::Stocktake),
            ),
        ]),
    };
    DummyReport {
        id: "dummy_report_stocktake".to_string(),
        name: "Dummy stocktake report".to_string(),
        report,
        context: ReportContext::Stocktake,
    }
}

pub fn requisition_report() -> DummyReport {
    let report = ReportDefinition {
        index: ReportDefinitionIndex {
            template: Some("template.html".to_string()),
            header: Some("template_header.html".to_string()),
            footer: Some("template_footer.html".to_string()),
            query: Some("query".to_string()),
        },
        entries: HashMap::from([
            (
                "template.html".to_string(),
                ReportDefinitionEntry::TeraTemplate(TeraTemplate {
                    output: ReportOutputType::Html,
                    template: "Dummy requisition template, requisition id: {{data.requisition.id}}"
                        .to_string(),
                }),
            ),
            (
                "template_header.html".to_string(),
                ReportDefinitionEntry::TeraTemplate(TeraTemplate {
                    output: ReportOutputType::Html,
                    template: r#"<div style="font-size: 10px; padding-top: 8px; text-align: center; width: 100%;"><span>Some header here.</div>"#.to_string(),
                }),
            ),
            (
                "template_footer.html".to_string(),
                ReportDefinitionEntry::TeraTemplate(TeraTemplate {
                    output: ReportOutputType::Html,
                    template: r#"<div style="font-size: 10px; padding-top: 8px; text-align: center; width: 100%;"><span>Some footer here.</div>"#.to_string(),
                }),
            ),
            (
                "query".to_string(),
                ReportDefinitionEntry::DefaultQuery(DefaultQuery::Requisition),
            ),
        ]),
    };
    DummyReport {
        id: "dummy_report_requisition".to_string(),
        name: "Dummy requisition report".to_string(),
        report,
        context: ReportContext::Requisition,
    }
}

pub fn insert_dummy_reports(connection: &StorageConnection) -> Result<(), RepositoryError> {
    let reports = vec![invoice_report(), stocktake_report(), requisition_report()];
    for report in reports {
        let row = ReportRow {
            id: report.id,
            name: report.name,
            r#type: ReportType::OmSupply,
            template: serde_json::to_string(&report.report).unwrap(),
            context: report.context,
            comment: None,
        };
        ReportRowRepository::new(connection).upsert_one(&row)?;
    }
    Ok(())
}
