use super::{
    Added, CentralDataTable, Change, ExportFilter, ImportTable, RecordCount, RowFailure,
    RowOutcome, SheetImport, SheetStart,
    cells::{Row, RowError, choice_cell, collect},
    delete::{DELETE_COLUMN, already_deleted, check_delete, is_delete},
    field_changes,
    lookup::{
        Found, InMemory, NOT_FOUND, NamesOfType, active_first, find_by_id_or_composite_key,
        find_reference, reference_conflict,
    },
    name::{TYPES as NAME_TYPES, type_label},
    name_with_code,
    sheet::Value,
    stores_with_names,
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
const NAME_CODE: &str = "name_code";
const NAME_TYPE: &str = "name_type";
const NAME_ID: &str = "name_id";
const NAME_IS_CUSTOMER: &str = "name_is_customer";
const NAME_IS_SUPPLIER: &str = "name_is_supplier";
const STORE_NAME: &str = "store_name";
const NAME_NAME: &str = "name_name";

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
        // One query: the export has already checked the row count against the import cap.
        let mut joins =
            NameStoreJoinRepository::new(connection).query_by_filter(join_filter(filter))?;
        let store_code = |join: &NameStoreJoin| {
            stores
                .get(&join.name_store_join.store_id)
                .map(|(store, _)| store.code.clone())
                .unwrap_or_default()
        };
        joins.sort_by_cached_key(|join| {
            (
                store_code(join),
                join.name.code.clone(),
                type_label(&join.name.r#type),
                join.name_store_join.id.clone(),
            )
        });
        Ok(joins
            .into_iter()
            .map(
                |NameStoreJoin {
                     name_store_join,
                     name,
                 }| {
                    let store = stores.get(&name_store_join.store_id);
                    let mut row = cells(&name_store_join, &name, store.map(|(store, _)| store));
                    row.push(store.map(|(_, name)| name.clone()).into());
                    row.push(name.name.into());
                    row
                },
            )
            .collect())
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

        let names = NameRowRepository::new(connection);
        let found_name = match &name_id {
            Some(name_id) => names.find_one_by_id(name_id)?,
            None => None,
        };
        if let Some(error) = found_name
            .as_ref()
            .and_then(|name| name_error(row, name, name_type.as_ref()))
        {
            errors.push(error);
            return Err(RowFailure::Invalid(errors));
        }

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
        if delete {
            return self.delete(connection, row, existing, found_name, errors);
        }
        // Found by store and name beside a new id: the join a store this import adds got for its
        // own name. The row's takes its place, so a whole export imports into another server.
        let (existing, replaced) = match existing {
            Some(saved) if id.as_deref().is_some_and(|id| id != saved.id) => (None, Some(saved)),
            existing => (existing, None),
        };
        let saved = existing.as_ref();

        let store_id = store_id.or(saved.map(|join| join.store_id.clone()));
        let name_id = name_id.or(saved.map(|join| join.name_id.clone()));
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

        // The same for the saved join: a row never changes its store or name.
        let name = name_with_id(connection, found_name, &new.name_id)?;
        let store = self.stores.get(&new.store_id);
        let change = Change::between_upserts(saved, &new);
        if let Some(replaced) = &replaced {
            delete_name_store_join(connection, &replaced.id)?;
        }
        if change != Change::Unchanged {
            upsert_name_store_join(connection, &new)
                .map_err(|error| upsert_failure(row, &new, name.as_ref(), store, error))?;
        }
        let name = name.unwrap_or_default();
        Ok(RowOutcome {
            fields: existing
                .map(|saved| {
                    field_changes(
                        COLUMNS,
                        cells(&saved, &name, store),
                        cells(&new, &name, store),
                    )
                })
                .unwrap_or_default(),
            record: record(&name, store),
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
        let by_key: Vec<NameStoreJoinRow> = match (store_id, name_id) {
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
        };
        find_by_id_or_composite_key(
            row,
            id,
            by_key,
            |join| &join.id,
            |id| repo.find_one_by_id(id),
            |saved, found, id| {
                Ok(match found {
                    Found::ById if store_id.is_some_and(|store_id| store_id != saved.store_id) => {
                        Some(self.conflict(connection, row, saved, id, true)?)
                    }
                    Found::ById if name_id.is_some_and(|name_id| name_id != saved.name_id) => {
                        Some(self.conflict(connection, row, saved, id, false)?)
                    }
                    Found::ById => None,
                    Found::NewIdBesideKey if self.added_own_name(saved) => None,
                    Found::NewIdBesideKey => {
                        Some(self.conflict(connection, row, saved, id, false)?)
                    }
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

    /// On the store's columns when `on_store`, else the name's, whichever the row fills.
    fn conflict(
        &self,
        connection: &StorageConnection,
        row: &Row,
        saved: &NameStoreJoinRow,
        id: &str,
        on_store: bool,
    ) -> Result<RowError, RepositoryError> {
        let store = self.stores.get(&saved.store_id);
        let name = NameRowRepository::new(connection)
            .find_one_by_id(&saved.name_id)?
            .unwrap_or_default();
        let (code, reference_id) = if on_store {
            (
                (STORE_CODE, store.map_or("", |store| store.code.as_str())),
                (STORE_ID, saved.store_id.as_str()),
            )
        } else {
            (
                (NAME_CODE, name.code.as_str()),
                (NAME_ID, saved.name_id.as_str()),
            )
        };
        Ok(reference_conflict(
            row,
            code,
            reference_id,
            &record(&name, store),
            &saved.id,
            id,
        ))
    }

    fn delete(
        &self,
        connection: &StorageConnection,
        row: &Row,
        existing: Option<NameStoreJoinRow>,
        found_name: Option<NameRow>,
        errors: Vec<RowError>,
    ) -> Result<RowOutcome, RowFailure> {
        let Some(saved) = existing else {
            return already_deleted(row, NAME_CODE, errors);
        };
        let name = name_with_id(connection, found_name, &saved.name_id)?.unwrap_or_default();
        let store = self.stores.get(&saved.store_id);
        check_delete(row, COLUMNS, cells(&saved, &name, store), errors)?;

        delete_name_store_join(connection, &saved.id)?;
        Ok(RowOutcome {
            record: record(&name, store),
            record_id: saved.id,
            change: Change::Deleted,
            fields: Vec::new(),
        })
    }
}

/// As `find_reference`. `name_code` finds the name within `r#type`, or among every type when it's
/// blank. A code alone never finds a patient or a system name, and finds a live name before a
/// deleted one.
fn find_name(
    connection: &StorageConnection,
    row: &Row,
    r#type: Option<NameRowType>,
) -> Result<Result<Option<Option<String>>, RowError>, RepositoryError> {
    let names = NamesOfType {
        repo: NameRowRepository::new(connection),
        r#type,
    };
    find_reference(&names, row, NAME_CODE, NAME_ID, |names| {
        let names = names
            .into_iter()
            .filter(|name| name.r#type != NameRowType::Patient && !name.is_system_name())
            .collect();
        active_first(names, |name| name.deleted_datetime.is_none())
    })
}

/// `found`, the name the row's cells found, when it's the one with `id`, as it is unless the row
/// leaves its name blank; else read.
fn name_with_id(
    connection: &StorageConnection,
    found: Option<NameRow>,
    id: &str,
) -> Result<Option<NameRow>, RepositoryError> {
    match found.filter(|name| name.id == id) {
        Some(name) => Ok(Some(name)),
        None => NameRowRepository::new(connection).find_one_by_id(id),
    }
}

/// A patient or a system name the row found by id, or a name whose type isn't the row's.
fn name_error(row: &Row, name: &NameRow, r#type: Option<&NameRowType>) -> Option<RowError> {
    let column = row.reference_column(NAME_CODE, NAME_ID);
    let label = name_with_code(&name.name, &name.code);
    if name.r#type == NameRowType::Patient {
        return Some(row.error(
            column,
            format!("{label} is a patient. Which stores see a patient isn't imported"),
        ));
    }
    if name.is_system_name() {
        return Some(row.error(
            column,
            format!("{label} is a system name, as the server needs it, so import can't change which stores see it"),
        ));
    }
    match r#type {
        Some(r#type) if *r#type != name.r#type => Some(row.error(
            NAME_TYPE,
            format!(
                "{label} is of type {}, not {}",
                type_label(&name.r#type),
                type_label(r#type)
            ),
        )),
        _ => None,
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
            .error(row.reference_column(STORE_CODE, STORE_ID), NOT_FOUND)
            .into(),
        UpsertNameStoreJoinError::NameNotFound => row.error(name_column, NOT_FOUND).into(),
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
                    store.map_or(join.store_id.as_str(), |store| store.code.as_str())
                ),
            )
            .into(),
        UpsertNameStoreJoinError::DatabaseError(error) => RowFailure::Database(error),
    }
}

/// How the preview and messages name a join.
fn record(name: &NameRow, store: Option<&StoreRow>) -> String {
    format!(
        "{} in store {}",
        name_with_code(&name.name, &name.code),
        store.map_or("", |store| store.code.as_str())
    )
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
fn cells(join: &NameStoreJoinRow, name: &NameRow, store: Option<&StoreRow>) -> Vec<Value> {
    vec![
        join.id.clone().into(),
        store.map(|store| store.code.clone()).into(),
        join.store_id.clone().into(),
        name.code.clone().into(),
        choice_cell(NAME_TYPES, &name.r#type),
        join.name_id.clone().into(),
        join.name_is_customer.into(),
        join.name_is_supplier.into(),
        Value::Empty,
    ]
}
