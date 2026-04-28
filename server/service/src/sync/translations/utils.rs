use chrono::Utc;
use repository::{
    system_log_row::{SystemLogRow, SystemLogRowRepository, SystemLogType},
    BarcodeRowRepository, LocationRowRepository, RepositoryError, StorageConnection,
};
use util::uuid::uuid;

/// Validate an optional foreign key during sync translation.
///
/// If the FK is `Some` but the referenced record does not exist, this:
///  - logs an error (so the operator can fix the translator dependency list)
///  - inserts a `system_log` row of type `SyncTranslationFkError`
///  - returns `Ok(None)` so the translated row can still be inserted
///
/// If the FK is `None` or the referenced record exists, the input is returned unchanged.
pub(crate) fn clear_invalid_fk<F, T>(
    connection: &StorageConnection,
    record_table: &str,
    record_id: &str,
    fk_field: &str,
    fk_id: Option<String>,
    lookup: F,
) -> Result<Option<String>, RepositoryError>
where
    F: FnOnce(&StorageConnection, &str) -> Result<Option<T>, RepositoryError>,
{
    let Some(id) = fk_id else {
        return Ok(None);
    };

    if lookup(connection, &id)?.is_some() {
        return Ok(Some(id));
    }

    let message = format!(
        "Sync translation: foreign key not found, ensure the dependency was defined correctly in the translator. \
         table={record_table}, record_id={record_id}, fk_field={fk_field}, fk_id={id}"
    );
    log::error!("{message}");

    SystemLogRowRepository::new(connection).insert_one(&SystemLogRow {
        id: uuid(),
        r#type: SystemLogType::SyncTranslationFkError,
        sync_site_id: None,
        datetime: Utc::now().naive_utc(),
        message: Some(message),
        is_error: true,
    })?;

    Ok(None)
}

/// Some datafiles contain links to non-existing barcode references.
pub(crate) fn clear_invalid_barcode_id(
    connection: &StorageConnection,
    record_table: &str,
    record_id: &str,
    barcode_id: Option<String>,
) -> Result<Option<String>, RepositoryError> {
    clear_invalid_fk(
        connection,
        record_table,
        record_id,
        "barcode_id",
        barcode_id,
        |c, id| BarcodeRowRepository::new(c).find_one_by_id(id),
    )
}

/// Some datafiles contain links to non-existing location references.
pub(crate) fn clear_invalid_location_id(
    connection: &StorageConnection,
    record_table: &str,
    record_id: &str,
    location_id: Option<String>,
) -> Result<Option<String>, RepositoryError> {
    clear_invalid_fk(
        connection,
        record_table,
        record_id,
        "location_id",
        location_id,
        |c, id| LocationRowRepository::new(c).find_one_by_id(id),
    )
}
