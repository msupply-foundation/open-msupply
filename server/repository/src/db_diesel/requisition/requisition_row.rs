use std::any::Any;

use super::requisition_row::requisition::dsl as requisition_dsl;

use crate::db_diesel::{
    item_link_row::item_link, name_link_row::name_link, period::period_row::period,
    program_requisition::program_row::program, store_row::store, user_row::user_account,
};
use crate::repository_error::RepositoryError;
use crate::StorageConnection;

use crate::{ChangeLogInsertRow, ChangelogRepository, ChangelogTableName, RowActionType};
use crate::{Delete, Upsert};
use chrono::{NaiveDate, NaiveDateTime};
use diesel::dsl::max;
use diesel::prelude::*;
use diesel_derive_enum::DbEnum;
use serde::{Deserialize, Serialize};
use util::Defaults;

table! {
    requisition (id) {
        id -> Text,
        requisition_number -> Bigint,
        name_link_id -> Text,
        store_id -> Text,
        user_id -> Nullable<Text>,
        #[sql_name = "type"] type_ -> crate::db_diesel::requisition::requisition_row::RequisitionTypeMapping,
        #[sql_name = "status"] status -> crate::db_diesel::requisition::requisition_row::RequisitionStatusMapping,
        created_datetime -> Timestamp,
        sent_datetime -> Nullable<Timestamp>,
        finalised_datetime -> Nullable<Timestamp>,
        expected_delivery_date -> Nullable<Date>,
        colour -> Nullable<Text>,
        comment -> Nullable<Text>,
        their_reference -> Nullable<Text>,
        max_months_of_stock -> Double,
        min_months_of_stock -> Double,
        approval_status -> Nullable<crate::db_diesel::requisition::requisition_row::ApprovalStatusTypeMapping>,
        linked_requisition_id -> Nullable<Text>,
        program_id -> Nullable<Text>,
        period_id -> Nullable<Text>,
        order_type -> Nullable<Text>,
    }
}

joinable!(requisition -> name_link (name_link_id));
joinable!(requisition -> store (store_id));
joinable!(requisition -> user_account (user_id));
joinable!(requisition -> period (period_id));
joinable!(requisition -> program (program_id));
allow_tables_to_appear_in_same_query!(requisition, name_link);
allow_tables_to_appear_in_same_query!(requisition, item_link);

#[derive(DbEnum, Debug, Clone, PartialEq, Eq)]
#[DbValueStyle = "SCREAMING_SNAKE_CASE"]
pub enum RequisitionType {
    Request,
    Response,
}
#[derive(DbEnum, Debug, Clone, PartialEq, Eq, Serialize, Deserialize)]
#[serde(rename_all = "SCREAMING_SNAKE_CASE")]
#[DbValueStyle = "SCREAMING_SNAKE_CASE"]
pub enum RequisitionStatus {
    Draft,
    New,
    Sent,
    Finalised,
}
#[derive(DbEnum, Debug, Clone, PartialEq, Eq)]
#[cfg_attr(test, derive(strum::EnumIter))]
#[DbValueStyle = "SCREAMING_SNAKE_CASE"]
pub enum ApprovalStatusType {
    None,
    Approved,
    Pending,
    Denied,
    AutoApproved,
    ApprovedByAnother,
    DeniedByAnother,
}

#[derive(Clone, Queryable, Insertable, AsChangeset, Debug, PartialEq)]
#[diesel(treat_none_as_null = true)]
#[diesel(table_name = requisition)]
pub struct RequisitionRow {
    pub id: String,
    pub requisition_number: i64,
    pub name_link_id: String,
    pub store_id: String,
    pub user_id: Option<String>,
    #[diesel(column_name = type_)]
    pub r#type: RequisitionType,
    pub status: RequisitionStatus,
    pub created_datetime: NaiveDateTime,
    pub sent_datetime: Option<NaiveDateTime>,
    pub finalised_datetime: Option<NaiveDateTime>,
    pub expected_delivery_date: Option<NaiveDate>,
    pub colour: Option<String>,
    pub comment: Option<String>,
    pub their_reference: Option<String>,
    pub max_months_of_stock: f64,
    pub min_months_of_stock: f64,
    pub approval_status: Option<ApprovalStatusType>,
    pub linked_requisition_id: Option<String>,
    pub program_id: Option<String>,
    pub period_id: Option<String>,
    pub order_type: Option<String>,
}

impl Default for RequisitionRow {
    fn default() -> Self {
        Self {
            r#type: RequisitionType::Request,
            status: RequisitionStatus::Draft,
            created_datetime: Defaults::naive_date_time(),
            // Defaults
            id: Default::default(),
            user_id: Default::default(),
            requisition_number: Default::default(),
            name_link_id: Default::default(),
            store_id: Default::default(),
            sent_datetime: Default::default(),
            finalised_datetime: Default::default(),
            expected_delivery_date: Default::default(),
            colour: Default::default(),
            comment: Default::default(),
            their_reference: Default::default(),
            max_months_of_stock: Default::default(),
            min_months_of_stock: Default::default(),
            approval_status: Default::default(),
            linked_requisition_id: Default::default(),
            program_id: None,
            period_id: None,
            order_type: None,
        }
    }
}

pub struct RequisitionRowRepository<'a> {
    connection: &'a StorageConnection,
}

