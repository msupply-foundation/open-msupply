use super::{
    CentralDataTable, Change, ExportFilter, ImportTable, RecordCount, RowFailure, RowOutcome,
    SheetImport, SheetStart,
    cells::{Row, RowError, collect},
    delete::{DELETE_COLUMN, already_deleted_by, check_delete, is_delete},
    field_changes,
    lookup::{
        InMemory, KeyPart, KeyedTable, LocationsOfStore, SavedCode, differs,
        find_by_id_or_composite_key, find_reference, find_reference_record, key_conflict, key_or,
    },
    name_with_code,
    sheet::Value,
    sorted_by, stores_with_names,
};
use crate::{
    i64_to_u32,
    item_store_join::{UpsertItemStoreJoinError, delete_item_store_join, upsert_item_store_join},
};
use repository::{
    ItemRow, ItemRowRepository, ItemStoreJoinFilter, ItemStoreJoinRow, ItemStoreJoinRowRepository,
    ItemStoreJoinRowRepositoryTrait, ItemStoreJoinWithNames, LocationRow, LocationRowRepository,
    RepositoryError, StorageConnection, StoreRow, StoreRowRepository, StringFilter, trim_spaces,
};
use util::uuid::uuid;

const ID: &str = "id";
const ITEM_CODE: &str = "item_code";
const ITEM_ID: &str = "item_id";
const STORE_CODE: &str = "store_code";
const STORE_ID: &str = "store_id";
const PRICE: &str = "default_sell_price_per_pack";
const IGNORE_FOR_ORDERS: &str = "ignore_for_orders";
const MARGIN: &str = "margin";
const LOCATION_CODE: &str = "default_location_code";
const LOCATION_ID: &str = "default_location_id";
const ITEM_NAME: &str = "item_name";
const STORE_NAME: &str = "store_name";
const LOCATION_NAME: &str = "default_location_name";

const COLUMNS: &[&str] = &[
    ID,
    ITEM_CODE,
    ITEM_ID,
    STORE_CODE,
    STORE_ID,
    PRICE,
    IGNORE_FOR_ORDERS,
    MARGIN,
    LOCATION_CODE,
    LOCATION_ID,
    DELETE_COLUMN,
];

/// Each item's properties in a store: its default sell price, margin, default location and
/// whether orders ignore it. Matched by `id`, else by its item and store together, a pair that
/// never changes.
pub(super) struct ItemStoreJoinTable;

impl ImportTable for ItemStoreJoinTable {
    fn table(&self) -> CentralDataTable {
        CentralDataTable::ItemStoreJoin
    }

