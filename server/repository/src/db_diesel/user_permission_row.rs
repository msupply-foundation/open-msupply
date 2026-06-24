use super::StorageConnection;
use crate::db_diesel::changelog::changelog::RowOrId;
use crate::diesel_macros::diesel_string_enum;
use crate::diesel_macros::define_batch_table;
use crate::repository_error::RepositoryError;
use crate::{ChangelogRepository, RowActionType, SourceSiteId};
use diesel::prelude::*;
use serde::{Deserialize, Serialize};
use strum::EnumIter;
use util::uuid::{deterministic_uuid, Uuid};

define_batch_table! {
    struct: UserPermissionRow,
    repo: UserPermissionRowRepository,
    table: user_permission (id) {
      id -> Text,
      user_id -> Text,
      store_id -> Nullable<Text>,
      permission -> Text,
      context_id -> Nullable<Text>,
    }
}

diesel_string_enum! {
    #[derive(Clone, Eq, Hash, Serialize, Deserialize, EnumIter)]
    #[strum(serialize_all = "SCREAMING_SNAKE_CASE")]
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
        PurchaseOrderFinalise,
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
        #[strum(default, transparent)]
        Unknown(String),
    }
}

#[derive(
    Clone, Queryable, Insertable, Debug, PartialEq, Eq, AsChangeset, Default, Serialize, Deserialize,
)]
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

impl PermissionType {
    pub fn known_iter() -> impl Iterator<Item = PermissionType> {
        use strum::IntoEnumIterator;
        PermissionType::iter().filter(|p| !matches!(p, PermissionType::Unknown(_)))
    }
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
        Self::deterministic_id_from_db_form(user_id, store_id, permission.as_ref())
    }

    /// String-keyed variant used by migrations, which read `permission` as raw text
    /// so they don't have to deserialize into the live `PermissionType` enum (which
    /// may have evolved since the migration was written). Callers must pass the
    /// `SCREAMING_SNAKE_CASE` form stored in the DB (e.g. `"STORE_ACCESS"`) so the
    /// hash matches [`Self::deterministic_id`].
    pub(crate) fn deterministic_id_from_db_form(
        user_id: &str,
        store_id: Option<&str>,
        permission_db_form: &str,
    ) -> String {
        // Project-local namespace; do not change without a migration plan.
        const NAMESPACE: Uuid = Uuid::from_u128(0x5d8e2b1a_4f3c_4a6e_9b7d_0c1e2f3a4b5c);
        let store = store_id.unwrap_or("");
        deterministic_uuid(
            &NAMESPACE,
            &format!("{user_id}:{store}:{permission_db_form}"),
        )
    }
}

pub struct UserPermissionRowRepository<'a> {
    connection: &'a StorageConnection,
}

impl<'a> UserPermissionRowRepository<'a> {
    pub fn new(connection: &'a StorageConnection) -> Self {
        UserPermissionRowRepository { connection }
    }

    pub(crate) fn _upsert_one(&self, row: &UserPermissionRow) -> Result<(), RepositoryError> {
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
            RowOrId::Row(row),
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
        let changelog = UserPermissionRow::generate_changelog(
            RowOrId::Id(id),
            self.connection,
            RowActionType::Delete,
            SourceSiteId::CurrentSiteId,
        )?;
        self._delete(id)?;
        ChangelogRepository::new(self.connection).insert(&changelog)
    }

    pub(crate) fn _batch_delete(&self, ids: &[&str]) -> Result<(), RepositoryError> {
        if ids.is_empty() {
            return Ok(());
        }
        diesel::delete(user_permission::table.filter(user_permission::id.eq_any(ids)))
            .execute(self.connection.lock().connection())?;
        Ok(())
    }
}

#[cfg(test)]
mod test {
    use crate::{
        mock::MockDataInserts, test_db::setup_all, PermissionType, UserPermissionRow,
        UserPermissionRowRepository,
    };

    #[actix_rt::test]
    async fn user_permission_row_type_enum() {
        let (_, connection, _, _) = setup_all(
            "user_permission_row_type_enum",
            MockDataInserts::none().stores(),
        )
        .await;

        let repo = UserPermissionRowRepository::new(&connection);
        for permission in PermissionType::known_iter() {
            let row_id = format!("{permission:?}");

            let result = repo.upsert_one(&UserPermissionRow {
                id: row_id.clone(),
                permission: permission.clone(),
                store_id: Some("store_a".to_string()),
                ..Default::default()
            });
            assert_eq!(result, Ok(()), "Failed to insert permission {row_id:?}");

            let found = repo.find_one_by_id(&row_id).unwrap().unwrap();
            assert_eq!(found.permission, permission);
        }

        repo.upsert_one(&UserPermissionRow {
            id: "unknown_perm".to_string(),
            permission: PermissionType::Unknown("FUTURE_PERMISSION".to_string()),
            store_id: Some("store_a".to_string()),
            ..Default::default()
        })
        .unwrap();
        let found = repo.find_one_by_id("unknown_perm").unwrap().unwrap();
        assert_eq!(
            found.permission,
            PermissionType::Unknown("FUTURE_PERMISSION".to_string())
        );
    }
}
