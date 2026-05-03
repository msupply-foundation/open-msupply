use crate::{
    db_diesel::{
        changelog::{ChangelogTableName, Row, RowOrDelete},
        storage_connection::TransactionError,
    },
    CurrencyRow, CurrencyRowRepository, InvoiceLineRow, InvoiceLineRowRepository, InvoiceRow,
    InvoiceRowRepository, ItemRow, ItemRowRepository, LocationTypeRow, LocationTypeRowRepository,
    NameRow, NameRowRepository, RepositoryError, StockLineRow, StockLineRowRepository,
    StorageConnection, StoreRow, StoreRowRepository, UnitRow, UnitRowRepository,
};

/// Initial chunk size for `batch_upsert`. Each chunk is attempted as one
/// `attempt_batch` call; on failure the chunk is binary-split until small
/// chunks fall back to `attempt_individual`.
const BATCH_UPSERT_SIZE: usize = 500;

/// When a chunk fails and is split, we keep splitting down to this size; below
/// it `attempt_individual` is called and per-item failures are collected.
const MIN_INDIVIDUAL_BATCH_SIZE: usize = 10;

/// Per-record error returned from `batch_upsert`. Identifies the record by
/// (`table_name`, `record_id`) and carries the underlying database error.
#[derive(Debug)]
pub struct BatchUpsertError {
    pub table_name: ChangelogTableName,
    pub record_id: String,
    pub error: RepositoryError,
}

/// Apply a batch of `RowOrDelete` items to the database, isolating failures
/// via a binary-split strategy.
///
/// - Input is split into chunks of `BATCH_UPSERT_SIZE`. Each chunk is
///   passed to `attempt_batch` which groups items by (table, action) and
///   issues one batched upsert/delete per group via the repositories'
///   `upsert_many` / `delete_many` methods.
/// - On failure the chunk is split in half and retried recursively. Once a
///   failing chunk is `<= MIN_INDIVIDUAL_BATCH_SIZE`, `attempt_individual`
///   is called: items are tried one at a time and failures are collected as
///   `BatchUpsertError`.
/// - When running on Postgres inside an outer transaction, each attempt is
///   wrapped in its own (savepoint) inner transaction so a failure does not
///   poison the outer. SQLite (which does not abort on a single statement
///   failure) and Postgres outside any transaction are applied directly.
///
/// **Note:** this function does NOT write changelog rows. Callers that need
/// changelog tracking must do so separately.
///
/// Returns `Err(...)` only for unrecoverable problems; typical row-level
/// failures are surfaced in the inner `Vec<BatchUpsertError>`.
pub fn batch_upsert(
    connection: &StorageConnection,
    items: Vec<RowOrDelete>,
) -> Result<Vec<BatchUpsertError>, RepositoryError> {
    let mut errors = Vec::new();
    for chunk in items.chunks(BATCH_UPSERT_SIZE) {
        try_apply_chunk(connection, chunk, &mut errors);
    }
    Ok(errors)
}

fn try_apply_chunk(
    connection: &StorageConnection,
    chunk: &[RowOrDelete],
    errors: &mut Vec<BatchUpsertError>,
) {
    if chunk.is_empty() {
        return;
    }

    if run(connection, |c| attempt_batch(c, chunk)).is_ok() {
        return;
    }

    if chunk.len() <= MIN_INDIVIDUAL_BATCH_SIZE {
        attempt_individual(connection, chunk, errors);
        return;
    }

    let mid = chunk.len() / 2;
    try_apply_chunk(connection, &chunk[..mid], errors);
    try_apply_chunk(connection, &chunk[mid..], errors);
}

/// Run `f` either inside a fresh (savepoint) inner transaction, or directly
/// against the connection, depending on the backend and whether we're already
/// in an outer transaction.
fn run<F>(connection: &StorageConnection, f: F) -> Result<(), RepositoryError>
where
    F: FnOnce(&StorageConnection) -> Result<(), RepositoryError>,
{
    if needs_inner_tx(connection) {
        connection
            .transaction_sync_etc(f, /* reuse_tx */ false)
            .map_err(TransactionError::to_inner_error)
    } else {
        f(connection)
    }
}

fn needs_inner_tx(connection: &StorageConnection) -> bool {
    if !cfg!(feature = "postgres") {
        return false;
    }
    let mut locked = connection.lock();
    locked
        .transaction_level::<RepositoryError>()
        .unwrap_or(0)
        > 0
}

/// Attempt to apply the whole chunk via batched repository methods grouped
/// by (table, action). Errors short-circuit and propagate up.
fn attempt_batch(
    connection: &StorageConnection,
    chunk: &[RowOrDelete],
) -> Result<(), RepositoryError> {
    let mut groups = TableGroups::default();
    for item in chunk {
        groups.push(item);
    }
    groups.flush(connection)
}

