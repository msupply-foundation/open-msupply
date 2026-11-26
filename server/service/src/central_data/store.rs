use super::{
    Added, CentralDataTable, Change, ExportFilter, ImportTable, RecordCount, RowFailure,
    RowOutcome, SheetImport, SheetStart,
    cells::{Row, RowError, choice_cell, collect, keep_or_saved},
    field_changes,
    lookup::{NamesOfType, active_first, find_record, find_reference},
    name::{TYPES as NAME_TYPES, type_label},
    name_refs::{NAME_CODE, NAME_ID, NAME_NAME, NAME_TYPE},
    name_with_code,
    sheet::Value,
};
use crate::store::{UpsertStoreError, upsert_store};
use chrono::NaiveDate;
use repository::{
    NameRow, NameRowRepository, NameRowType, Pagination, RepositoryError, Sort, StorageConnection,
    Store, StoreMode, StoreRepository, StoreRow, StoreRowRepository, StoreSortField,
};
use std::{cell::RefCell, rc::Rc};
use util::uuid::uuid;

const ID: &str = "id";
const CODE: &str = "code";
const SITE_ID: &str = "site_id";
const STORE_MODE: &str = "store_mode";
const IS_DISABLED: &str = "is_disabled";
const CREATED_DATE: &str = "created_date";

// No `logo`: a base64 image is longer than the 32,767 characters an Excel cell holds, so it
// couldn't round-trip. Import leaves it as saved.
const COLUMNS: &[&str] = &[
    ID,
    CODE,
    SITE_ID,
    STORE_MODE,
    IS_DISABLED,
    NAME_CODE,
    NAME_TYPE,
    NAME_ID,
];

const MODES: &[(&str, StoreMode)] = &[
    ("STORE", StoreMode::Store),
    ("DISPENSARY", StoreMode::Dispensary),
];

/// Matched by `id`, else `code`. A blank cell keeps the value, as every column is required. The
/// store's name is found by `name_code` with `name_type`, or by `name_id`. Disabling a store is
/// its delete.
pub(super) struct StoreTable;

impl ImportTable for StoreTable {
    fn table(&self) -> CentralDataTable {
        CentralDataTable::Store
    }

