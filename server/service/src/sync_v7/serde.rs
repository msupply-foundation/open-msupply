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
        // v7 only ships the variants above today. The Row enum is shared
        // with v5/v6 push and now covers many more tables; if one shows
        // up here it's a caller bug (a v7 filter let in a non-v7 table).
        other => Err(SyncRecordSerializeError::SerdeError(format!(
            "v7 serialize: unsupported Row variant {:?}",
            std::mem::discriminant(other)
        ))),
    }
}
