use super::{
    Added, CentralDataTable, Change, ExportFilter, ImportTable, RecordCount, RowFailure,
    RowOutcome, SheetImport, SheetStart,
    cells::{Row, RowError, choice_cell, collect},
    delete::{DELETE_COLUMN, already_deleted, check_delete, is_delete},
    field_changes,
    lookup::{
        Found, InMemory, KeyPart, differs, find_by_id_or_composite_key, find_reference,
        key_conflict, key_or,
    },
    name::{TYPES as NAME_TYPES, type_label},
    name_refs::{NAME_CODE, NAME_ID, NAME_NAME, NAME_TYPE, find_name, name_error, name_part},
    name_with_code,
    sheet::Value,
    sorted_by, stores_with_names,
};
use crate::{
    i64_to_u32,
    name_store_join::{UpsertNameStoreJoinError, delete_name_store_join, upsert_name_store_join},
};
use repository::{
    EqualFilter, NameRow, NameRowRepository, NameRowType, NameStoreJoin, NameStoreJoinFilter,
    NameStoreJoinRepository, NameStoreJoinRow, RepositoryError, StorageConnection, StoreRow,
    StoreRowRepository, StringFilter,
};
use std::{cell::RefCell, rc::Rc};
use util::uuid::uuid;

const ID: &str = "id";
const STORE_CODE: &str = "store_code";
const STORE_ID: &str = "store_id";
const NAME_IS_CUSTOMER: &str = "name_is_customer";
const NAME_IS_SUPPLIER: &str = "name_is_supplier";
const STORE_NAME: &str = "store_name";

const COLUMNS: &[&str] = &[
    ID,
    STORE_CODE,
    STORE_ID,
    NAME_CODE,
    NAME_TYPE,
    NAME_ID,
    NAME_IS_CUSTOMER,
    NAME_IS_SUPPLIER,
    DELETE_COLUMN,
];

/// The names each store sees. Matched by `id`, else by its store and name together, a pair that
/// never changes: a row that gives another store or name for a saved id is a conflict, except
/// over the join a store this import adds gets for its own name. Patients' and system names'
/// joins are neither exported nor imported.
pub(super) struct NameStoreJoinTable;

impl ImportTable for NameStoreJoinTable {
    fn table(&self) -> CentralDataTable {
        CentralDataTable::NameStoreJoin
    }

    fn columns(&self) -> &'static [&'static str] {
        COLUMNS
    }

    fn text_columns(&self) -> &'static [&'static str] {
        &[
            ID,
            STORE_CODE,
            STORE_ID,
            NAME_CODE,
            NAME_ID,
            DELETE_COLUMN,
            STORE_NAME,
            NAME_NAME,
        ]
    }

    fn export_only_columns(&self) -> &'static [&'static str] {
        &[STORE_NAME, NAME_NAME]
    }

    fn export(
        &self,
        connection: &StorageConnection,
        filter: &ExportFilter,
    ) -> Result<Vec<Vec<Value>>, RepositoryError> {
        let stores = stores_with_names(connection)?;
        // Read whole, not paged: the export has already checked the row cap.
        let joins =
            NameStoreJoinRepository::new(connection).query_by_filter(join_filter(filter))?;
        let rows = joins
            .into_iter()
            .map(
                |NameStoreJoin {
                     name_store_join,
                     name,
                 }| {
                    let store = stores.get(&name_store_join.store_id);
                    let mut cells =
                        cells(&name_store_join, Some(&name), store.map(|(store, _)| store));
                    cells.push(store.map(|(_, name)| name.clone()).into());
                    cells.push(name.name.into());
                    let order = (
                        store
                            .map(|(store, _)| store.code.clone())
                            .unwrap_or_default(),
                        name.code,
                        type_label(&name.r#type),
                        name_store_join.id,
                    );
                    (order, cells)
                },
            )
            .collect();
        Ok(sorted_by(rows))
    }

    fn count(
        &self,
        connection: &StorageConnection,
        filter: &ExportFilter,
    ) -> Result<RecordCount, RepositoryError> {
        let repo = NameStoreJoinRepository::new(connection);
        Ok(RecordCount {
            matching: i64_to_u32(repo.count(Some(join_filter(filter)))?),
            total: i64_to_u32(repo.count(Some(exportable()))?),
        })
    }

    fn start_sheet(
        &self,
        connection: &StorageConnection,
        start: SheetStart,
    ) -> Result<Box<dyn SheetImport>, RepositoryError> {
        // After the store sheet, so the stores it adds are found.
        Ok(Box::new(NameStoreJoinSheet {
            stores: InMemory::new(StoreRowRepository::new(connection).all()?),
            added: start.added,
        }))
    }
}

