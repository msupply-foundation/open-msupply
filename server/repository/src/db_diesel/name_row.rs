use super::{
    NameType, StorageConnection, currency_row::currency, custom_fields_json::JsonValue,
    location_type_row::location_type, master_list_name_join::master_list_name_join,
    master_list_row::master_list, name_store_join::name_store_join, program_row::program,
    store_row::store,
};
use crate::{
    ChangelogRepository, DBType, Delete, EqualFilter, NameLinkRow, NameLinkRowRepository,
    RowActionType, StringFilter,
    diesel_macros::{apply_equal_filter, apply_string_filter, apply_string_or_filter},
    item_link, name_link,
    repository_error::RepositoryError,
    trim, trim_spaces,
};
use crate::{ChangelogSyncType, RowOrId, SourceSiteId, Upsert};
use chrono::{NaiveDate, NaiveDateTime};
use diesel::prelude::*;
use diesel_derive_enum::DbEnum;
use serde::{Deserialize, Serialize};
use ts_rs::TS;
use util::constants::SYSTEM_NAME_CODES;

table! {
    #[sql_name = "name"]
    name (id) {
        id -> Text,
        #[sql_name = "name"]
        name_  -> Text,
        code -> Text,
        #[sql_name = "type"]
        type_ -> crate::db_diesel::name_row::NameRowTypeMapping,
        is_customer -> Bool,
        is_supplier -> Bool,
        supplying_store_id -> Nullable<Text>,
        first_name -> Nullable<Text>,
        last_name -> Nullable<Text>,
        gender -> Nullable<crate::db_diesel::name_row::GenderTypeMapping>,
        date_of_birth -> Nullable<Date>,
        phone -> Nullable<Text>,
        charge_code-> Nullable<Text>,
        comment -> Nullable<Text>,
        country -> Nullable<Text>,
        address1 -> Nullable<Text>,
        address2 -> Nullable<Text>,
        email -> Nullable<Text>,
        website -> Nullable<Text>,
        is_manufacturer -> Bool,
        is_donor -> Bool,
        on_hold -> Bool,
        next_of_kin_id -> Nullable<Text>,
        next_of_kin_name -> Nullable<Text>,
        created_datetime -> Nullable<Timestamp>,
        is_deceased -> Bool,
        national_health_number -> Nullable<Text>,
        date_of_death -> Nullable<Date>,
        custom_data -> Nullable<Text>,
        deleted_datetime -> Nullable<Timestamp>,
        hsh_code -> Nullable<Text>,
        hsh_name -> Nullable<Text>,
        margin -> Nullable<Double>,
        freight_factor -> Nullable<Double>,
        currency_id -> Nullable<Text>,
        custom_fields -> Nullable<crate::db_diesel::custom_fields_json::CustomFieldsJson>,
    }
}

table! {
    #[sql_name = "name"]
    name_oms_fields (id) {
        id -> Text,
        properties -> Nullable<Text>,
    }
}

alias!(name_oms_fields as name_oms_fields_alias: NameOmsFields);

joinable!(name_oms_fields -> name (id));
joinable!(name -> currency (currency_id));
allow_tables_to_appear_in_same_query!(name, item_link);
allow_tables_to_appear_in_same_query!(name, name_link);
allow_tables_to_appear_in_same_query!(name, name_oms_fields);
allow_tables_to_appear_in_same_query!(name, location_type);
allow_tables_to_appear_in_same_query!(name, currency);
// for names query
allow_tables_to_appear_in_same_query!(name_oms_fields, item_link);
allow_tables_to_appear_in_same_query!(name_oms_fields, store);
allow_tables_to_appear_in_same_query!(name_oms_fields, name_store_join);
// for programs query
allow_tables_to_appear_in_same_query!(name_oms_fields, master_list_name_join);
allow_tables_to_appear_in_same_query!(name_oms_fields, master_list);
allow_tables_to_appear_in_same_query!(name_oms_fields, program);

