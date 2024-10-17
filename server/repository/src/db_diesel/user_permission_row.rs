use super::StorageConnection;

use crate::{
    db_diesel::user_permission_row::user_permission::dsl as user_permission_dsl,
    repository_error::RepositoryError,
};
use crate::{Delete, Upsert};
use diesel::prelude::*;

use diesel_derive_enum::DbEnum;

table! {
  user_permission (id) {
      id -> Text,
      user_id -> Text,
      store_id -> Nullable<Text>,
      permission -> crate::db_diesel::user_permission_row::PermissionTypeMapping,
      context_id -> Nullable<Text>,
    }
}

#[derive(DbEnum, Debug, Clone, PartialEq, Eq, Hash)]
#[DbValueStyle = "SCREAMING_SNAKE_CASE"]
pub enum PermissionType {
    ServerAdmin,

    /// User has access to the store this permission is associated with.
    /// This acts like a master switch to enable/disable all user's permissions associated with a store.
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
    // r&r form,
    RnrFormQuery,
    RnrFormMutate,
    // outbound shipment
    OutboundShipmentQuery,
    OutboundShipmentMutate,
    // inbound shipment
    InboundShipmentQuery,
    InboundShipmentMutate,
    // supplier return
    SupplierReturnQuery,
    SupplierReturnMutate,
    // customer return
    CustomerReturnQuery,
    CustomerReturnMutate,
    // Prescription
    PrescriptionQuery,
    PrescriptionMutate,
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
    AssetCatalogueItemMutate,
    // Names
    NamePropertiesMutate,
    // Central Server
    EditCentralData,
}

#[derive(Clone, Queryable, Insertable, Debug, PartialEq, Eq, AsChangeset)]
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

pub struct UserPermissionRowRepository<'a> {
    connection: &'a StorageConnection,
}

impl<'a> UserPermissionRowRepository<'a> {
    pub fn new(connection: &'a StorageConnection) -> Self {
        UserPermissionRowRepository { connection }
    }

    pub fn upsert_one(&self, row: &UserPermissionRow) -> Result<(), RepositoryError> {
        diesel::insert_into(user_permission_dsl::user_permission)
            .values(row)
            .on_conflict(user_permission_dsl::id)
            .do_update()
            .set(row)
            .execute(self.connection.lock().connection())?;
        Ok(())
    }

    pub fn find_one_by_id(&self, id: &str) -> Result<Option<UserPermissionRow>, RepositoryError> {
        let result = user_permission_dsl::user_permission
            .filter(user_permission_dsl::id.eq(id))
            .first(self.connection.lock().connection())
            .optional()?;
        Ok(result)
    }

    pub fn delete_by_user_id(&self, user_id: &str) -> Result<(), RepositoryError> {
        diesel::delete(
            user_permission_dsl::user_permission.filter(user_permission_dsl::user_id.eq(user_id)),
        )
        .execute(self.connection.lock().connection())?;
        Ok(())
    }

    pub fn delete(&self, id: &str) -> Result<(), RepositoryError> {
        diesel::delete(user_permission_dsl::user_permission.filter(user_permission_dsl::id.eq(id)))
            .execute(self.connection.lock().connection())?;
        Ok(())
    }
}

#[derive(Debug, Clone)]
pub struct UserPermissionRowDelete(pub String);
impl Delete for UserPermissionRowDelete {
    fn delete(&self, con: &StorageConnection) -> Result<Option<i64>, RepositoryError> {
        UserPermissionRowRepository::new(con).delete(&self.0)?;
        Ok(None) // Table not in Changelog
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
    fn upsert(&self, con: &StorageConnection) -> Result<Option<i64>, RepositoryError> {
        UserPermissionRowRepository::new(con).upsert_one(self)?;
        Ok(None) // Table not in Changelog
    }

    // Test only
    fn assert_upserted(&self, con: &StorageConnection) {
        assert_eq!(
            UserPermissionRowRepository::new(con).find_one_by_id(&self.id),
            Ok(Some(self.clone()))
        )
    }
}
