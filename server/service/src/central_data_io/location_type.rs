use super::{
    CentralDataTable, Change, ExportFilter, FieldChange, ImportTable, RecordCount, RowFailure,
    RowOutcome, SheetImport,
    cells::{Row, RowError, collect, keep_or_saved},
    delete::{DELETE_COLUMN, check_unchanged, is_delete},
    lookup::{LookupError, resolve},
    sheet::Value,
};
use crate::location_type::{
    DeleteLocationTypeError, LocationTypeLookup, UpsertLocationTypeError, delete_location_type_in,
    upsert_location_type_in,
};
use repository::{LocationTypeRow, LocationTypeRowRepository, RepositoryError, StorageConnection};
use util::uuid::uuid;

const ID: &str = "id";
const CODE: &str = "code";
const NAME: &str = "name";
const MIN_TEMPERATURE: &str = "min_temperature";
const MAX_TEMPERATURE: &str = "max_temperature";

/// Matched by `id`, else `code`. Every column but `id` is required, so on an update a blank cell
/// keeps the value.
pub(super) struct LocationTypeTable;

impl ImportTable for LocationTypeTable {
    fn table(&self) -> CentralDataTable {
        CentralDataTable::LocationType
    }

    fn columns(&self) -> &'static [&'static str] {
        &[
            ID,
            CODE,
            NAME,
            MIN_TEMPERATURE,
            MAX_TEMPERATURE,
            DELETE_COLUMN,
        ]
    }

    fn text_columns(&self) -> &'static [&'static str] {
        &[ID, CODE, NAME, DELETE_COLUMN]
    }

    fn export(
        &self,
        connection: &StorageConnection,
        filter: &ExportFilter,
    ) -> Result<Vec<Vec<Value>>, RepositoryError> {
        Ok(LocationTypeRowRepository::new(connection)
            .find_all()?
            .into_iter()
            .filter(|location_type| matches(filter, location_type))
            .map(|location_type| {
                vec![
                    location_type.id.into(),
                    location_type.code.into(),
                    location_type.name.into(),
                    Value::Number(location_type.min_temperature),
                    Value::Number(location_type.max_temperature),
                    Value::Empty,
                ]
            })
            .collect())
    }

    fn count(
        &self,
        connection: &StorageConnection,
        filter: &ExportFilter,
    ) -> Result<RecordCount, RepositoryError> {
        let location_types = LocationTypeRowRepository::new(connection).find_all()?;
        Ok(RecordCount {
            matching: location_types
                .iter()
                .filter(|location_type| matches(filter, location_type))
                .count() as u32,
            total: location_types.len() as u32,
        })
    }

    fn start_sheet(
        &self,
        connection: &StorageConnection,
    ) -> Result<Box<dyn SheetImport>, RepositoryError> {
        // Location types are few.
        Ok(Box::new(LocationTypeSheet {
            location_types: LocationTypeLookup::load_all(connection)?,
        }))
    }
}

struct LocationTypeSheet {
    location_types: LocationTypeLookup,
}

impl SheetImport for LocationTypeSheet {
    fn import_row(
        &mut self,
        connection: &StorageConnection,
        row: &Row,
    ) -> Result<RowOutcome, RowFailure> {
        let mut errors = Vec::new();
        let delete = collect(&mut errors, is_delete(row));
        let min_temperature = collect(&mut errors, row.number(MIN_TEMPERATURE));
        let max_temperature = collect(&mut errors, row.number(MAX_TEMPERATURE));
        let id = row.text(ID);
        let code = row.text(CODE);

        // Without its record, the row's other checks would treat it as a new location type.
        let existing = match self.find(row, id.as_deref(), code.as_deref()) {
            Ok(existing) => existing,
            Err(e) => {
                errors.push(e);
                return Err(RowFailure::Invalid(errors));
            }
        };

        if delete {
            return self.delete(connection, row, existing, errors);
        }

        let code = keep_or_saved(code, existing.as_ref().map(|saved| saved.code.as_str()));
        let name = keep_or_saved(
            row.text(NAME),
            existing.as_ref().map(|saved| saved.name.as_str()),
        );
        let min_temperature =
            min_temperature.or(existing.as_ref().map(|saved| saved.min_temperature));
        let max_temperature =
            max_temperature.or(existing.as_ref().map(|saved| saved.max_temperature));
        row.require_for_new(
            &mut errors,
            "location type",
            &[
                (CODE, code.is_none()),
                (NAME, name.is_none()),
                (MIN_TEMPERATURE, min_temperature.is_none()),
                (MAX_TEMPERATURE, max_temperature.is_none()),
            ],
        );
        if !errors.is_empty() {
            return Err(RowFailure::Invalid(errors));
        }

        let location_type = LocationTypeRow {
            id: existing
                .as_ref()
                .map(|saved| saved.id.clone())
                .or(id)
                .unwrap_or_else(uuid),
            code: code.unwrap_or_default(),
            name: name.unwrap_or_default(),
            min_temperature: min_temperature.unwrap_or_default(),
            max_temperature: max_temperature.unwrap_or_default(),
        };

        let change = match &existing {
            Some(saved) if *saved == location_type => Change::Unchanged,
            Some(_) => Change::Updated,
            None => Change::Inserted,
        };
        if change != Change::Unchanged {
            upsert_location_type_in(connection, &mut self.location_types, &location_type).map_err(
                |error| upsert_failure(row, &self.location_types, &location_type, error),
            )?;
        }
        Ok(RowOutcome {
            fields: existing
                .map(|saved| changed_fields(&saved, &location_type))
                .unwrap_or_default(),
            record: record_name(&location_type),
            record_id: location_type.id,
            change,
        })
    }
}

