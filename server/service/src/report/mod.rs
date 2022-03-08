use std::collections::HashMap;

use serde::{Deserialize, Serialize};

mod html_printing;
pub mod report_service;

#[derive(Debug, Serialize, Deserialize, PartialEq, Clone)]
pub struct ReportHttpQuery {
    base_path: String,
    body: Option<String>,
}

#[derive(Debug, Serialize, Deserialize, PartialEq, Clone)]
pub enum DefaultQuery {
    OutboundShipment,
}

#[derive(Debug, Serialize, Deserialize, PartialEq, Clone)]
pub struct ReportRef {
    /// The id of the source report definition that is referred to by this reference
    source: String,
    /// The name of the entry in the referred report definition (only needed if different to local
    /// name)
    source_name: Option<String>,
}

#[derive(Debug, Serialize, Deserialize, PartialEq, Clone)]
pub struct TeraTemplate {
    pub output: ReportOutputType,
    pub template: String,
}

/// The output format that is produced by a report
#[derive(Debug, Serialize, Deserialize, PartialEq, Clone)]
pub enum ReportOutputType {
    Html,
}

#[derive(Debug, Serialize, Deserialize, PartialEq, Clone)]
#[serde(tag = "type", content = "data")]
pub enum ReportDefinitionEntry {
    TeraTemplate(TeraTemplate),
    /// Custom http query
    QueryHttp(ReportHttpQuery),
    /// Use default predefined query
    DefaultQuery(DefaultQuery),
    Resource(serde_json::Value),
    /// Entry reference to another report definition
    Ref(ReportRef),
}

#[derive(Debug, Serialize, Deserialize, PartialEq, Clone)]
pub struct ReportDefinition {
    pub entries: HashMap<String, ReportDefinitionEntry>,
}

#[cfg(test)]
mod report_dsl_test {
    use std::collections::HashMap;

    use serde_json::json;

    use crate::report::{
        DefaultQuery, ReportDefinition, ReportDefinitionEntry, ReportOutputType, ReportRef,
        TeraTemplate,
    };

    #[test]
    fn parse_template() {
        let template_data = r#"Hello World (Shipment id: {{id}})
        Some query data: {{data.value}}
        Some resource data: {{res.icon1}} and {{res.mainIcon}},
        "#;
        let template = json!({
          "entries": {
              "template": {
                  "type": "TeraTemplate",
                  "data": {
                      "output": "Html",
                      "template": template_data,
                  }
              },
              "local_footer.html": {
                  "type": "Ref",
                  "data": {
                      "source": "other_report_def",
                      "source_name": "footer.html",
                  }
              },
              "query": {
                  "type": "DefaultQuery",
                  "data": "OutboundShipment"
              },
              "icon": {
                  "type": "Resource",
                  "data": "IconData"
              },
              "mainIcon": {
                  "type": "Ref",
                  "data": {
                      "source": "other_report_def",
                  }
              }
          }
        });
        let report: ReportDefinition = serde_json::from_value(template).unwrap();
        assert_eq!(
            report,
            ReportDefinition {
                entries: HashMap::from([
                    (
                        "local_footer.html".to_string(),
                        ReportDefinitionEntry::Ref(ReportRef {
                            source: "other_report_def".to_string(),
                            source_name: Some("footer.html".to_string()),
                        })
                    ),
                    (
                        "template".to_string(),
                        ReportDefinitionEntry::TeraTemplate(TeraTemplate {
                            output: ReportOutputType::Html,
                            template: template_data.to_string()
                        })
                    ),
                    (
                        "query".to_string(),
                        ReportDefinitionEntry::DefaultQuery(DefaultQuery::OutboundShipment)
                    ),
                    (
                        "icon".to_string(),
                        ReportDefinitionEntry::Resource(json!("IconData"))
                    ),
                    (
                        "mainIcon".to_string(),
                        ReportDefinitionEntry::Ref(ReportRef {
                            source: "other_report_def".to_string(),
                            source_name: None
                        })
                    )
                ]),
            }
        )
    }
}
