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

use super::sync_style::{ChangeLogSyncStyle, SyncVersions};

// Underlying table — INSERTs target this. Carries raw `*_link_id` columns.
table! {
    #[sql_name = "changelog"]
    changelog_with_links (cursor) {
        cursor -> BigInt,
        table_name -> Text,
        record_id -> Text,
        row_action -> Text,
        store_id -> Nullable<Text>,
        is_sync_update -> Bool,
        source_site_id -> Nullable<Integer>,
        transfer_store_id -> Nullable<Text>,
        patient_link_id -> Nullable<Text>,
    }
}

// View — SELECTs target this. Exposes resolved `patient_id`
// (via LEFT JOIN name_link on the patient_link_id column).
table! {
    #[sql_name = "changelog_view"]
    changelog (cursor) {
        cursor -> BigInt,
        table_name -> Text,
        record_id -> Text,
        row_action -> Text,
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
    #[strum(serialize_all = "SCREAMING_SNAKE_CASE")]
    pub enum RowActionType {
        #[default]
        Upsert,
        Delete,
    }
}

diesel_string_enum! {
    #[derive(Clone, Eq, Hash, Serialize, Deserialize, strum::EnumIter, TS)]
    #[strum(serialize_all = "snake_case")]
    // The set of tables tracked by the changelog. How each one syncs is
    // defined separately in `sync_style.rs`.
    pub enum ChangelogTableName {
        Abbreviation,
        ActivityLog,
        Asset,
        AssetCatalogueItem,
        AssetCatalogueType,
        AssetCategory,
        AssetClass,
        AssetInternalLocation,
        AssetLog,
        AssetLogReason,
        AssetProperty,
        BackendPlugin,
        Barcode,
        BundledItem,
        Campaign,
        Category,
        Clinician,
        ClinicianStoreJoin,
        Contact,
        ContactForm,
        ContactTrace,
        Context,
        Currency,
        Demographic,
        DemographicIndicator,
        Diagnosis,
        Document,
        DocumentRegistry,
        Encounter,
        FormSchema,
        FrontendPlugin,
        IndicatorColumn,
        IndicatorLine,
        IndicatorValue,
        InsuranceProvider,
        Invoice,
        InvoiceLine,
        Item,
        ItemCategoryJoin,
        ItemDirection,
        ItemStoreJoin,
        ItemVariant,
        ItemWarningJoin,
        Location,
        LocationMovement,
        LocationType,
        MasterList,
        MasterListLine,
        MasterListNameJoin,
        Name,
        NameInsuranceJoin,
        NameOmsFields,
        NameProperty,
        NameStoreJoin,
        NameTag,
        NameTagJoin,
        PackagingVariant,
        Period,
        PeriodSchedule,
        PluginData,
        Preference,
        Printer,
        Program,
        ProgramEnrolment,
        ProgramEvent,
        ProgramIndicator,
        ProgramRequisitionOrderType,
        ProgramRequisitionSettings,
        Property,
        PurchaseOrder,
        PurchaseOrderLine,
        ReasonOption,
        Report,
        Requisition,
        RequisitionLine,
        RnrForm,
        RnrFormLine,
        Sensor,
        ShippingMethod,
        Site,
        StockLine,
        Stocktake,
        StocktakeLine,
        Store,
        StorePreference,
        #[default]
        SyncFileReference,
        SyncMessage,
        SystemLog,
        TemperatureBreach,
        TemperatureLog,
        Unit,
        UserAccount,
        UserPermission,
        UserStoreJoin,
        VVMStatus,
        VVMStatusLog,
        Vaccination,
        VaccineCourse,
        VaccineCourseDose,
        VaccineCourseItem,
        VaccineCourseStoreConfig,
    }
}

pub enum SourceSiteId {
    SourceSiteId(Option<i32>),
    CurrentSiteId,
}

pub(crate) enum RowOrId<'a, T> {
    Row(&'a T),
    Id(&'a str),
}

impl SourceSiteId {
    pub fn get_id(&self, connection: &StorageConnection) -> Result<Option<i32>, RepositoryError> {
        match self {
            SourceSiteId::SourceSiteId(id) => Ok(*id),
            SourceSiteId::CurrentSiteId => {
                KeyValueStoreRepository::new(connection).get_current_site_id()
            }
        }
    }
}

#[derive(Debug, Clone, PartialEq, Insertable, Default)]
#[diesel(table_name = changelog_with_links)]
pub struct ChangeLogInsertRow {
    pub table_name: ChangelogTableName,
    pub record_id: String,
    pub row_action: RowActionType,
    pub store_id: Option<String>,
    pub source_site_id: Option<i32>,
    pub transfer_store_id: Option<String>,
    // At the time of inserts a patient_id is the patient_link_id. 
    // If the patient info changes the changelog view will resolve to 
    // the correct patient_id via name_link join.
    #[diesel(column_name = "patient_link_id")]
    pub patient_id: Option<String>,
}

#[derive(Clone, Queryable, Debug, PartialEq, Serialize, Deserialize, TS, Default)]
#[diesel(table_name = changelog)]
pub struct ChangelogRow {
    pub cursor: i64,
    pub table_name: ChangelogTableName,
    pub record_id: String,
    pub row_action: RowActionType,
    pub store_id: Option<String>,
    pub is_sync_update: bool,
    pub source_site_id: Option<i32>,
    pub transfer_store_id: Option<String>,
    pub patient_id: Option<String>,
}

pub struct ChangelogRepository<'a> {
    pub(super) connection: &'a StorageConnection,
}

pub struct ChangelogQuery {
    pub rows: Vec<ChangelogRow>,
    pub max_cursor: u64,
    // Defaults to max cursor
    pub last_cursor_in_batch: u64,
}

impl<'a> ChangelogRepository<'a> {
    pub fn new(connection: &'a StorageConnection) -> Self {
        ChangelogRepository { connection }
    }

    pub fn query(
        &self,
        filter: ChangelogCondition::Inner,
        CursorAndLimit { cursor, limit }: CursorAndLimit,
    ) -> Result<ChangelogQuery, RepositoryError> {
        // Each sub-query scans at most this many cursor values. Bounding the cursor
        // range gives the planner a tight window to drive an index scan on
        // changelog_pkey, instead of a full bitmap scan + sort across the whole table.
        // TODO make this configurable
        const CURSOR_WINDOW: i64 = 250_000;

        let max_cursor = self.max_cursor()? as i64;
        let mut results: Vec<ChangelogRow> = Vec::new();
        let mut current_cursor = cursor;

        while (results.len() as i64) < limit && current_cursor < max_cursor {
            let window_end = current_cursor.saturating_add(CURSOR_WINDOW).min(max_cursor);
            let remaining = limit - results.len() as i64;

            let sub_filter = ChangelogCondition::And(vec![
                filter.clone(),
                ChangelogCondition::cursor::greater_than(current_cursor),
                // `lower_than(window_end + 1)` expresses `cursor <= window_end`;
                // the macro does not generate a `lower_than_or_equal` helper.
                ChangelogCondition::cursor::lower_than(window_end + 1),
            ]);

            let sub_query = query()
                .filter(sub_filter.to_boxed())
                .order(changelog::cursor.asc())
                .limit(remaining)
                .select(changelog::all_columns);

            let sub_results: Vec<ChangelogRow> =
                sub_query.load(self.connection.lock().connection())?;

            results.extend(sub_results);
            current_cursor = window_end;
        }

        let last_cursor_in_batch = results
            .last()
            .map(|r| r.cursor as u64)
            .unwrap_or(max_cursor as u64);

        Ok(ChangelogQuery {
            rows: results,
            max_cursor: max_cursor as u64,
            last_cursor_in_batch,
        })
    }

    /// Returns latest/max change log cursor. Queries the underlying table
    /// (not the view) so it works during migrations, before `changelog_view`
    /// gets rebuilt at the end of the migration run.
    pub fn max_cursor(&self) -> Result<u64, RepositoryError> {
        let result = changelog_with_links::table
            .select(diesel::dsl::max(changelog_with_links::cursor))
            .first::<Option<i64>>(self.connection.lock().connection())?;
        Ok(result.unwrap_or(0) as u64)
    }

    pub fn insert(&self, row: &ChangeLogInsertRow) -> Result<(), RepositoryError> {
        diesel::insert_into(changelog_with_links::table)
            .values(row)
            .execute(self.connection.lock().connection())?;
        self.connection
            .notify(TransactionNotification::ChangelogInsert);
        Ok(())
    }

    pub fn batch_insert(&self, rows: Vec<ChangeLogInsertRow>) -> Result<(), RepositoryError> {
        //TODO: Need to handle batch insert size limit
        diesel::insert_into(changelog_with_links::table)
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
        sync_style_options: Option<SyncVersions>,
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
                    // We have patients that are also central data, therefore patient_id should be null
                    C::patient_id::is_null(),
                ]),
                ToLegacyCentralOnly | RemoteToCentral => {
                    // Don't sync
                    continue;
                }
                Remote => C::site_id::equal(site_id),
                Transfer => C::transfer_site_id::equal(site_id),
                Patient => C::patient_site_id::equal(site_id),
                SyncRequest => {
                    // Routed to whichever site currently has the row's store
                    // active. Skipped entirely during initialisation — the
                    // remote should fully bootstrap before the runner starts
                    // executing requests.
                    if is_initialising {
                        continue;
                    }
                    C::site_id::equal(site_id)
                }
            };

            inner_or_conditions.push(C::And(vec![pre_condition, condition]));
        }

        let mut outer_and_condition = vec![C::Or(inner_or_conditions)];
        // We want to avoid circular sync, when record arrive on central server from remote site
        // it is marked with the source_site_id = site that sent it, so when the site pulls data
        // in next iteration we exclude those record. But during initialisation we want to sync all records for the site
        if !is_initialising {
            outer_and_condition.push(C::source_site_id::not_equal(site_id));
        }

        C::And(outer_and_condition)
    }

    pub fn patient_data_for_site(
        site_id: i32,
        sync_style_options: Option<SyncVersions>,
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

    pub fn data_for_store(store_id: &str) -> ChangelogCondition::Inner {
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

        let options = Some(SyncVersions {
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
                // SyncRequest is OMS-only (central->remote). Doesn't reach legacy mSupply.
                Central | RemoteToCentral | File | SyncRequest => continue,
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
        use ChangeLogSyncStyle::*;
        use ChangelogCondition as C;
        // SyncRequest is central->remote only; rows authored on this remote
        // (e.g. self-resync sync_request during init) must never be pushed up.
        // Restrict push to tables whose sync style is not SyncRequest.
        let pushable_tables: Vec<ChangelogTableName> = ChangelogTableName::iter()
            .filter(|t| !t.sync_style().0.contains(&SyncRequest))
            .collect();
        C::And(vec![
            C::source_site_id::equal(site_id),
            C::table_name::any(pushable_tables),
        ])
    }
}

#[cfg(test)]
mod print_query_tests {
    use super::*;
    use crate::DBType;
    use diesel::debug_query;

    // Remove ignore when you need to print the query
    #[ignore]
    #[test]
    fn print_all_data_for_site_query_for_site_300() {
        let filter = ChangelogFilter::all_data_for_site(300, false, None);

        let q = query()
            .filter(filter.to_boxed())
            .order(changelog::cursor.asc())
            .limit(100)
            .select(changelog::all_columns);

        println!("{}", debug_query::<DBType, _>(&q));
    }

    /// Locks the Rust↔DB contract for `row_action`: the column was the PG enum
    /// `row_action_type` with labels 'UPSERT'/'DELETE' until v3.0.0, then cast
    /// to TEXT preserving those labels. The strum serialization here must keep
    /// matching them.
    #[test]
    fn row_action_type_serializes_uppercase() {
        assert_eq!(RowActionType::Upsert.to_string(), "UPSERT");
        assert_eq!(RowActionType::Delete.to_string(), "DELETE");
    }
}