// If adding to this enum remember that we need to add migrations.
// Old versions may integrate through sync the new gender variant as `None`.
// Your migration should address this by checking all records with `None` values and
// convert them to the new more concrete variant you have added.
#[derive(DbEnum, Debug, Clone, PartialEq, Eq, Serialize, Deserialize, TS, Default)]
#[serde(rename_all = "SCREAMING_SNAKE_CASE")]
#[DbValueStyle = "SCREAMING_SNAKE_CASE"]
pub enum GenderType {
    Female,
    Male,
    Transgender,
    TransgenderMale,
    TransgenderMaleHormone,
    TransgenderMaleSurgical,
    TransgenderFemale,
    TransgenderFemaleHormone,
    TransgenderFemaleSurgical,
    #[default]
    Unknown,
    NonBinary,
}

impl GenderType {
    pub fn equal_to(&self) -> EqualFilter<GenderType> {
        EqualFilter {
            equal_to: Some(self.clone()),
            not_equal_to: None,
            not_equal_to_or_null: None,
            equal_any: None,
            not_equal_all: None,
            equal_any_or_null: None,
            is_null: None,
        }
    }
}

#[derive(DbEnum, Debug, Clone, PartialEq, Eq, Serialize, Deserialize, Default, TS)]
#[serde(rename_all = "SCREAMING_SNAKE_CASE")]
#[DbValueStyle = "SCREAMING_SNAKE_CASE"]
#[PgType = "name_type"]
pub enum NameRowType {
    Facility,
    Patient,
    Build,
    Invad,
    Repack,
    #[default]
    Store,
    // TS complains about serde other, other was a capture for unknown types, it's safe to ignore it in type definition
    #[ts(skip)]
    #[serde(other)]
    Others,
}

impl NameRowType {
    pub fn is_facility_or_store(&self) -> bool {
        *self == NameRowType::Facility || *self == NameRowType::Store
    }
}

#[derive(
    Clone, Queryable, Insertable, Debug, PartialEq, AsChangeset, Default, Serialize, Deserialize, TS,
)]
#[diesel(treat_none_as_null = true)]
#[diesel(table_name = name)]
pub struct NameRow {
    pub id: String,
    #[diesel(column_name = name_)]
    pub name: String,
    pub code: String,
    #[diesel(column_name = type_)]
    pub r#type: NameRowType,
    pub is_customer: bool,
    pub is_supplier: bool,

    pub supplying_store_id: Option<String>,
    pub first_name: Option<String>,
    pub last_name: Option<String>,

    pub gender: Option<GenderType>,
    pub date_of_birth: Option<NaiveDate>,
    pub phone: Option<String>,
    pub charge_code: Option<String>,

    pub comment: Option<String>,
    pub country: Option<String>,

    pub address1: Option<String>,
    pub address2: Option<String>,

    pub email: Option<String>,

    pub website: Option<String>,

    pub is_manufacturer: bool,
    pub is_donor: bool,
    pub on_hold: bool,

    pub next_of_kin_id: Option<String>,
    pub next_of_kin_name: Option<String>,

    pub created_datetime: Option<NaiveDateTime>,

    pub is_deceased: bool,
    pub national_health_number: Option<String>,
    pub date_of_death: Option<NaiveDate>,
    #[diesel(column_name = "custom_data")]
    pub custom_data_string: Option<String>,

    // Acts as a flag for soft deletion
    pub deleted_datetime: Option<NaiveDateTime>,

    pub hsh_code: Option<String>,
    pub hsh_name: Option<String>,
    pub margin: Option<f64>,
    pub freight_factor: Option<f64>,
    pub currency_id: Option<String>,
    #[ts(skip)]
    pub custom_fields: Option<JsonValue>,
}
#[derive(
    Clone, Queryable, Insertable, Debug, PartialEq, Eq, AsChangeset, Default, Serialize, Deserialize,
)]
#[diesel(treat_none_as_null = true)]
#[diesel(table_name = name_oms_fields)]
pub struct NameOmsFieldsRow {
    pub id: String,
    pub properties: Option<String>,
}

/// A kind of record that shows a name, so the name can't be deleted. Joins that only describe the
/// name, such as which stores see it, its master lists, tags, insurance and contacts, aren't here.
#[derive(Debug, Clone, Copy, PartialEq)]
pub enum NameUser {
    Store,
    Invoice,
    InvoiceLine,
    Requisition,
    PurchaseOrder,
    PurchaseOrderLine,
    StockLine,
    StocktakeLine,
    RnrForm,
    IndicatorValue,
    ItemVariant,
    BarcodeProposal,
    Asset,
    Vaccination,
}

