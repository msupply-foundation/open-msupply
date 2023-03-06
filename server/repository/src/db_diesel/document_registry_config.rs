use serde::{Deserialize, Serialize};

#[derive(Debug, Clone, Serialize, Deserialize, PartialEq)]
pub struct EventCondition {
    pub field: String,

    #[serde(rename = "isFalsy")]
    pub is_falsy: Option<bool>,
    #[serde(rename = "isTruthy")]
    pub is_truthy: Option<bool>,
    #[serde(rename = "isSet")]
    pub is_set: Option<bool>,
    #[serde(rename = "equalTo")]
    pub equal_to: Option<String>,
    #[serde(rename = "equalAny")]
    pub equal_any: Option<Vec<String>>,

    #[serde(rename = "lessThanOrEqualTo")]
    pub less_than_or_equal_to: Option<f64>,
    #[serde(rename = "lessThan")]
    pub less_than: Option<f64>,
    #[serde(rename = "greaterThanOrEqualTo")]
    pub greater_than_or_equal_to: Option<f64>,
    #[serde(rename = "greaterThan")]
    pub greater_than: Option<f64>,
}

#[derive(Debug, Clone, Serialize, Deserialize, PartialEq)]
pub struct EventTarget {
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

#[derive(Debug, Clone, Serialize, Deserialize, PartialEq)]
pub struct EventConfig<T> {
    pub conditions: Option<Vec<EventCondition>>,
    pub config: T,
    pub event: EventTarget,
}

#[derive(Debug, Clone, Serialize, Deserialize, PartialEq)]
pub struct EventScheduleInConfig {
    pub days: Option<i64>,
    pub minutes: Option<i64>,
}

#[derive(Debug, Clone, Serialize, Deserialize, PartialEq)]
pub struct EventScheduleConfig {
    /// Field with the scheduled base time.
    /// If not specified the document base time is used.
    #[serde(rename = "datetimeField")]
    pub datetime_field: Option<String>,
    /// For developing: force to schedules from now.
    #[serde(rename = "scheduleFromNow")]
    pub schedule_from_now: Option<bool>,
    #[serde(rename = "scheduleIn")]
    pub schedule_in: EventScheduleInConfig,
}

#[derive(Debug, Clone, Serialize, Deserialize, PartialEq)]
#[serde(tag = "type")]
pub enum EventConfigEnum {
    Schedule(EventConfig<EventScheduleConfig>),
    Field(EventConfig<Option<()>>),
}

#[derive(Debug, Clone, Serialize, Deserialize, PartialEq)]
pub struct DocumentRegistryConfig {
    pub events: Vec<EventConfigEnum>,
}