struct NameStoreJoinSheet {
    /// Read once: they're few, and none change while this sheet runs.
    stores: InMemory<StoreRow>,
    added: Rc<RefCell<Added>>,
}

impl SheetImport for NameStoreJoinSheet {
    fn import_row(
        &mut self,
        connection: &StorageConnection,
        row: &Row,
    ) -> Result<RowOutcome, RowFailure> {
        let mut errors = Vec::new();
        let delete = collect(&mut errors, is_delete(row));
        let is_customer = collect(&mut errors, row.bool(NAME_IS_CUSTOMER));
        let is_supplier = collect(&mut errors, row.bool(NAME_IS_SUPPLIER));
        // Looked up for a `DELETE` row too, so a missing reference stops the import.
        let store_id = find_reference(&self.stores, row, STORE_CODE, STORE_ID, |stores| stores)?;
        let name_type = row.choice(NAME_TYPE, NAME_TYPES);
        let name_id = find_name(connection, row, name_type.clone().ok().flatten())?;
        // Then a missing store or name is that error, not "required".
        let store_failed = store_id.is_err();
        let name_failed = name_type.is_err() || name_id.is_err();
        let store_id = collect(&mut errors, store_id).flatten();
        let name_type = collect(&mut errors, name_type);
        let name_id = collect(&mut errors, name_id).flatten();

        let id = row.text(ID);
        // Without its record, the row's other checks would treat it as a new join.
        let existing = match self.find_join(
            connection,
            row,
            id.as_deref(),
            store_id.as_deref(),
            name_id.as_deref(),
        )? {
            Ok(existing) => existing,
            Err(e) => {
                errors.push(e);
                return Err(RowFailure::Invalid(errors));
            }
        };
        // The saved join's when the row leaves it blank, so a row with only an id can't change a
        // patient's or a system name's join. Read once: `find_join` makes another name a conflict.
        let name_id = name_id.or(existing.as_ref().map(|join| join.name_id.clone()));
        let name = match &name_id {
            Some(name_id) => NameRowRepository::new(connection).find_one_by_id(name_id)?,
            None => None,
        };
        if let Some(error) = name
            .as_ref()
            .and_then(|name| name_error(row, name, name_type.as_ref(), "which stores see"))
        {
            errors.push(error);
            return Err(RowFailure::Invalid(errors));
        }
        if delete {
            return self.delete(connection, row, existing, name.as_ref(), errors);
        }
        // Found by store and name beside a new id: the join a store this import adds got for its
        // own name. The row's takes its place, so a whole export imports into another server.
        let (existing, replaced) = match existing {
            Some(saved) if id.as_deref().is_some_and(|id| id != saved.id) => (None, Some(saved)),
            existing => (existing, None),
        };
        let saved = existing.as_ref();

        let store_id = store_id.or(saved.map(|join| join.store_id.clone()));
        let is_customer = is_customer.or(saved.map(|join| join.name_is_customer));
        let is_supplier = is_supplier.or(saved.map(|join| join.name_is_supplier));
        row.require_for_new(
            &mut errors,
            "name in a store",
            &[
                (STORE_CODE, store_id.is_none() && !store_failed),
                (NAME_CODE, name_id.is_none() && !name_failed),
                (NAME_IS_CUSTOMER, is_customer.is_none()),
                (NAME_IS_SUPPLIER, is_supplier.is_none()),
            ],
        );
        if !errors.is_empty() {
            return Err(RowFailure::Invalid(errors));
        }

        let new = NameStoreJoinRow {
            id: saved
                .map(|join| join.id.clone())
                .or(id)
                .unwrap_or_else(uuid),
            store_id: store_id.unwrap_or_default(),
            name_id: name_id.unwrap_or_default(),
            name_is_customer: is_customer.unwrap_or_default(),
            name_is_supplier: is_supplier.unwrap_or_default(),
            // No column: only a patient's join is ever hidden.
            visible: saved.is_none_or(|join| join.visible),
        };

        let store = self.stores.get(&new.store_id);
        let change = Change::between_upserts(saved, &new);
        if let Some(replaced) = &replaced {
            delete_name_store_join(connection, &replaced.id)?;
        }
        if change != Change::Unchanged {
            upsert_name_store_join(connection, &new)
                .map_err(|error| upsert_failure(row, &new, name.as_ref(), store, error))?;
        }
        Ok(RowOutcome {
            fields: existing
                .map(|saved| {
                    field_changes(
                        COLUMNS,
                        cells(&saved, name.as_ref(), store),
                        cells(&new, name.as_ref(), store),
                    )
                })
                .unwrap_or_default(),
            record: record(&new, name.as_ref(), store),
            record_id: new.id,
            change,
        })
    }
}

