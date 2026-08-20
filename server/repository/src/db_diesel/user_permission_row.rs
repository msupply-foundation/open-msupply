use super::StorageConnection;
use crate::db_diesel::changelog::changelog::RowOrId;
use crate::diesel_macros::diesel_string_enum;
use crate::repository_error::RepositoryError;
use crate::{ChangelogRepository, ChangelogSyncType, Delete, RowActionType, SourceSiteId, Upsert};
use diesel::prelude::*;
use serde::{Deserialize, Serialize};
use strum::EnumIter;
use util::uuid::{deterministic_uuid, Uuid};

table! {
  user_permission (id) {
      id -> Text,
      user_id -> Text,
      store_id -> Nullable<Text>,
      permission -> Text,
      context_id -> Nullable<Text>,
    }
}

diesel_string_enum! {
    db_case = SCREAMING_SNAKE_CASE;
    #[derive(Clone, Eq, Hash, EnumIter)]
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

    /// Stable id for a permission this site granted locally from an external identity
    /// provider role (see `service::oidc::role_grant`).
    ///
    /// Deliberately a different namespace to [`Self::deterministic_id`] so a role grant can
    /// never collide with a row owned by sync, and so [`Self::is_role_grant`] can tell the two
    /// apart: the id is a pure function of the row's own fields, which means any row can be
    /// tested for "did we mint this?" without keeping a side table of grant ids.
    pub fn role_grant_id(
        user_id: &str,
        store_id: Option<&str>,
        permission: &PermissionType,
        context_id: Option<&str>,
    ) -> String {
        // Project-local namespace; do not change without invalidating existing grants
        // (they would stop being recognised by `is_role_grant` and leak).
        const NAMESPACE: Uuid = Uuid::from_u128(0x1c4a7f30_9d62_4f8b_8f3a_6b2d5e9c71a4);
        let store = store_id.unwrap_or("");
        let context = context_id.unwrap_or("");
        deterministic_uuid(
            &NAMESPACE,
            &format!("{user_id}:{store}:{}:{context}", permission.as_ref()),
        )
    }

    /// True when this row's id is the [`Self::role_grant_id`] derived from its own fields, i.e.
    /// the row was minted by the identity-provider role mapping on this site rather than
    /// delivered by sync. Used to scope grant cleanup so a re-login never deletes a synced
    /// permission.
    pub fn is_role_grant(&self) -> bool {
        self.id
            == Self::role_grant_id(
                &self.user_id,
                self.store_id.as_deref(),
                &self.permission,
                self.context_id.as_deref(),
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
            RowOrId::Row(row),
            self.connection,
            RowActionType::Upsert,
            SourceSiteId::CurrentSiteId,
        )?;
        ChangelogRepository::new(self.connection).insert(&changelog)
    }

    /// Upsert without queuing the row for sync.
    ///
    /// `user_permission` is `Remote`-authored, so [`Self::upsert_one`] writes a changelog row and
    /// the permission is pushed to central and on to the site's other devices. Permissions minted
    /// locally from an identity-provider role (see [`UserPermissionRow::role_grant_id`]) are
    /// derived state that belongs to this site only — central must stay the sole author of the
    /// permissions it distributes — so they bypass the changelog.
    pub fn upsert_one_without_changelog(
        &self,
        row: &UserPermissionRow,
    ) -> Result<(), RepositoryError> {
        self._upsert_one(row)
    }

    /// Delete without queuing a delete for sync. Counterpart to
    /// [`Self::upsert_one_without_changelog`] — only for rows this site minted locally.
    pub fn delete_without_changelog(&self, id: &str) -> Result<(), RepositoryError> {
        self._delete(id)
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
                    RowOrId::Id(&self.0),
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
                RowOrId::Row(self),
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

    #[test]
    fn role_grant_id_is_recognisable_and_distinct_from_sync_ids() {
        let permission = PermissionType::StocktakeMutate;
        let grant = UserPermissionRow {
            id: UserPermissionRow::role_grant_id("user_a", Some("store_a"), &permission, None),
            user_id: "user_a".to_string(),
            store_id: Some("store_a".to_string()),
            permission: permission.clone(),
            context_id: None,
        };
        assert!(grant.is_role_grant());

        // A row with the same (user, store, permission) minted by sync must not be mistaken for
        // a grant, otherwise re-login would delete synced permissions.
        let synced = UserPermissionRow {
            id: UserPermissionRow::deterministic_id("user_a", Some("store_a"), &permission),
            ..grant.clone()
        };
        assert_ne!(synced.id, grant.id);
        assert!(!synced.is_role_grant());

        // Legacy OG primary keys aren't grants either.
        assert!(!UserPermissionRow {
            id: "some_og_uuid".to_string(),
            ..grant.clone()
        }
        .is_role_grant());

        // Every field participates in the id, so a grant is only recognised against its own row.
        assert!(!UserPermissionRow {
            store_id: Some("store_b".to_string()),
            ..grant.clone()
        }
        .is_role_grant());
        assert!(!UserPermissionRow {
            context_id: Some("context_a".to_string()),
            ..grant.clone()
        }
        .is_role_grant());
        assert!(!UserPermissionRow {
            permission: PermissionType::StocktakeQuery,
            ..grant
        }
        .is_role_grant());
    }
}
