use super::{
    CentralDataTable, Change, ExportFilter, ImportTable, RecordCount, RowFailure, RowOutcome,
    SheetImport, SheetStart,
    cells::{Row, RowError, choice_cell, collect},
    delete::{DELETE_COLUMN, already_deleted_by, check_delete, is_delete},
    lookup::{InMemory, NOT_FOUND, find_by_id_or_composite_key, key_conflict},
    master_list_refs::{
        MASTER_LIST_ID, MASTER_LIST_NAME, check_not_placeholder, find_master_list,
        master_list_part, not_found_error, not_placeholder, protected_error, read_master_lists,
    },
    name::{TYPES as NAME_TYPES, type_label},
    name_refs::{NAME_CODE, NAME_ID, NAME_NAME, NAME_TYPE, find_name, name_error, name_part},
    name_with_code,
    sheet::Value,
    sorted_by,
};
use crate::{
    i64_to_u32,
    master_list::upsert_name_join::{
        UpsertMasterListNameJoinError, delete_master_list_name_join, find_master_list_name_joins,
        upsert_master_list_name_join,
    },
};
use repository::{
    EqualFilter, MasterListNameJoinFilter, MasterListNameJoinRepository, MasterListNameJoinRow,
    MasterListRow, NameRow, NameRowRepository, NameRowType, RepositoryError, StorageConnection,
    StringFilter,
};
use util::uuid::uuid;

const ID: &str = "id";
/// What a row on the placeholder master list would change.
const PROTECTED: &str = "which names it's given to";

const COLUMNS: &[&str] = &[
    ID,
    MASTER_LIST_NAME,
    MASTER_LIST_ID,
    NAME_CODE,
    NAME_TYPE,
    NAME_ID,
    DELETE_COLUMN,
];

/// The names each master list is given to. Matched by `id`, else by its master list and name
/// together, a pair that never changes, so a saved record is never updated: it's kept or deleted.
/// The placeholder master list's, patients' and system names' records are neither exported nor
/// imported.
pub(super) struct MasterListNameJoinTable;

impl ImportTable for MasterListNameJoinTable {
    fn table(&self) -> CentralDataTable {
        CentralDataTable::MasterListNameJoin
    }

    fn columns(&self) -> &'static [&'static str] {
        COLUMNS
    }

    fn text_columns(&self) -> &'static [&'static str] {
        &[
            ID,
            MASTER_LIST_NAME,
            MASTER_LIST_ID,
            NAME_CODE,
            NAME_ID,
            DELETE_COLUMN,
            NAME_NAME,
        ]
    }

    fn export_only_columns(&self) -> &'static [&'static str] {
        &[NAME_NAME]
    }

    fn export(
        &self,
        connection: &StorageConnection,
        filter: &ExportFilter,
    ) -> Result<Vec<Vec<Value>>, RepositoryError> {
        // Read whole, not paged: the export has already checked the row cap.
        let joins =
            MasterListNameJoinRepository::new(connection).query_by_filter(join_filter(filter))?;
        // Few, so read whole.
        let master_lists = read_master_lists(connection)?;
        let rows = joins
            .into_iter()
            .map(|(join, name)| {
                let master_list = master_lists.get(&join.master_list_id);
                let mut cells = cells(&join, master_list, Some(&name));
                cells.push(name.name.into());
                // Names in any letter case, so `antenatal` comes before `Clinic`.
                let order = (
                    master_list
                        .map(|master_list| master_list.name.to_lowercase())
                        .unwrap_or_default(),
                    name.code,
                    type_label(&name.r#type),
                    join.id,
                );
                (order, cells)
            })
            .collect();
        Ok(sorted_by(rows))
    }

    fn count(
        &self,
        connection: &StorageConnection,
        filter: &ExportFilter,
    ) -> Result<RecordCount, RepositoryError> {
        let repo = MasterListNameJoinRepository::new(connection);
        Ok(RecordCount {
            matching: i64_to_u32(repo.count(join_filter(filter))?),
            total: i64_to_u32(repo.count(exportable())?),
        })
    }

    fn start_sheet(
        &self,
        connection: &StorageConnection,
        _start: SheetStart,
    ) -> Result<Box<dyn SheetImport>, RepositoryError> {
        // Runs after the name and master list sheets, so their new records are found.
        Ok(Box::new(MasterListNameJoinSheet {
            master_lists: read_master_lists(connection)?,
        }))
    }
}

