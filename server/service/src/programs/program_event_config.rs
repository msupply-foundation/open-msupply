use serde::{Deserialize, Serialize};
use serde_json::{Map, Value};

#[derive(Debug, Clone, Serialize, Deserialize)]
pub struct Condition {
    pub field: String,

    #[serde(rename = "isFalsy")]
    pub is_falsy: Option<bool>,
    #[serde(rename = "isTruthy")]
    pub is_truthy: Option<bool>,
    #[serde(rename = "isSet")]
    pub is_set: Option<bool>,
}

#[derive(Debug, Clone, Serialize, Deserialize)]
pub struct Target {
    /// If not set the current document type and document name is used
    /// If set the specified document type is used but the document name is not set
    #[serde(rename = "documentType")]
    pub document_type: Option<String>,
    #[serde(rename = "documentName")]
    pub document_name: Option<bool>,
    pub r#type: String,

    #[serde(rename = "dataField")]
    pub data_field: Option<String>,
    pub data: Option<String>,
}

#[derive(Debug, Clone, Serialize, Deserialize)]
pub struct ProgramEventConfig<T> {
    pub conditions: Option<Vec<Condition>>,
    pub config: T,
    pub event: Target,
}

#[derive(Debug, Clone, Serialize, Deserialize)]
pub struct ProgramEventScheduleInConfig {
    pub days: Option<i64>,
    pub minutes: Option<i64>,
}

#[derive(Debug, Clone, Serialize, Deserialize)]
pub struct ProgramEventScheduleConfig {
    /// Field with the scheduled base time.
    /// If not specified the document base time is used.
    #[serde(rename = "datetimeField")]
    pub datetime_field: Option<String>,
    /// For developing: force to schedules from now.
    #[serde(rename = "scheduleFromNow")]
    pub schedule_from_now: Option<bool>,
    #[serde(rename = "scheduleIn")]
    pub schedule_in: ProgramEventScheduleInConfig,
}

#[derive(Debug, Clone, Serialize, Deserialize)]
#[serde(tag = "type")]
pub enum Config {
    Schedule(ProgramEventConfig<ProgramEventScheduleConfig>),
    Field(ProgramEventConfig<Option<()>>),
}

pub fn deserialize_config(
    ui_schema: &Map<String, Value>,
) -> Result<Option<Vec<Config>>, serde_json::Error> {
    let Some(config_list) = ui_schema.get("omSupply") else { return Ok(None)};

    serde_json::from_value(config_list.clone())
}