/// Apply each item one-at-a-time, each wrapped in its own attempt (and own
/// inner transaction when needed). Failures are collected per-item.
fn attempt_individual(
    connection: &StorageConnection,
    chunk: &[RowOrDelete],
    errors: &mut Vec<BatchUpsertError>,
) {
    for item in chunk {
        let one = std::slice::from_ref(item);
        if let Err(e) = run(connection, |c| attempt_batch(c, one)) {
            let cl = item.changelog();
            errors.push(BatchUpsertError {
                table_name: cl.table_name.clone(),
                record_id: cl.record_id.clone(),
                error: e,
            });
        }
    }
}

/// Holds per-table buckets of upsert rows / delete ids while iterating a
/// chunk; flushed in one call per (table, action) at the end.
#[derive(Default)]
struct TableGroups {
    units_upsert: Vec<UnitRow>,
    units_delete: Vec<String>,

    currencies_upsert: Vec<CurrencyRow>,
    currencies_delete: Vec<String>,

    names_upsert: Vec<NameRow>,
    names_delete: Vec<String>,

    stores_upsert: Vec<StoreRow>,
    stores_delete: Vec<String>,

    location_types_upsert: Vec<LocationTypeRow>,
    location_types_delete: Vec<String>,

    items_upsert: Vec<ItemRow>,
    items_delete: Vec<String>,

    stock_lines_upsert: Vec<StockLineRow>,
    stock_lines_delete: Vec<String>,

    invoices_upsert: Vec<InvoiceRow>,
    invoices_delete: Vec<String>,

    invoice_lines_upsert: Vec<InvoiceLineRow>,
    invoice_lines_delete: Vec<String>,
}

impl TableGroups {
    fn push(&mut self, item: &RowOrDelete) {
        match item {
            RowOrDelete::Row { row, .. } => match row {
                Row::Unit(r) => self.units_upsert.push(r.clone()),
                Row::Currency(r) => self.currencies_upsert.push(r.clone()),
                Row::Name(r) => self.names_upsert.push(r.clone()),
                Row::Store(r) => self.stores_upsert.push(r.clone()),
                Row::LocationType(r) => self.location_types_upsert.push(r.clone()),
                Row::Item(r) => self.items_upsert.push(r.clone()),
                Row::StockLine(r) => self.stock_lines_upsert.push(r.clone()),
                Row::Invoice(r) => self.invoices_upsert.push(r.clone()),
                Row::InvoiceLine(r) => self.invoice_lines_upsert.push(r.clone()),
            },
            RowOrDelete::Delete { changelog } => {
                let id = changelog.record_id.clone();
                match changelog.table_name {
                    ChangelogTableName::Unit => self.units_delete.push(id),
                    ChangelogTableName::Currency => self.currencies_delete.push(id),
                    ChangelogTableName::Name => self.names_delete.push(id),
                    ChangelogTableName::Store => self.stores_delete.push(id),
                    ChangelogTableName::LocationType => self.location_types_delete.push(id),
                    ChangelogTableName::Item => self.items_delete.push(id),
                    ChangelogTableName::StockLine => self.stock_lines_delete.push(id),
                    ChangelogTableName::Invoice => self.invoices_delete.push(id),
                    ChangelogTableName::InvoiceLine => self.invoice_lines_delete.push(id),
                    ref other => {
                        unimplemented!("batch_upsert does not yet support {:?}", other)
                    }
                }
            }
        }
    }

    fn flush(self, con: &StorageConnection) -> Result<(), RepositoryError> {
        UnitRowRepository::new(con)._upsert_many(&self.units_upsert)?;
        UnitRowRepository::new(con).delete_many(&self.units_delete)?;

        CurrencyRowRepository::new(con)._upsert_many(&self.currencies_upsert)?;
        CurrencyRowRepository::new(con).delete_many(&self.currencies_delete)?;

        NameRowRepository::new(con)._upsert_many(&self.names_upsert)?;
        NameRowRepository::new(con).delete_many(&self.names_delete)?;

        StoreRowRepository::new(con)._upsert_many(&self.stores_upsert)?;
        StoreRowRepository::new(con).delete_many(&self.stores_delete)?;

        LocationTypeRowRepository::new(con)._upsert_many(&self.location_types_upsert)?;
        LocationTypeRowRepository::new(con).delete_many(&self.location_types_delete)?;

        ItemRowRepository::new(con)._upsert_many(&self.items_upsert)?;
        ItemRowRepository::new(con).delete_many(&self.items_delete)?;

        StockLineRowRepository::new(con)._upsert_many(&self.stock_lines_upsert)?;
        StockLineRowRepository::new(con).delete_many(&self.stock_lines_delete)?;

        InvoiceRowRepository::new(con)._upsert_many(&self.invoices_upsert)?;
        InvoiceRowRepository::new(con).delete_many(&self.invoices_delete)?;

        InvoiceLineRowRepository::new(con)._upsert_many(&self.invoice_lines_upsert)?;
        InvoiceLineRowRepository::new(con).delete_many(&self.invoice_lines_delete)?;

        Ok(())
    }
}