/// Names are looked up a row at a time, by their indexed code, as a central server can have
/// thousands.
struct MasterListNameJoinSheet {
    /// Read once: far fewer than joins, and unchanged while this sheet runs.
    master_lists: InMemory<MasterListRow>,
}

impl SheetImport for MasterListNameJoinSheet {
    fn import_row(
        &mut self,
        connection: &StorageConnection,
        row: &Row,
    ) -> Result<RowOutcome, RowFailure> {
        let mut errors = Vec::new();
        let delete = collect(&mut errors, is_delete(row));
        // For a `DELETE` row too, so a missing reference stops the import.
        let master_list_id = find_master_list(&self.master_lists, row)?;
        let name_type = row.choice(NAME_TYPE, NAME_TYPES);
        let name_id = find_name(connection, row, name_type.clone().ok().flatten())?;
        let master_list_id = collect(&mut errors, master_list_id).flatten();
        let name_type = collect(&mut errors, name_type);
        let name_id = collect(&mut errors, name_id).flatten();
        // Then a missing reference is that error, not "required".
        if !errors.is_empty() {
            return Err(RowFailure::Invalid(errors));
        }

        let id = row.text(ID);
        let existing = self.find_join(
            connection,
            row,
            id.as_deref(),
            master_list_id.as_deref(),
            name_id.as_deref(),
        )??;
        let saved = existing.as_ref();
        check_not_placeholder(
            row,
            saved.map(|join| join.master_list_id.as_str()),
            master_list_id.as_deref(),
            PROTECTED,
        )?;
        // The saved join's when the row leaves it blank, so a row with only an id can't change a
        // patient's or a system name's join. Read once: `find_join` makes another name a conflict.
        let name_id = name_id.or(saved.map(|join| join.name_id.clone()));
        let name = match &name_id {
            Some(name_id) => NameRowRepository::new(connection).find_one_by_id(name_id)?,
            None => None,
        };
        if let Some(error) = name.as_ref().and_then(|name| {
            name_error(
                row,
                name,
                name_type.as_ref(),
                "which master lists are given to",
            )
        }) {
            return Err(error.into());
        }
        if delete {
            let Some(saved) = existing else {
                // Named by the row's master list and name, as found.
                return already_deleted_by(
                    row,
                    master_list_id.as_ref().zip(name_id.as_ref()),
                    |(master_list_id, name_id)| self.record(master_list_id, name.as_ref(), name_id),
                );
            };
            return self.delete(connection, row, saved, name.as_ref());
        }
        // `find_join` makes another master list or name a conflict, so a saved join is kept as
        // it is.
        if let Some(saved) = existing {
            return Ok(RowOutcome {
                record: self.record(&saved.master_list_id, name.as_ref(), &saved.name_id),
                record_id: saved.id,
                change: Change::Unchanged,
                fields: Vec::new(),
            });
        }

        row.require_for_new(
            &mut errors,
            "name on a master list",
            &[
                (MASTER_LIST_NAME, master_list_id.is_none()),
                (NAME_CODE, name_id.is_none()),
            ],
        );
        if !errors.is_empty() {
            return Err(RowFailure::Invalid(errors));
        }

        let new = MasterListNameJoinRow {
            id: id.unwrap_or_else(uuid),
            master_list_id: master_list_id.unwrap_or_default(),
            name_id: name_id.unwrap_or_default(),
        };
        upsert_master_list_name_join(connection, &new)
            .map_err(|error| self.upsert_failure(row, &new, name.as_ref(), error))?;
        Ok(RowOutcome {
            record: self.record(&new.master_list_id, name.as_ref(), &new.name_id),
            record_id: new.id,
            change: Change::Inserted,
            fields: Vec::new(),
        })
    }
}

impl MasterListNameJoinSheet {
    /// `Central clinic (CL1) on Essential medicines`. `name` is the one with `name_id`, if found.
    fn record(&self, master_list_id: &str, name: Option<&NameRow>, name_id: &str) -> String {
        let name = name.map_or_else(
            || name_id.to_string(),
            |name| name_with_code(&name.name, &name.code),
        );
        format!("{name} on {}", self.master_lists.key_or_id(master_list_id))
    }

