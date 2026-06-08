use chrono::Utc;
use repository::{
    system_log_row::{SystemLogRow, SystemLogRowRepository, SystemLogType},
    LocationRowRepository, RepositoryError, StorageConnection,
};
use util::uuid::uuid;

/// Validate an optional foreign key during sync translation.
///
/// If the FK is `Some` but the referenced record does not exist, this:
///  - if `log_if_missing` is true: logs an error and inserts a `system_log` row of type
///    `SyncTranslationFkError` (use for FKs the operator should be aware of)
///  - returns `Ok(None)` so the translated row can still be inserted
///
/// Pass `log_if_missing: false` when a missing FK is expected and not actionable — e.g. a
/// foreign-site invoice line referencing a location that only exists on the remote site.
///
/// If the FK is `None` or the referenced record exists, the input is returned unchanged.
pub(crate) fn clear_invalid_fk<F>(
    connection: &StorageConnection,
    record_table: &str,
    record_id: &str,
    fk_field: &str,
    fk_id: Option<String>,
    check_exists: F,
    log_if_missing: bool,
) -> Result<Option<String>, RepositoryError>
where
    F: FnOnce(&StorageConnection, &str) -> Result<bool, RepositoryError>,
{
    let Some(id) = fk_id else {
        return Ok(None);
    };

    if check_exists(connection, &id)? {
        return Ok(Some(id));
    }

    if log_if_missing {
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
    }

    Ok(None)
}

pub(crate) fn clear_invalid_location_id(
    connection: &StorageConnection,
    location_id: Option<String>,
) -> Result<Option<String>, RepositoryError> {
    let location_id = if let Some(id) = location_id {
        LocationRowRepository::new(connection)
            .find_one_by_id(&id)?
            .map(|it| it.id)
    } else {
        None
    };
    Ok(location_id)
}
