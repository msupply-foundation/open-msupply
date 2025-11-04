use super::StorageConnection;

use crate::{
    db_diesel::store_row::store, repository_error::RepositoryError, user_account, Delete, Upsert,
};
use crate::{ChangeLogInsertRow, ChangelogRepository, ChangelogTableName, RowActionType};

use chrono::NaiveDateTime;
use diesel::prelude::*;
use diesel_derive_enum::DbEnum;
use serde::{Deserialize, Serialize};

table! {
    activity_log (id) {
        id -> Text,
        #[sql_name = "type"] type_ -> crate::db_diesel::activity_log_row::ActivityLogTypeMapping,
        user_id -> Nullable<Text>,
        store_id -> Nullable<Text>,
        record_id -> Nullable<Text>,
        datetime -> Timestamp,
        changed_to -> Nullable<Text>,
        changed_from -> Nullable<Text>,
    }
}

joinable!(activity_log -> user_account (user_id));
joinable!(activity_log -> store (store_id));

#[derive(DbEnum, Debug, Clone, PartialEq, Eq, Serialize, Deserialize, Default)]
#[cfg_attr(test, derive(strum::EnumIter))]
#[DbValueStyle = "SCREAMING_SNAKE_CASE"]
pub enum ActivityLogType {
    #[default]
    UserLoggedIn,
    InvoiceCreated,
    InvoiceDeleted,
    InvoiceNumberAllocated,
    InvoiceStatusAllocated,
    InvoiceStatusPicked,
    InvoiceStatusShipped,
    InvoiceStatusDelivered,
    InvoiceStatusReceived,
    InvoiceStatusVerified,
    InvoiceStatusCancelled,
    InventoryAdjustment,
    StocktakeCreated,
    StocktakeDeleted,
    StocktakeStatusFinalised,
    RequisitionCreated,
    RequisitionDeleted,
    RequisitionNumberAllocated,
    RequisitionStatusSent,
    RequisitionApproved,
    RequisitionStatusFinalised,
    StockLocationChange,
    StockCostPriceChange,
    StockSellPriceChange,
    StockExpiryDateChange,
    StockBatchChange,
    StockOnHold,
    StockOffHold,
    Repack,
    PrescriptionCreated,
    PrescriptionDeleted,
    PrescriptionStatusPicked,
    PrescriptionStatusVerified,
    PrescriptionStatusCancelled,
    SensorLocationChanged,
    AssetCreated,
    AssetUpdated,
    AssetDeleted,
    AssetLogCreated,
    AssetLogReasonCreated,
    AssetLogReasonDeleted,
    QuantityForLineHasBeenSetToZero,
    AssetCatalogueItemCreated,
    AssetCatalogueItemPropertyCreated,
    AssetPropertyCreated,
    VaccineCourseCreated,
    ProgramCreated,
    ProgramUpdated,
    VaccineCourseUpdated,
    RnrFormCreated,
    RnrFormUpdated,
    RnrFormFinalised,
    RnrFormDeleted,
    VaccinationCreated,
    VaccinationUpdated,
    VaccinationDeleted,
    VVMStatusLogUpdated,
    DemographicIndicatorCreated,
    DemographicIndicatorUpdated,
    DemographicProjectionCreated,
    DemographicProjectionUpdated,
    ItemVariantCreated,
    ItemVariantDeleted,
    ItemVariantUpdatedName,
    // Renamed in 2.10.0 - keeping name in DB/sync for backwards compatibility
    #[serde(rename = "ITEM_VARIANT_UPDATE_COLD_STORAGE_TYPE")]
    ItemVariantUpdateLocationType,
    ItemVariantUpdateManufacturer,
    ItemVariantUpdateDosePerUnit,
    ItemVariantUpdateVVMType,
    VolumePerPackChanged,
    GoodsReceivedCreated,
    GoodsReceivedDeleted,
    GoodsReceivedStatusFinalised,
    // Purchase Orders
    PurchaseOrderCreated,
    PurchaseOrderRequestApproval,
    PurchaseOrderUnauthorised,
    PurchaseOrderSent,
    PurchaseOrderConfirmed,
    PurchaseOrderFinalised,
    PurchaseOrderDeleted,
    PurchaseOrderLineCreated,
    PurchaseOrderLineUpdated,
    PurchaseOrderLineDeleted,
    PurchaseOrderStatusChangedFromSentToConfirmed,
    PurchaseOrderLineStatusClosed,
    PurchaseOrderLineStatusChangedFromSentToNew,
    PatientUpdated,
    PatientCreated,
}