impl NameRow {
    /// One of the names the server records its own work against, such as inventory adjustments.
    /// The server finds them by exact code, so only that code makes one.
    pub fn is_system_name(&self) -> bool {
        SYSTEM_NAME_CODES.contains(&self.code.as_str())
    }
}

/// `NameRow::is_system_name` in SQL, or its opposite, for any query over the name table.
pub(crate) fn system_name_filter<QS>(
    is_system_name: bool,
) -> Box<dyn BoxableExpression<QS, DBType, SqlType = diesel::sql_types::Bool>>
where
    name::code: SelectableExpression<QS>,
{
    if is_system_name {
        Box::new(name::code.eq_any(SYSTEM_NAME_CODES))
    } else {
        Box::new(name::code.ne_all(SYSTEM_NAME_CODES))
    }
}

/// The name table alone, without the store joins `NameFilter` brings.
#[derive(Clone, Default, Debug, PartialEq)]
pub struct NameRowFilter {
    pub code_or_name: Option<StringFilter>,
    pub r#type: Option<EqualFilter<NameRowType>>,
    pub is_deleted: Option<bool>,
    /// As `NameRow::is_system_name`.
    pub is_system_name: Option<bool>,
}

type BoxedNameRowQuery = name::BoxedQuery<'static, DBType>;

fn filtered(filter: NameRowFilter) -> BoxedNameRowQuery {
    let NameRowFilter {
        code_or_name,
        r#type,
        is_deleted,
        is_system_name,
    } = filter;
    let mut query = name::table.into_boxed();
    // The or filter goes before the and filters.
    if code_or_name.is_some() {
        apply_string_filter!(query, code_or_name.clone(), name::code);
        apply_string_or_filter!(query, code_or_name, name::name_);
    }
    apply_equal_filter!(query, r#type, name::type_);
    query = match is_deleted {
        Some(true) => query.filter(name::deleted_datetime.is_not_null()),
        Some(false) => query.filter(name::deleted_datetime.is_null()),
        None => query,
    };
    match is_system_name {
        Some(is_system_name) => query.filter(system_name_filter(is_system_name)),
        None => query,
    }
}

pub struct NameRowRepository<'a> {
    connection: &'a StorageConnection,
}

fn insert_or_ignore_name_link(
    connection: &StorageConnection,
    name_row: &NameRow,
) -> Result<(), RepositoryError> {
    let name_link_row = NameLinkRow {
        id: name_row.id.clone(),
        name_id: name_row.id.clone(),
    };
    NameLinkRowRepository::new(connection).insert_one_or_ignore(&name_link_row)?;
    Ok(())
}

impl<'a> NameRowRepository<'a> {
    pub fn new(connection: &'a StorageConnection) -> Self {
        NameRowRepository { connection }
    }

    fn _upsert_one(&self, name_row: &NameRow) -> Result<(), RepositoryError> {
        diesel::insert_into(name::table)
            .values(name_row)
            .on_conflict(name::id)
            .do_update()
            .set(name_row)
            .execute(self.connection.lock().connection())?;
        insert_or_ignore_name_link(self.connection, name_row)?;
        Ok(())
    }

    pub fn upsert_one(&self, row: &NameRow) -> Result<(), RepositoryError> {
        self._upsert_one(row)?;
        let changelog = NameRow::generate_changelog(
            RowOrId::Row(row),
            self.connection,
            RowActionType::Upsert,
            SourceSiteId::CurrentSiteId,
        )?;
        ChangelogRepository::new(self.connection).insert(&changelog)
    }

    // An already deleted name keeps its original deletion time
    fn _mark_deleted(&self, name_id: &str) -> Result<(), RepositoryError> {
        diesel::update(
            name::table
                .filter(name::id.eq(name_id))
                .filter(name::deleted_datetime.is_null()),
        )
        .set(name::deleted_datetime.eq(Some(chrono::Utc::now().naive_utc())))
        .execute(self.connection.lock().connection())?;
        Ok(())
    }

