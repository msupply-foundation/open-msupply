use super::requisition_line_row::requisition_line::dsl as requisition_line_dsl;

use crate::db_diesel::{item_link_row::item_link, requisition_row::requisition};
use crate::repository_error::RepositoryError;
use crate::StorageConnection;
use diesel::prelude::*;

use chrono::NaiveDateTime;

table! {
    requisition_line (id) {
        id -> Text,
        requisition_id -> Text,
        item_link_id -> Text,
        requested_quantity -> Integer,
        suggested_quantity -> Integer,
        supply_quantity -> Integer,
        available_stock_on_hand -> Integer ,
        average_monthly_consumption -> Integer,
        snapshot_datetime -> Nullable<Timestamp>,
        approved_quantity -> Integer,
        approval_comment -> Nullable<Text>,
        comment -> Nullable<Text>,
    }
}

table! {
    #[sql_name = "requisition_line"]
    requisition_line_is_sync_update (id) {
        id -> Text,
        is_sync_update -> Bool,
    }
}

joinable!(requisition_line -> item_link (item_link_id));
joinable!(requisition_line -> requisition (requisition_id));
allow_tables_to_appear_in_same_query!(requisition_line, item_link);

#[derive(Clone, Queryable, AsChangeset, Insertable, Debug, PartialEq, Default)]
#[table_name = "requisition_line"]
pub struct RequisitionLineRow {
    pub id: String,
    pub requisition_id: String,
    pub item_link_id: String,
    pub requested_quantity: i32,
    pub suggested_quantity: i32,
    pub supply_quantity: i32,
    pub available_stock_on_hand: i32,
    pub average_monthly_consumption: i32,
    pub snapshot_datetime: Option<NaiveDateTime>,
    pub approved_quantity: i32,
    pub approval_comment: Option<String>,
    pub comment: Option<String>,
}

pub struct RequisitionLineRowRepository<'a> {
    connection: &'a StorageConnection,
}

impl<'a> RequisitionLineRowRepository<'a> {
    pub fn new(connection: &'a StorageConnection) -> Self {
        RequisitionLineRowRepository { connection }
    }

    #[cfg(feature = "postgres")]
    pub fn _upsert_one(&self, row: &RequisitionLineRow) -> Result<(), RepositoryError> {
        diesel::insert_into(requisition_line_dsl::requisition_line)
            .values(row)
            .on_conflict(requisition_line_dsl::id)
            .do_update()
            .set(row)
            .execute(&self.connection.connection)?;
        Ok(())
    }

    #[cfg(not(feature = "postgres"))]
    pub fn _upsert_one(&self, row: &RequisitionLineRow) -> Result<(), RepositoryError> {
        diesel::replace_into(requisition_line_dsl::requisition_line)
            .values(row)
            .execute(&self.connection.connection)?;
        Ok(())
    }

    fn toggle_is_sync_update(&self, id: &str, is_sync_update: bool) -> Result<(), RepositoryError> {
        diesel::update(requisition_line_is_sync_update::table.find(id))
            .set(requisition_line_is_sync_update::dsl::is_sync_update.eq(is_sync_update))
            .execute(&self.connection.connection)?;

        Ok(())
    }

    pub fn upsert_one(&self, row: &RequisitionLineRow) -> Result<(), RepositoryError> {
        self._upsert_one(row)?;
        self.toggle_is_sync_update(&row.id, false)?;
        Ok(())
    }

    pub fn delete(&self, requisition_line_id: &str) -> Result<(), RepositoryError> {
        diesel::delete(
            requisition_line_dsl::requisition_line
                .filter(requisition_line_dsl::id.eq(requisition_line_id)),
        )
        .execute(&self.connection.connection)?;
        Ok(())
    }

    pub fn find_one_by_id(&self, id: &str) -> Result<Option<RequisitionLineRow>, RepositoryError> {
        let result = requisition_line_dsl::requisition_line
            .filter(requisition_line_dsl::id.eq(id))
            .first(&self.connection.connection)
            .optional()?;
        Ok(result)
    }

    pub fn sync_upsert_one(&self, row: &RequisitionLineRow) -> Result<(), RepositoryError> {
        self._upsert_one(row)?;
        self.toggle_is_sync_update(&row.id, true)?;

        Ok(())
    }

    #[cfg(test)]
    fn find_is_sync_update_by_id(&self, id: &str) -> Result<Option<bool>, RepositoryError> {
        let result = requisition_line_is_sync_update::table
            .find(id)
            .select(requisition_line_is_sync_update::dsl::is_sync_update)
            .first(&self.connection.connection)
            .optional()?;
        Ok(result)
    }
}

#[cfg(test)]
mod test {
    use crate::{
        mock::{mock_request_draft_requisition_all_fields, MockData, MockDataInserts},
        test_db::setup_all_with_data,
    };

    use super::*;

    #[actix_rt::test]
    async fn requisition_line_is_sync_update() {
        let (_, connection, _, _) = setup_all_with_data(
            "requisition_line",
            MockDataInserts::none().names().stores().units().items(),
            MockData {
                requisitions: vec![mock_request_draft_requisition_all_fields().requisition],
                ..Default::default()
            },
        )
        .await;

        let repo = RequisitionLineRowRepository::new(&connection);

        let row = mock_request_draft_requisition_all_fields().lines[0].clone();
        let row2 = mock_request_draft_requisition_all_fields().lines[1].clone();
        // First insert
        repo.upsert_one(&row).unwrap();
        repo.upsert_one(&row2).unwrap();

        assert_eq!(repo.find_is_sync_update_by_id(&row.id), Ok(Some(false)));
        assert_eq!(repo.find_is_sync_update_by_id(&row2.id), Ok(Some(false)));

        // Synchronisation upsert
        repo.sync_upsert_one(&row).unwrap();

        assert_eq!(repo.find_is_sync_update_by_id(&row.id), Ok(Some(true)));
        assert_eq!(repo.find_is_sync_update_by_id(&row2.id), Ok(Some(false)));

        // Normal upsert
        repo.upsert_one(&row).unwrap();

        assert_eq!(repo.find_is_sync_update_by_id(&row.id), Ok(Some(false)));
        assert_eq!(repo.find_is_sync_update_by_id(&row2.id), Ok(Some(false)));
    }
}
