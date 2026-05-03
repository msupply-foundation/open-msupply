use crate::{
    db_diesel::store_row::store, diesel_macros::diesel_string_enum,
    dynamic_query_filter::create_condition, name_store_join::name_store_join,
    vaccination_row::vaccination, KeyType, KeyValueStoreRepository, RepositoryError,
    StorageConnection, TransactionNotification,
};
use diesel::{dsl::LeftJoinQuerySource, prelude::*};
use serde::{Deserialize, Serialize};
use strum::IntoEnumIterator;
use thiserror::Error;
use ts_rs::TS;

table! {
    changelog (cursor) {
        cursor -> BigInt,
        table_name -> Text,
        record_id -> Text,
        row_action -> Text,
        name_link_id -> Nullable<Text>,
        store_id -> Nullable<Text>,
        is_sync_update -> Bool,
        source_site_id -> Nullable<Integer>,
        transfer_store_id -> Nullable<Text>,
        patient_id -> Nullable<Text>,
    }
}

allow_tables_to_appear_in_same_query!(changelog, vaccination);
allow_tables_to_appear_in_same_query!(changelog, store);
allow_tables_to_appear_in_same_query!(changelog, name_store_join);

diesel::alias!(
    store as transfer_stores: TransferStores,
    store as patient_stores: PatientStore,
);

#[diesel::dsl::auto_type]
fn query() -> _ {
    changelog::table
        .left_join(store::table.on(store::id.nullable().eq(changelog::store_id)))
        .left_join(
            transfer_stores.on(transfer_stores
                .field(store::id)
                .nullable()
                .eq(changelog::transfer_store_id)),
        )
        .left_join(
            name_store_join::table.on(name_store_join::name_id
                .nullable()
                .eq(changelog::patient_id)),
        )
        .left_join(
            patient_stores.on(patient_stores
                .field(store::id)
                .nullable()
                .eq(name_store_join::store_id.nullable())),
        )
}

// Expand macro recurseively for auto_type, hen replace "diesel::dsl::LeftJoin" with "LeftJoinQuerySource"
// And then remove diesel::dsl::On< keeping what's inside here >
type Source = LeftJoinQuerySource<
    LeftJoinQuerySource<
        LeftJoinQuerySource<
            LeftJoinQuerySource<
                changelog::table,
                store::table,
                diesel::dsl::Eq<diesel::dsl::Nullable<store::id>, changelog::store_id>,
            >,
            transfer_stores,
            diesel::dsl::Eq<
                diesel::dsl::Nullable<diesel::dsl::Field<transfer_stores, store::id>>,
                changelog::transfer_store_id,
            >,
        >,
        name_store_join::table,
        diesel::dsl::Eq<diesel::dsl::Nullable<name_store_join::name_id>, changelog::patient_id>,
    >,
    patient_stores,
    diesel::dsl::Eq<
        diesel::dsl::Nullable<diesel::dsl::Field<patient_stores, store::id>>,
        diesel::dsl::Nullable<name_store_join::store_id>,
    >,
>;

diesel_string_enum! {
    #[derive(Clone, Eq, Serialize, Deserialize, TS)]
    #[strum(serialize_all = "snake_case")]
    pub enum RowActionType {
        #[default]
        Upsert,
        Delete,
    }
}

