use serde::{Deserialize, Serialize};

#[derive(Debug, Clone, Serialize, Deserialize, PartialEq)]
pub struct EventCondition {
    /// The condition is evaluated against the data located at the specified field in the document
    /// data.
    /// For example, against the data at `extension.myField`.
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
    /// The document type the event is emitted to.
    /// If not set the current document type is used.
    /// Note, this option does not affect if the target document name.
    #[serde(rename = "documentType")]
    pub document_type: Option<String>,
    /// If set to true, the event is targeted to the document that is currently edited.
    /// For example, an event can be targeted to a specific encounter.
    #[serde(rename = "documentName")]
    pub document_name: Option<bool>,
    /// The type of the event
    pub r#type: String,

    /// If specified the data field in the document data from where the event data is extracted.
    /// For example, `extension.myData.field1`.
    /// Note, this option takes precedence over the `data` option.
    #[serde(rename = "dataField")]
    pub data_field: Option<String>,
    /// A constant event data value, i.e. the event data.
    /// This setting can also be used as a fallback if there is no data located at a specified
    /// `data_field`.
    pub data: Option<String>,
}

/// Every event config follows the same structure:
/// - A list of `conditions` to configure when an event should be emitted
/// - A definition about the event that should be emitted.
/// - A config type (not in here, see EventConfigEnum)
/// - A config object specific to the config type,
#[derive(Debug, Clone, Serialize, Deserialize, PartialEq)]
pub struct EventConfig<T> {
    /// Event is extracted when ALL conditions match.
    pub conditions: Vec<EventCondition>,
    /// Event config based on the config type.
    pub config: T,
    /// Specifies which event should be emitted when all conditions are satisfied.
    pub event: EventTarget,
}

#[derive(Debug, Clone, Serialize, Deserialize, PartialEq)]
pub struct EventScheduleInConfig {
    pub months: Option<i32>,
    pub days: Option<i64>,
    pub minutes: Option<i64>,
}

#[derive(Debug, Clone, Serialize, Deserialize, PartialEq)]
pub struct EventScheduleConfig {
    /// Field with the scheduled base time.
    /// If not specified the document base time is used.
    /// For example, `extension.myData.myDatetime`
    ///
    /// Note, the document base time is currently extracted from the document when updating the
    /// document and is dependent on the document type, e.g. for encounters the base time is the
    /// encounter's `startDatetime`.
    #[serde(rename = "datetimeField")]
    pub datetime_field: Option<String>,
    /// For developing: force to schedule an event from now, e.g. in 1 minute.
    #[serde(rename = "scheduleFromNow")]
    pub schedule_from_now: Option<bool>,
    /// Specifies when an event should be scheduled based on the datetime value from the
    /// `datetime_field`.
    #[serde(rename = "scheduleIn")]
    pub schedule_in: EventScheduleInConfig,
}

#[derive(Debug, Clone, Serialize, Deserialize, PartialEq)]
#[serde(tag = "type")]
pub enum EventConfigEnum {
    /// Config to schedule an event based on a datetime field in the document data.
    Schedule(EventConfig<EventScheduleConfig>),
    /// Config to extract a field from the document data and put it into an event.
    Field(EventConfig<Option<()>>),
}

#[derive(Debug, Clone, Serialize, Deserialize, PartialEq)]
#[serde(tag = "type")]
pub enum NextEncounterEnum {
    Event(NextEncounterEvent),
}

#[derive(Debug, Clone, Serialize, Deserialize, PartialEq)]
pub struct NextEncounterEvent {
    #[serde(rename = "eventType")]
    pub event_type: String,
    pub label: Option<String>,
}

#[derive(Debug, Clone, Serialize, Deserialize, PartialEq)]
pub struct DocumentRegistryConfig {
    #[serde(rename = "nextEncounter")]
    pub next_encounter: Option<NextEncounterEnum>,
    pub events: Vec<EventConfigEnum>,
}
