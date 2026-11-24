use super::{
    CentralDataTable, Change, ExportFilter, ImportTable, RecordCount, RowFailure, RowOutcome,
    SheetImport, SheetStart,
    cells::{Row, RowError, collect},
    delete::{DELETE_COLUMN, already_deleted_as, check_delete, is_delete},
    field_changes,
    lookup::{
        InMemory, KeyPart, KeyedTable, NOT_FOUND, SavedCode, differs, find_by_id_or_composite_key,
        find_reference_record, key_conflict, key_or,
    },
    master_list_refs::{
        MASTER_LIST_ID, MASTER_LIST_NAME, check_not_placeholder, find_master_list,
        master_list_part, not_found_error, not_placeholder, protected_error, read_master_lists,
    },
    name_with_code,
    sheet::Value,
    sorted_by,
};
use crate::{
    i64_to_u32,
    master_list::upsert_line::{
        UpsertMasterListLineError, delete_master_list_line, find_master_list_lines,
        upsert_master_list_line,
    },
};
use repository::{
    ItemRow, ItemRowRepository, MasterListLineFilter, MasterListLineRepository, MasterListLineRow,
    MasterListLineRowRepository, MasterListRow, RepositoryError, StorageConnection, StringFilter,
};
use util::uuid::uuid;

const ID: &str = "id";
/// What a row on the placeholder master list would change.
const PROTECTED: &str = "its items";
const ITEM_CODE: &str = "item_code";
const ITEM_ID: &str = "item_id";
const PRICE_PER_UNIT: &str = "price_per_unit";
const ITEM_NAME: &str = "item_name";

const COLUMNS: &[&str] = &[
    ID,
    MASTER_LIST_NAME,
    MASTER_LIST_ID,
    ITEM_CODE,
    ITEM_ID,
    PRICE_PER_UNIT,
    DELETE_COLUMN,
];

/// The items on each master list. Matched by `id`, else by its master list and item together, a
/// pair that never changes. The placeholder master list's lines are neither exported nor imported.
pub(super) struct MasterListLineTable;

impl ImportTable for MasterListLineTable {
    fn table(&self) -> CentralDataTable {
        CentralDataTable::MasterListLine
    }