diesel_string_enum! {
    #[derive(Clone, Eq, Hash, Serialize, Deserialize, strum::EnumIter, TS)]
    #[strum(serialize_all = "snake_case")]
    // Variants are grouped by `sync_style()` and sorted alphabetically within each group.
    // Keep this layout in sync with the match in `sync_style` below.
    pub enum ChangelogTableName {
        // ---- Legacy — Remote (not v6) ----
        ActivityLog,
        Barcode,
        Clinician,
        ClinicianStoreJoin,
        Currency,
        Document,
        IndicatorValue,
        InsuranceProvider,
        Item,
        Location,
        LocationMovement,
        Name,
        NameInsuranceJoin,
        NameStoreJoin,
        Number,
        PurchaseOrder,
        PurchaseOrderLine,
        Sensor,
        StockLine,
        Stocktake,
        StocktakeLine,
        TemperatureBreach,
        TemperatureBreachConfig,
        TemperatureLog,
        VVMStatusLog,

        // ---- Legacy — Remote + Transfer (not v6) ----
        Requisition,
        RequisitionLine,

        // ---- Legacy — Remote + Transfer + Patient (not v6) ----
        Invoice,
        InvoiceLine,

        // ---- Central (v6) ----
        AssetCatalogueItem,
        AssetCatalogueItemProperty,
        AssetCatalogueProperty,
        AssetCatalogueType,
        AssetCategory,
        AssetClass,
        AssetLogReason,
        AssetProperty,
        BackendPlugin,
        BundledItem,
        Campaign,
        Demographic,
        FormSchema,
        FrontendPlugin,
        ItemVariant,
        NameOmsFields,
        NameProperty,
        PackVariant,
        PackagingVariant,
        Property,
        Report,
        VaccineCourse,
        VaccineCourseDose,
        VaccineCourseItem,
        VaccineCourseStoreConfig,

        // ---- Central (not v6) ----
        LocationType,
        MasterList,
        Store,
        Unit,

        // ---- ToLegacyCentralOnly (not v6) ----
        Site,

        // ---- Remote (v6) ----
        Asset,
        AssetInternalLocation,
        AssetLog,
        Encounter,
        RnrForm,
        RnrFormLine,
        SyncMessage,
        Vaccination,

        // ---- File (v6) ----
        #[default]
        SyncFileReference,

        // ---- RemoteAndCentral (v6) ----
        PluginData,
        Preference,

        // ---- RemoteToCentral (v6) ----
        ContactForm,
        SystemLog,
    }
}

pub(crate) enum SourceSiteId {
    SourceSiteId(Option<i32>),
    CurrentSiteId,
}