    /// The first kind of record found that shows the name, through any of its links: each table
    /// here is its link-resolving view, so a record pointing at a merged name's link counts.
    pub fn used_by(&self, name_id: &str) -> Result<Option<NameUser>, RepositoryError> {
        use super::{
            assets::asset_row::asset, barcode_proposal_row::barcode_proposal,
            indicator_value_row::indicator_value, invoice_line_row::invoice_line,
            invoice_row::invoice, item_variant::item_variant_row::item_variant,
            purchase_order_line_row::purchase_order_line, purchase_order_row::purchase_order,
            requisition::requisition_row::requisition, rnr_form_row::rnr_form,
            stock_line_row::stock_line, stocktake_line_row::stocktake_line,
            vaccination_row::vaccination,
        };
        use diesel::dsl::exists;
        let mut guard = self.connection.lock();
        let connection = guard.connection();
        macro_rules! check {
            ($user:expr, $query:expr) => {
                if diesel::select(exists($query)).get_result::<bool>(connection)? {
                    return Ok(Some($user));
                }
            };
        }
        // One column per check, each with its own index: an OR across columns resolved through
        // separate link joins makes Postgres read the whole table.
        check!(
            NameUser::Store,
            store::table.filter(store::name_id.eq(name_id))
        );
        check!(
            NameUser::Invoice,
            invoice::table.filter(invoice::name_id.eq(name_id))
        );
        check!(
            NameUser::Invoice,
            invoice::table.filter(invoice::default_donor_id.eq(name_id))
        );
        check!(
            NameUser::InvoiceLine,
            invoice_line::table.filter(invoice_line::donor_id.eq(name_id))
        );
        check!(
            NameUser::InvoiceLine,
            invoice_line::table.filter(invoice_line::manufacturer_id.eq(name_id))
        );
        check!(
            NameUser::Requisition,
            requisition::table.filter(requisition::name_id.eq(name_id))
        );
        check!(
            NameUser::PurchaseOrder,
            purchase_order::table.filter(purchase_order::supplier_name_id.eq(name_id))
        );
        check!(
            NameUser::PurchaseOrder,
            purchase_order::table.filter(purchase_order::donor_id.eq(name_id))
        );
        check!(
            NameUser::PurchaseOrderLine,
            purchase_order_line::table.filter(purchase_order_line::manufacturer_id.eq(name_id))
        );
        check!(
            NameUser::StockLine,
            stock_line::table.filter(stock_line::supplier_id.eq(name_id))
        );
        check!(
            NameUser::StockLine,
            stock_line::table.filter(stock_line::donor_id.eq(name_id))
        );
        check!(
            NameUser::StockLine,
            stock_line::table.filter(stock_line::manufacturer_id.eq(name_id))
        );
        check!(
            NameUser::StocktakeLine,
            stocktake_line::table.filter(stocktake_line::donor_id.eq(name_id))
        );
        check!(
            NameUser::StocktakeLine,
            stocktake_line::table.filter(stocktake_line::manufacturer_id.eq(name_id))
        );
        check!(
            NameUser::RnrForm,
            rnr_form::table.filter(rnr_form::name_id.eq(name_id))
        );
        check!(
            NameUser::IndicatorValue,
            indicator_value::table.filter(indicator_value::customer_name_id.eq(name_id))
        );
        check!(
            NameUser::ItemVariant,
            item_variant::table.filter(item_variant::manufacturer_id.eq(name_id))
        );
        check!(
            NameUser::BarcodeProposal,
            barcode_proposal::table.filter(barcode_proposal::manufacturer_id.eq(name_id))
        );
        // Holds the name's id itself, not a link. A deleted asset no longer shows it.
        check!(
            NameUser::Asset,
            asset::table.filter(
                asset::donor_name_id
                    .eq(name_id)
                    .and(asset::deleted_datetime.is_null())
            )
        );
        check!(
            NameUser::Vaccination,
            vaccination::table.filter(vaccination::facility_name_id.eq(name_id))
        );
        Ok(None)
    }

    pub fn mark_deleted(&self, name_id: &str) -> Result<(), RepositoryError> {
        self._mark_deleted(name_id)?;
        let changelog = NameRow::generate_changelog(
            RowOrId::Id(name_id),
            self.connection,
            RowActionType::Upsert,
            SourceSiteId::CurrentSiteId,
        )?;
        ChangelogRepository::new(self.connection).insert(&changelog)
    }

