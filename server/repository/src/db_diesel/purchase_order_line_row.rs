use crate::db_diesel::item_row::item;
use crate::db_diesel::purchase_order_row::purchase_order;
use crate::{db_diesel::item_link_row::item_link, Upsert};

use crate::repository_error::RepositoryError;
use crate::StorageConnection;
use diesel::prelude::*;
use serde::{Deserialize, Serialize};

use crate::{ChangeLogInsertRow, ChangelogRepository, ChangelogTableName, RowActionType};

use chrono::NaiveDate;

table! {
    purchase_order_line (id) {
        id ->  Text,
        purchase_order_id -> Text,
        line_number -> BigInt,
        item_link_id -> Text,
        item_name -> Text,
        requested_pack_size -> Double,
        requested_number_of_units -> Double,
        authorised_number_of_units -> Nullable<Double>,
        received_number_of_units -> Double,
        requested_delivery_date -> Nullable<Date>,
        expected_delivery_date -> Nullable<Date>,
        soh_in_units -> Double,
        supplier_item_code -> Nullable<Text>,
        price_per_pack_before_discount -> Double,
        discount_percentage -> Double,
    }
}

joinable!(purchase_order_line -> item_link (item_link_id));
joinable!(purchase_order_line -> purchase_order (purchase_order_id));
allow_tables_to_appear_in_same_query!(purchase_order_line, item_link);
allow_tables_to_appear_in_same_query!(purchase_order_line, item);
allow_tables_to_appear_in_same_query!(purchase_order_line, purchase_order);

#[derive(
    Clone, Insertable, Queryable, Debug, AsChangeset, Serialize, Deserialize, Default, PartialEq,
)]
#[diesel(treat_none_as_null = true)]
#[diesel(table_name = purchase_order_line)]
pub struct PurchaseOrderLineRow {
    pub id: String,
    pub purchase_order_id: String,
    pub line_number: i64,
    pub item_link_id: String,
    pub item_name: String,
    pub requested_pack_size: f64,
    pub requested_number_of_units: f64,
    pub authorised_number_of_units: Option<f64>,
    pub received_number_of_units: f64,
    pub requested_delivery_date: Option<NaiveDate>,
    pub expected_delivery_date: Option<NaiveDate>,
    pub soh_in_units: f64,
    pub supplier_item_code: Option<String>,
    pub price_per_pack_before_discount: f64,
    pub discount_percentage: f64,
}

pub struct PurchaseOrderLineRowRepository<'a> {
    connection: &'a StorageConnection,
}

impl<'a> PurchaseOrderLineRowRepository<'a> {
    pub fn new(connection: &'a StorageConnection) -> Self {
        PurchaseOrderLineRowRepository { connection }
    }

    pub fn upsert_one(&self, row: &PurchaseOrderLineRow) -> Result<i64, RepositoryError> {
        diesel::insert_into(purchase_order_line::table)
            .values(row)
            .on_conflict(purchase_order_line::id)
            .do_update()
            .set(row)
            .execute(self.connection.lock().connection())?;
        self.insert_changelog(row, RowActionType::Upsert)
    }

    fn insert_changelog(
        &self,
        row: &PurchaseOrderLineRow,
        action: RowActionType,
    ) -> Result<i64, RepositoryError> {
        let row = ChangeLogInsertRow {
            table_name: ChangelogTableName::PurchaseOrderLine,
            record_id: row.id.clone(),
            row_action: action,
            // no information on store - but this can be found on the parent purchase order record
            store_id: None,
            name_link_id: None,
        };

        ChangelogRepository::new(self.connection).insert(&row)
    }

    pub fn delete(&self, purchase_order_line_id: &str) -> Result<Option<i64>, RepositoryError> {
        let purchase_order_line = self.find_one_by_id(purchase_order_line_id)?;
        let change_log_id = match purchase_order_line {
            Some(purchase_order_line) => {
                self.insert_changelog(&purchase_order_line, RowActionType::Delete)?
            }
            None => {
                return Ok(None);
            }
        };

        diesel::delete(
            purchase_order_line::table.filter(purchase_order_line::id.eq(purchase_order_line_id)),
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

    pub fn find_many_by_purchase_order_ids(
        &self,
        purchase_order_ids: &[String],
    ) -> Result<Vec<PurchaseOrderLineRow>, RepositoryError> {
        let result = purchase_order_line::table
            .filter(purchase_order_line::purchase_order_id.eq_any(purchase_order_ids))
            .load::<PurchaseOrderLineRow>(self.connection.lock().connection())?;
        Ok(result)
    }
}

impl Upsert for PurchaseOrderLineRow {
    fn upsert(&self, con: &StorageConnection) -> Result<Option<i64>, RepositoryError> {
        let change_log_id = PurchaseOrderLineRowRepository::new(con).upsert_one(self)?;
        Ok(Some(change_log_id))
    }

    // Test only
    fn assert_upserted(&self, con: &StorageConnection) {
        assert_eq!(
            PurchaseOrderLineRowRepository::new(con).find_one_by_id(&self.id),
            Ok(Some(self.clone()))
        )
    }
}

// purchase order line basic upsert and query operation test:
#[cfg(test)]
mod tests {
    use crate::mock::{mock_store_a, MockDataInserts};
    use crate::{
        db_diesel::purchase_order_line_row::PurchaseOrderLineRowRepository, test_db::setup_all,
        PurchaseOrderLineRow,
    };
    use crate::{PurchaseOrderRow, PurchaseOrderRowRepository, PurchaseOrderStatus};
    use util::inline_init;
    #[actix_rt::test]
    async fn purchase_order_line_upsert_and_query() {
        let (_, connection, _, _) = setup_all("purchase order line", MockDataInserts::all()).await;
        let repo = PurchaseOrderLineRowRepository::new(&connection);

        // add purchase order
        let purchase_order_repo = PurchaseOrderRowRepository::new(&connection);
        let purchase_order_id = "test-po-1";
        let row = inline_init(|p: &mut PurchaseOrderRow| {
            p.id = purchase_order_id.to_string();
            p.status = PurchaseOrderStatus::New;
            p.store_id = mock_store_a().id.clone();
            p.created_datetime = chrono::Utc::now().naive_utc().into();
            p.purchase_order_number = 1;
        });

        let _ = purchase_order_repo.upsert_one(&row);

        let line = inline_init(|l: &mut PurchaseOrderLineRow| {
            l.id = "test-line-1".to_string();
            l.purchase_order_id = purchase_order_id.to_string();
            l.line_number = 1;
            l.item_link_id = "item_a".to_string();
        });

        let _ = repo.upsert_one(&line);

        let result = repo.find_one_by_id(&line.id).unwrap().unwrap();
        assert_eq!(result.id, "test-line-1".to_string());
    }
}