pub(crate) enum RowOrId<'a, T> {
    Row(&'a T),
    Id(&'a str),
}

impl SourceSiteId {
    pub(crate) fn get_id(
        &self,
        connection: &StorageConnection,
    ) -> Result<Option<i32>, RepositoryError> {
        match self {
            SourceSiteId::SourceSiteId(id) => Ok(*id),
            SourceSiteId::CurrentSiteId => {
                KeyValueStoreRepository::new(connection).get_current_site_id()
            }
        }
    }
}

#[derive(strum::EnumIter, PartialEq, Eq, Debug)]
pub(crate) enum ChangeLogSyncStyle {
    Central, // Data created on Open-mSupply central server
    Remote,
    File,
    ToLegacyCentralOnly,
    Transfer,
    Patient,
    RemoteToCentral, // These records won't sync back to the remote site on re-initalisation
}

impl ChangeLogSyncStyle {
    fn get_table_names_for_sync_style(
        &self,
        sync_style_options: Option<SyncStyleOptions>,
    ) -> Vec<ChangelogTableName> {
        ChangelogTableName::iter()
            .filter(|table| {
                let (styles, options) = table.sync_style();
                if let Some(sync_style_options) = &sync_style_options {
                    if sync_style_options != &options {
                        return false;
                    }
                }
                styles.iter().any(|style| style == self)
            })
            .collect()
    }
}

#[derive(Debug, Clone, PartialEq)]
pub struct SyncStyleOptions {
    pub is_v6: bool,
    pub is_v5: bool,
}

// When adding a new change log record type, specify how it should be synced
// If new requirements are needed a different ChangeLogSyncStyle can be added
//
// Variants are grouped to match the order of `ChangelogTableName` above and
// sorted alphabetically within each group. Keep the two in sync.
impl ChangelogTableName {
    pub(crate) fn sync_style(&self) -> (Vec<ChangeLogSyncStyle>, SyncStyleOptions) {
        use ChangeLogSyncStyle::*;
        use ChangelogTableName::*;
        match self {
            // ----------------------------------------------------------
            // Legacy — Remote (not v6)
            // ----------------------------------------------------------
            ActivityLog
            | Barcode
            | Clinician
            | ClinicianStoreJoin
            | Currency
            | Document
            | IndicatorValue
            | InsuranceProvider
            | Item
            | Location
            | LocationMovement
            | Name
            | NameInsuranceJoin
            | NameStoreJoin
            | Number
            | PurchaseOrder
            | PurchaseOrderLine
            | Sensor
            | StockLine
            | Stocktake
            | StocktakeLine
            | TemperatureBreach
            | TemperatureBreachConfig
            | TemperatureLog
            | SyncMessage
            | VVMStatusLog => (
                vec![Remote],
                SyncStyleOptions {
                    is_v6: false,
                    is_v5: true,
                },
            ),

            // ----------------------------------------------------------
            // Legacy — Remote + Transfer (not v6)
            // ----------------------------------------------------------
            Requisition | RequisitionLine => (
                vec![Remote, Transfer],
                SyncStyleOptions {
                    is_v6: false,
                    is_v5: true,
                },
            ),

            // ----------------------------------------------------------
            // Legacy — Remote + Transfer + Patient (not v6)
            // ----------------------------------------------------------
            Invoice | InvoiceLine => (
                vec![Remote, Transfer, Patient],
                SyncStyleOptions {
                    is_v6: false,
                    is_v5: true,
                },
            ),

            // ----------------------------------------------------------
            // Central (v6) — created on the Open-mSupply central server
            // ----------------------------------------------------------
            AssetCatalogueItem
            | AssetCatalogueItemProperty
            | AssetCatalogueProperty
            | AssetCatalogueType
            | AssetCategory
            | AssetClass
            | AssetLogReason
            | AssetProperty
            | BackendPlugin
            | BundledItem
            | Campaign
            | Demographic
            | FormSchema
            | FrontendPlugin
            | ItemVariant
            | NameOmsFields
            | NameProperty
            | PackVariant
            | PackagingVariant
            | Property
            | Report
            | VaccineCourse
            | VaccineCourseDose
            | VaccineCourseItem
            | VaccineCourseStoreConfig => (
                vec![Central],
                SyncStyleOptions {
                    is_v6: true,
                    is_v5: false,
                },
            ),

            // ----------------------------------------------------------
            // Central (not v6) — central data synced via legacy mSupply
            // ----------------------------------------------------------
            LocationType | MasterList | Store | Unit => (
                vec![Central],
                SyncStyleOptions {
                    is_v6: false,
                    is_v5: true,
                },
            ),

            // ----------------------------------------------------------
            // ToLegacyCentralOnly (not v6)
            // ----------------------------------------------------------
            Site => (
                vec![ToLegacyCentralOnly],
                SyncStyleOptions {
                    is_v6: false,
                    is_v5: true,
                },
            ),

            // ----------------------------------------------------------
            // Remote (v6) — store-scoped data that syncs to the owning site
            // ----------------------------------------------------------
            Asset
            | AssetInternalLocation
            | AssetLog
            | Encounter
            | RnrForm
            | RnrFormLine
            | Vaccination => (
                vec![Remote],
                SyncStyleOptions {
                    is_v6: true,
                    is_v5: false,
                },
            ),

            // ----------------------------------------------------------
            // File (v6) — file references (handled by the file-sync pipeline)
            // ----------------------------------------------------------
            SyncFileReference => (
                vec![File],
                SyncStyleOptions {
                    is_v6: true,
                    is_v5: false,
                },
            ),

            // ----------------------------------------------------------
            // RemoteAndCentral (v6) — Remote when store_id is set, otherwise Central
            // ----------------------------------------------------------
            PluginData | Preference => (
                vec![Remote, Central],
                SyncStyleOptions {
                    is_v6: true,
                    is_v5: false,
                },
            ),

            // ----------------------------------------------------------
            // RemoteToCentral (v6) — pushed to central but not synced back on re-init
            // ----------------------------------------------------------
            ContactForm | SystemLog => (
                vec![RemoteToCentral],
                SyncStyleOptions {
                    is_v6: true,
                    is_v5: false,
                },
            ),
        }
    }
}

#[derive(Debug, Clone, PartialEq, Insertable, Default)]
#[diesel(table_name = changelog)]
pub struct ChangeLogInsertRow {
    pub table_name: ChangelogTableName,
    pub record_id: String,
    pub row_action: RowActionType,
    pub store_id: Option<String>,
    pub source_site_id: Option<i32>,
    pub transfer_store_id: Option<String>,
    pub patient_id: Option<String>,
}

#[derive(Clone, Queryable, Debug, PartialEq, Insertable, Serialize, Deserialize, TS, Default)]
#[diesel(table_name = changelog)]
pub struct ChangelogRow {
    pub cursor: i64,
    pub table_name: ChangelogTableName,
    pub record_id: String,
    pub row_action: RowActionType,
    #[diesel(column_name = "name_link_id")]
    pub name_id: Option<String>,
    pub store_id: Option<String>,
    pub is_sync_update: bool,
    pub source_site_id: Option<i32>,
    pub transfer_store_id: Option<String>,
    pub patient_id: Option<String>,
}

pub struct ChangelogRepository<'a> {
    pub(super) connection: &'a StorageConnection,
}

