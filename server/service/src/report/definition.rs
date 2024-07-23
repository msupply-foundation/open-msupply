use std::collections::HashMap;

use serde::{Deserialize, Serialize};
use serde_json::Value;

use super::string_or_vec::string_or_vec;

#[derive(Debug, Serialize, Deserialize, PartialEq, Clone)]
pub struct SQLQuery {
    pub name: String,
    pub query_sqlite: String,
    pub query_postgres: String,
}

#[derive(Debug, Serialize, Deserialize, PartialEq, Clone)]
pub struct GraphQlQuery {
    pub query: String,
    /// Must be an Object. If `dataId` is set it will be overwritten.
    pub variables: Option<Value>,
}

/// This struct is used to sort report data by a key and in descending or ascending order
#[derive(Clone)]
pub struct PrintReportSort {
    /// Key to sort by
    pub key: String,
    /// Whether to sort in descending order
    pub desc: Option<bool>,
}

#[derive(Debug, Serialize, Deserialize, PartialEq, Clone)]
pub enum DefaultQuery {
    Invoice,
    Stocktake,
    Requisition,
}

#[derive(Debug, Serialize, Deserialize, PartialEq, Clone)]
pub struct ReportRef {
    /// The id of the source report definition that is referred to by this reference
    pub source: String,
    /// The name of the entry in the referred report definition (only needed if different to local
    /// name)
    pub source_name: Option<String>,
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
    GraphGLQuery(GraphQlQuery),
    /// Use default predefined query
    DefaultQuery(DefaultQuery),
    SQLQuery(SQLQuery),
    Resource(serde_json::Value),
    /// Entry reference to another report definition
    Ref(ReportRef),
}

/// Specifies which report definition entries are the "main" entries.
#[derive(Debug, Serialize, Deserialize, PartialEq, Clone)]
pub struct ReportDefinitionIndex {
    pub template: Option<String>,
    pub header: Option<String>,
    pub footer: Option<String>,
    #[serde(deserialize_with = "string_or_vec")]
    pub query: Vec<String>,
}

#[derive(Debug, Serialize, Deserialize, PartialEq, Clone)]
pub struct ReportDefinition {
    pub index: ReportDefinitionIndex,
    pub entries: HashMap<String, ReportDefinitionEntry>,
}

#[cfg(test)]
mod report_dsl_test {
    use std::collections::HashMap;

    use serde_json::json;

    use crate::report::definition::{
        DefaultQuery, ReportDefinition, ReportDefinitionEntry, ReportDefinitionIndex,
        ReportOutputType, ReportRef, TeraTemplate,
    };

    #[test]
    fn parse_template() {
        let template_data = r#"Hello World (Shipment id: {{id}})
        Some query data: {{data.value}}
        Some resource data: {{res.icon1}} and {{res.mainIcon}},
        "#;
        let template = json!({
            "index": {
                "template": "template.html",
                "footer": "local_footer.html",
                "query": "query"
            },
            "entries": {
              "template.html": {
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
                  "data": "Invoice"
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
                index: ReportDefinitionIndex {
                    template: Some("template.html".to_string()),
                    header: None,
                    footer: Some("local_footer.html".to_string()),
                    query: vec!["query".to_string()],
                },
                entries: HashMap::from([
                    (
                        "local_footer.html".to_string(),
                        ReportDefinitionEntry::Ref(ReportRef {
                            source: "other_report_def".to_string(),
                            source_name: Some("footer.html".to_string()),
                        })
                    ),
                    (
                        "template.html".to_string(),
                        ReportDefinitionEntry::TeraTemplate(TeraTemplate {
                            output: ReportOutputType::Html,
                            template: template_data.to_string()
                        })
                    ),
                    (
                        "query".to_string(),
                        ReportDefinitionEntry::DefaultQuery(DefaultQuery::Invoice)
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
