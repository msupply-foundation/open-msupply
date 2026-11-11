use crate::migrations::*;

/// Estimated consumption for a store that has no consumption history yet, e.g.
/// a new site. The `consumption` view adds each row on top of real consumption,
/// so AMC uses it until the rows fall out of the look-back window.
///
/// An estimate is entered for a calendar month (`type` MONTHLY) and stored as
/// week-long pieces, each dated at its midpoint and holding its share of the
/// month's quantity, so a window that covers part of a month counts about the
/// right part of it. A month is the pieces dated in it.
pub(crate) struct Migrate;

impl MigrationFragment for Migrate {
    fn identifier(&self) -> &'static str {
        "add_consumption_estimate_table"
    }

    fn migrate(&self, connection: &StorageConnection) -> anyhow::Result<()> {
        sql!(
            connection,
            r#"
                CREATE TABLE consumption_estimate (
                    id TEXT NOT NULL PRIMARY KEY,
                    store_id TEXT NOT NULL REFERENCES store(id),
                    item_link_id TEXT NOT NULL REFERENCES item_link(id),
                    type TEXT NOT NULL,
                    date {DATE} NOT NULL,
                    quantity {DOUBLE} NOT NULL
                );
                CREATE INDEX index_consumption_estimate_store_id_date
                    ON consumption_estimate (store_id, date);
                CREATE INDEX index_consumption_estimate_item_link_id
                    ON consumption_estimate (item_link_id);
            "#,
        )?;

        Ok(())
    }
}
