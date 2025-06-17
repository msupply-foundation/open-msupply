use crate::db_diesel::item_link_row::item_link;
use crate::db_diesel::item_row::item;
use crate::db_diesel::purchase_order_row::purchase_order;

use crate::repository_error::RepositoryError;
use crate::StorageConnection;
use diesel::prelude::*;
use serde::{Deserialize, Serialize};
use ts_rs::TS;

use crate::{ChangeLogInsertRow, ChangelogRepository, ChangelogTableName, RowActionType};

use chrono::NaiveDate;

table! {
    purchase_order_line (id) {
        id ->  Text,
        purchase_order_id -> Text,
        line_number -> Integer,
        item_link_id -> Nullable<Text>,
        item_code -> Text,
        item_name -> Nullable<Text>,
        number_of_packs ->  Nullable<Double>,
        pack_size ->  Nullable<Double>,
        requested_quantity ->  Nullable<Double>,
        authorised_quantity ->  Nullable<Double>,
        total_received ->  Nullable<Double>,
        requested_delivery_date ->  Nullable<Date>,
        expected_delivery_date ->  Nullable<Date>,
    }
}

joinable!(purchase_order_line -> item_link (item_link_id));
joinable!(purchase_order_line -> purchase_order (purchase_order_id));
allow_tables_to_appear_in_same_query!(purchase_order_line, item_link);
allow_tables_to_appear_in_same_query!(purchase_order_line, item);
allow_tables_to_appear_in_same_query!(purchase_order_line, purchase_order);

#[derive(
    TS, Clone, Queryable, AsChangeset, Insertable, Debug, PartialEq, Default, Serialize, Deserialize,
)]
#[diesel(treat_none_as_null = true)]
#[diesel(table_name = purchase_order_line)]
pub struct PurchaseOrderLineRow {
    pub id: String,
    pub purchase_order_id: String,
    pub line_number: i32,
    pub item_link_id: Option<String>,
    pub item_code: String,
    pub item_name: Option<String>,
    pub number_of_packs: Option<f64>,
    pub pack_size: Option<f64>,
    pub requested_quantity: Option<f64>,
    pub authorised_quantity: Option<f64>,
    pub total_received: Option<f64>,
    pub requested_delivery_date: Option<NaiveDate>,
    pub expected_delivery_date: Option<NaiveDate>,
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
            p.created_datetime = chrono::Utc::now().naive_utc();
        });

        let result = purchase_order_repo.upsert_one(&row);
        assert!(result.is_ok());

        let line = inline_init(|l: &mut PurchaseOrderLineRow| {
            l.id = "test-line-1".to_string();
            l.purchase_order_id = purchase_order_id.to_string();
            l.line_number = 1;
            l.item_code = "test-item-1".to_string();
        });

        let result = repo.upsert_one(&line);
        assert!(result.is_ok());

        let line = repo.find_one_by_id(&line.id).unwrap().unwrap();
        assert_eq!(line.id, "test-line-1".to_string());
    }
}