impl<'a> ChangelogRepository<'a> {
    pub fn new(connection: &'a StorageConnection) -> Self {
        ChangelogRepository { connection }
    }

    pub fn query(
        &self,
        filter: ChangelogCondition::Inner,
        CursorAndLimit { cursor, limit }: CursorAndLimit,
    ) -> Result<Vec<ChangelogRow>, RepositoryError> {
        let filter = ChangelogCondition::And(vec![
            filter,
            ChangelogCondition::cursor::greater_than(cursor),
        ]);

        let query = query()
            .filter(filter.to_boxed())
            .order(changelog::cursor.asc())
            .limit(limit)
            .select(changelog::all_columns);

        // Debug diesel query
        // println!("{}", diesel::debug_query::<DBType, _>(&query).to_string());
        let result: Vec<ChangelogRow> = query.load(self.connection.lock().connection())?;

        Ok(result)
    }

    /// Returns latest/max change log cursor
    pub fn max_cursor(&self) -> Result<u64, RepositoryError> {
        let result = changelog::table
            .select(diesel::dsl::max(changelog::cursor))
            .first::<Option<i64>>(self.connection.lock().connection())?;
        Ok(result.unwrap_or(0) as u64)
    }

    pub fn insert(&self, row: &ChangeLogInsertRow) -> Result<(), RepositoryError> {
        diesel::insert_into(changelog::table)
            .values(row)
            .execute(self.connection.lock().connection())?;
        self.connection
            .notify(TransactionNotification::ChangelogInsert);
        Ok(())
    }

    pub fn batch_insert(&self, rows: Vec<ChangeLogInsertRow>) -> Result<(), RepositoryError> {
        //TODO: Need to handle batch insert size limit
        diesel::insert_into(changelog::table)
            .values(rows)
            .execute(self.connection.lock().connection())?;
        self.connection
            .notify(TransactionNotification::ChangelogInsert);
        Ok(())
    }
}

// Dynamic query filter for changelog
// Source type is the changelog table (for queries directly against the table)
create_condition!(
    ChangelogCondition,
    Source,
    (cursor, i64, changelog::cursor),
    (site_id, i32, store::site_id),
    (action, RowActionType, changelog::row_action),
    (table_name, ChangelogTableName, changelog::table_name),
    (store_id, string, changelog::store_id),
    (source_site_id, i32, changelog::source_site_id),
    (transfer_store_id, string, changelog::transfer_store_id),
    (patient_id, string, changelog::patient_id),
    (transfer_site_id, i32, transfer_stores.field(store::site_id)),
    (patient_site_id, i32, patient_stores.field(store::site_id)),
);

use crate::dynamic_query_filter::*;

pub struct CursorAndLimit {
    pub cursor: i64,
    pub limit: i64,
}

#[derive(Debug, PartialEq)]
pub enum SyncType {
    Central,
    Remote,
}

pub struct ChangelogFilter;

