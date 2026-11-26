use super::{
    CentralDataTable, Change, ExportFilter, ImportTable, RecordCount, RowFailure, RowOutcome,
    SheetImport, SheetStart,
    cells::{Row, RowError, collect, keep_or_saved},
    fail_if_any, field_changes,
    lookup::{duplicate_name_error, find_by_id_or_name},
    sheet::Value,
};
use crate::master_list::upsert::{
    UpsertMasterListError, master_list_errors, upsert_master_list_unchecked,
};
use repository::{MasterListRow, MasterListRowRepository, RepositoryError, StorageConnection};
use util::{constants::MISSING_PROGRAM, uuid::uuid};

const ID: &str = "id";
const CODE: &str = "code";
const NAME: &str = "name";
const DESCRIPTION: &str = "description";
const IS_ACTIVE: &str = "is_active";
const IS_DEFAULT_PRICE_LIST: &str = "is_default_price_list";
const DISCOUNT_PERCENTAGE: &str = "discount_percentage";
const COLUMNS: &[&str] = &[
    ID,
    CODE,
    NAME,
    DESCRIPTION,
    IS_ACTIVE,
    IS_DEFAULT_PRICE_LIST,
    DISCOUNT_PERCENTAGE,
];

/// Matched by `id`, else `name` among active lists first; with an id, a different name renames the
/// list. On an update a blank cell keeps the value, except in the optional `code`, `description`
/// and `discount_percentage`, where it clears it.
pub(super) struct MasterListTable;

impl ImportTable for MasterListTable {
    fn table(&self) -> CentralDataTable {
        CentralDataTable::MasterList
    }

    fn columns(&self) -> &'static [&'static str] {
        COLUMNS
    }

    fn text_columns(&self) -> &'static [&'static str] {
        &[ID, CODE, NAME, DESCRIPTION]
    }

    fn export(
        &self,
        connection: &StorageConnection,
        filter: &ExportFilter,
    ) -> Result<Vec<Vec<Value>>, RepositoryError> {
        Ok(importable(connection)?
            .into_iter()
            .filter(|master_list| matches(filter, master_list))
            .map(|master_list| cells(&master_list))
            .collect())
    }

    fn count(
        &self,
        connection: &StorageConnection,
        filter: &ExportFilter,
    ) -> Result<RecordCount, RepositoryError> {
        let master_lists = importable(connection)?;
        Ok(RecordCount::in_memory(&master_lists, |master_list| {
            matches(filter, master_list)
        }))
    }

    fn start_sheet(
        &self,
        _connection: &StorageConnection,
        _start: SheetStart,
    ) -> Result<Box<dyn SheetImport>, RepositoryError> {
        Ok(Box::new(MasterListSheet))
    }
}

struct MasterListSheet;