    pub async fn insert_one(&self, name_row: &NameRow) -> Result<(), RepositoryError> {
        diesel::insert_into(name::table)
            .values(name_row)
            .execute(self.connection.lock().connection())?;
        insert_or_ignore_name_link(self.connection, name_row)?;
        Ok(())
    }

    pub fn find_one_by_id(&self, name_id: &str) -> Result<Option<NameRow>, RepositoryError> {
        let result = name::table
            .filter(name::id.eq(name_id))
            .first(self.connection.lock().connection())
            .optional()?;
        Ok(result)
    }

    pub fn find_one_by_code(&self, name_code: &str) -> Result<Option<NameRow>, RepositoryError> {
        let result = name::table
            .filter(name::code.eq(name_code))
            .first(self.connection.lock().connection())
            .optional()?;
        Ok(result)
    }

    /// Every type, deleted names included. Letter case counts; spaces around either code don't.
    pub fn find_by_trimmed_code(&self, code: &str) -> Result<Vec<NameRow>, RepositoryError> {
        Ok(name::table
            .filter(trim(name::code).eq(trim_spaces(code)))
            .order(name::id.asc())
            .load(self.connection.lock().connection())?)
    }

    /// Patients included, unlike `NameRepository`, which lists a store's names. Sorted by code,
    /// then type, then id.
    pub fn query_by_filter(&self, filter: NameRowFilter) -> Result<Vec<NameRow>, RepositoryError> {
        Ok(filtered(filter)
            .order((name::code.asc(), name::type_.asc(), name::id.asc()))
            .load(self.connection.lock().connection())?)
    }

    pub fn count_by_filter(&self, filter: NameRowFilter) -> Result<i64, RepositoryError> {
        Ok(filtered(filter)
            .count()
            .get_result(self.connection.lock().connection())?)
    }

    pub fn find_many_by_id(&self, ids: &[String]) -> Result<Vec<NameRow>, RepositoryError> {
        let result = name::table
            .filter(name::id.eq_any(ids))
            .load(self.connection.lock().connection())?;
        Ok(result)
    }

    pub fn find_one_oms_fields_by_id(
        &self,
        name_id: &str,
    ) -> Result<Option<NameOmsFieldsRow>, RepositoryError> {
        let result = name_oms_fields::table
            .filter(name_oms_fields::id.eq(name_id))
            .first(self.connection.lock().connection())
            .optional()?;
        Ok(result)
    }

    pub fn find_many_oms_fields_by_id(
        &self,
        ids: &[String],
    ) -> Result<Vec<NameOmsFieldsRow>, RepositoryError> {
        Ok(name_oms_fields::table
            .filter(name_oms_fields::id.eq_any(ids))
            .load(self.connection.lock().connection())?)
    }

    pub fn update_properties(
        &self,
        name_id: &str,
        properties: &Option<String>,
    ) -> Result<(), RepositoryError> {
        diesel::update(name_oms_fields::table.find(name_id))
            .set(name_oms_fields::properties.eq(properties))
            .execute(self.connection.lock().connection())?;

        let changelog = NameOmsFieldsRow::generate_changelog(
            name_id.to_string(),
            self.connection,
            RowActionType::Upsert,
            SourceSiteId::CurrentSiteId,
        )?;
        ChangelogRepository::new(self.connection).insert(&changelog)
    }