// Pull from OMS central
impl ChangelogFilter {
    pub fn all_data_for_site(
        site_id: i32,
        is_initialising: bool,
        sync_style_options: Option<SyncStyleOptions>,
    ) -> ChangelogCondition::Inner {
        // TODO can optimise, not filter at all by remote data when initialising
        use ChangeLogSyncStyle::*;
        use ChangelogCondition as C;
        let mut inner_or_conditions = vec![];
        for sync_style in ChangeLogSyncStyle::iter() {
            let table_names = sync_style.get_table_names_for_sync_style(sync_style_options.clone());

            if table_names.is_empty() {
                continue;
            }

            let pre_condition = C::table_name::any(table_names);

            let condition = match sync_style {
                Central | File => C::And(vec![
                    // We have central and remote records with same table_name, so need to make sure to include only central ones (where store_id is null)
                    C::store_id::is_null(),
                ]),
                ToLegacyCentralOnly | RemoteToCentral => {
                    // Don't sync
                    continue;
                }
                Remote => C::site_id::equal(site_id),
                Transfer => C::transfer_site_id::equal(site_id),
                Patient => C::patient_site_id::equal(site_id),
            };

            inner_or_conditions.push(C::And(vec![pre_condition, condition]));
        }

        let mut outer_and_condition = vec![C::Or(inner_or_conditions)];
        if !is_initialising {
            outer_and_condition.push(C::source_site_id::not_equal(site_id));
        }

        C::And(outer_and_condition)
    }

    pub fn patient_data_for_site(
        site_id: i32,
        sync_style_options: Option<SyncStyleOptions>,
    ) -> ChangelogCondition::Inner {
        // TODO do we need to sync name_store_join ?
        use ChangeLogSyncStyle::*;
        use ChangelogCondition as C;

        let table_names = Patient.get_table_names_for_sync_style(sync_style_options);

        C::And(vec![
            C::table_name::any(table_names),
            C::patient_site_id::equal(site_id),
        ])
    }

    pub fn data_for_store(store_id: i32) -> ChangelogCondition::Inner {
        use ChangeLogSyncStyle::*;
        use ChangelogCondition as C;

        let remote_table_names = Remote.get_table_names_for_sync_style(None);
        let transfer_table_names = Transfer.get_table_names_for_sync_style(None);

        C::Or(vec![
            C::And(vec![
                C::table_name::any(remote_table_names),
                C::store_id::equal(store_id.to_string()),
            ]),
            C::And(vec![
                C::table_name::any(transfer_table_names),
                C::transfer_store_id::equal(store_id.to_string()),
            ]),
        ])
    }
}

// Push to Legacy Central
#[derive(Debug, Error)]
pub enum LegacyDataFilterError {
    #[error(transparent)]
    DatabaseError(#[from] RepositoryError),
    #[error("mSupply Central site id is not set in database")]
    CentralSiteIdNotSet,
}

impl ChangelogFilter {
    pub fn all_data_for_legacy_central(
        connection: &StorageConnection,
    ) -> Result<ChangelogCondition::Inner, LegacyDataFilterError> {
        use ChangeLogSyncStyle::*;
        use ChangelogCondition as C;

        let msupply_central_server_id = KeyValueStoreRepository::new(connection)
            .get_i32(KeyType::SettingsSyncCentralServerSiteId)?
            .ok_or(LegacyDataFilterError::CentralSiteIdNotSet)?;

        let mut inner_or_conditions = vec![];

        let options = Some(SyncStyleOptions {
            is_v6: false,
            is_v5: true,
        });
        for sync_style in ChangeLogSyncStyle::iter() {
            let table_names = sync_style.get_table_names_for_sync_style(options.clone());

            if table_names.is_empty() {
                continue;
            }

            match sync_style {
                ToLegacyCentralOnly | Remote | Transfer | Patient => {
                    inner_or_conditions.push(C::table_name::any(table_names))
                }
                Central | RemoteToCentral | File => continue,
            };
        }

        Ok(C::And(vec![
            C::Or(inner_or_conditions),
            C::source_site_id::not_equal(msupply_central_server_id),
        ]))
    }
}

impl ChangelogFilter {
    // Push from OMS remote
    pub fn all_data_edited_on_site(site_id: i32) -> ChangelogCondition::Inner {
        ChangelogCondition::source_site_id::equal(site_id)
    }
}

