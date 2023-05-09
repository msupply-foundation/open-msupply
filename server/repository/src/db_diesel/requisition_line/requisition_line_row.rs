use super::requisition_line_row::requisition_line::dsl as requisition_line_dsl;

use crate::db_diesel::{item_row::item, requisition_row::requisition};
use crate::repository_error::RepositoryError;
use crate::StorageConnection;
use diesel::prelude::*;

use chrono::NaiveDateTime;

table! {
    requisition_line (id) {
        id -> Text,
        requisition_id -> Text,
        item_id -> Text,
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
    requistion_line_is_sync_update (id) {
        id -> Text,
        is_sync_update -> Bool,
    }
}

joinable!(requisition_line -> item (item_id));
joinable!(requisition_line -> requisition (requisition_id));

#[derive(AsChangeset)]
#[table_name = "requistion_line_is_sync_update"]
#[cfg_attr(test, derive(Debug, PartialEq, Queryable))]
struct RequisitionLineIsSyncUpdate {
    #[allow(dead_code)]
    id: String,
    is_sync_update: bool,
}

#[derive(Clone, Queryable, AsChangeset, Insertable, Debug, PartialEq, Default)]
#[table_name = "requisition_line"]
pub struct RequisitionLineRow {
    pub id: String,
    pub requisition_id: String,
    pub item_id: String,
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
    pub fn upsert_one_etc(&self, row: &RequisitionLineRow) -> Result<(), RepositoryError> {
        diesel::insert_into(requisition_line_dsl::requisition_line)
            .values(row)
            .on_conflict(requisition_line_dsl::id)
            .do_update()
            .set(row)
            .execute(&self.connection.connection)?;
        Ok(())
    }

    #[cfg(not(feature = "postgres"))]
    pub fn upsert_one_etc(&self, row: &RequisitionLineRow) -> Result<(), RepositoryError> {
        diesel::replace_into(requisition_line_dsl::requisition_line)
            .values(row)
            .execute(&self.connection.connection)?;
        Ok(())
    }

    pub fn upsert_one(&self, row: &RequisitionLineRow) -> Result<(), RepositoryError> {
        self.upsert_one_etc(row)?;

        diesel::update(requistion_line_is_sync_update::table)
            .set(row.as_is_sync_update(false))
            .execute(&self.connection.connection)?;

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
        self.upsert_one_etc(row)?;

        diesel::update(requistion_line_is_sync_update::table)
            .set(row.as_is_sync_update(true))
            .execute(&self.connection.connection)?;

        Ok(())
    }

    #[cfg(test)]
    fn sync_find_one_by_id(
        &self,
        id: &str,
    ) -> Result<Option<RequisitionLineIsSyncUpdate>, RepositoryError> {
        let result = requistion_line_is_sync_update::table
            .filter(requistion_line_is_sync_update::dsl::id.eq(id))
            .first(&self.connection.connection)
            .optional()?;
        Ok(result)
    }
}

impl RequisitionLineRow {
    fn as_is_sync_update(&self, is_sync_update: bool) -> RequisitionLineIsSyncUpdate {
        RequisitionLineIsSyncUpdate {
            id: self.id.clone(),
            is_sync_update,
        }
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

        // First insert
        repo.upsert_one(&row).unwrap();

        assert_eq!(
            repo.sync_find_one_by_id(&row.id),
            Ok(Some(RequisitionLineIsSyncUpdate {
                id: row.id.clone(),
                is_sync_update: false
            }))
        );

        // Synchronisation upsert
        repo.sync_upsert_one(&row).unwrap();

        assert_eq!(
            repo.sync_find_one_by_id(&row.id),
            Ok(Some(RequisitionLineIsSyncUpdate {
                id: row.id.clone(),
                is_sync_update: true
            }))
        );

        // Normal upsert
        repo.upsert_one(&row).unwrap();

        assert_eq!(
            repo.sync_find_one_by_id(&row.id),
            Ok(Some(RequisitionLineIsSyncUpdate {
                id: row.id.clone(),
                is_sync_update: false
            }))
        );
    }
}