impl SheetImport for MasterListSheet {
    fn import_row(
        &mut self,
        connection: &StorageConnection,
        row: &Row,
    ) -> Result<RowOutcome, RowFailure> {
        let mut errors = Vec::new();
        let is_active = collect(&mut errors, row.bool(IS_ACTIVE));
        let is_default_price_list = collect(&mut errors, row.bool(IS_DEFAULT_PRICE_LIST));
        let discount_percentage = collect(&mut errors, row.number(DISCOUNT_PERCENTAGE));
        let id = row.text(ID);
        let name = row.text(NAME);

        let repo = MasterListRowRepository::new(connection);
        let existing = match find_by_id_or_name(
            &repo,
            row,
            NAME,
            id.as_deref(),
            name.as_deref(),
            |master_list| master_list.is_active,
        )? {
            Ok(existing) => existing,
            // Without it, the row's other checks would treat it as a new master list.
            Err(e) => {
                errors.push(e);
                return Err(RowFailure::Invalid(errors));
            }
        };
        let saved = existing.as_ref();
        // Here, not only in the save, as an unchanged row isn't saved.
        if let Some(saved) = saved.filter(|saved| saved.id == MISSING_PROGRAM) {
            errors.push(protected_error(row, &saved.name));
            return Err(RowFailure::Invalid(errors));
        }

        let name = keep_or_saved(name, saved.map(|master_list| master_list.name.as_str()));
        let is_active = is_active.or(saved.map(|master_list| master_list.is_active));
        let is_default_price_list =
            is_default_price_list.or(saved.map(|master_list| master_list.is_default_price_list));
        row.require_for_new(
            &mut errors,
            "master list",
            &[
                (NAME, name.is_none()),
                (IS_ACTIVE, is_active.is_none()),
                (IS_DEFAULT_PRICE_LIST, is_default_price_list.is_none()),
            ],
        );

        let master_list = MasterListRow {
            id: saved
                .map(|master_list| master_list.id.clone())
                .or(id)
                .unwrap_or_else(uuid),
            code: row
                .optional_text(CODE, saved.map(|master_list| master_list.code.as_str()))
                .unwrap_or_default(),
            name: name.unwrap_or_default(),
            description: row
                .optional_text(
                    DESCRIPTION,
                    saved.map(|master_list| master_list.description.as_str()),
                )
                .unwrap_or_default(),
            is_active: is_active.unwrap_or_default(),
            is_default_price_list: is_default_price_list.unwrap_or_default(),
            discount_percentage: row.optional(
                DISCOUNT_PERCENTAGE,
                discount_percentage.map(Some),
                saved.map(|master_list| master_list.discount_percentage),
            ),
        };

        let change = Change::between(saved, &master_list, |master_list| master_list.is_active);
        if change != Change::Unchanged {
            for error in master_list_errors(connection, &master_list)? {
                let reads = reads(&error);
                upsert_failure(row, &master_list, error).add_rule(reads, &mut errors)?;
            }
        }
        fail_if_any(&mut errors)?;
        if change != Change::Unchanged {
            upsert_master_list_unchecked(connection, &master_list)?;
        }
        Ok(RowOutcome {
            fields: existing
                .map(|saved| field_changes(COLUMNS, cells(&saved), cells(&master_list)))
                .unwrap_or_default(),
            record: master_list.name,
            record_id: master_list.id,
            change,
        })
    }
}

/// On the column the row found it by.
fn protected_error(row: &Row, name: &str) -> RowError {
    row.error(
        row.found_by(NAME),
        format!("{name} is protected, as the server needs it, so import can't change it"),
    )
}

/// The columns `error`'s rule reads beside the one it's reported on.
fn reads(error: &UpsertMasterListError) -> &'static [&'static str] {
    match error {
        // Only active records hold on to their name.
        UpsertMasterListError::DuplicateName { .. } => &[IS_ACTIVE],
        _ => &[],
    }
}

fn upsert_failure(
    row: &Row,
    master_list: &MasterListRow,
    error: UpsertMasterListError,
) -> RowFailure {
    match error {
        UpsertMasterListError::NameRequired => row.error(NAME, "name is required").into(),
        UpsertMasterListError::DuplicateName { other_id } => {
            duplicate_name_error(row, "master list", &other_id, &master_list.name).into()
        }
        UpsertMasterListError::DuplicateCode { other_id } => row
            .error(
                CODE,
                format!(
                    "Master list {other_id} already has code {}",
                    master_list.code
                ),
            )
            .into(),
        // Unreachable here: `import_row` refuses it first.
        UpsertMasterListError::Protected => protected_error(row, MISSING_PROGRAM).into(),
    }
}

fn importable(connection: &StorageConnection) -> Result<Vec<MasterListRow>, RepositoryError> {
    let mut master_lists = MasterListRowRepository::new(connection).find_all()?;
    master_lists.retain(|master_list| master_list.id != MISSING_PROGRAM);
    Ok(master_lists)
}

/// Master lists are few, so they're filtered in memory.
fn matches(filter: &ExportFilter, master_list: &MasterListRow) -> bool {
    filter.matches(
        &[&master_list.name, &master_list.code],
        Some(master_list.is_active),
    )
}

/// One per column, as the export writes them and the preview shows them.
fn cells(master_list: &MasterListRow) -> Vec<Value> {
    vec![
        master_list.id.clone().into(),
        master_list.code.clone().into(),
        master_list.name.clone().into(),
        master_list.description.clone().into(),
        master_list.is_active.into(),
        master_list.is_default_price_list.into(),
        master_list
            .discount_percentage
            .map_or(Value::Empty, Value::Number),
    ]
}