#[cfg(test)]
mod test {
    use super::*;
    use crate::{
        db_diesel::changelog::{ChangelogRow, RowActionType},
        mock::MockDataInserts,
        test_db::setup_all,
    };

    fn unit_row_or_delete(id: &str, action: RowActionType) -> RowOrDelete {
        let changelog = ChangelogRow {
            cursor: 0,
            table_name: ChangelogTableName::Unit,
            record_id: id.to_string(),
            row_action: action.clone(),
            ..Default::default()
        };
        match action {
            RowActionType::Upsert => RowOrDelete::Row {
                changelog,
                row: Row::Unit(UnitRow {
                    id: id.to_string(),
                    name: format!("name-{id}"),
                    is_active: true,
                    ..Default::default()
                }),
            },
            RowActionType::Delete => RowOrDelete::Delete { changelog },
        }
    }

    #[actix_rt::test]
    async fn batch_upsert_happy_path() {
        let (_, connection, _, _) =
            setup_all("batch_upsert_happy_path", MockDataInserts::none()).await;

        let items = vec![
            unit_row_or_delete("a", RowActionType::Upsert),
            unit_row_or_delete("b", RowActionType::Upsert),
            unit_row_or_delete("c", RowActionType::Upsert),
        ];

        let errors = batch_upsert(&connection, items).unwrap();
        assert!(errors.is_empty(), "unexpected errors: {:?}", errors);

        let repo = UnitRowRepository::new(&connection);
        assert_eq!(repo.find_one_by_id("a").unwrap().unwrap().name, "name-a");
        assert_eq!(repo.find_one_by_id("b").unwrap().unwrap().name, "name-b");
        assert_eq!(repo.find_one_by_id("c").unwrap().unwrap().name, "name-c");
    }

    #[actix_rt::test]
    async fn batch_upsert_handles_delete() {
        let (_, connection, _, _) =
            setup_all("batch_upsert_handles_delete", MockDataInserts::none()).await;

        // Pre-create the unit so the delete has something to soft-delete.
        UnitRowRepository::new(&connection)
            .upsert_one(&UnitRow {
                id: "a".to_string(),
                name: "name-a".to_string(),
                is_active: true,
                ..Default::default()
            })
            .unwrap();

        let items = vec![unit_row_or_delete("a", RowActionType::Delete)];
        let errors = batch_upsert(&connection, items).unwrap();
        assert!(errors.is_empty(), "unexpected errors: {:?}", errors);

        // UnitRowRepository::delete_many is a soft delete (is_active=false).
        let row = UnitRowRepository::new(&connection)
            .find_one_by_id("a")
            .unwrap()
            .unwrap();
        assert!(!row.is_active);
    }

    #[actix_rt::test]
    async fn batch_upsert_groups_by_table() {
        let (_, connection, _, _) =
            setup_all("batch_upsert_groups_by_table", MockDataInserts::none()).await;

        // Mix Unit + LocationType upserts in the same chunk; the
        // attempt_batch path issues one statement per (table, action).
        let unit_changelog = ChangelogRow {
            cursor: 0,
            table_name: ChangelogTableName::Unit,
            record_id: "u1".to_string(),
            row_action: RowActionType::Upsert,
            ..Default::default()
        };
        let lt_changelog = ChangelogRow {
            cursor: 0,
            table_name: ChangelogTableName::LocationType,
            record_id: "lt1".to_string(),
            row_action: RowActionType::Upsert,
            ..Default::default()
        };

        let items = vec![
            RowOrDelete::Row {
                changelog: unit_changelog,
                row: Row::Unit(UnitRow {
                    id: "u1".to_string(),
                    name: "u1-name".to_string(),
                    is_active: true,
                    ..Default::default()
                }),
            },
            RowOrDelete::Row {
                changelog: lt_changelog,
                row: Row::LocationType(LocationTypeRow {
                    id: "lt1".to_string(),
                    name: "lt1-name".to_string(),
                    min_temperature: 0.0,
                    max_temperature: 10.0,
                }),
            },
        ];

        let errors = batch_upsert(&connection, items).unwrap();
        assert!(errors.is_empty(), "unexpected errors: {:?}", errors);

        assert_eq!(
            UnitRowRepository::new(&connection)
                .find_one_by_id("u1")
                .unwrap()
                .unwrap()
                .name,
            "u1-name",
        );
        assert_eq!(
            LocationTypeRowRepository::new(&connection)
                .find_one_by_id("lt1")
                .unwrap()
                .unwrap()
                .name,
            "lt1-name",
        );
    }
}
