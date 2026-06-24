use crate::{
<<<<<<< HEAD
    db_diesel::store_row::store, diesel_macros::apply_equal_filter,
    name_store_join::name_store_join, vaccination_row::vaccination, ChangelogCursorTracker, DBType,
    EqualFilter, RepositoryError, StorageConnection, TransactionNotification,
=======
    db_diesel::{changelog::changelog_cursor_tracker::ChangelogCursorTracker, store_row::store},
    diesel_macros::diesel_string_enum,
    dynamic_query_filter::create_condition,
    name_link,
    name_store_join::name_store_join,
    vaccination_row::vaccination,
    KeyType, KeyValueStoreRepository, RepositoryError, StorageConnection, TransactionNotification,
>>>>>>> origin/v3.0.0-RC
};
use diesel::prelude::*;
use serde::{Deserialize, Serialize};
use strum::IntoEnumIterator;
use thiserror::Error;
use ts_rs::TS;

use super::sync_style::{Distribution, SyncVersions};

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
allow_tables_to_appear_in_same_query!(changelog_with_links, vaccination);
allow_tables_to_appear_in_same_query!(changelog_with_links, store);
allow_tables_to_appear_in_same_query!(changelog_with_links, name_store_join);
allow_tables_to_appear_in_same_query!(changelog_with_links, name_link);

diesel::alias!(
    store as transfer_stores: TransferStores,
    store as patient_stores: PatientStore,
    // Used inside the patient_site_id subquery so it doesn't collide with the outer query's
    // name_link join (Diesel rejects a table appearing more than once across the statement).
    name_link as patient_name_links: PatientNameLink,
);

diesel_string_enum! {
    #[derive(Clone, Eq, Serialize, Deserialize, TS)]
    #[strum(serialize_all = "SCREAMING_SNAKE_CASE")]
    pub enum RowActionType {
        #[default]
        Upsert,
        Delete,
    }
}