    /// Update the new-system `name.custom_fields` JSONB blob.
    ///
    /// Column-scoped (`UPDATE ... SET custom_fields`) rather than a whole-row
    /// `_upsert_one`. This is a property of the *local* write only: it avoids a
    /// read-modify-write race (writing the whole row back would revert any sibling
    /// column a concurrent sync integrated meanwhile) and touches only this column.
    /// It is NOT a sync-time guarantee — the `Name` changelog carries record_id and
    /// the full current row is whole-row upserted at receiving sites, so
    /// `custom_fields` is overwritten wholesale on integration. Owned legacy keys
    /// (custom_1/2/3) clobbered by a stale remote push are healed by the central v5
    /// merge-on-import (see `merge_legacy_custom_fields`); non-owned (OMS-authored)
    /// keys are last-writer-wins like every other name column.
    ///
    /// Emits a `Name` changelog so the value rides the existing Name sync (Central +
    /// Patient). Unlike the legacy [`update_properties`], this targets the
    /// `name.custom_fields` column and the `Name` table rather than
    /// `name_oms_fields.properties` / `NameOmsFields`.
    pub fn update_custom_fields(
        &self,
        name_id: &str,
        custom_fields: &Option<JsonValue>,
    ) -> Result<(), RepositoryError> {
        diesel::update(name::table.find(name_id))
            .set(name::custom_fields.eq(custom_fields))
            .execute(self.connection.lock().connection())?;

        let changelog = NameRow::generate_changelog(
            RowOrId::Id(name_id),
            self.connection,
            RowActionType::Upsert,
            SourceSiteId::CurrentSiteId,
        )?;
        ChangelogRepository::new(self.connection).insert(&changelog)
    }
}

impl NameRowType {
    pub fn equal_to(&self) -> EqualFilter<Self> {
        EqualFilter {
            equal_to: Some(self.clone()),
            ..Default::default()
        }
    }
}

impl From<NameRowType> for NameType {
    fn from(from_value: NameRowType) -> NameType {
        use NameRowType as from;
        use NameType as to;
        match from_value {
            from::Facility => to::Facility,
            from::Invad => to::Invad,
            from::Repack => to::Repack,
            from::Store => to::Store,
            _ => to::Invad,
        }
    }
}

#[derive(Debug, Clone)]
pub struct NameRowDelete(pub String);
impl Delete for NameRowDelete {
    fn delete_sync(
        &self,
        con: &StorageConnection,
        sync_type: ChangelogSyncType,
    ) -> Result<(), RepositoryError> {
        let changelog = match sync_type {
            ChangelogSyncType::SyncTypeV5V6 { source_site_id } => NameRow::generate_changelog(
                RowOrId::Id(&self.0),
                con,
                RowActionType::Upsert,
                SourceSiteId::SourceSiteId(source_site_id),
            )?,
            ChangelogSyncType::SyncTypeV7 { changelog_row } => changelog_row,
        };

        NameRowRepository::new(con)._mark_deleted(&self.0)?;
        ChangelogRepository::new(con).insert(&changelog)?;
        Ok(())
    }
    // Test only
    fn assert_deleted(&self, con: &StorageConnection) {
        assert!(matches!(
            NameRowRepository::new(con).find_one_by_id(&self.0),
            Ok(Some(NameRow {
                deleted_datetime: Some(_),
                ..
            })) | Ok(None)
        ));
    }
}

impl Upsert for NameRow {
    fn upsert_sync(
        &self,
        con: &StorageConnection,
        sync_type: ChangelogSyncType,
    ) -> Result<(), RepositoryError> {
        NameRowRepository::new(con)._upsert_one(self)?;

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
            NameRowRepository::new(con).find_one_by_id(&self.id),
            Ok(Some(self.clone()))
        )
    }
}

impl Upsert for NameOmsFieldsRow {
    fn upsert_sync(
        &self,
        con: &StorageConnection,
        sync_type: ChangelogSyncType,
    ) -> Result<(), RepositoryError> {
        diesel::update(name_oms_fields::table.find(&self.id))
            .set(name_oms_fields::properties.eq(&self.properties))
            .execute(con.lock().connection())?;

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
            NameRowRepository::new(con).find_one_oms_fields_by_id(&self.id),
            Ok(Some(self.clone()))
        )
    }
}

#[cfg(test)]
mod test {
    use util::uuid::uuid;

    use crate::{
        ChangelogCondition, ChangelogRepository, ChangelogTableName, CursorAndLimit, EqualFilter,
        FilterBuilder, KeyType, KeyValueStoreRepository, NameFilter, NameRepository, NameRow,
        NameRowRepository, NameRowType, mock::MockDataInserts, test_db::setup_all,
    };

    // covers: OMS-REG-CDIO-01.135