    /// The saved join a row changes: by id, else by its master list and name together.
    /// `Ok(None)` for a row that adds one.
    fn find_join(
        &self,
        connection: &StorageConnection,
        row: &Row,
        id: Option<&str>,
        master_list_id: Option<&str>,
        name_id: Option<&str>,
    ) -> Result<Result<Option<MasterListNameJoinRow>, RowError>, RepositoryError> {
        let by_key = || match (master_list_id, name_id) {
            (Some(master_list_id), Some(name_id)) => {
                find_master_list_name_joins(connection, master_list_id, name_id)
            }
            _ => Ok(Vec::new()),
        };
        find_by_id_or_composite_key(
            row,
            id,
            by_key,
            |join| &join.id,
            |id| MasterListNameJoinRepository::new(connection).find_one_by_id(id),
            |saved, found, id| {
                let parts = [
                    master_list_part(&self.master_lists, master_list_id, &saved.master_list_id),
                    name_part(name_id, &saved.name_id),
                ];
                // The saved join's name, read only to describe a conflict.
                key_conflict(row, found, &saved.id, id, &parts, || {
                    let name = NameRowRepository::new(connection).find_one_by_id(&saved.name_id)?;
                    let record = self.record(&saved.master_list_id, name.as_ref(), &saved.name_id);
                    Ok((record, name))
                })
            },
        )
    }

    fn delete(
        &self,
        connection: &StorageConnection,
        row: &Row,
        saved: MasterListNameJoinRow,
        name: Option<&NameRow>,
    ) -> Result<RowOutcome, RowFailure> {
        check_delete(
            row,
            COLUMNS,
            &[NAME_TYPE],
            cells(&saved, self.master_lists.get(&saved.master_list_id), name),
            Vec::new(),
        )?;
        delete_master_list_name_join(connection, &saved.id)?;
        Ok(RowOutcome {
            record: self.record(&saved.master_list_id, name, &saved.name_id),
            record_id: saved.id,
            change: Change::Deleted,
            fields: Vec::new(),
        })
    }

    fn upsert_failure(
        &self,
        row: &Row,
        join: &MasterListNameJoinRow,
        name: Option<&NameRow>,
        error: UpsertMasterListNameJoinError,
    ) -> RowFailure {
        let name_column = row.reference_column(NAME_CODE, NAME_ID);
        let name_label = name.map_or_else(
            || join.name_id.clone(),
            |name| name_with_code(&name.name, &name.code),
        );
        match error {
            // Not reached here: `find_reference` and `find_name` find them among the saved
            // records.
            UpsertMasterListNameJoinError::MasterListNotFound => not_found_error(row).into(),
            UpsertMasterListNameJoinError::NameNotFound => row.error(name_column, NOT_FOUND).into(),
            UpsertMasterListNameJoinError::NameDeleted => row
                .error(
                    name_column,
                    format!("{name_label} is deleted, so it can't be given a master list"),
                )
                .into(),
            // Unreachable here: `import_row` refuses it first.
            UpsertMasterListNameJoinError::Protected => protected_error(row, PROTECTED).into(),
            // Unreachable here: `find_join` turns a saved master list and name into a match or a
            // conflict.
            UpsertMasterListNameJoinError::DuplicateJoin { other_id } => row
                .error(
                    name_column,
                    format!(
                        "{name_label} already has {}, through {other_id}",
                        self.master_lists.key_or_id(&join.master_list_id)
                    ),
                )
                .into(),
            UpsertMasterListNameJoinError::DatabaseError(error) => RowFailure::Database(error),
        }
    }
}

/// Not the placeholder master list's, nor a patient's or a system name's.
fn exportable() -> MasterListNameJoinFilter {
    MasterListNameJoinFilter {
        master_list_id: not_placeholder(),
        name_type: Some(EqualFilter {
            not_equal_to: Some(NameRowType::Patient),
            ..Default::default()
        }),
        is_system_name: Some(false),
        ..Default::default()
    }
}

/// Joins can be many, so they're filtered and counted in SQL.
fn join_filter(filter: &ExportFilter) -> MasterListNameJoinFilter {
    let mut join_filter = exportable();
    if let Some(text) = filter.contains.as_deref().map(str::trim)
        && !text.is_empty()
    {
        join_filter.master_list_name_or_name_code = Some(StringFilter::like(text));
    }
    join_filter
}

/// One per column. The export adds `name_name`.
fn cells(
    join: &MasterListNameJoinRow,
    master_list: Option<&MasterListRow>,
    name: Option<&NameRow>,
) -> Vec<Value> {
    vec![
        join.id.clone().into(),
        master_list
            .map(|master_list| master_list.name.clone())
            .into(),
        join.master_list_id.clone().into(),
        name.map(|name| name.code.clone()).into(),
        name.map_or(Value::Empty, |name| choice_cell(NAME_TYPES, &name.r#type)),
        join.name_id.clone().into(),
        Value::Empty,
    ]
}
