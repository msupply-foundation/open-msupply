use super::{
    CentralDataTable, Change, ExportFilter, FieldChange, ImportTable, RecordCount, RowFailure,
    RowOutcome, SheetImport, SheetStart,
    cells::{Row, RowError, collect, keep_or_saved},
    delete::{DELETE_COLUMN, already_deleted, check_delete, is_delete},
    field_changes,
    lookup::find_record,
    name_with_code,
    sheet::Value,
};
use crate::location_type::{
    DeleteLocationTypeError, UpsertLocationTypeError, delete_location_type, upsert_location_type,
};
use repository::{
    LocationTypeRow, LocationTypeRowRepository, LocationTypeUser, RepositoryError,
    StorageConnection,
};
use util::uuid::uuid;

const ID: &str = "id";
const CODE: &str = "code";
const NAME: &str = "name";
const MIN_TEMPERATURE: &str = "min_temperature";
const MAX_TEMPERATURE: &str = "max_temperature";
const COLUMNS: &[&str] = &[
    ID,
    CODE,
    NAME,
    MIN_TEMPERATURE,
    MAX_TEMPERATURE,
    DELETE_COLUMN,
];

/// Matched by `id`, else `code`. Every column but `id` is required, so on an update a blank cell
/// keeps the value.
pub(super) struct LocationTypeTable;

impl ImportTable for LocationTypeTable {
    fn table(&self) -> CentralDataTable {
        CentralDataTable::LocationType
    }

    fn columns(&self) -> &'static [&'static str] {
        COLUMNS
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
            .map(|location_type| cells(&location_type))
            .collect())
    }

    fn count(
        &self,
        connection: &StorageConnection,
        filter: &ExportFilter,
    ) -> Result<RecordCount, RepositoryError> {
        let location_types = LocationTypeRowRepository::new(connection).find_all()?;
        Ok(RecordCount::in_memory(&location_types, |location_type| {
            matches(filter, location_type)
        }))
    }

    fn start_sheet(
        &self,
        _connection: &StorageConnection,
        _start: SheetStart,
    ) -> Result<Box<dyn SheetImport>, RepositoryError> {
        Ok(Box::new(LocationTypeSheet))
    }
}

struct LocationTypeSheet;

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
        let existing = match find_record(
            &LocationTypeRowRepository::new(connection),
            row,
            CODE,
            id.as_deref(),
            code.as_deref(),
            |saved| &saved.name,
            std::convert::identity,
        )? {
            Ok(existing) => existing,
            Err(e) => {
                errors.push(e);
                return Err(RowFailure::Invalid(errors));
            }
        };

        if delete {
            return delete_row(connection, row, existing, errors);
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

        let change = Change::between_upserts(existing.as_ref(), &location_type);
        if change != Change::Unchanged {
            upsert_location_type(connection, &location_type)
                .map_err(|error| upsert_failure(row, &location_type, error))?;
        }
        Ok(RowOutcome {
            fields: existing
                .map(|saved| changed_fields(&saved, &location_type))
                .unwrap_or_default(),
            record: name_with_code(&location_type.name, &location_type.code),
            record_id: location_type.id,
            change,
        })
    }
}

fn delete_row(
    connection: &StorageConnection,
    row: &Row,
    existing: Option<LocationTypeRow>,
    errors: Vec<RowError>,
) -> Result<RowOutcome, RowFailure> {
    // Already gone: nothing to delete, so the row changes nothing.
    let Some(saved) = existing else {
        return already_deleted(row, CODE, errors);
    };
    check_delete(row, COLUMNS, cells(&saved), errors)?;

    delete_location_type(connection, &saved.id).map_err(|error| match error {
        DeleteLocationTypeError::InUse(user) => row
            .error(
                DELETE_COLUMN,
                format!(
                    "{} is used by {}, so it can't be deleted",
                    name_with_code(&saved.name, &saved.code),
                    match user {
                        LocationTypeUser::Location => "a location",
                        LocationTypeUser::Item => "an item",
                        LocationTypeUser::ItemVariant => "an item variant",
                        LocationTypeUser::RequisitionLine => "a requisition line",
                    }
                ),
            )
            .into(),
        DeleteLocationTypeError::DatabaseError(error) => RowFailure::Database(error),
    })?;
    Ok(RowOutcome {
        record: name_with_code(&saved.name, &saved.code),
        record_id: saved.id,
        change: Change::Deleted,
        fields: Vec::new(),
    })
}

fn upsert_failure(
    row: &Row,
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
        // Unreachable here: `find` turns a saved code into a match or a conflict first.
        UpsertLocationTypeError::DuplicateCode { other_id } => row
            .error(CODE, format!("location type {other_id} has this code"))
            .into(),
        UpsertLocationTypeError::DatabaseError(error) => RowFailure::Database(error),
    }
}

/// Location types are few, so they're filtered in memory.
fn matches(filter: &ExportFilter, location_type: &LocationTypeRow) -> bool {
    filter.matches(&[&location_type.name, &location_type.code], None)
}

/// One per column, as the export writes them and the preview shows them.
fn cells(location_type: &LocationTypeRow) -> Vec<Value> {
    vec![
        location_type.id.clone().into(),
        location_type.code.clone().into(),
        location_type.name.clone().into(),
        Value::Number(location_type.min_temperature),
        Value::Number(location_type.max_temperature),
        Value::Empty,
    ]
}

fn changed_fields(old: &LocationTypeRow, new: &LocationTypeRow) -> Vec<FieldChange> {
    field_changes(COLUMNS, cells(old), cells(new))
}