    // Records that show a name count; joins that only describe it, and deleted assets, don't.
    #[actix_rt::test]
    async fn used_by_counts_records_that_show_a_name_but_not_its_joins() {
        use crate::{
            AssetRow, AssetRowRepository, ItemRow, ItemRowRepository, ItemVariantRow,
            ItemVariantRowRepository, NameStoreJoinRepository, NameStoreJoinRow, NameUser,
            StoreRow, StoreRowRepository,
        };
        let (_, connection, _, _) =
            setup_all("name_used_by_records_not_joins", MockDataInserts::none()).await;
        let names = NameRowRepository::new(&connection);
        for id in ["store_name", "maker", "donor", "old_donor", "visible"] {
            names
                .upsert_one(&NameRow {
                    id: id.to_string(),
                    ..Default::default()
                })
                .unwrap();
        }
        StoreRowRepository::new(&connection)
            .upsert_one(&StoreRow {
                id: "store".to_string(),
                name_id: "store_name".to_string(),
                ..Default::default()
            })
            .unwrap();
        ItemRowRepository::new(&connection)
            .upsert_one(&ItemRow {
                id: "item".to_string(),
                ..Default::default()
            })
            .unwrap();
        ItemVariantRowRepository::new(&connection)
            .upsert_one(&ItemVariantRow {
                id: "variant".to_string(),
                item_id: "item".to_string(),
                manufacturer_id: Some("maker".to_string()),
                ..Default::default()
            })
            .unwrap();
        let assets = AssetRowRepository::new(&connection);
        assets
            .upsert_one(
                &AssetRow {
                    id: "fridge".to_string(),
                    donor_name_id: Some("donor".to_string()),
                    ..Default::default()
                },
                None,
            )
            .unwrap();
        assets
            .upsert_one(
                &AssetRow {
                    id: "old_fridge".to_string(),
                    donor_name_id: Some("old_donor".to_string()),
                    deleted_datetime: Some(Default::default()),
                    ..Default::default()
                },
                None,
            )
            .unwrap();
        NameStoreJoinRepository::new(&connection)
            .upsert_one(&NameStoreJoinRow {
                id: "join".to_string(),
                store_id: "store".to_string(),
                name_is_customer: true,
                name_is_supplier: false,
                visible: true,
                name_id: "visible".to_string(),
            })
            .unwrap();

        assert_eq!(names.used_by("maker").unwrap(), Some(NameUser::ItemVariant));
        assert_eq!(names.used_by("donor").unwrap(), Some(NameUser::Asset));
        assert_eq!(names.used_by("old_donor").unwrap(), None);
        assert_eq!(names.used_by("visible").unwrap(), None);
    }

    // A record pointing at a merged name's link still uses the name it was merged into.
    #[actix_rt::test]
    async fn used_by_follows_merged_links() {
        use crate::{
            InvoiceRow, InvoiceRowRepository, NameLinkRow, NameLinkRowRepository, NameUser,
            StoreRow, StoreRowRepository,
        };
        let (_, connection, _, _) =
            setup_all("name_used_by_follows_merged_links", MockDataInserts::none()).await;
        let names = NameRowRepository::new(&connection);
        for id in ["store_name", "kept", "merged"] {
            names
                .upsert_one(&NameRow {
                    id: id.to_string(),
                    ..Default::default()
                })
                .unwrap();
        }
        StoreRowRepository::new(&connection)
            .upsert_one(&StoreRow {
                id: "store".to_string(),
                name_id: "store_name".to_string(),
                ..Default::default()
            })
            .unwrap();
        // The invoice is saved against the merged name's link.
        InvoiceRowRepository::new(&connection)
            .upsert_one(&InvoiceRow {
                id: "invoice".to_string(),
                name_id: "merged".to_string(),
                store_id: "store".to_string(),
                ..Default::default()
            })
            .unwrap();
        assert_eq!(names.used_by("kept").unwrap(), None);

        NameLinkRowRepository::new(&connection)
            .upsert_one(&NameLinkRow {
                id: "merged".to_string(),
                name_id: "kept".to_string(),
            })
            .unwrap();
        assert_eq!(names.used_by("kept").unwrap(), Some(NameUser::Invoice));
        assert_eq!(names.used_by("merged").unwrap(), None);
        assert_eq!(names.used_by("store_name").unwrap(), Some(NameUser::Store));
    }

