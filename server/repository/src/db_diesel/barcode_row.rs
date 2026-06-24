use crate::SourceSiteId;

use super::{
    invoice_line_row::invoice_line, item_link_row::item_link, item_row::item,
    name_link_row::name_link, RepositoryError, StorageConnection,
};
use crate::diesel_macros::define_linked_tables;
use crate::{ChangelogRepository, RowActionType};

use diesel::prelude::*;

define_linked_tables! {
    view: barcode = "barcode_view",
    core: barcode_with_links = "barcode",
    struct: BarcodeRow,
    repo: BarcodeRowRepository,
    shared: {
        gtin -> Text,
        item_id -> Text,
        pack_size -> Nullable<Double>,
        parent_id -> Nullable<Text>,
    },
    links: {},
    optional_links: {
        manufacturer_link_id -> manufacturer_id,
    }
}

use crate::db_diesel::name_row::name;

joinable!(barcode -> item (item_id));
joinable!(barcode -> invoice_line (id));
joinable!(barcode -> name (manufacturer_id));
joinable!(barcode_with_links -> name_link (manufacturer_link_id));
allow_tables_to_appear_in_same_query!(barcode, item_link);

#[derive(Clone, Queryable, Debug, PartialEq, Default, serde::Serialize, serde::Deserialize)]
#[diesel(table_name = barcode)]
pub struct BarcodeRow {
    pub id: String,
    pub gtin: String,
    pub item_id: String,
    pub pack_size: Option<f64>,
    pub parent_id: Option<String>,
    // Resolved from name_link - must be last to match view column order
    pub manufacturer_id: Option<String>,
}
pub struct BarcodeRowRepository<'a> {
    connection: &'a StorageConnection,
}

impl<'a> BarcodeRowRepository<'a> {
    pub fn new(connection: &'a StorageConnection) -> Self {
        BarcodeRowRepository { connection }
    }

    pub fn upsert_one(&self, row: &BarcodeRow) -> Result<(), RepositoryError> {
        self._upsert(row)?;
        let changelog = BarcodeRow::generate_changelog(
            row.id.clone(),
            self.connection,
            RowActionType::Upsert,
            SourceSiteId::CurrentSiteId,
        )?;
        ChangelogRepository::new(self.connection).insert(&changelog)
    }

    pub fn find_one_by_id(&self, id: &str) -> Result<Option<BarcodeRow>, RepositoryError> {
        let result = barcode::table
            .filter(barcode::id.eq(id))
            .first(self.connection.lock().connection())
            .optional()?;
        Ok(result)
    }

    pub fn check_exists_by_id(&self, lookup_id: &str) -> Result<bool, RepositoryError> {
        let exists: bool = diesel::select(diesel::dsl::exists(
            barcode::table.filter(barcode::id.eq(lookup_id)),
        ))
        .get_result(self.connection.lock().connection())?;
        Ok(exists)
    }

    pub fn find_many_by_item_id(&self, item_id: &str) -> Result<Vec<BarcodeRow>, RepositoryError> {
        let result = barcode::table
            .filter(barcode::item_id.eq(item_id))
            .get_results(self.connection.lock().connection())?;
        Ok(result)
    }

    pub fn find_many_by_id(&self, ids: &[String]) -> Result<Vec<BarcodeRow>, RepositoryError> {
        Ok(barcode::table
            .filter(barcode::id.eq_any(ids))
            .load(self.connection.lock().connection())?)
    }
}

#[cfg(test)]
mod batch_upsert_test {
    use super::*;
    use crate::{mock::MockDataInserts, test_db::setup_all};

    fn barcode_row(id: &str, gtin: &str) -> BarcodeRow {
        BarcodeRow {
            id: id.to_string(),
            gtin: gtin.to_string(),
            item_id: "item_a".to_string(),
            pack_size: Some(1.0),
            parent_id: None,
            // Optional link: resolved field `manufacturer_id` is bound into the
            // `manufacturer_link_id` CORE column by the generated `WalkRow`.
            manufacturer_id: None,
        }
    }

    /// Proves the generated raw-SQL `batch_upsert` for a `define_linked_tables!` table
    /// writes the CORE table in one multi-row `INSERT ... ON CONFLICT DO UPDATE` and
    /// round-trips through the resolving view, on SQLite.
    #[actix_rt::test]
    async fn linked_table_generated_batch_upsert_round_trips() {
        let (_, con, _, _) = setup_all(
            "barcode_linked_generated_batch_upsert",
            MockDataInserts::none().items(),
        )
        .await;
        let repo = BarcodeRowRepository::new(&con);

        let row1 = barcode_row("bc_1", "gtin_1");
        let row2 = barcode_row("bc_2", "gtin_2");
        repo.batch_upsert(vec![&row1, &row2]).unwrap();
        assert_eq!(repo.find_one_by_id("bc_1").unwrap(), Some(row1));
        assert_eq!(repo.find_one_by_id("bc_2").unwrap(), Some(row2));

        // Conflict on bc_2 -> UPDATE (gtin flips); bc_3 new -> INSERT.
        let row2_v2 = barcode_row("bc_2", "gtin_updated");
        let row3 = barcode_row("bc_3", "gtin_3");
        repo.batch_upsert(vec![&row2_v2, &row3]).unwrap();
        assert_eq!(repo.find_one_by_id("bc_2").unwrap(), Some(row2_v2));
        assert_eq!(repo.find_one_by_id("bc_3").unwrap(), Some(row3));
    }
}
