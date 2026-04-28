use crate::{
    db_diesel::{item_link_row::item_link, item_row::item, purchase_order_row::purchase_order},
    diesel_macros::define_linked_tables,
    Delete, PurchaseOrderRowRepository, ChangelogSyncType, Upsert,
};
use crate::{
    ChangeLogInsertRow, ChangelogRepository, ChangelogTableName, KeyValueStoreRepository,
    RepositoryError, RowActionType, StorageConnection,
};
use chrono::NaiveDate;
use diesel::prelude::*;
use diesel_derive_enum::DbEnum;
use serde::{Deserialize, Serialize};

table! {
    purchase_order_line_stats (purchase_order_line_id) {
        purchase_order_line_id -> Text,
        shipped_number_of_units -> Double,
        in_transit_number_of_units -> Double,
        received_number_of_units -> Double,
    }
}

#[derive(Clone, Insertable, Queryable, Debug, PartialEq, Default)]
#[diesel(table_name = purchase_order_line_stats)]
pub struct PurchaseOrderLineStatsRow {
    pub purchase_order_line_id: String,
    pub shipped_number_of_units: f64,
    pub in_transit_number_of_units: f64,
    pub received_number_of_units: f64,
}

define_linked_tables! {
    view: purchase_order_line = "purchase_order_line_view",
    core: purchase_order_line_with_links = "purchase_order_line",
    struct: PurchaseOrderLineRow,
    repo: PurchaseOrderLineRowRepository,
    shared: {
        store_id -> Text,
        purchase_order_id -> Text,
        line_number -> BigInt,
        item_link_id -> Text,
        item_name -> Text,
        requested_pack_size -> Double,
        requested_number_of_units -> Double,
        adjusted_number_of_units -> Nullable<Double>,
        requested_delivery_date -> Nullable<Date>,
        expected_delivery_date -> Nullable<Date>,
        stock_on_hand_in_units -> Double,
        supplier_item_code -> Nullable<Text>,
        price_per_pack_before_discount -> Double,
        price_per_pack_after_discount -> Double,
        comment -> Nullable<Text>,
        note -> Nullable<Text>,
        unit -> Nullable<Text>,
        status -> crate::db_diesel::purchase_order_line_row::PurchaseOrderLineStatusMapping,
    },
    links: {
    },
    optional_links: {
        manufacturer_link_id -> manufacturer_id,
    }
}

joinable!(purchase_order_line -> purchase_order_line_stats (id));
joinable!(purchase_order_line -> item_link (item_link_id));
joinable!(purchase_order_line -> purchase_order (purchase_order_id));
allow_tables_to_appear_in_same_query!(purchase_order_line, purchase_order_line_stats);
allow_tables_to_appear_in_same_query!(purchase_order_line, item_link);
allow_tables_to_appear_in_same_query!(purchase_order_line, item);
allow_tables_to_appear_in_same_query!(purchase_order_line, purchase_order);
allow_tables_to_appear_in_same_query!(purchase_order_line_stats, item_link);
allow_tables_to_appear_in_same_query!(purchase_order_line_stats, item);
allow_tables_to_appear_in_same_query!(purchase_order_line_stats, purchase_order);

#[derive(Clone, Queryable, Debug, Serialize, Deserialize, Default, PartialEq)]
#[diesel(table_name = purchase_order_line)]
pub struct PurchaseOrderLineRow {
    pub id: String,
    pub store_id: String,
    pub purchase_order_id: String,
    pub line_number: i64,
    pub item_link_id: String,
    pub item_name: String,
    pub requested_pack_size: f64,
    pub requested_number_of_units: f64,
    pub adjusted_number_of_units: Option<f64>,
    pub requested_delivery_date: Option<NaiveDate>,
    pub expected_delivery_date: Option<NaiveDate>,
    pub stock_on_hand_in_units: f64,
    pub supplier_item_code: Option<String>,
    pub price_per_pack_before_discount: f64,
    pub price_per_pack_after_discount: f64,
    pub comment: Option<String>,
    pub note: Option<String>,
    pub unit: Option<String>,
    pub status: PurchaseOrderLineStatus,
    // Resolved from name_link - must be last to match view column order
    pub manufacturer_id: Option<String>,
}

#[derive(DbEnum, Debug, Clone, PartialEq, Eq, Serialize, Deserialize, Default)]
#[cfg_attr(test, derive(strum::EnumIter))]
#[serde(rename_all = "SCREAMING_SNAKE_CASE")]
#[DbValueStyle = "SCREAMING_SNAKE_CASE"]
pub enum PurchaseOrderLineStatus {
    #[default]
    New,
    Sent,
    Closed,
}