    fn columns(&self) -> &'static [&'static str] {
        COLUMNS
    }

    fn text_columns(&self) -> &'static [&'static str] {
        &[
            ID,
            ITEM_CODE,
            ITEM_ID,
            STORE_CODE,
            STORE_ID,
            LOCATION_CODE,
            LOCATION_ID,
            DELETE_COLUMN,
            ITEM_NAME,
            STORE_NAME,
            LOCATION_NAME,
        ]
    }

    fn export_only_columns(&self) -> &'static [&'static str] {
        &[ITEM_NAME, STORE_NAME, LOCATION_NAME]
    }

    fn export(
        &self,
        connection: &StorageConnection,
        filter: &ExportFilter,
    ) -> Result<Vec<Vec<Value>>, RepositoryError> {
        // Read whole, not paged: the export has already checked the row cap.
        let joins =
            ItemStoreJoinRowRepository::new(connection).query_with_names(join_filter(filter))?;
        let stores = stores_with_names(connection)?;
        let rows = joins
            .into_iter()
            .map(
                |ItemStoreJoinWithNames {
                     item_store_join: join,
                     item_code,
                     item_name,
                     location_code,
                     location_name,
                 }| {
                    let store = stores.get(&join.store_id);
                    let mut cells = cells(
                        &join,
                        Some(&item_code),
                        store.map(|(store, _)| store),
                        location_code.as_deref(),
                    );
                    cells.push(item_name.into());
                    cells.push(store.map(|(_, name)| name.clone()).into());
                    cells.push(location_name.into());
                    let order = (
                        store
                            .map(|(store, _)| store.code.clone())
                            .unwrap_or_default(),
                        item_code,
                        join.id,
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
        let repo = ItemStoreJoinRowRepository::new(connection);
        Ok(RecordCount {
            matching: i64_to_u32(repo.count(join_filter(filter))?),
            total: i64_to_u32(repo.count(ItemStoreJoinFilter::default())?),
        })
    }

    fn start_sheet(
        &self,
        connection: &StorageConnection,
        _start: SheetStart,
    ) -> Result<Box<dyn SheetImport>, RepositoryError> {
        // Runs after the item and store sheets, so their new records are found.
        Ok(Box::new(ItemStoreJoinSheet {
            stores: InMemory::new(StoreRowRepository::new(connection).all()?),
        }))
    }
}

/// Items and locations are looked up a row at a time, by their indexed code, as a central server
/// can have tens of thousands of items.
struct ItemStoreJoinSheet {
    /// Read once: they're few, and none change while this sheet runs.
    stores: InMemory<StoreRow>,
}

impl SheetImport for ItemStoreJoinSheet {
    fn import_row(
        &mut self,
        connection: &StorageConnection,
        row: &Row,
    ) -> Result<RowOutcome, RowFailure> {
        let mut errors = Vec::new();
        let delete = collect(&mut errors, is_delete(row));
        let price = collect(&mut errors, row.number(PRICE));
        let ignore_for_orders = collect(&mut errors, row.bool(IGNORE_FOR_ORDERS));
        let margin = collect(&mut errors, row.number(MARGIN));
        // For a `DELETE` row too, so a missing reference stops the import. The item is kept, for
        // naming the record, so it isn't read again.
        let item = find_reference_record(
            &ItemRowRepository::new(connection),
            row,
            ITEM_CODE,
            ITEM_ID,
            |items| items,
        )?;
        let store_id = find_reference(&self.stores, row, STORE_CODE, STORE_ID, |stores| stores)?;
        let item = collect(&mut errors, item).flatten();
        let item_id = item.as_ref().map(|item| item.id.clone());
        let store_id = collect(&mut errors, store_id).flatten();
        // Then a missing reference is that error, not "required".
        if !errors.is_empty() {
            return Err(RowFailure::Invalid(errors));
        }

        let id = row.text(ID);
        let existing = self.find_join(
            connection,
            row,
            id.as_deref(),
            item_id.as_deref(),
            store_id.as_deref(),
        )??;
        let saved = existing.as_ref();
        // `find_join` makes another item or store a conflict, so these are the saved join's.
        let item_id = item_id.or(saved.map(|join| join.item_id.clone()));
        let store_id = store_id.or(saved.map(|join| join.store_id.clone()));
        let saved_location = location(
            connection,
            saved.and_then(|join| join.default_location_id.as_deref()),
        )?;
        let row_location = if repeats_location(row, saved_location.as_ref()) {
            // Kept as it is, even one of another store, as legacy mSupply can send it, so an
            // unedited export imports and a `DELETE` row for it runs.
            Some(saved_location.clone())
        } else {
            // Among the store's locations, so it needs the store; a new row without one is an
            // error for its store below. For a `DELETE` row too, so a missing location stops the
            // import.
            match &store_id {
                Some(store_id) => match find_reference_record(
                    &LocationsOfStore {
                        repo: LocationRowRepository::new(connection),
                        store_id,
                    },
                    row,
                    LOCATION_CODE,
                    LOCATION_ID,
                    |locations| locations,
                )? {
                    Ok(location) => location,
                    Err(error) => {
                        return Err(self
                            .location_error(connection, row, store_id, error)?
                            .into());
                    }
                },
                None => None,
            }
        };
        // Read only when the row leaves its item blank, as a row with only an id does.
        let item = match (item, &item_id) {
            (Some(item), _) => Some(item),
            (None, Some(item_id)) => ItemRowRepository::new(connection).find_by_id(item_id)?,
            (None, None) => None,
        };
        if delete {
            let Some(saved) = existing else {
                // Named by the row's item and store, as found.
                return already_deleted_by(
                    row,
                    item_id.as_ref().zip(store_id.as_ref()),
                    |(item_id, store_id)| self.record(item_id, store_id, item.as_ref()),
                );
            };
            return self.delete(
                connection,
                row,
                saved,
                item.as_ref(),
                saved_location.as_ref(),
            );
        }

        let price = price.or(saved.map(|join| join.default_sell_price_per_pack));
        let ignore_for_orders = ignore_for_orders.or(saved.map(|join| join.ignore_for_orders));
        let margin = margin.or(saved.map(|join| join.margin));
        row.require_for_new(
            &mut errors,
            "item in a store",
            &[
                (ITEM_CODE, item_id.is_none()),
                (STORE_CODE, store_id.is_none()),
                (PRICE, price.is_none()),
                (IGNORE_FOR_ORDERS, ignore_for_orders.is_none()),
                (MARGIN, margin.is_none()),
            ],
        );
        if !errors.is_empty() {
            return Err(RowFailure::Invalid(errors));
        }

        let new = ItemStoreJoinRow {
            id: saved
                .map(|join| join.id.clone())
                .or(id)
                .unwrap_or_else(uuid),
            store_id: store_id.unwrap_or_default(),
            default_sell_price_per_pack: price.unwrap_or_default(),
            ignore_for_orders: ignore_for_orders.unwrap_or_default(),
            margin: margin.unwrap_or_default(),
            // Neither column in the sheet keeps the saved one; both blank clear it.
            default_location_id: match &row_location {
                Some(location) => location.as_ref().map(|location| location.id.clone()),
                None => saved.and_then(|join| join.default_location_id.clone()),
            },
            item_id: item_id.unwrap_or_default(),
        };
        let store = self.stores.get(&new.store_id);
        let change = Change::between_upserts(saved, &new);
        if change != Change::Unchanged {
            upsert_item_store_join(connection, &new)
                .map_err(|error| self.upsert_failure(row, &new, item.as_ref(), error))?;
        }
        let item_code = item.as_ref().map(|item| item.code.as_str());
        Ok(RowOutcome {
            fields: match existing {
                Some(saved) => {
                    // The row's, as found, or the saved one it keeps: neither is read again.
                    let new_location = match &row_location {
                        Some(location) => location.as_ref(),
                        None => saved_location.as_ref(),
                    };
                    field_changes(
                        COLUMNS,
                        cells(&saved, item_code, store, code_of(saved_location.as_ref())),
                        cells(&new, item_code, store, code_of(new_location)),
                    )
                }
                None => Vec::new(),
            },
            record: self.record(&new.item_id, &new.store_id, item.as_ref()),
            record_id: new.id,
            change,
        })
    }
}

impl ItemStoreJoinSheet {
    /// `Paracetamol (PARA) in store MS`. `item` is the one with `item_id`, if found.
    fn record(&self, item_id: &str, store_id: &str, item: Option<&ItemRow>) -> String {
        let item = item.map_or_else(
            || item_id.to_string(),
            |item| name_with_code(&item.name, &item.code),
        );
        format!("{item} in store {}", self.stores.key_or_id(store_id))
    }

    /// The saved join a row changes: by id, else by its item and store together. `Ok(None)` for a
    /// row that adds one.
    fn find_join(
        &self,
        connection: &StorageConnection,
        row: &Row,
        id: Option<&str>,
        item_id: Option<&str>,
        store_id: Option<&str>,
    ) -> Result<Result<Option<ItemStoreJoinRow>, RowError>, RepositoryError> {
        let by_key = || match (item_id, store_id) {
            (Some(item_id), Some(store_id)) => ItemStoreJoinRowRepository::new(connection)
                .find_by_item_and_store(item_id, store_id),
            _ => Ok(Vec::new()),
        };
        find_by_id_or_composite_key(
            row,
            id,
            by_key,
            |join| &join.id,
            |id| ItemStoreJoinRowRepository::new(connection).find_one_by_id(id),
            |saved, found, id| {
                let parts = [
                    KeyPart {
                        changed: differs(item_id, &saved.item_id),
                        code_column: ITEM_CODE,
                        id_column: ITEM_ID,
                        saved_id: &saved.item_id,
                        saved_code: SavedCode::Read(|item: &Option<ItemRow>| {
                            item.as_ref().map(|item| item.code.as_str())
                        }),
                    },
                    KeyPart::in_memory(
                        &self.stores,
                        differs(store_id, &saved.store_id),
                        STORE_CODE,
                        STORE_ID,
                        &saved.store_id,
                    ),
                ];
                // The saved join's item, read only to describe a conflict.
                key_conflict(row, found, &saved.id, id, &parts, || {
                    let item = ItemRowRepository::new(connection).find_by_id(&saved.item_id)?;
                    let record = self.record(&saved.item_id, &saved.store_id, item.as_ref());
                    Ok((record, item))
                })
            },
        )
    }

    fn delete(
        &self,
        connection: &StorageConnection,
        row: &Row,
        saved: ItemStoreJoinRow,
        item: Option<&ItemRow>,
        saved_location: Option<&LocationRow>,
    ) -> Result<RowOutcome, RowFailure> {
        check_delete(
            row,
            COLUMNS,
            &[],
            cells(
                &saved,
                item.map(|item| item.code.as_str()),
                self.stores.get(&saved.store_id),
                code_of(saved_location),
            ),
            Vec::new(),
        )?;
        delete_item_store_join(connection, &saved.id)?;
        Ok(RowOutcome {
            record: self.record(&saved.item_id, &saved.store_id, item),
            record_id: saved.id,
            change: Change::Deleted,
            fields: Vec::new(),
        })
    }

    /// A code no location of the store has names the stores whose location has it.
    fn location_error(
        &self,
        connection: &StorageConnection,
        row: &Row,
        store_id: &str,
        error: RowError,
    ) -> Result<RowError, RepositoryError> {
        let Some(code) = row
            .text(LOCATION_CODE)
            .filter(|_| error.column.as_deref() == Some(LOCATION_CODE))
        else {
            return Ok(error);
        };
        let repo = LocationRowRepository::new(connection);
        if !repo
            .find_by_store_and_trimmed_code(store_id, &code)?
            .is_empty()
        {
            return Ok(error);
        }
        let mut stores: Vec<String> = repo
            .find_by_trimmed_code(&code)?
            .into_iter()
            .map(|location| location.store_id)
            .collect();
        stores.dedup();
        if stores.is_empty() {
            return Ok(error);
        }
        Ok(row.error(
            LOCATION_CODE,
            self.in_another_store(&code, &stores, store_id),
        ))
    }

    /// `BACK is a location of store STB, not of store STA`.
    fn in_another_store(&self, code: &str, location_stores: &[String], store_id: &str) -> String {
        let codes: Vec<&str> = location_stores
            .iter()
            .map(|id| self.stores.key_or_id(id))
            .collect();
        let of = if codes.len() == 1 { "store" } else { "stores" };
        format!(
            "{code} is a location of {of} {}, not of store {}",
            codes.join(", "),
            self.stores.key_or_id(store_id)
        )
    }

    fn upsert_failure(
        &self,
        row: &Row,
        join: &ItemStoreJoinRow,
        item: Option<&ItemRow>,
        error: UpsertItemStoreJoinError,
    ) -> RowFailure {
        let location_column = row.reference_column(LOCATION_CODE, LOCATION_ID);
        match error {
            // Not reached here: the row's references are found among the saved records.
            UpsertItemStoreJoinError::ItemNotFound => row
                .not_found(row.reference_column(ITEM_CODE, ITEM_ID))
                .into(),
            UpsertItemStoreJoinError::StoreNotFound => row
                .not_found(row.reference_column(STORE_CODE, STORE_ID))
                .into(),
            UpsertItemStoreJoinError::LocationNotFound => row.not_found(location_column).into(),
            UpsertItemStoreJoinError::LocationInAnotherStore {
                location_code,
                location_store_id,
            } => row
                .error(
                    location_column,
                    self.in_another_store(&location_code, &[location_store_id], &join.store_id),
                )
                .into(),
            UpsertItemStoreJoinError::NegativePrice => row
                .error(PRICE, format!("{PRICE} can't be negative"))
                .into(),
            // Unreachable here: `find_join` turns a saved item and store into a match or a
            // conflict.
            UpsertItemStoreJoinError::DuplicateJoin { other_id } => row
                .error(
                    row.reference_column(ITEM_CODE, ITEM_ID),
                    format!(
                        "{} already has properties in store {}, through {other_id}",
                        key_or(item, &join.item_id),
                        self.stores.key_or_id(&join.store_id)
                    ),
                )
                .into(),
            UpsertItemStoreJoinError::DatabaseError(error) => RowFailure::Database(error),
        }
    }
}

/// The row gives the saved default location's id, and its code or none, as an export writes them.
fn repeats_location(row: &Row, saved: Option<&LocationRow>) -> bool {
    saved.is_some_and(|saved| {
        row.text(LOCATION_ID).as_deref() == Some(saved.id.as_str())
            && row
                .text(LOCATION_CODE)
                .is_none_or(|code| code == trim_spaces(&saved.code))
    })
}

fn code_of(location: Option<&LocationRow>) -> Option<&str> {
    location.map(|location| location.code.as_str())
}

fn location(
    connection: &StorageConnection,
    id: Option<&str>,
) -> Result<Option<LocationRow>, RepositoryError> {
    id.map(|id| LocationRowRepository::new(connection).find_one_by_id(id))
        .transpose()
        .map(Option::flatten)
}

/// Joins can be many, so they're filtered and counted in SQL.
fn join_filter(filter: &ExportFilter) -> ItemStoreJoinFilter {
    let mut join_filter = ItemStoreJoinFilter::default();
    if let Some(text) = filter.contains.as_deref().map(str::trim)
        && !text.is_empty()
    {
        join_filter.item_code_or_store_code = Some(StringFilter::like(text));
    }
    join_filter
}

/// One per column, as the export writes them and the preview shows them. The export adds
/// `item_name`, `store_name` and `default_location_name`.
fn cells(
    join: &ItemStoreJoinRow,
    item_code: Option<&str>,
    store: Option<&StoreRow>,
    location_code: Option<&str>,
) -> Vec<Value> {
    vec![
        join.id.clone().into(),
        item_code.map(str::to_string).into(),
        join.item_id.clone().into(),
        store.map(|store| store.code.clone()).into(),
        join.store_id.clone().into(),
        Value::Number(join.default_sell_price_per_pack),
        join.ignore_for_orders.into(),
        Value::Number(join.margin),
        location_code.map(str::to_string).into(),
        join.default_location_id.clone().into(),
        Value::Empty,
    ]
}