impl LocationTypeSheet {
    /// `None` for a row that adds a location type.
    fn find(
        &self,
        row: &Row,
        id: Option<&str>,
        code: Option<&str>,
    ) -> Result<Option<LocationTypeRow>, RowError> {
        let by_code = |code: &str| -> Vec<String> {
            self.location_types
                .by_code(code)
                .into_iter()
                .map(|other| other.id.clone())
                .collect()
        };
        match (id, code) {
            (Some(id), code) => match (self.location_types.by_id(id), code) {
                (Some(saved), Some(code)) if saved.code.trim() != code => Err(row.error(
                    CODE,
                    format!(
                        "code and id conflict: {id} is {}, whose code is {}, not {code}",
                        saved.name, saved.code
                    ),
                )),
                (Some(saved), _) => Ok(Some(saved.clone())),
                // A new id beside a saved code is a copied row with one column edited.
                (None, Some(code)) if !by_code(code).is_empty() => Err(row.error(
                    CODE,
                    LookupError::Conflict {
                        resolved: by_code(code).join(", "),
                        provided: id.to_string(),
                    }
                    .message(code),
                )),
                (None, _) => Ok(None),
            },
            (None, Some(code)) => match resolve(None, false, Some(&by_code(code))) {
                Ok(found) => Ok(found.and_then(|id| self.location_types.by_id(&id).cloned())),
                Err(LookupError::NotFound) => Ok(None),
                Err(e) => Err(row.error(CODE, e.message(code))),
            },
            (None, None) => Ok(None),
        }
    }

    fn delete(
        &mut self,
        connection: &StorageConnection,
        row: &Row,
        existing: Option<LocationTypeRow>,
        mut errors: Vec<RowError>,
    ) -> Result<RowOutcome, RowFailure> {
        let Some(saved) = existing else {
            let column = if row.text(ID).is_some() { ID } else { CODE };
            errors.push(row.error(column, LookupError::NotFound.message("")));
            return Err(RowFailure::Invalid(errors));
        };
        if let Err(e) = check_unchanged(
            row,
            &[
                (NAME, Value::Text(saved.name.clone())),
                (MIN_TEMPERATURE, Value::Number(saved.min_temperature)),
                (MAX_TEMPERATURE, Value::Number(saved.max_temperature)),
            ],
        ) {
            errors.push(e);
        }
        if !errors.is_empty() {
            return Err(RowFailure::Invalid(errors));
        }

        delete_location_type_in(connection, &mut self.location_types, &saved.id).map_err(
            |error| match error {
                DeleteLocationTypeError::InUse => row
                    .error(
                        DELETE_COLUMN,
                        format!(
                            "{} is used by a location, an item, an item variant or a requisition line, so it can't be deleted",
                            saved.name
                        ),
                    )
                    .into(),
                DeleteLocationTypeError::DatabaseError(error) => RowFailure::Database(error),
            },
        )?;
        Ok(RowOutcome {
            record: record_name(&saved),
            record_id: saved.id,
            change: Change::Deleted,
            fields: Vec::new(),
        })
    }
}

fn upsert_failure(
    row: &Row,
    location_types: &LocationTypeLookup,
    location_type: &LocationTypeRow,
    error: UpsertLocationTypeError,
) -> RowFailure {
    match error {
        UpsertLocationTypeError::CodeRequired => row.error(CODE, "code is required").into(),
        UpsertLocationTypeError::NameRequired => row.error(NAME, "name is required").into(),
        UpsertLocationTypeError::MaxBelowMin => row
            .error(
                MAX_TEMPERATURE,
                format!(
                    "max_temperature {} is below min_temperature {}",
                    location_type.max_temperature, location_type.min_temperature
                ),
            )
            .into(),
        // Unreachable here: a saved code is matched first.
        UpsertLocationTypeError::DuplicateCode { other_id } => {
            let other = location_types
                .by_id(&other_id)
                .map_or(other_id.clone(), |other| {
                    format!("{} ({other_id})", other.name)
                });
            row.error(
                CODE,
                format!(
                    "Location type {other} already has the code {}. Give this location type another code",
                    location_type.code
                ),
            )
            .into()
        }
        UpsertLocationTypeError::DatabaseError(error) => RowFailure::Database(error),
    }
}

/// With the code, as two location types can share a name.
fn record_name(location_type: &LocationTypeRow) -> String {
    format!("{} ({})", location_type.name, location_type.code)
}

/// Location types are few, so they're filtered in memory.
fn matches(filter: &ExportFilter, location_type: &LocationTypeRow) -> bool {
    filter.matches(&[&location_type.name, &location_type.code], None)
}

/// As the sheet shows them.
fn changed_fields(old: &LocationTypeRow, new: &LocationTypeRow) -> Vec<FieldChange> {
    let values = |location_type: &LocationTypeRow| {
        [
            (CODE, location_type.code.clone()),
            (NAME, location_type.name.clone()),
            (MIN_TEMPERATURE, location_type.min_temperature.to_string()),
            (MAX_TEMPERATURE, location_type.max_temperature.to_string()),
        ]
    };
    values(old)
        .into_iter()
        .zip(values(new))
        .filter(|((_, from), (_, to))| from != to)
        .map(|((column, from), (_, to))| FieldChange { column, from, to })
        .collect()
}
