use repository::{syncv7::SyncRecordSerializeError, Row};

pub fn serialize(row: &Row) -> Result<serde_json::Value, SyncRecordSerializeError> {
    let map_serde_err =
        |e: serde_json::Error| SyncRecordSerializeError::SerdeError(e.to_string());

    match row {
        Row::Unit(r) => serde_json::to_value(r).map_err(map_serde_err),
        Row::Currency(r) => serde_json::to_value(r).map_err(map_serde_err),
        Row::Name(r) => serde_json::to_value(r).map_err(map_serde_err),
        Row::Store(r) => serde_json::to_value(r).map_err(map_serde_err),
        Row::LocationType(r) => serde_json::to_value(r).map_err(map_serde_err),
        Row::Item(r) => serde_json::to_value(r).map_err(map_serde_err),
        Row::StockLine(r) => serde_json::to_value(r).map_err(map_serde_err),
        Row::Invoice(r) => serde_json::to_value(r).map_err(map_serde_err),
        Row::InvoiceLine(r) => serde_json::to_value(r).map_err(map_serde_err),
    }
}
