use crate::{
    db_diesel::{changelog::changelog_cursor_tracker::ChangelogCursorTracker, store_row::store},
    diesel_macros::diesel_string_enum,
    dynamic_query_filter::create_condition,
    name_link,
    name_store_join::name_store_join,
    vaccination_row::vaccination,
    KeyType, KeyValueStoreRepository, RepositoryError, StorageConnection, TransactionNotification,
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
    #[derive(Clone, Eq, TS)]
    #[strum(serialize_all = "SCREAMING_SNAKE_CASE")]
    pub enum RowActionType {
        #[default]
        Upsert,
        Delete,
    }
}

diesel_string_enum! {
    #[derive(Clone, Eq, Hash, strum::EnumIter, TS)]
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
        StockRelocation,
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
        // Fallback for a table this site doesn't recognise (e.g. a newer central
        // pushing a table added after this site's version). The raw name is preserved
        // so the record lands in the sync buffer under its real table name and is simply
        // skipped at integration (no translator matches) instead of failing the whole
        // batch parse. Must remain the last variant — see `diesel_string_enum!`.
        #[strum(default, transparent)]
        Other(String),
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
            .first::<Option<i64>>(self.connection.lock().connection())?;
        Ok(result.unwrap_or(0) as u64)
    }

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
    // Patients visible at a specific store (via name_store_join), rather than at a whole site.
    // Used by `data_for_store` to re-sync a moved store's patient data without pulling every
    // patient on the destination site. Mirrors `patient_site_id` but constrains on the
    // name_store_join's store_id directly instead of the joined store's site_id.
    (patient_store_id, subquery: String, |for_store| changelog_with_links::patient_link_id.is_not_null().and(
        changelog_with_links::patient_link_id.eq_any(
            name_store_join::table
                .inner_join(patient_name_links.on(name_store_join::name_id.eq(patient_name_links.field(name_link::id))))
                .filter(name_store_join::store_id.eq(for_store))
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
    // Which changelog rows belong to this site, by distribution. Shared by
    // `all_data_for_site` and `multi_device_all_data_for_site` so they can't drift.
    fn site_distribution_conditions(
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

        C::Or(inner_or_conditions)
    }

    pub fn all_data_for_site(
        site_id: i32,
        is_initialising: bool,
        sync_style_options: Option<SyncVersions>,
    ) -> ChangelogCondition::Inner {
        use ChangelogCondition as C;

        let mut outer_and_condition = vec![Self::site_distribution_conditions(
            site_id,
            is_initialising,
            sync_style_options,
        )];
        // We want to avoid circular sync, when record arrive on central server from remote site
        // it is marked with the source_site_id = site that sent it, so when the site pulls data
        // in next iteration we exclude those record. But during initialisation we want to sync all records for the site
        if !is_initialising {
            outer_and_condition.push(C::source_site_id::not_equal(site_id));
        }

        C::And(outer_and_condition)
    }

    // Pull from OMS central to multi device remote site
    pub fn multi_device_all_data_for_site(
        site_id: i32,
        is_initialising: bool,
        sync_style_options: Option<SyncVersions>,
    ) -> ChangelogCondition::Inner {
        use ChangelogCondition as C;

        let table_names: Vec<ChangelogTableName> = ChangelogTableName::iter()
            .filter(|table| table.sync_style().multi_device_site)
            .collect();

        C::And(vec![
            // No anti-circular exclusion: devices on a multi-device site share one site_id,
            // so records the site sourced must still relay to its other devices.
            Self::site_distribution_conditions(site_id, is_initialising, sync_style_options),
            C::table_name::any(table_names),
        ])
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
        let patient_table_names = Patient.get_table_names_for_distribution(None);

        C::Or(vec![
            C::And(vec![
                C::table_name::any(store_scoped_table_names),
                C::store_id::equal(store_id.to_string()),
            ]),
            C::And(vec![
                C::table_name::any(transfer_table_names),
                C::transfer_store_id::equal(store_id.to_string()),
            ]),
            // Patient-scoped data for patients visible at this store. Without this, a moved
            // store would arrive on the destination site missing its patients' data (#12325).
            // Scoped to the store (via name_store_join) rather than the whole site, so we only
            // re-pull patients this store can actually see.
            C::And(vec![
                C::table_name::any(patient_table_names),
                C::patient_store_id::matching(store_id.to_string()),
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

        Ok(C::And(vec![
            C::table_name::any(table_names),
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

impl ChangelogFilter {
    // Push from OMS multi device remote
    pub fn all_data_edited_on_multi_device_site(site_id: i32) -> ChangelogCondition::Inner {
        use ChangelogCondition as C;

        let table_names: Vec<ChangelogTableName> = ChangelogTableName::iter()
            .filter(|table| table.sync_style().multi_device_site)
            .collect();

        C::And(vec![
            Self::all_data_edited_on_site(site_id),
            C::table_name::any(table_names),
        ])
    }
}

#[cfg(test)]
mod print_query_tests {
    use super::*;

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

    /// The v7 wire format uses serde and must stay PascalCase (the variant identifier),
    /// independent of the `strum` `snake_case` used for the DB column.
    #[test]
    fn changelog_table_name_serde_is_pascal_case() {
        assert_eq!(
            serde_json::to_string(&ChangelogTableName::StockLine).unwrap(),
            "\"StockLine\""
        );
        assert_eq!(
            serde_json::from_str::<ChangelogTableName>("\"StockLine\"").unwrap(),
            ChangelogTableName::StockLine
        );
        // DB column stays snake_case via strum.
        assert_eq!(ChangelogTableName::StockLine.to_string(), "stock_line");
    }

    /// Regression for issue #12361: a table name a newer central knows but this site
    /// doesn't must deserialize to `Other(..)` instead of failing the whole batch parse,
    /// and must round-trip back out unchanged so it reaches the sync buffer under its
    /// real name.
    #[test]
    fn changelog_table_name_unknown_falls_back_to_other() {
        // serde (v7 wire) — unknown PascalCase name is captured verbatim.
        let parsed: ChangelogTableName = serde_json::from_str("\"CustomField\"").unwrap();
        assert_eq!(parsed, ChangelogTableName::Other("CustomField".to_string()));
        assert_eq!(
            serde_json::to_string(&parsed).unwrap(),
            "\"CustomField\"",
            "Other round-trips back to its raw wire name"
        );

        // strum (DB column / sync buffer `to_string()`) — same fallback, inner string
        // preserved thanks to `#[strum(transparent)]`.
        use std::str::FromStr;
        let from_db = ChangelogTableName::from_str("custom_field").unwrap();
        assert_eq!(from_db, ChangelogTableName::Other("custom_field".to_string()));
        assert_eq!(from_db.to_string(), "custom_field");
    }
}
