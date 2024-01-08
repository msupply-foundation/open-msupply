use chrono::NaiveDateTime;

#[derive(Debug, PartialEq, Clone)]
pub struct TemperatureExcursionRow {
    pub id: String,
    pub datetime: NaiveDateTime,
    pub temperature: f64,
    pub location_id: Option<String>,
    pub sensor_id: String,
    pub duration: i64,
    pub store_id: String,
}