<<<<<<< HEAD
#[derive(DbEnum, Debug, Clone, PartialEq, Eq, Default, Serialize, Deserialize, EnumIter, TS)]
#[DbValueStyle = "snake_case"]
pub enum ChangelogTableName {
    BackendPlugin,
    Number,
    Location,
    LocationMovement,
    StockLine,
    Invoice,
    InvoiceLine,
    Stocktake,
    StocktakeLine,
    Requisition,
    RequisitionLine,
    ActivityLog,
    Barcode,
    Clinician,
    ClinicianStoreJoin,
    Name,
    NameStoreJoin,
    Document,
    Sensor,
    TemperatureBreach,
    TemperatureBreachConfig,
    TemperatureLog,
    PackVariant,
    Currency,
    AssetClass,
    AssetCategory,
    AssetCatalogueType,
    AssetCatalogueItem,
    AssetCatalogueItemProperty,
    AssetCatalogueProperty,
    AssetInternalLocation,
    #[default]
    SyncFileReference,
    Asset,
    AssetLog,
    AssetLogReason,
    AssetProperty,
    Property,
    NameProperty,
    NameOmsFields,
    RnrForm,
    RnrFormLine,
    Demographic,
    VaccineCourse,
    VaccineCourseItem,
    VaccineCourseDose,
    VaccineCourseStoreConfig,
    Vaccination,
    Encounter,
    ItemVariant,
    PackagingVariant,
    IndicatorValue,
    BundledItem,
    AncillaryItem,
    Item,
    ContactForm,
    SystemLog,
    InsuranceProvider,
    FrontendPlugin,
    NameInsuranceJoin,
    Report,
    FormSchema,
    PluginData,
    Preference,
    VVMStatusLog,
    Campaign,
    SyncMessage,
    PurchaseOrder,
    PurchaseOrderLine,
    StockRelocation,
    MasterList,
=======
diesel_string_enum! {
    #[derive(Clone, Eq, Hash, Serialize, Deserialize, strum::EnumIter, TS)]
    #[strum(serialize_all = "snake_case")]
    // The set of tables tracked by the changelog. How each one syncs is
    // defined separately in `sync_style.rs`.
    pub enum ChangelogTableName {
        Abbreviation,
        ActivityLog,
        AncillaryItem,
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
>>>>>>> origin/v3.0.0-RC
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
<<<<<<< HEAD
            ChangelogTableName::BackendPlugin => ChangeLogSyncStyle::Central,
            ChangelogTableName::Number => ChangeLogSyncStyle::Legacy,
            ChangelogTableName::Location => ChangeLogSyncStyle::Legacy,
            ChangelogTableName::LocationMovement => ChangeLogSyncStyle::Legacy,
            ChangelogTableName::StockLine => ChangeLogSyncStyle::Legacy,
            ChangelogTableName::Invoice => ChangeLogSyncStyle::Legacy,
            ChangelogTableName::InvoiceLine => ChangeLogSyncStyle::Legacy,
            ChangelogTableName::Stocktake => ChangeLogSyncStyle::Legacy,
            ChangelogTableName::StocktakeLine => ChangeLogSyncStyle::Legacy,
            ChangelogTableName::Requisition => ChangeLogSyncStyle::Legacy,
            ChangelogTableName::RequisitionLine => ChangeLogSyncStyle::Legacy,
            ChangelogTableName::ActivityLog => ChangeLogSyncStyle::Legacy,
            ChangelogTableName::Barcode => ChangeLogSyncStyle::Legacy,
            ChangelogTableName::Clinician => ChangeLogSyncStyle::Legacy,
            ChangelogTableName::ClinicianStoreJoin => ChangeLogSyncStyle::Legacy,
            ChangelogTableName::Name => ChangeLogSyncStyle::Legacy,
            ChangelogTableName::NameStoreJoin => ChangeLogSyncStyle::Legacy,
            ChangelogTableName::Document => ChangeLogSyncStyle::Legacy,
            ChangelogTableName::Sensor => ChangeLogSyncStyle::Legacy,
            ChangelogTableName::TemperatureBreach => ChangeLogSyncStyle::Legacy,
            ChangelogTableName::TemperatureBreachConfig => ChangeLogSyncStyle::Legacy,
            ChangelogTableName::TemperatureLog => ChangeLogSyncStyle::Legacy,
            ChangelogTableName::Currency => ChangeLogSyncStyle::Legacy,
            ChangelogTableName::Item => ChangeLogSyncStyle::Legacy,
            ChangelogTableName::PackVariant => ChangeLogSyncStyle::Central,
            ChangelogTableName::AssetClass => ChangeLogSyncStyle::Central,
            ChangelogTableName::AssetCategory => ChangeLogSyncStyle::Central,
            ChangelogTableName::AssetCatalogueType => ChangeLogSyncStyle::Central,
            ChangelogTableName::AssetCatalogueItem => ChangeLogSyncStyle::Central,
            ChangelogTableName::Asset => ChangeLogSyncStyle::Remote,
            ChangelogTableName::AssetInternalLocation => ChangeLogSyncStyle::Remote,
            ChangelogTableName::SyncFileReference => ChangeLogSyncStyle::File,
            ChangelogTableName::AssetLog => ChangeLogSyncStyle::Remote,
            ChangelogTableName::AssetCatalogueItemProperty => ChangeLogSyncStyle::Central,
            ChangelogTableName::AssetCatalogueProperty => ChangeLogSyncStyle::Central,
            ChangelogTableName::AssetLogReason => ChangeLogSyncStyle::Central,
            ChangelogTableName::AssetProperty => ChangeLogSyncStyle::Central,
            ChangelogTableName::Property => ChangeLogSyncStyle::Central,
            ChangelogTableName::NameProperty => ChangeLogSyncStyle::Central,
            ChangelogTableName::NameOmsFields => ChangeLogSyncStyle::Central,
            ChangelogTableName::RnrForm => ChangeLogSyncStyle::Remote,
            ChangelogTableName::RnrFormLine => ChangeLogSyncStyle::Remote,
            ChangelogTableName::Demographic => ChangeLogSyncStyle::Central,
            ChangelogTableName::VaccineCourse => ChangeLogSyncStyle::Central,
            ChangelogTableName::VaccineCourseItem => ChangeLogSyncStyle::Central,
            ChangelogTableName::VaccineCourseDose => ChangeLogSyncStyle::Central,
            ChangelogTableName::VaccineCourseStoreConfig => ChangeLogSyncStyle::Central,
            ChangelogTableName::Vaccination => ChangeLogSyncStyle::Remote,
            ChangelogTableName::Encounter => ChangeLogSyncStyle::Remote,
            ChangelogTableName::ItemVariant => ChangeLogSyncStyle::Central,
            ChangelogTableName::PackagingVariant => ChangeLogSyncStyle::Central,
            ChangelogTableName::IndicatorValue => ChangeLogSyncStyle::Legacy,
            ChangelogTableName::BundledItem => ChangeLogSyncStyle::Central,
            ChangelogTableName::AncillaryItem => ChangeLogSyncStyle::Central,
            ChangelogTableName::ContactForm => ChangeLogSyncStyle::RemoteToCentral,
            ChangelogTableName::SystemLog => ChangeLogSyncStyle::RemoteToCentral,
            ChangelogTableName::InsuranceProvider => ChangeLogSyncStyle::Legacy,
            ChangelogTableName::FrontendPlugin => ChangeLogSyncStyle::Central,
            ChangelogTableName::NameInsuranceJoin => ChangeLogSyncStyle::Legacy,
            ChangelogTableName::Report => ChangeLogSyncStyle::Central,
            ChangelogTableName::FormSchema => ChangeLogSyncStyle::Central,
            ChangelogTableName::PluginData => ChangeLogSyncStyle::RemoteAndCentral,
            ChangelogTableName::Preference => ChangeLogSyncStyle::RemoteAndCentral,
            ChangelogTableName::VVMStatusLog => ChangeLogSyncStyle::Legacy,
            ChangelogTableName::Campaign => ChangeLogSyncStyle::Central,
            ChangelogTableName::SyncMessage => ChangeLogSyncStyle::Remote,
            ChangelogTableName::PurchaseOrder => ChangeLogSyncStyle::Legacy,
            ChangelogTableName::PurchaseOrderLine => ChangeLogSyncStyle::Legacy,
            ChangelogTableName::StockRelocation => ChangeLogSyncStyle::Legacy,
            ChangelogTableName::MasterList => ChangeLogSyncStyle::ProcessorOnly,
=======
            SourceSiteId::SourceSiteId(id) => Ok(*id),
            SourceSiteId::CurrentSiteId => {
                KeyValueStoreRepository::new(connection).get_current_site_id()
            }
>>>>>>> origin/v3.0.0-RC
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

            let sub_results =
                self.query_cursor_window(filter.clone(), current_cursor, window_end, remaining)?;

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

    /// Loads one cursor window: changelog rows matching `filter` with
    /// `current_cursor < cursor <= window_end`, ordered by cursor, capped at `limit`.
    ///
    /// The filter is applied directly to the `changelog_with_links LEFT JOIN name_link` query and
    /// `name_link.name_id` is selected to resolve `patient_id` in one pass (no separate
    /// `cursor IN (...)` subselect). The patient/store/transfer site filters use their own
    /// (aliased) subqueries, so they don't collide with this outer name_link join.
    fn query_cursor_window(
        &self,
        filter: ChangelogCondition::Inner,
        current_cursor: i64,
        window_end: i64,
        limit: i64,
    ) -> Result<Vec<ChangelogRow>, RepositoryError> {
<<<<<<< HEAD
        let mut query = create_filtered_query(earliest, filter);
        query = clamp_to_safe_cursor(self.connection, query);
        let query = query
            .order(changelog_deduped::dsl::cursor.asc())
            .limit(limit.into());

        // // Debug diesel query
        // println!(
        //     "{}",
        //     diesel::debug_query::<crate::DBType, _>(&query).to_string()
        // );

        let result: Vec<ChangelogRow> = query.load(self.connection.lock().connection())?;
        Ok(result)
    }

    pub fn count(
        &self,
        earliest: u64,
        filter: Option<ChangelogFilter>,
    ) -> Result<u64, RepositoryError> {
        // Clamp identically to the row reader so callers that drive a push/processor loop off
        // `count` (e.g. the `_ => continue` termination check) stay consistent with `changelogs()`
        // while a tx is in flight — otherwise count could report rows the clamped reader won't
        // return, spinning the loop.
        let query = clamp_to_safe_cursor(self.connection, create_filtered_query(earliest, filter));
        let result = query
            .count()
            .get_result::<i64>(self.connection.lock().connection())?;
        Ok(result as u64)
    }

    pub fn outgoing_sync_records_from_central(
        &self,
        earliest: u64,
        batch_size: u32,
        sync_site_id: i32,
        is_initialized: bool,
    ) -> Result<Vec<ChangelogRow>, RepositoryError> {
        let mut query = create_filtered_outgoing_sync_query(earliest, sync_site_id, is_initialized);
        query = clamp_to_safe_cursor(self.connection, query);
        let query = query
            .order(changelog_deduped::cursor.asc())
            .limit(batch_size.into());

        // Debug diesel query
        // println!(
        //     "{}",
        //     diesel::debug_query::<crate::DBType, _>(&query).to_string()
        // );

        let result: Vec<ChangelogRow> = query.load(self.connection.lock().connection())?;
        Ok(result)
    }

    pub fn outgoing_patient_sync_records_from_central(
        &self,
        earliest: u64,
        batch_size: u32,
        sync_site_id: i32,
        fetch_patient_id: String,
    ) -> Result<Vec<ChangelogRow>, RepositoryError> {
        let mut query =
            create_filtered_outgoing_patient_sync_query(earliest, sync_site_id, fetch_patient_id);
        query = clamp_to_safe_cursor(self.connection, query);
        let query = query
            .order(changelog_deduped::cursor.asc())
            .limit(batch_size.into());

        // Debug diesel query
        // println!(
        //     "{}",
        //     diesel::debug_query::<crate::DBType, _>(&query).to_string()
        // );

        let result: Vec<ChangelogRow> = query.load(self.connection.lock().connection())?;
        Ok(result)
    }

    /// This returns the number of changelog records that should be evaluated to send to the remote site when doing a v6_pull
    /// This looks up associated records to decide if change log should be sent to the site or not
    /// Update this method when adding new record types to the system
    pub fn count_outgoing_sync_records_from_central(
        &self,
        earliest: u64,
        sync_site_id: i32,
        is_initialized: bool,
    ) -> Result<u64, RepositoryError> {
        let query = clamp_to_safe_cursor(
            self.connection,
            create_filtered_outgoing_sync_query(earliest, sync_site_id, is_initialized),
        );
        let result = query
            .count()
            .get_result::<i64>(self.connection.lock().connection())?;
        Ok(result as u64)
    }

    pub fn count_outgoing_patient_sync_records_from_central(
        &self,
        earliest: u64,
        sync_site_id: i32,
        fetch_patient_id: String,
    ) -> Result<u64, RepositoryError> {
        let query = clamp_to_safe_cursor(
            self.connection,
            create_filtered_outgoing_patient_sync_query(earliest, sync_site_id, fetch_patient_id),
        );
        let result = query
            .count()
            .get_result::<i64>(self.connection.lock().connection())?;
        Ok(result as u64)
    }

    /// Returns latest change log
    /// After initial sync we use this method to get the latest cursor to make sure we don't try to push any records that were synced to this site on initialisation
    pub fn absolute_latest_cursor(&self) -> Result<u64, RepositoryError> {
        let result = changelog::table
            .select(diesel::dsl::max(changelog::cursor))
=======
        let filter = ChangelogCondition::And(vec![
            filter,
            ChangelogCondition::cursor::greater_than(current_cursor),
            // `lower_than(window_end + 1)` expresses `cursor <= window_end`;
            // the macro does not generate a `lower_than_or_equal` helper.
            ChangelogCondition::cursor::lower_than(window_end + 1),
        ]);

        let query = changelog_with_links::table
            .left_join(
                name_link::table
                    .on(changelog_with_links::patient_link_id.eq(name_link::id.nullable())),
            )
            .filter(filter.to_boxed())
            .order(changelog_with_links::cursor.asc())
            .limit(limit)
            .select((
                changelog_with_links::cursor,
                changelog_with_links::table_name,
                changelog_with_links::record_id,
                changelog_with_links::row_action,
                changelog_with_links::store_id,
                changelog_with_links::is_sync_update,
                changelog_with_links::source_site_id,
                changelog_with_links::transfer_store_id,
                name_link::name_id.nullable(),
            ));

        // Uncomment to print the generated SQL (e.g. from the ignored
        // `print_all_data_for_site_query_for_site_300` test):
        // println!("{}", diesel::debug_query::<crate::DBType, _>(&query));

        Ok(query.load(self.connection.lock().connection())?)
    }

    /// Returns latest/max change log cursor.
    ///
    /// If the `ChangelogCursorTracker` reports an in-flight cursor, the safe cursor
    /// (`min(in_flight)`) is returned without a database query — it is
    /// always at most the DB MAX visible to this connection (every committed
    /// changelog row passed through `track`, registering a value <= its actual
    /// cursor).
    pub fn max_cursor(&self) -> Result<u64, RepositoryError> {
        if let Some(safe) = ChangelogCursorTracker::max_safe_cursor(self.connection) {
            return Ok(safe);
        }
        let result = changelog_with_links::table
            .select(diesel::dsl::max(changelog_with_links::cursor))
>>>>>>> origin/v3.0.0-RC
            .first::<Option<i64>>(self.connection.lock().connection())?;
        Ok(result.unwrap_or(0) as u64)
    }

<<<<<<< HEAD
    /// Like [`absolute_latest_cursor`], but clamped to the max safe cursor while another connection has an
    /// in-flight changelog tx (see [`ChangelogCursorTracker`]). Use this for sync push cursor
    /// advancement so we never advance past an in-flight (uncommitted, lower) cursor.
    ///
    /// Note: `absolute_latest_cursor` itself is deliberately left un-clamped — migration bookkeeping
    /// (`run_without_change_log_updates`) inserts changelog rows then reads the cursor on the same
    /// connection, where a clamp would return the pre-insert max.
    pub fn latest_cursor(&self) -> Result<u64, RepositoryError> {
        match ChangelogCursorTracker::max_safe_cursor(self.connection) {
            Some(safe) => Ok(safe),
            None => self.absolute_latest_cursor(),
        }
    }

    // Delete all change logs with cursor greater-equal cursor_ge
    pub fn delete(&self, cursor_ge: i64) -> Result<(), RepositoryError> {
        diesel::delete(changelog::dsl::changelog)
            .filter(changelog::dsl::cursor.ge(cursor_ge))
            .execute(self.connection.lock().connection())?;
        Ok(())
    }

    // Needed for tests, when is_sync_update needs to be reset when records were inserted via
    // PullUpsertRecord (but not through sync)
    #[cfg(feature = "integration_test")]
    pub fn reset_is_sync_update(&self, from_cursor: u64) -> Result<(), RepositoryError> {
        diesel::update(changelog::table)
            .set(changelog::is_sync_update.eq(false))
            .filter(changelog::cursor.gt(from_cursor as i64))
            .execute(self.connection.lock().connection())?;
        Ok(())
    }

    pub fn set_source_site_id_and_is_sync_update(
        &self,
        cursor_id: i64,
        source_site_id: Option<i32>,
    ) -> Result<(), RepositoryError> {
        diesel::update(changelog::table)
            .set((
                changelog::source_site_id.eq(source_site_id),
                changelog::is_sync_update.eq(true),
            ))
            .filter(changelog::cursor.eq(cursor_id))
            .execute(self.connection.lock().connection())?;
        Ok(())
    }

    /// Inserts a changelog record, and returns the cursor of the inserted record
    #[cfg(feature = "postgres")]
    pub fn insert(&self, row: &ChangeLogInsertRow) -> Result<i64, RepositoryError> {
        // Register this connection's in-flight cursor boundary before the insert so concurrent
        // readers clamp below it (see ChangelogCursorTracker).
        ChangelogCursorTracker::track(self.connection)?;

        // Insert the record, and then return the cursor of the inserted record
        // Using a returning clause makes this thread safe
        let cursor_id = diesel::insert_into(changelog::table)
            .values(row)
            .returning(changelog::cursor)
            .get_results(self.connection.lock().connection())?
            .pop()
            .unwrap_or_default(); // This shouldn't happen, maybe should unwrap or panic?

        self.connection
            .notify(TransactionNotification::ChangelogInsert);
        Ok(cursor_id)
    }

    #[cfg(not(feature = "postgres"))]
    pub fn insert(&self, row: &ChangeLogInsertRow) -> Result<i64, RepositoryError> {
        // Register this connection's in-flight cursor boundary before the insert so concurrent
        // readers clamp below it (see ChangelogCursorTracker).
        ChangelogCursorTracker::track(self.connection)?;

        // Insert the record, and then return the cursor of the inserted record
        // SQLite docs say this is safe if you don't have different threads sharing a single connection
        diesel::insert_into(changelog::table)
            .values(row)
            .execute(self.connection.lock().connection())?;
        let cursor_id = diesel::select(last_insert_rowid())
            .get_result::<i64>(self.connection.lock().connection())?;
        self.connection
            .notify(TransactionNotification::ChangelogInsert);
        Ok(cursor_id)
=======
    pub fn insert(&self, row: &ChangeLogInsertRow) -> Result<(), RepositoryError> {
        ChangelogCursorTracker::track(self.connection)?;

        diesel::insert_into(changelog_with_links::table)
            .values(row)
            .execute(self.connection.lock().connection())?;
        self.connection
            .notify(TransactionNotification::ChangelogInsert);
        Ok(())
    }

    pub fn batch_insert(&self, rows: Vec<ChangeLogInsertRow>) -> Result<(), RepositoryError> {
        //TODO: Need to handle batch insert size limit
        ChangelogCursorTracker::track(self.connection)?;

        diesel::insert_into(changelog_with_links::table)
            .values(rows)
            .execute(self.connection.lock().connection())?;
        self.connection
            .notify(TransactionNotification::ChangelogInsert);
        Ok(())
>>>>>>> origin/v3.0.0-RC
    }
}

// Dynamic query filter for changelog.
// The Source is `changelog_with_links LEFT JOIN name_link` (the shape the query runs against):
// the filter only references changelog_with_links columns, but typing the boxed condition against
// the joined source lets it be applied directly to the joined query in `query_cursor_window`.
type ChangelogConditionSource = diesel::dsl::LeftJoinQuerySource<
    changelog_with_links::table,
    name_link::table,
    diesel::dsl::Eq<changelog_with_links::patient_link_id, diesel::dsl::Nullable<name_link::id>>,
>;

create_condition!(
    ChangelogCondition,
    ChangelogConditionSource,
    (cursor, i64, changelog_with_links::cursor),
    (action, RowActionType, changelog_with_links::row_action),
    (table_name, ChangelogTableName, changelog_with_links::table_name),
    (source_site_id, i32, changelog_with_links::source_site_id),
    (store_id, string, changelog_with_links::store_id),
    (transfer_store_id, string, changelog_with_links::transfer_store_id),
    (patient_link_id, string, changelog_with_links::patient_link_id),
    // Each site filter is gated by `<column> IS NOT NULL AND <column> IN (...)` so the IN subquery
    // is only evaluated for rows that actually carry that column (most rows have a null transfer /
    // patient link), letting the planner short-circuit.
    (transfer_site_id, subquery: i32, |for_site| changelog_with_links::transfer_store_id.is_not_null().and(
        changelog_with_links::transfer_store_id.eq_any(
            store::table
                .filter(store::site_id.eq(for_site))
                .select(store::id.nullable())
        )
    )),
     (store_site_id, subquery: i32, |for_site| changelog_with_links::store_id.is_not_null().and(
        changelog_with_links::store_id.eq_any(
            store::table
                .filter(store::site_id.eq(for_site))
                .select(store::id.nullable())
        )
    )),
    (patient_site_id, subquery: i32, |for_site| changelog_with_links::patient_link_id.is_not_null().and(
        changelog_with_links::patient_link_id.eq_any(
            name_store_join::table
                .inner_join(patient_name_links.on(name_store_join::name_id.eq(patient_name_links.field(name_link::id))))
                .inner_join(patient_stores.on(patient_stores.field(store::id).eq(name_store_join::store_id)))
                .filter(patient_stores.field(store::site_id).eq(for_site))
                .select(patient_name_links.field(name_link::id).nullable())
        )
    )),
    // Resolve a patient by their (resolved) name_id: match changelog rows whose patient_link_id
    // points at any name_link row resolving to that name_id.
    //   changelog.patient_link_id IN (SELECT name_link.id FROM name_link WHERE name_link.name_id = $patient_id)
    // `patient_name_links` (a name_link alias) avoids colliding with the outer query's name_link join.
    (patient_id, subquery: String, |for_patient| changelog_with_links::patient_link_id.eq_any(
        patient_name_links
            .filter(patient_name_links.field(name_link::name_id).eq(for_patient))
            .select(patient_name_links.field(name_link::id).nullable())
    )),
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
        use ChangelogCondition as C;
        use Distribution::*;
        let mut inner_or_conditions = vec![];
        for distribution in Distribution::iter() {
            let table_names =
                distribution.get_table_names_for_distribution(sync_style_options.clone());

            if table_names.is_empty() {
                continue;
            }

            let pre_condition = C::table_name::any(table_names);

            let condition = match distribution {
                Central => C::And(vec![
                    // We have central and remote records with same table_name, so need to make sure to include only central ones (where store_id is null)
                    C::store_id::is_null(),
                    // We have patients that are also central data, therefore patient_id should be null
                    C::patient_link_id::is_null(),
                ]),
                NotDistributed => {
                    // Don't sync
                    continue;
                }
                Remote => C::store_site_id::matching(site_id),
                RemoteOwned => {
                    // Central never has edits to push back — relay only during initialisation.
                    if !is_initialising {
                        continue;
                    }
                    C::store_site_id::matching(site_id)
                }
                Transfer => C::transfer_site_id::matching(site_id),
                Patient => C::patient_site_id::matching(site_id),
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
        use ChangelogCondition as C;
        use Distribution::*;

        let table_names = Patient.get_table_names_for_distribution(sync_style_options);

        C::And(vec![
            C::table_name::any(table_names),
            C::patient_site_id::matching(site_id),
        ])
    }

    pub fn data_for_store(store_id: &str) -> ChangelogCondition::Inner {
        use ChangelogCondition as C;
        use Distribution::*;

        let mut store_scoped_table_names = Remote.get_table_names_for_distribution(None);
        store_scoped_table_names.extend(RemoteOwned.get_table_names_for_distribution(None));
        let transfer_table_names = Transfer.get_table_names_for_distribution(None);

        C::Or(vec![
            C::And(vec![
                C::table_name::any(store_scoped_table_names),
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
        use ChangelogCondition as C;

        let msupply_central_server_id = KeyValueStoreRepository::new(connection)
            .get_i32(KeyType::SettingsSyncCentralServerSiteId)?
            .ok_or(LegacyDataFilterError::CentralSiteIdNotSet)?;

        let table_names: Vec<_> = ChangelogTableName::iter()
            // OG central takes all records that have a V5 transport tag
            .filter(|table| table.sync_style().transport.is_v5)
            .collect();

<<<<<<< HEAD
    query
}

/// Clamps a changelog query to the max safe cursor reported by the
/// `ChangelogCursorTracker`, so reads never advance past an in-flight
/// (uncommitted, lower) changelog cursor on another connection.
///
/// Motivation:
/// When querying changelog entries, ongoing transactions might continue adding changelog entries
/// to the queried range of changelogs.
/// This is because Postgres has Read Committed isolation level (instead of Serialized in Sqlite).
/// However, we assume that there will be no new changelog entries in the queried range in the
/// future, e.g. when updating the cursor position.
///
/// For example, a changelog may contain [1, 3, 4, 5] while another (slow) tx is about to commit a
/// changelog row with cursor = 2.
/// If we update the latest changelog cursor to 5, the changelog with cursor = 2 will be left
/// unhandled when continuing from the latest cursor position.
///
/// While that tx is in flight the tracker reports a safe cursor below 2, so this filter caps the
/// query at that boundary. The ceiling comes from the raw `changelog` table and is conservative vs
/// the `changelog_deduped` view (`MAX(deduped) <= MAX(raw)`). When no tx is in flight the tracker
/// returns `None` and the query is unchanged. This replaces the previous `LOCK TABLE` approach,
/// which blocked concurrent readers under load.
fn clamp_to_safe_cursor(
    connection: &StorageConnection,
    query: BoxedChangelogQuery,
) -> BoxedChangelogQuery {
    match ChangelogCursorTracker::max_safe_cursor(connection) {
        Some(safe) => query.filter(changelog_deduped::cursor.le(safe as i64)),
        None => query,
=======
        Ok(C::And(vec![
            C::table_name::any(table_names),
            C::source_site_id::not_equal(msupply_central_server_id),
        ]))
>>>>>>> origin/v3.0.0-RC
    }
}

impl ChangelogFilter {
    // Push from OMS remote
    pub fn all_data_edited_on_site(site_id: i32) -> ChangelogCondition::Inner {
        ChangelogCondition::source_site_id::equal(site_id)
    }
}

#[cfg(test)]
mod print_query_tests {
    use super::*;
<<<<<<< HEAD
    use strum::IntoEnumIterator;
    use util::assert_matches;

    use crate::{mock::MockDataInserts, test_db::setup_all};
    #[cfg(feature = "postgres")]
    use crate::{
        ClinicianRow, ClinicianRowRepository, ClinicianRowRepositoryTrait, RepositoryError,
        TransactionError,
    };

    /// Concurrent-tx race (the scenario the `ChangelogCursorTracker` guards): while connection A
    /// holds an in-flight (uncommitted, lower) changelog cursor, connection B commits a *higher*
    /// cursor. Without clamping, a reader on a third connection would return the higher committed
    /// row and advance its push cursor past A's in-flight row, skipping it forever. The tracker
    /// caps reads at A's tracked boundary until A commits.
    ///
    /// Postgres-only: SQLite serialises writers under `BEGIN IMMEDIATE`, so a concurrent in-flight
    /// tx on a separate connection cannot be reproduced (and the channel handshake below would
    /// deadlock on the single writer).
    #[cfg(feature = "postgres")]
    #[tokio::test(flavor = "multi_thread", worker_threads = 2)]
    async fn test_changelog_clamped_by_in_flight_tx() {
        let (_, connection, connection_manager, _) = setup_all(
            "test_changelog_clamped_by_in_flight_tx",
            MockDataInserts::none(),
        )
        .await;

        let not_system_log = || {
            Some(
                ChangelogFilter::new()
                    .table_name(EqualFilter::not_equal_to(ChangelogTableName::SystemLog)),
            )
        };

        let observer = connection_manager.connection().unwrap();
        let cursor_before = ChangelogRepository::new(&observer)
            .absolute_latest_cursor()
            .unwrap();

        // Channels to drive connection A: signal it has registered an in-flight cursor, then
        // signal it to commit.
        let (registered_tx, registered_rx) = std::sync::mpsc::channel::<()>();
        let (release_tx, release_rx) = std::sync::mpsc::channel::<()>();

        let manager_a = connection_manager.clone();
        let slow_tx = tokio::task::spawn_blocking(move || {
            let conn = manager_a.connection().unwrap();
            let _: Result<(), TransactionError<RepositoryError>> =
                conn.transaction_sync(|con| -> Result<(), RepositoryError> {
                    ClinicianRowRepository::new(con).upsert_one(&ClinicianRow {
                        id: "clinician_in_flight".to_string(),
                        is_active: true,
                        ..Default::default()
                    })?;
                    registered_tx.send(()).unwrap();
                    release_rx.recv().unwrap();
                    Ok(())
                });
        });

        registered_rx.recv().unwrap();

        // Connection B commits a higher changelog cursor while A's lower cursor is still in flight.
        ClinicianRowRepository::new(&connection)
            .upsert_one(&ClinicianRow {
                id: "clinician_committed_after".to_string(),
                is_active: true,
                ..Default::default()
            })
            .unwrap();

        // The clamp is active: safe cursor is pegged below the (now higher) raw max.
        assert!(ChangelogCursorTracker::max_safe_cursor(&observer).is_some());
        let safe_during = ChangelogRepository::new(&observer).latest_cursor().unwrap();
        let raw_during = ChangelogRepository::new(&observer)
            .absolute_latest_cursor()
            .unwrap();
        assert!(
            safe_during <= cursor_before && safe_during < raw_during,
            "expected safe cursor clamped (<= {}, < raw {}), got {}",
            cursor_before,
            raw_during,
            safe_during
        );

        // The reader must not return the committed-after row past the clamp.
        let rows_during = ChangelogRepository::new(&observer)
            .changelogs(0, 100, not_system_log())
            .unwrap();
        assert!(
            !rows_during
                .iter()
                .any(|r| r.record_id == "clinician_committed_after"),
            "reader returned a row past the in-flight clamp"
        );

        // `count` must clamp identically to the row reader, otherwise a push/processor loop that
        // continues while `count > 0` but the clamped reader returns nothing would spin until the
        // in-flight tx commits. (Fails if `count` is left un-clamped — it would include the
        // committed-after row.)
        let count_during = ChangelogRepository::new(&observer)
            .count(0, not_system_log())
            .unwrap();
        assert_eq!(
            count_during as usize,
            rows_during.len(),
            "count must clamp identically to changelogs() while a tx is in flight"
        );

        // Release A; once it commits the tracker entry is removed and the clamp lifts.
        release_tx.send(()).unwrap();
        slow_tx.await.unwrap();

        assert_eq!(ChangelogCursorTracker::max_safe_cursor(&observer), None);
        let safe_after = ChangelogRepository::new(&observer).latest_cursor().unwrap();
        assert!(
            safe_after > cursor_before,
            "expected cursor to advance past {} after commit, got {}",
            cursor_before,
            safe_after
        );

        let rows_after = ChangelogRepository::new(&observer)
            .changelogs(0, 100, not_system_log())
            .unwrap();
        assert!(rows_after
            .iter()
            .any(|r| r.record_id == "clinician_in_flight"));
        assert!(rows_after
            .iter()
            .any(|r| r.record_id == "clinician_committed_after"));
=======

    // To see the SQL: remove `#[ignore]`, uncomment the `debug_query` line inside
    // `ChangelogRepository::query_cursor_window`, and run this test with --nocapture.
    #[ignore]
    #[actix_rt::test]
    async fn print_all_data_for_site_query_for_site_300() {
        let (_, connection, _, _) = crate::test_db::setup_all(
            "print_all_data_for_site_query_for_site_300",
            crate::mock::MockDataInserts::none(),
        )
        .await;

        // Mirrors a single cursor window of `ChangelogRepository::query`.
        // Values are illustrative (cursor window 0..=250_000, limit 100).
        let filter = ChangelogFilter::all_data_for_site(300, false, None);

        ChangelogRepository::new(&connection)
            .query_cursor_window(filter, 0, 250_000, 100)
            .unwrap();
>>>>>>> origin/v3.0.0-RC
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