    fn columns(&self) -> &'static [&'static str] {
        COLUMNS
    }

    fn text_columns(&self) -> &'static [&'static str] {
        &[
            ID,
            MASTER_LIST_NAME,
            MASTER_LIST_ID,
            ITEM_CODE,
            ITEM_ID,
            DELETE_COLUMN,
            ITEM_NAME,
        ]
    }

    fn export_only_columns(&self) -> &'static [&'static str] {
        &[ITEM_NAME]
    }

    fn export(
        &self,
        connection: &StorageConnection,
        filter: &ExportFilter,
    ) -> Result<Vec<Vec<Value>>, RepositoryError> {
        // Read whole, not paged: the export has already checked the row cap.
        let lines = MasterListLineRepository::new(connection)
            .query_with_item_code_and_name(line_filter(filter))?;
        // Few, so read whole.
        let master_lists = read_master_lists(connection)?;
        let rows = lines
            .into_iter()
            .map(|(line, item_code, item_name)| {
                let master_list = master_lists.get(&line.master_list_id);
                let mut cells = cells(&line, master_list, Some(&item_code));
                cells.push(item_name.into());
                // Names in any letter case, so `antenatal` comes before `Clinic`.
                let order = (
                    master_list
                        .map(|master_list| master_list.name.to_lowercase())
                        .unwrap_or_default(),
                    item_code,
                    line.id,
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
        let repo = MasterListLineRepository::new(connection);
        Ok(RecordCount {
            matching: i64_to_u32(repo.count(Some(line_filter(filter)))?),
            total: i64_to_u32(repo.count(Some(exportable()))?),
        })
    }

    fn start_sheet(
        &self,
        connection: &StorageConnection,
        _start: SheetStart,
    ) -> Result<Box<dyn SheetImport>, RepositoryError> {
        // Runs after the item and master list sheets, so their new records are found.
        Ok(Box::new(MasterListLineSheet {
            master_lists: read_master_lists(connection)?,
        }))
    }
}

/// Items are looked up a row at a time, by their indexed code, as a central server can have tens of
/// thousands.
struct MasterListLineSheet {
    /// Read once: far fewer than lines, and unchanged while this sheet runs.
    master_lists: InMemory<MasterListRow>,
}

impl SheetImport for MasterListLineSheet {
    fn import_row(
        &mut self,
        connection: &StorageConnection,
        row: &Row,
    ) -> Result<RowOutcome, RowFailure> {
        let mut errors = Vec::new();
        let delete = collect(&mut errors, is_delete(row));
        let price_per_unit = collect(&mut errors, row.number(PRICE_PER_UNIT));
        // For a `DELETE` row too, so a missing reference stops the import. The item is kept, for
        // naming the record, so it isn't read again.
        let master_list_id = find_master_list(&self.master_lists, row)?;
        let item = find_reference_record(
            &ItemRowRepository::new(connection),
            row,
            ITEM_CODE,
            ITEM_ID,
            |items| items,
        )?;
        let master_list_id = collect(&mut errors, master_list_id).flatten();
        let item = collect(&mut errors, item).flatten();
        let item_id = item.as_ref().map(|item| item.id.clone());
        // Then a missing reference is that error, not "required".
        if !errors.is_empty() {
            return Err(RowFailure::Invalid(errors));
        }

        let id = row.text(ID);
        let existing = self.find_line(
            connection,
            row,
            id.as_deref(),
            master_list_id.as_deref(),
            item_id.as_deref(),
        )??;
        let saved = existing.as_ref();
        check_not_placeholder(
            row,
            saved.map(|line| line.master_list_id.as_str()),
            master_list_id.as_deref(),
            PROTECTED,
        )?;
        // A row never changes its item, as `find_line` makes that a conflict. Read only when the
        // row leaves its item blank, as a row with only an id does.
        let item_id = item_id.or(saved.map(|line| line.item_id.clone()));
        let item = match (item, &item_id) {
            (Some(item), _) => Some(item),
            (None, Some(item_id)) => ItemRowRepository::new(connection).find_by_id(item_id)?,
            (None, None) => None,
        };
        if delete {
            // Named by the row's master list and item, as found.
            let missing = match (&master_list_id, &item_id) {
                (Some(master_list_id), Some(item_id)) => {
                    self.record(master_list_id, item_id, item.as_ref())
                }
                _ => id.clone().unwrap_or_default(),
            };
            return self.delete(connection, row, existing, item.as_ref(), missing);
        }

        let master_list_id = master_list_id.or(saved.map(|line| line.master_list_id.clone()));
        row.require_for_new(
            &mut errors,
            "master list line",
            &[
                (MASTER_LIST_NAME, master_list_id.is_none()),
                (ITEM_CODE, item_id.is_none()),
            ],
        );
        if !errors.is_empty() {
            return Err(RowFailure::Invalid(errors));
        }

        let new = MasterListLineRow {
            id: saved
                .map(|line| line.id.clone())
                .or(id)
                .unwrap_or_else(uuid),
            master_list_id: master_list_id.unwrap_or_default(),
            price_per_unit: row.optional(
                PRICE_PER_UNIT,
                price_per_unit.map(Some),
                saved.map(|line| line.price_per_unit),
            ),
            item_id: item_id.unwrap_or_default(),
        };
        let change = Change::between_upserts(saved, &new);
        if change != Change::Unchanged {
            upsert_master_list_line(connection, &new)
                .map_err(|error| self.upsert_failure(row, &new, item.as_ref(), error))?;
        }
        let master_list = self.master_lists.get(&new.master_list_id);
        let item_code = item.as_ref().map(|item| item.code.as_str());
        Ok(RowOutcome {
            fields: existing
                .map(|saved| {
                    field_changes(
                        COLUMNS,
                        cells(&saved, master_list, item_code),
                        cells(&new, master_list, item_code),
                    )
                })
                .unwrap_or_default(),
            record: self.record(&new.master_list_id, &new.item_id, item.as_ref()),
            record_id: new.id,
            change,
        })
    }
}

impl MasterListLineSheet {
    /// `Paracetamol (PARA) on Essential medicines`. `item` is the one with `item_id`, if found.
    fn record(&self, master_list_id: &str, item_id: &str, item: Option<&ItemRow>) -> String {
        let item = item.map_or_else(
            || item_id.to_string(),
            |item| name_with_code(&item.name, &item.code),
        );
        format!("{item} on {}", self.master_lists.key_or_id(master_list_id))
    }

    /// The saved line a row changes: by id, else by its master list and item together.
    /// `Ok(None)` for a row that adds one.
    fn find_line(
        &self,
        connection: &StorageConnection,
        row: &Row,
        id: Option<&str>,
        master_list_id: Option<&str>,
        item_id: Option<&str>,
    ) -> Result<Result<Option<MasterListLineRow>, RowError>, RepositoryError> {
        let by_key = || match (master_list_id, item_id) {
            (Some(master_list_id), Some(item_id)) => {
                find_master_list_lines(connection, master_list_id, item_id)
            }
            _ => Ok(Vec::new()),
        };
        find_by_id_or_composite_key(
            row,
            id,
            by_key,
            |line| &line.id,
            |id| MasterListLineRowRepository::new(connection).find_one_by_id(id),
            |saved, found, id| {
                let parts = [
                    master_list_part(&self.master_lists, master_list_id, &saved.master_list_id),
                    KeyPart {
                        changed: differs(item_id, &saved.item_id),
                        code_column: ITEM_CODE,
                        id_column: ITEM_ID,
                        saved_id: &saved.item_id,
                        saved_code: SavedCode::Read(|item: &Option<ItemRow>| {
                            item.as_ref().map(|item| item.code.as_str())
                        }),
                    },
                ];
                // The saved line's item, read only to describe a conflict.
                key_conflict(row, found, &saved.id, id, &parts, || {
                    let item = ItemRowRepository::new(connection).find_by_id(&saved.item_id)?;
                    let record = self.record(&saved.master_list_id, &saved.item_id, item.as_ref());
                    Ok((record, item))
                })
            },
        )
    }

    fn delete(
        &self,
        connection: &StorageConnection,
        row: &Row,
        existing: Option<MasterListLineRow>,
        item: Option<&ItemRow>,
        missing: String,
    ) -> Result<RowOutcome, RowFailure> {
        let Some(saved) = existing else {
            return already_deleted_as(row, missing, Vec::new());
        };
        check_delete(
            row,
            COLUMNS,
            &[],
            cells(
                &saved,
                self.master_lists.get(&saved.master_list_id),
                item.map(|item| item.code.as_str()),
            ),
            Vec::new(),
        )?;
        delete_master_list_line(connection, &saved.id)?;
        Ok(RowOutcome {
            record: self.record(&saved.master_list_id, &saved.item_id, item),
            record_id: saved.id,
            change: Change::Deleted,
            fields: Vec::new(),
        })
    }

    fn upsert_failure(
        &self,
        row: &Row,
        line: &MasterListLineRow,
        item: Option<&ItemRow>,
        error: UpsertMasterListLineError,
    ) -> RowFailure {
        match error {
            // Not reached here: `find_master_list` and `find_reference_record` find them among the
            // saved records.
            UpsertMasterListLineError::MasterListNotFound => not_found_error(row).into(),
            UpsertMasterListLineError::ItemNotFound => row
                .error(row.reference_column(ITEM_CODE, ITEM_ID), NOT_FOUND)
                .into(),
            UpsertMasterListLineError::NegativePrice => row
                .error(PRICE_PER_UNIT, "price_per_unit can't be negative")
                .into(),
            // Unreachable here: `import_row` refuses it first.
            UpsertMasterListLineError::Protected => protected_error(row, PROTECTED).into(),
            // Unreachable here: `find_line` turns a saved master list and item into a match or a
            // conflict.
            UpsertMasterListLineError::DuplicateLine { other_id } => row
                .error(
                    row.reference_column(ITEM_CODE, ITEM_ID),
                    format!(
                        "{} is already on {}, through {other_id}",
                        key_or(item, &line.item_id),
                        self.master_lists.key_or_id(&line.master_list_id)
                    ),
                )
                .into(),
            UpsertMasterListLineError::DatabaseError(error) => RowFailure::Database(error),
        }
    }
}

/// Not the placeholder master list's.
fn exportable() -> MasterListLineFilter {
    MasterListLineFilter {
        master_list_id: not_placeholder(),
        ..Default::default()
    }
}

/// Lines can be many, so they're filtered and counted in SQL.
fn line_filter(filter: &ExportFilter) -> MasterListLineFilter {
    let mut line_filter = exportable();
    if let Some(text) = filter.contains.as_deref().map(str::trim)
        && !text.is_empty()
    {
        line_filter.master_list_name_or_item_code = Some(StringFilter::like(text));
    }
    line_filter
}

/// One per column. The export adds `item_name`.
fn cells(
    line: &MasterListLineRow,
    master_list: Option<&MasterListRow>,
    item_code: Option<&str>,
) -> Vec<Value> {
    vec![
        line.id.clone().into(),
        master_list
            .map(|master_list| master_list.name.clone())
            .into(),
        line.master_list_id.clone().into(),
        item_code.map(str::to_string).into(),
        line.item_id.clone().into(),
        line.price_per_unit.map_or(Value::Empty, Value::Number),
        Value::Empty,
    ]
}
