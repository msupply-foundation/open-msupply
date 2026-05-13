use super::StorageConnection;

use crate::repository_error::RepositoryError;
use crate::{
    ChangelogRepository, ChangelogSyncType, Delete, RowActionType, SourceSiteId, Upsert,
};
use diesel::prelude::*;

use diesel_derive_enum::DbEnum;
use util::uuid::{deterministic_uuid, Uuid};

table! {
  user_permission (id) {
      id -> Text,
      user_id -> Text,
      store_id -> Nullable<Text>,
      permission -> crate::db_diesel::user_permission_row::PermissionTypeMapping,
      context_id -> Nullable<Text>,
    }
}

#[derive(DbEnum, Debug, Clone, PartialEq, Eq, Hash, Default, serde::Serialize, serde::Deserialize)]
#[cfg_attr(test, derive(strum::EnumIter))]
#[DbValueStyle = "SCREAMING_SNAKE_CASE"]
pub enum PermissionType {
    ServerAdmin,

    /// User has access to the store this permission is associated with.
    /// This acts like a master switch to enable/disable all user's permissions associated with a store.
    #[default]
    StoreAccess,
    // location,
    LocationMutate,
    // sensor,
    SensorMutate,
    SensorQuery,
    TemperatureBreachQuery,
    TemperatureLogQuery,
    // stock line
    StockLineQuery,
    StockLineMutate,
    CreateRepack,
    // stocktake
    StocktakeQuery,
    StocktakeMutate,
    // inventory adjustment
    InventoryAdjustmentMutate,
    // requisition
    RequisitionQuery,
    RequisitionMutate,
    RequisitionSend,
    RequisitionCreateOutboundShipment,
    // r&r form,
    RnrFormQuery,
    RnrFormMutate,
    // outbound shipment
    OutboundShipmentQuery,
    OutboundShipmentMutate,
    // inbound shipment
    InboundShipmentQuery,
    InboundShipmentMutate,
    InboundShipmentVerify,
    // supplier return
    SupplierReturnQuery,
    SupplierReturnMutate,
    // customer return
    CustomerReturnQuery,
    CustomerReturnMutate,
    // prescription
    PrescriptionQuery,
    PrescriptionMutate,
    CancelFinalisedInvoices,
    // purchase orders
    PurchaseOrderQuery,
    PurchaseOrderMutate,
    PurchaseOrderAuthorise,
    // inbound shipment external
    InboundShipmentExternalQuery,
    InboundShipmentExternalMutate,
    InboundShipmentExternalVerify,
    InboundShipmentExternalAuthorise,
    // reporting
    Report,
    // log
    LogQuery,
    // items
    ItemMutate,
    ItemNamesCodesAndUnitsMutate,
    PatientQuery,
    PatientMutate,
    // Document
    DocumentQuery,
    DocumentMutate,
    // Cold chain
    ColdChainApi,
    AssetQuery,
    AssetMutate,
    AssetMutateViaDataMatrix,
    AssetCatalogueItemMutate,
    AssetStatusMutate,
    // Names
    NamePropertiesMutate,
    // Central Server
    EditCentralData,
    ViewAndEditVvmStatus,
    // clinician
    MutateClinician,
}

#[derive(Clone, Queryable, Insertable, Debug, PartialEq, Eq, AsChangeset, Default, serde::Serialize, serde::Deserialize)]
#[diesel(treat_none_as_null = true)]
#[diesel(table_name = user_permission)]
pub struct UserPermissionRow {
    pub id: String,
    pub user_id: String,
    pub store_id: Option<String>,
    pub permission: PermissionType,
    /// An optional resource associated with this permission.
    /// The resource value is only used for certain Permission variants.
    pub context_id: Option<String>,
}

impl UserPermissionRow {
    /// Stable id for a non-context-bound permission keyed by `(user_id, store_id,
    /// permission)`. Context-bound permissions (synced from `om_user_permission`)
    /// keep using the legacy OG id — see the `user_permission` translator.
    pub fn deterministic_id(
        user_id: &str,
        store_id: Option<&str>,
        permission: &PermissionType,
    ) -> String {
        // Project-local namespace; do not change without a migration plan.
        const NAMESPACE: Uuid = Uuid::from_u128(0x5d8e2b1a_4f3c_4a6e_9b7d_0c1e2f3a4b5c);
        let store = store_id.unwrap_or("");
        deterministic_uuid(&NAMESPACE, &format!("{user_id}:{store}:{permission:?}"))
    }
}

pub struct UserPermissionRowRepository<'a> {
    connection: &'a StorageConnection,
}

impl<'a> UserPermissionRowRepository<'a> {
    pub fn new(connection: &'a StorageConnection) -> Self {
        UserPermissionRowRepository { connection }
    }

    fn _upsert_one(&self, row: &UserPermissionRow) -> Result<(), RepositoryError> {
        diesel::insert_into(user_permission::table)
            .values(row)
            .on_conflict(user_permission::id)
            .do_update()
            .set(row)
            .execute(self.connection.lock().connection())?;
        Ok(())
    }