#[derive(Clone, Queryable, Insertable, AsChangeset, Debug, PartialEq, Default)]
#[diesel(treat_none_as_null = true)]
#[diesel(table_name = activity_log)]
pub struct ActivityLogRow {
    pub id: String,
    #[diesel(column_name = type_)]
    pub r#type: ActivityLogType,
    pub user_id: Option<String>,
    pub store_id: Option<String>,
    pub record_id: Option<String>,
    pub datetime: NaiveDateTime,
    pub changed_to: Option<String>,
    pub changed_from: Option<String>,
}

pub struct ActivityLogRowRepository<'a> {
    connection: &'a StorageConnection,
}

impl<'a> ActivityLogRowRepository<'a> {
    pub fn new(connection: &'a StorageConnection) -> Self {
        ActivityLogRowRepository { connection }
    }

    pub fn insert_one(&self, row: &ActivityLogRow) -> Result<i64, RepositoryError> {
        diesel::insert_into(activity_log::table)
            .values(row)
            .execute(self.connection.lock().connection())?;
        self.insert_changelog(row, RowActionType::Upsert)
    }

    fn insert_changelog(
        &self,
        row: &ActivityLogRow,
        action: RowActionType,
    ) -> Result<i64, RepositoryError> {
        let row = ChangeLogInsertRow {
            table_name: ChangelogTableName::ActivityLog,
            record_id: row.id.clone(),
            row_action: action,
            store_id: row.store_id.clone(),
            name_link_id: None,
        };

        ChangelogRepository::new(self.connection).insert(&row)
    }

    pub fn find_one_by_id(&self, log_id: &str) -> Result<Option<ActivityLogRow>, RepositoryError> {
        let result = activity_log::table
            .filter(activity_log::id.eq(log_id))
            .first(self.connection.lock().connection())
            .optional()?;
        Ok(result)
    }

    pub fn find_many_by_record_id(&self, id: &str) -> Result<Vec<ActivityLogRow>, RepositoryError> {
        let result = activity_log::table
            .filter(activity_log::record_id.eq(id))
            .get_results(self.connection.lock().connection())?;
        Ok(result)
    }
}

impl Upsert for ActivityLogRow {
    fn upsert(&self, con: &StorageConnection) -> Result<Option<i64>, RepositoryError> {
        let change_log_id = ActivityLogRowRepository::new(con).insert_one(self)?;
        Ok(Some(change_log_id))
    }

    // Test only
    fn assert_upserted(&self, con: &StorageConnection) {
        assert_eq!(
            ActivityLogRowRepository::new(con).find_one_by_id(&self.id),
            Ok(Some(self.clone()))
        )
    }
}

#[derive(Debug, Clone)]
// Only used in tests
pub struct ActivityLogRowDelete(pub String);
impl Delete for ActivityLogRowDelete {
    fn delete(&self, _: &StorageConnection) -> Result<Option<i64>, RepositoryError> {
        // Not deleting in tests, just want to check asserted_deleted
        Ok(None)
    }
    // Test only
    fn assert_deleted(&self, con: &StorageConnection) {
        assert_eq!(
            ActivityLogRowRepository::new(con).find_one_by_id(&self.0),
            Ok(None)
        )
    }
}
#[cfg(test)]
mod test {
    use super::*;
    use strum::IntoEnumIterator;
    use util::assert_matches;

    use crate::{mock::MockDataInserts, test_db::setup_all};

    #[actix_rt::test]
    async fn activity_log_type_enum() {
        let (_, connection, _, _) =
            setup_all("activity_log_type_enum", MockDataInserts::none()).await;

        let repo = ActivityLogRowRepository::new(&connection);
        // Try upsert all variants, confirm that diesel enums match postgres
        for option_type in ActivityLogType::iter() {
            let id = format!("{:?}", option_type);
            let result = repo.insert_one(&ActivityLogRow {
                id: id.clone(),
                r#type: option_type,
                ..Default::default()
            });
            assert!(
                result.is_ok(),
                "failed to insert activity log for type {:?}",
                id
            );

            assert_matches!(repo.find_one_by_id(&id), Ok(Some(_)));
        }
    }
}