impl NameStoreJoinSheet {
    /// The saved join a row changes: by id, else by its store and name together. `Ok(None)` for a
    /// row that adds one. Beside a new id, only the own-name join of a store this import adds.
    fn find_join(
        &self,
        connection: &StorageConnection,
        row: &Row,
        id: Option<&str>,
        store_id: Option<&str>,
        name_id: Option<&str>,
    ) -> Result<Result<Option<NameStoreJoinRow>, RowError>, RepositoryError> {
        let repo = NameStoreJoinRepository::new(connection);
        let by_key = || -> Result<Vec<NameStoreJoinRow>, RepositoryError> {
            Ok(match (store_id, name_id) {
                (Some(store_id), Some(name_id)) => repo
                    .query_by_filter(
                        NameStoreJoinFilter::new()
                            .store_id(EqualFilter::equal_to(store_id.to_string()))
                            .name_id(EqualFilter::equal_to(name_id.to_string())),
                    )?
                    .into_iter()
                    .map(|join| join.name_store_join)
                    .collect(),
                _ => Vec::new(),
            })
        };
        find_by_id_or_composite_key(
            row,
            id,
            by_key,
            |join| &join.id,
            |id| repo.find_one_by_id(id),
            |saved, found, id| {
                if found == Found::NewIdBesideKey && self.added_own_name(saved) {
                    return Ok(None);
                }
                let store = self.stores.get(&saved.store_id);
                let parts = [
                    KeyPart::in_memory(
                        &self.stores,
                        differs(store_id, &saved.store_id),
                        STORE_CODE,
                        STORE_ID,
                        &saved.store_id,
                    ),
                    name_part(name_id, &saved.name_id),
                ];
                // The saved join's name, read only to describe a conflict.
                key_conflict(row, found, &saved.id, id, &parts, || {
                    let name = NameRowRepository::new(connection).find_one_by_id(&saved.name_id)?;
                    Ok((record(saved, name.as_ref(), store), name))
                })
            },
        )
    }

    /// The join `upsert_store` gave a store this import adds, for the store's own name.
    fn added_own_name(&self, join: &NameStoreJoinRow) -> bool {
        self.added.borrow().stores.contains(&join.store_id)
            && self
                .stores
                .get(&join.store_id)
                .is_some_and(|store| store.name_id == join.name_id)
    }