    // Covers the v2.01 legacy `name.properties` column. A NameRow upsert must
    // not clobber values written via `update_properties()`.
    #[actix_rt::test]
    async fn name_sync_update_does_not_overwrite_properties() {
        let (_, connection, _, _) = setup_all(
            "name_sync_update_does_not_overwrite_properties",
            MockDataInserts::none(),
        )
        .await;

        let row_repo = NameRowRepository::new(&connection);

        let name_repo = NameRepository::new(&connection);

        let row = NameRow {
            id: uuid(),
            ..Default::default()
        };

        // First insert
        row_repo.upsert_one(&row).unwrap();

        let properties = Some("{\"key\": \"test\"}".to_string());

        // Add properties to name
        row_repo.update_properties(&row.id, &properties).unwrap();

        let name_filter = NameFilter::new().id(EqualFilter::equal_to(row.id.to_string()));
        let name = name_repo
            .query_one("store_id", name_filter.clone())
            .unwrap()
            .unwrap();

        // Check properties have been set
        assert_eq!(name.properties, properties);

        // upsert name_row
        row_repo.upsert_one(&row).unwrap();

        let name = name_repo
            .query_one("store_id", name_filter)
            .unwrap()
            .unwrap();

        // Properties have not been overwritten
        assert_eq!(name.properties, properties);
    }

    // Round-trip the new custom fields JSONB column through NameRow on both
    // PG (native Jsonb) and SQLite (TEXT Json). Verifies the CustomFieldsJson
    // sql_type alias and serde_json::Value field wiring.
    #[actix_rt::test]
    async fn name_row_custom_fields_round_trip() {
        let (_, connection, _, _) =
            setup_all("name_row_custom_fields_round_trip", MockDataInserts::none()).await;

        let row_repo = NameRowRepository::new(&connection);

        let custom_fields = serde_json::json!({"foo": "bar", "n": 42, "nested": [1, 2, 3]});
        let row = NameRow {
            id: uuid(),
            custom_fields: Some(custom_fields.clone()),
            ..Default::default()
        };

        row_repo.upsert_one(&row).unwrap();

        let fetched = row_repo.find_one_by_id(&row.id).unwrap().unwrap();
        assert_eq!(fetched.custom_fields, Some(custom_fields));
    }

    // `update_custom_fields` writes the JSONB column and emits a `Name`
    // changelog (so the value rides Name sync) stamped with this site's id.
    #[actix_rt::test]
    async fn name_custom_fields_update_generates_name_changelog() {
        let (_, connection, _, _) = setup_all(
            "name_custom_fields_update_generates_name_changelog",
            MockDataInserts::none(),
        )
        .await;

        // CurrentSiteId reads SettingsSyncSiteId; set it so the changelog gets a
        // non-null source_site_id.
        KeyValueStoreRepository::new(&connection)
            .set_i32(KeyType::SettingsSyncSiteId, Some(42))
            .unwrap();

        let row_repo = NameRowRepository::new(&connection);
        let row = NameRow {
            id: uuid(),
            r#type: NameRowType::Patient,
            ..Default::default()
        };
        row_repo.upsert_one(&row).unwrap();

        let cursor_before = ChangelogRepository::new(&connection).max_cursor().unwrap() as i64;

        let custom_fields = serde_json::json!({"custom_1": "edited"});
        row_repo
            .update_custom_fields(&row.id, &Some(custom_fields.clone()))
            .unwrap();

        // Value persisted.
        let fetched = row_repo.find_one_by_id(&row.id).unwrap().unwrap();
        assert_eq!(fetched.custom_fields, Some(custom_fields));

        // A Name changelog was emitted for this record with a non-null source_site_id.
        let changelogs: Vec<_> = ChangelogRepository::new(&connection)
            .query(
                ChangelogCondition::table_name::equal(ChangelogTableName::Name),
                CursorAndLimit {
                    cursor: cursor_before,
                    limit: 100,
                },
            )
            .unwrap()
            .rows
            .into_iter()
            .filter(|c| c.record_id == row.id)
            .collect();
        assert_eq!(changelogs.len(), 1);
        assert_eq!(changelogs[0].source_site_id, Some(42));
        // Patient rows carry patient_id for Patient-style routing.
        assert_eq!(changelogs[0].patient_id, Some(row.id));
    }
}