impl PurchaseOrderLineRow {
    pub fn changelog(
        &self,
        con: &StorageConnection,
        action: RowActionType,
        source_site_id: Option<i32>,
    ) -> Result<ChangeLogInsertRow, RepositoryError> {
        let purchase_order = PurchaseOrderRowRepository::new(con)
            .find_one_by_id(&self.purchase_order_id)?;
        let purchase_order = match purchase_order {
            Some(purchase_order) => purchase_order,
            None => return Err(RepositoryError::NotFound),
        };

        Ok(ChangeLogInsertRow {
            table_name: ChangelogTableName::PurchaseOrderLine,
            record_id: self.id.clone(),
            row_action: action,
            store_id: Some(purchase_order.store_id.clone()),
            name_id: None,
            source_site_id: KeyValueStoreRepository::new(con).get_source_site_id(source_site_id)?,
            ..Default::default()
        })
    }
}

pub struct PurchaseOrderLineRowRepository<'a> {
    connection: &'a StorageConnection,
}

impl<'a> PurchaseOrderLineRowRepository<'a> {
    pub fn new(connection: &'a StorageConnection) -> Self {
        PurchaseOrderLineRowRepository { connection }
    }

    pub fn upsert_one(&self, row: &PurchaseOrderLineRow) -> Result<i64, RepositoryError> {
        self._upsert(row)?;
        let changelog = row.changelog(self.connection, RowActionType::Upsert, None)?;
        let _ = ChangelogRepository::new(self.connection).insert(&changelog);

        let purchase_order = PurchaseOrderRowRepository::new(self.connection)
            .find_one_by_id(&row.purchase_order_id)?;
        let purchase_order = match purchase_order {
            Some(po) => po,
            None => return Err(RepositoryError::NotFound),
        };
        let po_changelog = purchase_order.changelog(self.connection, RowActionType::Upsert, None)?;
        ChangelogRepository::new(self.connection).insert(&po_changelog)
    }

    pub fn delete(&self, purchase_order_line_id: &str) -> Result<Option<i64>, RepositoryError> {
        let old_row = match self.find_one_by_id(purchase_order_line_id)? {
            Some(row) => row,
            None => return Ok(None),
        };

        let changelog = old_row.changelog(self.connection, RowActionType::Delete, None)?;
        let _ = ChangelogRepository::new(self.connection).insert(&changelog);

        let purchase_order = PurchaseOrderRowRepository::new(self.connection)
            .find_one_by_id(&old_row.purchase_order_id)?;
        let purchase_order = match purchase_order {
            Some(po) => po,
            None => return Err(RepositoryError::NotFound),
        };
        let po_changelog = purchase_order.changelog(self.connection, RowActionType::Upsert, None)?;
        let change_log_id = ChangelogRepository::new(self.connection).insert(&po_changelog)?;

        diesel::delete(
            purchase_order_line_with_links::table
                .filter(purchase_order_line_with_links::id.eq(purchase_order_line_id)),
        )
        .execute(self.connection.lock().connection())?;
        Ok(Some(change_log_id))
    }

    pub fn find_one_by_id(
        &self,
        id: &str,
    ) -> Result<Option<PurchaseOrderLineRow>, RepositoryError> {
        let result = purchase_order_line::table
            .filter(purchase_order_line::id.eq(id))
            .first(self.connection.lock().connection())
            .optional()?;
        Ok(result)
    }

    pub fn find_one_by_purchase_order_id_and_item_id(
        &self,
        purchase_order_id: &str,
        item_id: &str,
    ) -> Result<Option<PurchaseOrderLineRow>, RepositoryError> {
        let result = purchase_order_line::table
            .filter(purchase_order_line::purchase_order_id.eq(purchase_order_id))
            .filter(purchase_order_line::item_link_id.eq(item_id))
            .first(self.connection.lock().connection())
            .optional()?;
        Ok(result)
    }

    pub fn find_many_by_purchase_order_ids(
        &self,
        purchase_order_ids: &[String],
    ) -> Result<Vec<PurchaseOrderLineRow>, RepositoryError> {
        let result = purchase_order_line::table
            .filter(purchase_order_line::purchase_order_id.eq_any(purchase_order_ids))
            .load::<PurchaseOrderLineRow>(self.connection.lock().connection())?;
        Ok(result)
    }

    pub fn find_max_purchase_order_line_number(
        &self,
        purchase_order_id: &str,
    ) -> Result<Option<i64>, RepositoryError> {
        let result = purchase_order_line::table
            .filter(purchase_order_line::purchase_order_id.eq(purchase_order_id))
            .select(diesel::dsl::max(purchase_order_line::line_number))
            .first(self.connection.lock().connection())?;
        Ok(result)
    }
}