    fn delete(
        &self,
        connection: &StorageConnection,
        row: &Row,
        existing: Option<NameStoreJoinRow>,
        name: Option<&NameRow>,
        errors: Vec<RowError>,
    ) -> Result<RowOutcome, RowFailure> {
        let Some(saved) = existing else {
            return already_deleted(row, NAME_CODE, errors);
        };
        let store = self.stores.get(&saved.store_id);
        check_delete(
            row,
            COLUMNS,
            &[NAME_TYPE],
            cells(&saved, name, store),
            errors,
        )?;

        delete_name_store_join(connection, &saved.id)?;
        Ok(RowOutcome {
            record: record(&saved, name, store),
            record_id: saved.id,
            change: Change::Deleted,
            fields: Vec::new(),
        })
    }
}

fn upsert_failure(
    row: &Row,
    join: &NameStoreJoinRow,
    name: Option<&NameRow>,
    store: Option<&StoreRow>,
    error: UpsertNameStoreJoinError,
) -> RowFailure {
    let name_column = row.reference_column(NAME_CODE, NAME_ID);
    let name_label = name.map_or_else(
        || join.name_id.clone(),
        |name| name_with_code(&name.name, &name.code),
    );
    match error {
        // Not checked here: `find_reference` finds them among the saved records.
        UpsertNameStoreJoinError::StoreNotFound => row
            .not_found(row.reference_column(STORE_CODE, STORE_ID))
            .into(),
        UpsertNameStoreJoinError::NameNotFound => row.not_found(name_column).into(),
        UpsertNameStoreJoinError::NameDeleted => row
            .error(
                name_column,
                format!("{name_label} is deleted, so a store can't be given it"),
            )
            .into(),
        // Unreachable here: `find_join` turns a saved store and name into a match or a conflict.
        UpsertNameStoreJoinError::DuplicateJoin { other_id } => row
            .error(
                name_column,
                format!(
                    "Store {} already sees {name_label}, through {other_id}",
                    key_or(store, &join.store_id)
                ),
            )
            .into(),
        UpsertNameStoreJoinError::DatabaseError(error) => RowFailure::Database(error),
    }
}

/// How the preview and messages name a join. `name` and `store` are the join's, if found; each
/// falls back to its id.
fn record(join: &NameStoreJoinRow, name: Option<&NameRow>, store: Option<&StoreRow>) -> String {
    let name = name.map_or_else(
        || join.name_id.clone(),
        |name| name_with_code(&name.name, &name.code),
    );
    format!("{name} in store {}", key_or(store, &join.store_id))
}

/// Neither a patient's nor a system name's.
fn exportable() -> NameStoreJoinFilter {
    NameStoreJoinFilter {
        name_type: Some(EqualFilter {
            not_equal_to: Some(NameRowType::Patient),
            ..Default::default()
        }),
        is_system_name: Some(false),
        ..Default::default()
    }
}

/// Joins can be many, so they're filtered and counted in SQL.
fn join_filter(filter: &ExportFilter) -> NameStoreJoinFilter {
    let mut join_filter = exportable();
    if let Some(text) = filter.contains.as_deref().map(str::trim)
        && !text.is_empty()
    {
        join_filter.name_or_store_code = Some(StringFilter::like(text));
    }
    join_filter
}

/// One per column, as the export writes them and the preview shows them. The export adds
/// `store_name` and `name_name`.
fn cells(join: &NameStoreJoinRow, name: Option<&NameRow>, store: Option<&StoreRow>) -> Vec<Value> {
    vec![
        join.id.clone().into(),
        store.map(|store| store.code.clone()).into(),
        join.store_id.clone().into(),
        name.map(|name| name.code.clone()).into(),
        name.map_or(Value::Empty, |name| choice_cell(NAME_TYPES, &name.r#type)),
        join.name_id.clone().into(),
        join.name_is_customer.into(),
        join.name_is_supplier.into(),
        Value::Empty,
    ]
}