impl<'a> RequisitionRowRepository<'a> {
    pub fn new(connection: &'a StorageConnection) -> Self {
        RequisitionRowRepository { connection }
    }

    pub fn upsert_one(&self, row: &RequisitionRow) -> Result<i64, RepositoryError> {
        diesel::insert_into(requisition_dsl::requisition)
            .values(row)
            .on_conflict(requisition_dsl::id)
            .do_update()
            .set(row)
            .execute(self.connection.lock().connection())?;
        self.insert_changelog(row, RowActionType::Upsert)
    }

    fn insert_changelog(
        &self,
        row: &RequisitionRow,
        action: RowActionType,
    ) -> Result<i64, RepositoryError> {
        let row = ChangeLogInsertRow {
            table_name: ChangelogTableName::Requisition,
            record_id: row.id.clone(),
            row_action: action,
            store_id: Some(row.store_id.clone()),
            name_link_id: Some(row.name_link_id.clone()),
        };

        ChangelogRepository::new(self.connection).insert(&row)
    }

    pub fn delete(&self, requisition_id: &str) -> Result<Option<i64>, RepositoryError> {
        let requisition = self.find_one_by_id(requisition_id)?;
        let requisition = match requisition {
            Some(requisition) => requisition,
            None => return Ok(None),
        };

        let change_log_id = self.insert_changelog(&requisition, RowActionType::Delete)?;

        diesel::delete(requisition_dsl::requisition.filter(requisition_dsl::id.eq(requisition_id)))
            .execute(self.connection.lock().connection())?;

        Ok(Some(change_log_id))
    }

    pub fn find_one_by_id(&self, id: &str) -> Result<Option<RequisitionRow>, RepositoryError> {
        let result = requisition_dsl::requisition
            .filter(requisition_dsl::id.eq(id))
            .first(self.connection.lock().connection())
            .optional()?;
        Ok(result)
    }

    pub fn find_max_requisition_number(
        &self,
        r#type: RequisitionType,
        store_id: &str,
    ) -> Result<Option<i64>, RepositoryError> {
        let result = requisition_dsl::requisition
            .filter(
                requisition_dsl::type_
                    .eq(r#type)
                    .and(requisition_dsl::store_id.eq(store_id)),
            )
            .select(max(requisition_dsl::requisition_number))
            .first(self.connection.lock().connection())?;
        Ok(result)
    }
}

#[derive(Debug, Clone)]
pub struct RequisitionRowDelete(pub String);
impl Delete for RequisitionRowDelete {
    fn delete(&self, con: &StorageConnection) -> Result<Option<i64>, RepositoryError> {
        RequisitionRowRepository::new(con).delete(&self.0)
    }
    // Test only
    fn assert_deleted(&self, con: &StorageConnection) {
        assert_eq!(
            RequisitionRowRepository::new(con).find_one_by_id(&self.0),
            Ok(None)
        )
    }
}

impl Upsert for RequisitionRow {
    fn upsert(&self, con: &StorageConnection) -> Result<Option<i64>, RepositoryError> {
        let change_log_id = RequisitionRowRepository::new(con).upsert_one(self)?;
        Ok(Some(change_log_id))
    }

    // Test only
    fn assert_upserted(&self, con: &StorageConnection) {
        assert_eq!(
            RequisitionRowRepository::new(con).find_one_by_id(&self.id),
            Ok(Some(self.clone()))
        )
    }

    fn as_mut_any(&mut self) -> Option<&mut dyn Any> {
        Some(self)
    }
}

impl ApprovalStatusType {
    pub fn is_approved(&self) -> bool {
        matches!(
            self,
            ApprovalStatusType::ApprovedByAnother
                | ApprovalStatusType::AutoApproved
                | ApprovalStatusType::Approved
        )
    }
}

#[cfg(test)]
mod test {
    use crate::{
        mock::{mock_request_draft_requisition_all_fields, MockDataInserts},
        test_db::setup_all,
        ApprovalStatusType, RequisitionRow, RequisitionRowRepository,
    };
    use strum::IntoEnumIterator;

    #[actix_rt::test]
    async fn approval_status_enum() {
        let (_, connection, _, _) = setup_all(
            "approval_status_enum",
            MockDataInserts::none().names().stores(),
        )
        .await;

        let repo = RequisitionRowRepository::new(&connection);
        // Try upsert all variants of RequisitionRowApprovalStatus, confirm that diesel enums match postgres
        for variant in ApprovalStatusType::iter() {
            let row = RequisitionRow {
                approval_status: Some(variant),
                ..mock_request_draft_requisition_all_fields().requisition
            };
            let result = repo.upsert_one(&row);
            assert!(result.is_ok());

            let result = repo
                .find_one_by_id(&mock_request_draft_requisition_all_fields().requisition.id)
                .unwrap()
                .unwrap();
            assert_eq!(result.approval_status, row.approval_status);
        }

        assert_eq!(ApprovalStatusType::Approved.is_approved(), true);
        assert_eq!(ApprovalStatusType::ApprovedByAnother.is_approved(), true);
        assert_eq!(ApprovalStatusType::AutoApproved.is_approved(), true);
        assert_eq!(ApprovalStatusType::Denied.is_approved(), false);
        assert_eq!(ApprovalStatusType::DeniedByAnother.is_approved(), false);
        assert_eq!(ApprovalStatusType::Pending.is_approved(), false);
        assert_eq!(ApprovalStatusType::None.is_approved(), false);
    }
}
