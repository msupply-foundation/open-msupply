use repository::{
    syncv7::SyncRecordSerializeError, ChangelogTableName, CurrencyRowRepository,
    InvoiceLineRowRepository, InvoiceRowRepository, ItemRowRepository, LocationTypeRowRepository,
    NameRowRepository, StockLineRowRepository, StorageConnection, StoreRowRepository,
    UnitRowRepository,
};

pub fn serialize(
    connection: &StorageConnection,
    table_name: &ChangelogTableName,
    id: &str,
) -> Result<Option<serde_json::Value>, SyncRecordSerializeError> {
    match table_name {
        ChangelogTableName::Unit => {
            let row = UnitRowRepository::new(connection).find_one_by_id(id)?;
            Ok(row.map(|r| serde_json::to_value(&r)).transpose()?)
        }
        ChangelogTableName::Currency => {
            let row = CurrencyRowRepository::new(connection).find_one_by_id(id)?;
            Ok(row.map(|r| serde_json::to_value(&r)).transpose()?)
        }
        ChangelogTableName::Name => {
            let row = NameRowRepository::new(connection).find_one_by_id(id)?;
            Ok(row.map(|r| serde_json::to_value(&r)).transpose()?)
        }
        ChangelogTableName::Store => {
            let row = StoreRowRepository::new(connection).find_one_by_id(id)?;
            Ok(row.map(|r| serde_json::to_value(&r)).transpose()?)
        }
        ChangelogTableName::LocationType => {
            let row = LocationTypeRowRepository::new(connection).find_one_by_id(id)?;
            Ok(row.map(|r| serde_json::to_value(&r)).transpose()?)
        }
        ChangelogTableName::Item => {
            let row = ItemRowRepository::new(connection).find_one_by_id(id)?;
            Ok(row.map(|r| serde_json::to_value(&r)).transpose()?)
        }
        ChangelogTableName::StockLine => {
            let row = StockLineRowRepository::new(connection).find_one_by_id(id)?;
            Ok(row.map(|r| serde_json::to_value(&r)).transpose()?)
        }
        ChangelogTableName::Invoice => {
            let row = InvoiceRowRepository::new(connection).find_one_by_id(id)?;
            Ok(row.map(|r| serde_json::to_value(&r)).transpose()?)
        }
        ChangelogTableName::InvoiceLine => {
            let row = InvoiceLineRowRepository::new(connection).find_one_by_id(id)?;
            Ok(row.map(|r| serde_json::to_value(&r)).transpose()?)
        }
        _ => Ok(None),
    }
}