    pub fn upsert_one(&self, row: &UserPermissionRow) -> Result<(), RepositoryError> {
        self._upsert_one(row)?;
        let changelog = UserPermissionRow::generate_changelog(
            row.id.clone(),
            self.connection,
            RowActionType::Upsert,
            SourceSiteId::CurrentSiteId,
        )?;
        ChangelogRepository::new(self.connection).insert(&changelog)
    }

    pub fn find_one_by_id(&self, id: &str) -> Result<Option<UserPermissionRow>, RepositoryError> {
        let result = user_permission::table
            .filter(user_permission::id.eq(id))
            .first(self.connection.lock().connection())
            .optional()?;
        Ok(result)
    }

    pub fn find_many_by_id(
        &self,
        ids: &[String],
    ) -> Result<Vec<UserPermissionRow>, RepositoryError> {
        Ok(user_permission::table
            .filter(user_permission::id.eq_any(ids))
            .load(self.connection.lock().connection())?)
    }

    pub fn delete_by_user_id(&self, user_id: &str) -> Result<(), RepositoryError> {
        diesel::delete(user_permission::table.filter(user_permission::user_id.eq(user_id)))
            .execute(self.connection.lock().connection())?;
        Ok(())
    }

    fn _delete(&self, id: &str) -> Result<(), RepositoryError> {
        diesel::delete(user_permission::table.filter(user_permission::id.eq(id)))
            .execute(self.connection.lock().connection())?;
        Ok(())
    }

    pub fn delete(&self, id: &str) -> Result<(), RepositoryError> {
        self._delete(id)?;
        let changelog = UserPermissionRow::generate_changelog(
            id.to_string(),
            self.connection,
            RowActionType::Delete,
            SourceSiteId::CurrentSiteId,
        )?;
        ChangelogRepository::new(self.connection).insert(&changelog)
    }
}

#[derive(Debug, Clone)]
pub struct UserPermissionRowDelete(pub String);
impl Delete for UserPermissionRowDelete {
    fn delete_sync(
        &self,
        con: &StorageConnection,
        sync_type: ChangelogSyncType,
    ) -> Result<(), RepositoryError> {
        let repo = UserPermissionRowRepository::new(con);

        let changelog = match sync_type {
            ChangelogSyncType::SyncTypeV5V6 { source_site_id } => {
                UserPermissionRow::generate_changelog(
                    self.0.clone(),
                    con,
                    RowActionType::Delete,
                    SourceSiteId::SourceSiteId(source_site_id),
                )?
            }
            ChangelogSyncType::SyncTypeV7 { changelog_row } => changelog_row,
        };

        repo._delete(&self.0)?;
        ChangelogRepository::new(con).insert(&changelog)?;
        Ok(())
    }
    // Test only
    fn assert_deleted(&self, con: &StorageConnection) {
        assert_eq!(
            UserPermissionRowRepository::new(con).find_one_by_id(&self.0),
            Ok(None)
        )
    }
}

impl Upsert for UserPermissionRow {
    fn upsert_sync(
        &self,
        con: &StorageConnection,
        sync_type: ChangelogSyncType,
    ) -> Result<(), RepositoryError> {
        UserPermissionRowRepository::new(con)._upsert_one(self)?;

        let changelog = match sync_type {
            ChangelogSyncType::SyncTypeV5V6 { source_site_id } => Self::generate_changelog(
                self.id.clone(),
                con,
                RowActionType::Upsert,
                SourceSiteId::SourceSiteId(source_site_id),
            )?,
            ChangelogSyncType::SyncTypeV7 { changelog_row } => changelog_row,
        };

        ChangelogRepository::new(con).insert(&changelog)?;
        Ok(())
    }

    // Test only
    fn assert_upserted(&self, con: &StorageConnection) {
        assert_eq!(
            UserPermissionRowRepository::new(con).find_one_by_id(&self.id),
            Ok(Some(self.clone()))
        )
    }
}

#[cfg(test)]
mod test {
    use crate::{
        mock::MockDataInserts, test_db::setup_all, PermissionType, UserPermissionRow,
        UserPermissionRowRepository,
    };
    use strum::IntoEnumIterator;

    #[actix_rt::test]
    async fn user_permission_row_type_enum() {
        let (_, connection, _, _) = setup_all(
            "user_permission_row_type_enum",
            MockDataInserts::none().stores(),
        )
        .await;

        let repo = UserPermissionRowRepository::new(&connection);
        // Try upsert all variants of PermissionType, confirm that diesel enums match postgres
        for permission in PermissionType::iter() {
            let row_id = format!("{permission:?}");

            let result = repo.upsert_one(&UserPermissionRow {
                id: row_id.clone(),
                permission: permission.clone(),
                store_id: Some("store_a".to_string()),
                ..Default::default()
            });
            assert_eq!(result, Ok(()), "\n \n HINT: Failed to insert permission for type {row_id:?}. Have you created a migration to add this type to the postgres database enum? \n");

            let found = repo.find_one_by_id(&row_id).unwrap().unwrap();
            assert_eq!(found.permission, permission);
        }
    }
}