    fn columns(&self) -> &'static [&'static str] {
        COLUMNS
    }

    fn text_columns(&self) -> &'static [&'static str] {
        &[ID, CODE, NAME_CODE, NAME_ID, CREATED_DATE, NAME_NAME]
    }

    fn export_only_columns(&self) -> &'static [&'static str] {
        &[CREATED_DATE, NAME_NAME]
    }

    fn export(
        &self,
        connection: &StorageConnection,
        filter: &ExportFilter,
    ) -> Result<Vec<Vec<Value>>, RepositoryError> {
        Ok(stores(connection)?
            .into_iter()
            .filter(|store| matches(filter, store))
            .map(
                |Store {
                     store_row,
                     name_row,
                 }| {
                    let mut row = cells(&store_row, Some(&name_row));
                    // Text, so Excel keeps it as written rather than in its own date format.
                    row.push(store_row.created_date.map(|date| date.to_string()).into());
                    row.push(name_row.name.into());
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
        Ok(RecordCount::in_memory(&stores(connection)?, |store| {
            matches(filter, store)
        }))
    }

    fn start_sheet(
        &self,
        _connection: &StorageConnection,
        start: SheetStart,
    ) -> Result<Box<dyn SheetImport>, RepositoryError> {
        Ok(Box::new(StoreSheet {
            today: start.today,
            added: start.added,
        }))
    }
}

/// Few enough to filter in memory. Each with its name.
fn stores(connection: &StorageConnection) -> Result<Vec<Store>, RepositoryError> {
    StoreRepository::new(connection).query(
        Pagination::all(),
        None,
        Some(Sort {
            key: StoreSortField::Code,
            desc: Some(false),
        }),
    )
}

fn matches(filter: &ExportFilter, store: &Store) -> bool {
    filter.matches(
        &[&store.name_row.name, &store.store_row.code],
        Some(!store.store_row.is_disabled),
    )
}

struct StoreSheet {
    /// A new store's `created_date`.
    today: NaiveDate,
    added: Rc<RefCell<Added>>,
}

impl SheetImport for StoreSheet {
    fn import_row(
        &mut self,
        connection: &StorageConnection,
        row: &Row,
    ) -> Result<RowOutcome, RowFailure> {
        let mut errors = Vec::new();
        let site_id = collect(&mut errors, row.int(SITE_ID));
        let store_mode = collect(&mut errors, row.choice(STORE_MODE, MODES));
        let is_disabled = collect(&mut errors, row.bool(IS_DISABLED));
        let name_type = row.choice(NAME_TYPE, NAME_TYPES);
        let name_id = find_name(connection, row, name_type.clone().ok().flatten())?;
        // Then a missing name is that error, not "required".
        let name_failed = name_type.is_err() || name_id.is_err();
        collect(&mut errors, name_type);
        let name_id = collect(&mut errors, name_id);
        let id = row.text(ID);
        let code = row.text(CODE);

        // Without its record, the row's other checks would treat it as a new store.
        let existing = match find_record(
            &StoreRowRepository::new(connection),
            row,
            CODE,
            id.as_deref(),
            code.as_deref(),
            |saved| &saved.code,
            std::convert::identity,
        )? {
            Ok(existing) => existing,
            Err(e) => {
                errors.push(e);
                return Err(RowFailure::Invalid(errors));
            }
        };
        let saved = existing.as_ref();

        let code = keep_or_saved(code, saved.map(|store| store.code.as_str()));
        let site_id = site_id.or(saved.map(|store| store.site_id));
        let store_mode = store_mode.or(saved.map(|store| store.store_mode.clone()));
        let is_disabled = is_disabled.or(saved.map(|store| store.is_disabled));
        // Both name cells blank keep the saved name: a store always has one.
        let name_id = name_id
            .flatten()
            .or(saved.map(|store| store.name_id.clone()));
        row.require_for_new(
            &mut errors,
            "store",
            &[
                (CODE, code.is_none()),
                (SITE_ID, site_id.is_none()),
                (STORE_MODE, store_mode.is_none()),
                (IS_DISABLED, is_disabled.is_none()),
                (NAME_CODE, name_id.is_none() && !name_failed),
            ],
        );
        if !errors.is_empty() {
            return Err(RowFailure::Invalid(errors));
        }

        let new = StoreRow {
            id: saved
                .map(|store| store.id.clone())
                .or(id)
                .unwrap_or_else(uuid),
            code: code.unwrap_or_default(),
            site_id: site_id.unwrap_or_default(),
            store_mode: store_mode.unwrap_or_default(),
            // Export-only: set on a new store.
            created_date: match saved {
                Some(saved) => saved.created_date,
                None => Some(self.today),
            },
            is_disabled: is_disabled.unwrap_or_default(),
            name_id: name_id.unwrap_or_default(),
        };

        let names = NameRowRepository::new(connection);
        let new_name = names.find_one_by_id(&new.name_id)?;
        let change = Change::between(saved, &new, |store| !store.is_disabled);
        if change != Change::Unchanged {
            upsert_store(connection, &new)
                .map_err(|error| upsert_failure(row, &new, new_name.as_ref(), error))?;
            if saved.is_none() {
                self.added.borrow_mut().stores.insert(new.id.clone());
            }
        }
        let fields = match saved {
            Some(saved) => {
                let saved_name = if saved.name_id == new.name_id {
                    new_name.clone()
                } else {
                    names.find_one_by_id(&saved.name_id)?
                };
                field_changes(
                    COLUMNS,
                    cells(saved, saved_name.as_ref()),
                    cells(&new, new_name.as_ref()),
                )
            }
            None => Vec::new(),
        };
        Ok(RowOutcome {
            record: name_with_code(
                new_name.as_ref().map_or("", |name| name.name.as_str()),
                &new.code,
            ),
            record_id: new.id,
            change,
            fields,
        })
    }
}

/// As `find_reference`. `name_code` finds the name within `r#type`. When it's blank, `STORE`, or
/// every type beside a `name_id`, which settles the name: an export writes a patient's type blank,
/// and must still find a saved store's name. `upsert_store` checks the type of a name the row
/// changes, whichever column found it.
fn find_name(
    connection: &StorageConnection,
    row: &Row,
    r#type: Option<NameRowType>,
) -> Result<Result<Option<Option<String>>, RowError>, RepositoryError> {
    let names = NamesOfType {
        repo: NameRowRepository::new(connection),
        r#type: r#type.or_else(|| row.text(NAME_ID).is_none().then_some(NameRowType::Store)),
    };
    find_reference(&names, row, NAME_CODE, NAME_ID, |names| {
        active_first(names, |name| name.deleted_datetime.is_none())
    })
}

fn upsert_failure(
    row: &Row,
    store: &StoreRow,
    name: Option<&NameRow>,
    error: UpsertStoreError,
) -> RowFailure {
    let name_column = row.reference_column(NAME_CODE, NAME_ID);
    let name_type = name
        .map(|name| type_label(&name.r#type))
        .unwrap_or_default();
    let name = name.map_or_else(
        || store.name_id.clone(),
        |name| name_with_code(&name.name, &name.code),
    );
    match error {
        UpsertStoreError::CodeRequired => row.error(CODE, "code is required").into(),
        // Unreachable here: `find_record` turns a saved code into a match or a conflict first.
        UpsertStoreError::DuplicateCode { other_code, .. } => row
            .error(CODE, format!("Store {other_code} already has this code"))
            .into(),
        // Not checked here: `find_name` finds it among the saved names.
        UpsertStoreError::NameNotFound => row.not_found(name_column).into(),
        UpsertStoreError::NameNotStore => row
            .error(
                name_column,
                format!("{name} is of type {name_type}. A store's name must be of type STORE"),
            )
            .into(),
        UpsertStoreError::NameDeleted => row
            .error(
                name_column,
                format!("{name} is deleted, so a store can't have it"),
            )
            .into(),
        UpsertStoreError::NameHasStore { other_code, .. } => row
            .error(
                name_column,
                format!(
                    "{name} is already store {other_code}'s name. A name can be only one store's"
                ),
            )
            .into(),
        UpsertStoreError::SiteNotFound => row
            .error(
                SITE_ID,
                format!("Site {} isn't on this server", store.site_id),
            )
            .into(),
        UpsertStoreError::DatabaseError(error) => RowFailure::Database(error),
    }
}

/// One per column, as the export writes them and the preview shows them. The export adds
/// `created_date` and `name_name`.
fn cells(store: &StoreRow, name: Option<&NameRow>) -> Vec<Value> {
    vec![
        store.id.clone().into(),
        store.code.clone().into(),
        store.site_id.into(),
        choice_cell(MODES, &store.store_mode),
        store.is_disabled.into(),
        name.map(|name| name.code.clone()).into(),
        name.map_or(Value::Empty, |name| choice_cell(NAME_TYPES, &name.r#type)),
        store.name_id.clone().into(),
    ]
}