impl Upsert for PurchaseOrderLineRow {
    fn upsert_sync(&self, con: &StorageConnection, sync_type: ChangelogSyncType) -> Result<(), RepositoryError> {
        PurchaseOrderLineRowRepository::new(con)._upsert(self)?;

        let changelog = match sync_type {
            ChangelogSyncType::SyncTypeV5V6 { source_site_id } => {
                let purchase_order = PurchaseOrderRowRepository::new(con)
                    .find_one_by_id(&self.purchase_order_id)?;
                let purchase_order = match purchase_order {
                    Some(purchase_order) => purchase_order,
                    None => return Err(RepositoryError::NotFound),
                };

                let po_changelog = purchase_order.changelog(con, RowActionType::Upsert, source_site_id.clone())?;
                ChangelogRepository::new(con).insert(&po_changelog)?;

                self.changelog(con, RowActionType::Upsert, source_site_id)?
            }
            ChangelogSyncType::SyncTypeV7 { changelog_row } => changelog_row,
        };

        ChangelogRepository::new(con).insert(&changelog)?;
        Ok(())
    }

    // Test only
    fn assert_upserted(&self, con: &StorageConnection) {
        assert_eq!(
            PurchaseOrderLineRowRepository::new(con).find_one_by_id(&self.id),
            Ok(Some(self.clone()))
        )
    }
}

#[derive(Debug, Clone)]
pub struct PurchaseOrderLineDelete(pub String);

impl PurchaseOrderLineDelete {
    /// Fetches the line and its parent PO, inserts a PO upsert changelog,
    /// and returns the line's delete changelog.
    fn delete_changelog_with_po_update(
        &self,
        con: &StorageConnection,
        source_site_id: Option<i32>,
    ) -> Result<ChangeLogInsertRow, RepositoryError> {
        let old_row = PurchaseOrderLineRowRepository::new(con)
            .find_one_by_id(&self.0)?
            .ok_or(RepositoryError::NotFound)?;

        let purchase_order = PurchaseOrderRowRepository::new(con)
            .find_one_by_id(&old_row.purchase_order_id)?
            .ok_or(RepositoryError::NotFound)?;

        let po_changelog = purchase_order.changelog(con, RowActionType::Upsert, source_site_id)?;
        ChangelogRepository::new(con).insert(&po_changelog)?;

        old_row.changelog(con, RowActionType::Delete, source_site_id)
    }
}

impl Delete for PurchaseOrderLineDelete {
    fn delete_sync(
        &self,
        con: &StorageConnection,
        sync_type: ChangelogSyncType,
    ) -> Result<(), RepositoryError> {
        let changelog = match sync_type {
            ChangelogSyncType::SyncTypeV5V6 { source_site_id } => {
                self.delete_changelog_with_po_update(con, source_site_id)?
            }
            ChangelogSyncType::SyncTypeV7 { changelog_row } => changelog_row,
        };

        diesel::delete(
            purchase_order_line_with_links::table
                .filter(purchase_order_line_with_links::id.eq(&self.0)),
        )
        .execute(con.lock().connection())?;
        ChangelogRepository::new(con).insert(&changelog)?;
        Ok(())
    }
    // Test only
    fn assert_deleted(&self, con: &StorageConnection) {
        assert_eq!(
            PurchaseOrderLineRowRepository::new(con).find_one_by_id(&self.0),
            Ok(None)
        )
    }
}

// purchase order line basic upsert and query operation test:
#[cfg(test)]
mod tests {
    use crate::mock::{mock_item_a, mock_name_c, mock_store_a, MockDataInserts};
    use crate::{
        db_diesel::purchase_order_line_row::PurchaseOrderLineRowRepository, test_db::setup_all,
        PurchaseOrderLineRow,
    };
    use crate::{PurchaseOrderRow, PurchaseOrderRowRepository, PurchaseOrderStatus};

    #[actix_rt::test]
    async fn purchase_order_line_upsert_and_query() {
        let (_, connection, _, _) = setup_all(
            "purchase_order_line_upsert_and_query",
            MockDataInserts::all(),
        )
        .await;
        let repo = PurchaseOrderLineRowRepository::new(&connection);

        // add purchase order
        let purchase_order_repo = PurchaseOrderRowRepository::new(&connection);
        let purchase_order_id = "test-po-1";
        let row = PurchaseOrderRow {
            id: purchase_order_id.to_string(),
            supplier_name_id: mock_name_c().id,
            status: PurchaseOrderStatus::New,
            store_id: mock_store_a().id.clone(),
            created_datetime: chrono::Utc::now().naive_utc(),
            purchase_order_number: 1,

            ..Default::default()
        };

        let _ = purchase_order_repo.upsert_one(&row);

        let line = PurchaseOrderLineRow {
            id: "test-line-1".to_string(),
            purchase_order_id: purchase_order_id.to_string(),
            store_id: mock_store_a().id.clone(),
            line_number: 1,
            item_link_id: mock_item_a().id,
            comment: Some("Test comment".to_string()),
            ..Default::default()
        };

        let _ = repo.upsert_one(&line);

        let result = repo.find_one_by_id(&line.id).unwrap().unwrap();
        assert_eq!(result.id, "test-line-1".to_string());
        assert_eq!(result.comment, Some("Test comment".to_string()));
    }
}
