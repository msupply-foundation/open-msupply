use super::{
    name_row::name, name_store_join::name_store_join, store_row::store, DBType, NameRow,
    NameStoreJoinRow, StorageConnection, StoreRow,
};

use crate::{
    diesel_macros::{
        apply_equal_filter, apply_sort_no_case, apply_string_filter, apply_string_or_filter,
    },
    name_oms_fields_alias,
    property_v2_value_row::property_v2_value,
    repository_error::RepositoryError,
    EqualFilter, NameOmsFieldsRow, NameRowType, NumberRangeFilter, Pagination,
    PropertyV2ValueFilter, PropertyV2ValueRepository, Sort, StoreFilter, StoreRepository,
    StringFilter,
};

use diesel::{dsl::IntoBoxed, prelude::*};
use util::constants::SYSTEM_NAME_CODES;

#[derive(PartialEq, Debug, Clone, Default)]
pub struct Name {
    pub name_row: NameRow,
    pub name_store_join_row: Option<NameStoreJoinRow>,
    pub store_row: Option<StoreRow>,
    pub properties: Option<String>,
}

#[derive(Clone, Default, PartialEq, Debug)]
pub enum NameType {
    Facility,
    Invad,
    Repack,
    #[default]
    Store,
}
#[derive(Clone, Default, PartialEq, Debug)]
pub struct NameFilter {
    pub id: Option<EqualFilter<String>>,
    pub name: Option<StringFilter>,
    pub code: Option<StringFilter>,
    pub is_customer: Option<bool>,
    pub is_supplier: Option<bool>,
    pub is_manufacturer: Option<bool>,
    pub is_donor: Option<bool>,
    pub is_store: Option<bool>,
    pub store_code: Option<StringFilter>,
    pub is_visible: Option<bool>,
    pub is_system_name: Option<bool>,
    pub r#type: Option<EqualFilter<NameType>>,
    pub supplying_store_id: Option<EqualFilter<String>>,

    pub phone: Option<StringFilter>,
    pub address1: Option<StringFilter>,
    pub address2: Option<StringFilter>,
    pub country: Option<StringFilter>,
    pub email: Option<StringFilter>,

    pub code_or_name: Option<StringFilter>,
    pub store: Option<StoreFilter>,

    /// Filter by relational property values. Each entry becomes its own
    /// `record_id IN (SELECT record_id FROM property_value WHERE …)`
    /// sub-query, so multiple entries AND together.
    pub property: Option<Vec<PropertyV2ValueFilter>>,

    /// Perf-comparison: filter by legacy JSON properties via
    /// `json_extract(name_oms_fields.properties, '$.<key>')` (SQLite) /
    /// `(name_oms_fields.properties::jsonb) ->> '<key>'` (Postgres).
    /// Reads the text-JSON source column — parsed on every row.
    pub legacy_property: Option<Vec<LegacyPropertyFilter>>,

    /// Perf-comparison twin of `legacy_property` that reads the read-only
    /// `name_oms_fields.properties_jsonb` column instead — no per-row parse.
    pub legacy_property_jsonb: Option<Vec<LegacyPropertyFilter>>,
}

#[derive(Clone, PartialEq, Debug, Default)]
pub struct LegacyPropertyFilter {
    pub key: String,
    /// Text/option-style filter — `LIKE`/`equal_to` against the JSON-extracted
    /// value treated as text.
    pub value: Option<StringFilter>,
    /// Range filter for integer-valued JSON properties — emitted as
    /// `CAST(json_extract(...) AS INTEGER) BETWEEN ? AND ?` (or backend
    /// equivalent). Both bounds optional; equality is `min == max`.
    pub number_value: Option<NumberRangeFilter>,
}

#[derive(PartialEq, Debug)]
pub enum NameSortField {
    Name,
    Code,
    Phone,
    Address1,
    Address2,
    Country,
    Email,
    /// Perf-comparison: ORDER BY `json_extract(name_oms_fields.properties, '$.<key>')`.
    /// The String payload is the property key (validated as ASCII alphanumeric/underscore
    /// before interpolation into raw SQL).
    LegacyProperty(String),
    /// Same as LegacyProperty but sorts against `properties_jsonb`.
    LegacyPropertyJsonb(String),
    /// Perf-comparison: ORDER BY a value pulled from `property_v2_value` via a
    /// correlated subquery keyed on `(record_id, property_id, table_name='name')`.
    /// The String payload is the property_v2 id (validated before interpolation).
    PropertyV2(String),
}

pub type NameSort = Sort<NameSortField>;

type NameAndNameStoreJoin = (
    NameRow,
    Option<NameStoreJoinRow>,
    Option<StoreRow>,
    NameOmsFieldsRow,
);

pub struct NameRepository<'a> {
    connection: &'a StorageConnection,
}

impl<'a> NameRepository<'a> {
    pub fn new(connection: &'a StorageConnection) -> Self {
        NameRepository { connection }
    }

    pub fn count(
        &self,
        store_id: &str,
        filter: Option<NameFilter>,
    ) -> Result<i64, RepositoryError> {
        let query = Self::create_filtered_query(store_id.to_string(), filter);

        Ok(query
            .count()
            .get_result(self.connection.lock().connection())?)
    }

    pub fn query_by_filter(
        &self,
        store_id: &str,
        filter: NameFilter,
    ) -> Result<Vec<Name>, RepositoryError> {
        self.query(store_id, Pagination::new(), Some(filter), None)
    }

    pub fn query_one(
        &self,
        store_id: &str,
        filter: NameFilter,
    ) -> Result<Option<Name>, RepositoryError> {
        Ok(self.query_by_filter(store_id, filter)?.pop())
    }

    pub fn query(
        &self,
        store_id: &str,
        pagination: Pagination,
        filter: Option<NameFilter>,
        sort: Option<NameSort>,
    ) -> Result<Vec<Name>, RepositoryError> {
        let mut query = Self::create_filtered_query(store_id.to_string(), filter);

        if let Some(sort) = sort {
            match &sort.key {
                NameSortField::Name => {
                    apply_sort_no_case!(query, sort, name::name_);
                }
                NameSortField::Code => {
                    apply_sort_no_case!(query, sort, name::code);
                }
                NameSortField::Phone => apply_sort_no_case!(query, sort, name::phone),
                NameSortField::Address1 => apply_sort_no_case!(query, sort, name::address1),
                NameSortField::Address2 => apply_sort_no_case!(query, sort, name::address2),
                NameSortField::Country => apply_sort_no_case!(query, sort, name::country),
                NameSortField::Email => apply_sort_no_case!(query, sort, name::email),
                NameSortField::LegacyProperty(key) => {
                    query = apply_legacy_property_sort(query, key, false, sort.desc);
                }
                NameSortField::LegacyPropertyJsonb(key) => {
                    query = apply_legacy_property_sort(query, key, true, sort.desc);
                }
                NameSortField::PropertyV2(property_id) => {
                    query = apply_property_v2_sort(query, property_id, sort.desc);
                }
            }
        } else {
            query = query.order(name::id.asc())
        }

        let final_query = query
            .offset(pagination.offset as i64)
            .limit(pagination.limit as i64);

        // Debug diesel query
        // println!(
        //     "{}",
        //     diesel::debug_query::<DBType, _>(&final_query).to_string()
        // );

        let result =
            final_query.load::<NameAndNameStoreJoin>(self.connection.lock().connection())?;

        Ok(result.into_iter().map(Name::from_join).collect())
    }

    /// Returns a list of names left joined to name_store_join (for name_store_joins matching store_id parameter)
    /// Names will still be present in result even if name_store_join doesn't match store_id in parameters
    /// but it's considered invisible in subsequent filters.
    pub fn create_filtered_query(store_id: String, filter: Option<NameFilter>) -> BoxedNameQuery {
        let mut query = query(store_id)
            .into_boxed()
            .filter(name::type_.ne(NameRowType::Patient))
            .filter(
                store::is_disabled
                    .is_null()
                    .or(store::is_disabled.eq(false)),
            ); // Filter out disabled stores, these are usually due to store merge, and should not be visible

        if let Some(f) = filter {
            let NameFilter {
                id,
                name,
                code,
                is_customer,
                is_supplier,
                is_manufacturer,
                is_donor,
                is_store,
                store_code,
                is_visible,
                is_system_name,
                r#type,
                phone,
                address1,
                address2,
                country,
                email,
                code_or_name,
                supplying_store_id,
                store,
                property,
                legacy_property,
                legacy_property_jsonb,
            } = f;

            // or filter need to be applied before and filters
            if code_or_name.is_some() {
                apply_string_filter!(query, code_or_name.clone(), name::code);
                apply_string_or_filter!(query, code_or_name, name::name_);
            }

            apply_equal_filter!(query, id, name::id);
            apply_string_filter!(query, code, name::code);

            apply_string_filter!(query, name, name::name_);
            apply_string_filter!(query, store_code, store::code);

            let r#type = r#type.map(|r| r.convert_filter::<NameRowType>());
            apply_equal_filter!(query, r#type, name::type_);

            apply_string_filter!(query, phone, name::phone);
            apply_string_filter!(query, address1, name::address1);
            apply_string_filter!(query, address2, name::address2);
            apply_string_filter!(query, country, name::country);
            apply_string_filter!(query, email, name::email);
            apply_equal_filter!(query, supplying_store_id, name::supplying_store_id);

            if let Some(is_customer) = is_customer {
                query = query.filter(name_store_join::name_is_customer.eq(is_customer));
            }
            if let Some(is_supplier) = is_supplier {
                query = query.filter(name_store_join::name_is_supplier.eq(is_supplier));
            }
            if let Some(is_manufacturer) = is_manufacturer {
                query = query.filter(name::is_manufacturer.eq(is_manufacturer));
            }

            query = match is_donor {
                Some(bool) => query.filter(name::is_donor.eq(bool)),
                None => query,
            };

            query = match is_visible {
                Some(true) => query.filter(name_store_join::id.is_not_null()),
                Some(false) => query.filter(name_store_join::id.is_null()),
                None => query,
            };

            query = match is_system_name {
                Some(true) => query.filter(name::code.eq_any(SYSTEM_NAME_CODES)),
                Some(false) => query.filter(name::code.ne_all(SYSTEM_NAME_CODES)),
                None => query,
            };

            query = match is_store {
                Some(true) => query.filter(store::id.is_not_null()),
                Some(false) => query.filter(store::id.is_null()),
                None => query,
            };

            if store.is_some() {
                let store_ids = StoreRepository::create_filtered_query(store).select(store::id);
                query = query.filter(store::id.eq_any(store_ids));
            }

            // Each property filter becomes its own EXISTS-style sub-query keyed on
            // `table_name = "name"`. Multiple entries AND together so a name must
            // have a matching `property_v2_value` row for *every* condition.
            if let Some(property_filters) = property {
                for cond in property_filters {
                    let sub = PropertyV2ValueRepository::create_filtered_query(Some(
                        cond.table_name(EqualFilter::equal_to("name".to_string())),
                    ))
                    .select(property_v2_value::record_id);
                    query = query.filter(name::id.eq_any(sub));
                }
            }

            // Legacy text-JSON property filters — parses `properties` per row.
            if let Some(legacy_filters) = legacy_property {
                for cond in legacy_filters {
                    query = apply_legacy_property_filter(query, &cond, false);
                }
            }

            // Read-only JSONB twin column — no per-row parse.
            if let Some(legacy_filters) = legacy_property_jsonb {
                for cond in legacy_filters {
                    query = apply_legacy_property_filter(query, &cond, true);
                }
            }
        };

        // Only return active (not deleted) names
        query = query.filter(name::deleted_datetime.is_null());
        query
    }
}

impl Name {
    pub fn from_join(
        (name_row, name_store_join_row, store_row, name_oms_fields): NameAndNameStoreJoin,
    ) -> Name {
        Name {
            name_row,
            name_store_join_row,
            store_row,
            properties: name_oms_fields.properties,
        }
    }

    pub fn custom_data(&self) -> Result<Option<serde_json::Value>, serde_json::Error> {
        self.name_row
            .custom_data_string
            .as_ref()
            .map(|custom_data_string| serde_json::from_str(custom_data_string))
            .transpose()
    }
}

#[diesel::dsl::auto_type]
fn query(store_id: String) -> _ {
    name::table
        .left_join(
            name_store_join::table.on(name_store_join::name_id
                .eq(name::id)
                .and(name_store_join::store_id.eq(store_id))),
        )
        .left_join(store::table)
        .inner_join(name_oms_fields_alias)
}

type BoxedNameQuery = IntoBoxed<'static, query, DBType>;

/// Reject keys with anything other than ASCII alphanumeric or underscore.
/// The validated key is interpolated directly into raw SQL, so this is the
/// injection boundary — only matches what JSON property keys can legitimately be.
fn is_safe_property_key(key: &str) -> bool {
    !key.is_empty() && key.chars().all(|c| c.is_ascii_alphanumeric() || c == '_')
}

/// Build the SQL expression that extracts a legacy property value as text.
/// `use_jsonb` switches between the text-JSON source column and the
/// read-only JSONB twin. Caller is responsible for having validated `key`
/// via [`is_safe_property_key`].
///
/// Columns are referenced via the unaliased `name` table — both `properties`
/// and `properties_jsonb` live on `name` itself (the Diesel `name_oms_fields`
/// schema is an alias for the same physical table, used only so it can be
/// joined a second time with a different selection).
fn legacy_property_extract_sql(key: &str, use_jsonb: bool) -> String {
    if cfg!(feature = "postgres") {
        if use_jsonb {
            format!("name.properties_jsonb ->> '{key}'")
        } else {
            // `properties` is TEXT on Postgres — cast to jsonb per row.
            format!("(name.properties::jsonb) ->> '{key}'")
        }
    } else {
        let column = if use_jsonb {
            "properties_jsonb"
        } else {
            "properties"
        };
        // `json_extract` accepts both text JSON and jsonb input transparently;
        // on the jsonb column it skips the parse step.
        format!("json_extract(name.{column}, '$.{key}')")
    }
}

fn apply_legacy_property_filter(
    mut query: BoxedNameQuery,
    cond: &LegacyPropertyFilter,
    use_jsonb: bool,
) -> BoxedNameQuery {
    use diesel::dsl::sql;
    use diesel::sql_types::{Bool, Integer, Text};

    if !is_safe_property_key(&cond.key) {
        // Silently no-op on a bad key. The frontend only ever sends keys from
        // the `name_property` definitions list, so this branch is defensive.
        return query;
    }
    let extract = legacy_property_extract_sql(&cond.key, use_jsonb);
    let like_op = if cfg!(feature = "postgres") {
        "ILIKE"
    } else {
        "LIKE"
    };

    if let Some(value) = &cond.value {
        if let Some(v) = &value.equal_to {
            query = query.filter(
                sql::<Bool>(&format!("{extract} = ")).bind::<Text, _>(v.clone()),
            );
        }
        if let Some(v) = &value.not_equal_to {
            query = query.filter(
                sql::<Bool>(&format!("{extract} <> ")).bind::<Text, _>(v.clone()),
            );
        }
        if let Some(v) = &value.like {
            query = query.filter(
                sql::<Bool>(&format!("{extract} {like_op} "))
                    .bind::<Text, _>(format!("%{v}%")),
            );
        }
        if let Some(v) = &value.starts_with {
            query = query.filter(
                sql::<Bool>(&format!("{extract} {like_op} "))
                    .bind::<Text, _>(format!("{v}%")),
            );
        }
        if let Some(v) = &value.ends_with {
            query = query.filter(
                sql::<Bool>(&format!("{extract} {like_op} "))
                    .bind::<Text, _>(format!("%{v}")),
            );
        }
        // `equal_any` / `not_equal_all` intentionally not implemented for this
        // perf-comparison prototype — the frontend only emits text `like`
        // filters and exact `equal_to` matches for now.
    }

    if let Some(range) = &cond.number_value {
        // Cast the JSON-extracted value to integer for the comparison. On
        // SQLite `json_extract` already returns the typed numeric for numeric
        // JSON, so CAST is a cheap no-op there. On Postgres the value is text
        // (->> ) so the CAST is necessary.
        let cast_sql = if cfg!(feature = "postgres") {
            format!("({extract})::integer")
        } else {
            format!("CAST({extract} AS INTEGER)")
        };
        if let Some(min) = range.min {
            query = query.filter(
                sql::<Bool>(&format!("{cast_sql} >= ")).bind::<Integer, _>(min),
            );
        }
        if let Some(max) = range.max {
            query = query.filter(
                sql::<Bool>(&format!("{cast_sql} <= ")).bind::<Integer, _>(max),
            );
        }
    }
    query
}

fn apply_legacy_property_sort(
    query: BoxedNameQuery,
    key: &str,
    use_jsonb: bool,
    desc: Option<bool>,
) -> BoxedNameQuery {
    use diesel::dsl::sql;
    use diesel::sql_types::Text;

    if !is_safe_property_key(key) {
        return query;
    }
    let extract = legacy_property_extract_sql(key, use_jsonb);
    let direction = if desc.unwrap_or(false) { "DESC" } else { "ASC" };
    query.order(sql::<Text>(&format!("{extract} {direction}")))
}

/// Property V2 IDs are UUID-ish — alphanumeric plus underscore/hyphen.
/// Same idea as [`is_safe_property_key`]: it gates raw-SQL interpolation.
fn is_safe_property_v2_id(id: &str) -> bool {
    !id.is_empty()
        && id
            .chars()
            .all(|c| c.is_ascii_alphanumeric() || c == '_' || c == '-')
}

fn apply_property_v2_sort(
    query: BoxedNameQuery,
    property_id: &str,
    desc: Option<bool>,
) -> BoxedNameQuery {
    use diesel::dsl::sql;
    use diesel::sql_types::Text;

    if !is_safe_property_v2_id(property_id) {
        return query;
    }
    let direction = if desc.unwrap_or(false) { "DESC" } else { "ASC" };
    // Correlated subquery returning a single sortable representation per name:
    // text for TEXT, stringified numbers for NUMBER/REAL, ISO text for DATE,
    // and the option's name for OPTION-typed properties. Both SQLite and
    // Postgres accept this form. NULLs (missing values) sort consistently.
    let cast = if cfg!(feature = "postgres") {
        // Postgres `text` cast for numerics, `to_char` for dates kept as text.
        "COALESCE(\
            pv.value_text, \
            pv.value_number::text, \
            pv.value_real::text, \
            pv.value_date::text, \
            (SELECT pvo.name FROM property_v2_option pvo WHERE pvo.id = pv.value_option_id) \
         )"
    } else {
        "COALESCE(\
            pv.value_text, \
            CAST(pv.value_number AS TEXT), \
            CAST(pv.value_real AS TEXT), \
            pv.value_date, \
            (SELECT pvo.name FROM property_v2_option pvo WHERE pvo.id = pv.value_option_id) \
         )"
    };
    let order_sql = format!(
        "(SELECT {cast} FROM property_v2_value pv \
          WHERE pv.record_id = name.id \
            AND pv.table_name = 'name' \
            AND pv.property_id = '{property_id}') {direction}"
    );
    query.order(sql::<Text>(&order_sql))
}

impl NameFilter {
    pub fn new() -> NameFilter {
        NameFilter::default()
    }

    pub fn id(mut self, filter: EqualFilter<String>) -> Self {
        self.id = Some(filter);
        self
    }

    pub fn code(mut self, filter: StringFilter) -> Self {
        self.code = Some(filter);
        self
    }

    pub fn name(mut self, filter: StringFilter) -> Self {
        self.name = Some(filter);
        self
    }

    pub fn match_is_supplier(mut self, value: bool) -> Self {
        self.is_supplier = Some(value);
        self
    }

    pub fn is_visible(mut self, value: bool) -> Self {
        self.is_visible = Some(value);
        self
    }

    pub fn is_system_name(mut self, value: bool) -> Self {
        self.is_system_name = Some(value);
        self
    }

    pub fn is_store(mut self, value: bool) -> Self {
        self.is_store = Some(value);
        self
    }

    pub fn store_code(mut self, filter: StringFilter) -> Self {
        self.store_code = Some(filter);
        self
    }

    pub fn is_customer(mut self, value: bool) -> Self {
        self.is_customer = Some(value);
        self
    }

    pub fn r#type(mut self, filter: EqualFilter<NameType>) -> Self {
        self.r#type = Some(filter);
        self
    }

    pub fn code_or_name(mut self, filter: StringFilter) -> Self {
        self.code_or_name = Some(filter);
        self
    }

    pub fn supplying_store_id(mut self, filter: EqualFilter<String>) -> Self {
        self.supplying_store_id = Some(filter);
        self
    }

    pub fn store(mut self, filter: StoreFilter) -> Self {
        self.store = Some(filter);
        self
    }

    pub fn property(mut self, filters: Vec<PropertyV2ValueFilter>) -> Self {
        self.property = Some(filters);
        self
    }

    pub fn legacy_property(mut self, filters: Vec<LegacyPropertyFilter>) -> Self {
        self.legacy_property = Some(filters);
        self
    }

    pub fn legacy_property_jsonb(mut self, filters: Vec<LegacyPropertyFilter>) -> Self {
        self.legacy_property_jsonb = Some(filters);
        self
    }
}

impl Name {
    pub fn is_customer(&self) -> bool {
        self.name_store_join_row
            .as_ref()
            .map(|name_store_join_row| name_store_join_row.name_is_customer)
            .unwrap_or(false)
    }

    pub fn is_supplier(&self) -> bool {
        self.name_store_join_row
            .as_ref()
            .map(|name_store_join_row| name_store_join_row.name_is_supplier)
            .unwrap_or(false)
    }

    pub fn is_manufacturer(&self) -> bool {
        self.name_row.is_manufacturer
    }

    pub fn is_donor(&self) -> bool {
        self.name_row.is_donor
    }

    pub fn is_visible(&self) -> bool {
        self.name_store_join_row.is_some()
    }

    pub fn is_system_name(&self) -> bool {
        SYSTEM_NAME_CODES
            .iter()
            .any(|system_name_code| self.name_row.code == *system_name_code)
    }

    pub fn store_id(&self) -> Option<&str> {
        self.store_row
            .as_ref()
            .map(|store_row| store_row.id.as_str())
    }
}

impl NameType {
    pub fn equal_to(&self) -> EqualFilter<Self> {
        EqualFilter {
            equal_to: Some(self.clone()),
            ..Default::default()
        }
    }
}

impl From<NameType> for NameRowType {
    fn from(from_value: NameType) -> NameRowType {
        use NameRowType as to;
        use NameType as from;
        match from_value {
            from::Facility => to::Facility,
            from::Invad => to::Invad,
            from::Repack => to::Repack,
            from::Store => to::Store,
        }
    }
}

#[cfg(test)]
mod tests {
    use util::constants::INVENTORY_ADJUSTMENT_NAME_CODE;

    use crate::{
        mock::{
            mock_name_1, mock_test_name_query_store_1, mock_test_name_query_store_2,
            MockDataInserts,
        },
        test_db, NameFilter, NameRepository, NameRow, NameRowRepository, NumberRangeFilter,
        Pagination, StringFilter,
    };

    use std::convert::TryFrom;

    use super::{Name, NameSort, NameSortField};

    fn data() -> (Vec<NameRow>, Vec<Name>) {
        let mut rows = Vec::new();
        let mut queries = Vec::new();
        for index in 0..200 {
            rows.push(NameRow {
                id: format!("id{index:05}"),
                name: format!("name{index}"),
                code: format!("code{index}"),
                is_customer: true,
                is_supplier: true,
                ..Default::default()
            });

            queries.push(Name {
                name_row: NameRow {
                    id: format!("id{index:05}"),
                    name: format!("name{index}"),
                    code: format!("code{index}"),
                    is_customer: true,
                    is_supplier: true,
                    ..Default::default()
                },
                name_store_join_row: None,
                store_row: None,
                properties: None,
            });
        }
        (rows, queries)
    }

    #[actix_rt::test]
    async fn test_name_query_repository() {
        // Prepare
        let (_, storage_connection, _, _) =
            test_db::setup_all("test_name_query_repository", MockDataInserts::none()).await;

        let (rows, queries) = data();
        for row in rows {
            NameRowRepository::new(&storage_connection)
                .upsert_one(&row)
                .unwrap();
        }

        let store_id = "store_a";

        // Test
        // .count()
        assert_eq!(
            usize::try_from(
                NameRepository::new(&storage_connection)
                    .count(store_id, None)
                    .unwrap()
            )
            .unwrap(),
            queries.len()
        );

        // .query, no pagination (default) - gets all names
        assert_eq!(
            NameRepository::new(&storage_connection)
                .query(store_id, Pagination::new(), None, None)
                .unwrap()
                .len(),
            queries.len()
        );

        // .query, pagination (offset 10)
        let result = NameRepository::new(&storage_connection)
            .query(
                store_id,
                Pagination {
                    offset: 10,
                    limit: 100,
                },
                None,
                None,
            )
            .unwrap();
        assert_eq!(result.len(), 100);
        assert_eq!(result[0], queries[10]);
        assert_eq!(result[99], queries[109]);

        // .query, pagination (first 10)
        let result = NameRepository::new(&storage_connection)
            .query(
                store_id,
                Pagination {
                    offset: 0,
                    limit: 10,
                },
                None,
                None,
            )
            .unwrap();
        assert_eq!(result.len(), 10);
        assert_eq!(*result.last().unwrap(), queries[9]);

        // .query, pagination (offset 150, first 90) <- more then records in table
        let result = NameRepository::new(&storage_connection)
            .query(
                store_id,
                Pagination {
                    offset: 150,
                    limit: 90,
                },
                None,
                None,
            )
            .unwrap();
        assert_eq!(result.len(), queries.len() - 150);
        assert_eq!(result.last().unwrap(), queries.last().unwrap());
    }

    // TODO need to test name_store_join, but it also requires 'store' records to be add and name_store_join helpers
    // which i think might be too much for this test ? Ideally we would have a database snapshot to load in tests
    // I've tested locally with graphIQL, seems to work

    #[actix_rt::test]
    async fn test_name_query_sort() {
        let (_, connection, _, _) = test_db::setup_all(
            "test_name_query_sort",
            MockDataInserts::none().names().stores(),
        )
        .await;
        let repo = NameRepository::new(&connection);

        let store_id = "store_a";
        let mut names = repo.query(store_id, Pagination::new(), None, None).unwrap();

        let sorted = repo
            .query(
                store_id,
                Pagination::new(),
                None,
                Some(NameSort {
                    key: NameSortField::Name,
                    desc: None,
                }),
            )
            .unwrap();

        names.sort_by(|a, b| {
            a.name_row
                .name
                .to_lowercase()
                .cmp(&b.name_row.name.to_lowercase())
        });

        for (count, name) in names.iter().enumerate() {
            assert_eq!(
                name.name_row.name.clone().to_lowercase(),
                sorted[count].name_row.name.clone().to_lowercase(),
            );
        }

        let sorted = repo
            .query(
                store_id,
                Pagination::new(),
                None,
                Some(NameSort {
                    key: NameSortField::Code,
                    desc: Some(true),
                }),
            )
            .unwrap();

        names.sort_by(|b, a| {
            a.name_row
                .code
                .to_lowercase()
                .cmp(&b.name_row.code.to_lowercase())
        });

        for (count, name) in names.iter().enumerate() {
            assert_eq!(
                name.name_row.code.clone().to_lowercase(),
                sorted[count].name_row.code.clone().to_lowercase(),
            );
        }
    }

    #[actix_rt::test]
    async fn test_name_query_repository_all_filter_sort() {
        let (_, connection, _, _) = test_db::setup_all(
            "test_name_query_repository_all_filter_sort",
            MockDataInserts::none().names().stores().name_store_joins(),
        )
        .await;
        let repo = NameRepository::new(&connection);

        let store_id = &mock_test_name_query_store_1().id;
        // test filter:

        // Two matched, name_2 and name_3

        let result = repo
            .query_by_filter(
                store_id,
                NameFilter::new()
                    .is_visible(true)
                    .name(StringFilter::like("me_")),
            )
            .unwrap();
        assert_eq!(result.len(), 2);

        // case insensitive search
        // Two matched, name_2 and name_3

        let result = repo
            .query_by_filter(
                store_id,
                NameFilter::new()
                    .is_visible(true)
                    .name(StringFilter::like("mE_")),
            )
            .unwrap();
        assert_eq!(result.len(), 2);

        // case insensitive search with umlaut
        // Works for postgres but not for sqlite:
        #[cfg(feature = "postgres")]
        {
            let result = repo
                .query_by_filter(
                    store_id,
                    NameFilter::new().name(StringFilter::like("T_Ää_N")),
                )
                .unwrap();
            assert_eq!(result.len(), 1);
        }

        // Test system names

        let result = repo
            .query_by_filter(
                store_id,
                NameFilter::new()
                    .is_system_name(true)
                    .code(StringFilter::equal_to(INVENTORY_ADJUSTMENT_NAME_CODE)),
            )
            .unwrap();
        assert_eq!(result.len(), 1);
        assert_eq!(
            result.first().unwrap().name_row.code,
            INVENTORY_ADJUSTMENT_NAME_CODE
        );

        let result = repo
            .query_by_filter(
                store_id,
                NameFilter::new()
                    .is_visible(true)
                    .is_system_name(true)
                    .code(StringFilter::equal_to(INVENTORY_ADJUSTMENT_NAME_CODE)),
            )
            .unwrap();
        assert_eq!(result.len(), 0);

        // Test is store

        let result = repo
            .query_by_filter(store_id, NameFilter::new().is_visible(true).is_store(true))
            .unwrap();
        assert_eq!(result.len(), 1);
        assert_eq!(
            result.first().unwrap().name_row.id,
            mock_test_name_query_store_2().name_id
        );

        // Test is visible
        // Visibility is determined by having name_store_join

        let result = repo
            .query_by_filter(
                &mock_test_name_query_store_2().id,
                NameFilter::new().is_visible(true),
            )
            .unwrap();
        assert_eq!(result.len(), 2);

        // Test is supplier

        let result = repo
            .query_by_filter(store_id, NameFilter::new().match_is_supplier(true))
            .unwrap();
        assert_eq!(result.len(), 3);

        let result = repo
            .query_by_filter(
                &mock_test_name_query_store_2().id,
                NameFilter::new().match_is_supplier(true),
            )
            .unwrap();
        assert_eq!(result.len(), 1);
        assert_eq!(result.first().unwrap().name_row.id, mock_name_1().id);

        // Test sort

        let result = repo
            .query(
                store_id,
                Pagination::new(),
                Some(NameFilter::new().is_visible(true)),
                Some(NameSort {
                    key: NameSortField::Code,
                    desc: Some(true),
                }),
            )
            .unwrap();
        assert_eq!(result.first().unwrap().name_row.code, "code3");
    }

    #[actix_rt::test]
    async fn test_name_query_filter_by_property() {
        use crate::{
            mock::{
                mock_name_a, mock_name_b, mock_name_c, mock_property_date, mock_property_number,
                mock_property_option, mock_property_option_a, mock_property_option_b,
                mock_property_real, mock_property_text,
            },
            DateFilter, EqualFilter, PropertyV2ValueFilter, PropertyV2ValueRow,
            PropertyV2ValueRowRepository, StringFilter,
        };
        use chrono::NaiveDate;

        let (_, connection, _, _) = test_db::setup_all(
            "test_name_query_filter_by_property",
            MockDataInserts::none().names().properties(),
        )
        .await;
        let repo = NameRepository::new(&connection);
        let store_id = "any_store";

        // value_text: like — only name_a's "abc" matches.
        let result = repo
            .query_by_filter(
                store_id,
                NameFilter::new().property(vec![PropertyV2ValueFilter::new()
                    .property_id(EqualFilter::equal_to(mock_property_text().id))
                    .value_text(StringFilter::like("ab"))]),
            )
            .unwrap();
        assert_eq!(result.len(), 1);
        assert_eq!(result[0].name_row.id, mock_name_a().id);

        // value_option_id: equal_to — only name_b is attached to option_a.
        let result = repo
            .query_by_filter(
                store_id,
                NameFilter::new().property(vec![PropertyV2ValueFilter::new()
                    .property_id(EqualFilter::equal_to(mock_property_option().id))
                    .value_option_id(EqualFilter::equal_to(mock_property_option_a().id))]),
            )
            .unwrap();
        assert_eq!(result.len(), 1);
        assert_eq!(result[0].name_row.id, mock_name_b().id);

        // value_option_id: equal_any across both options — both name_b and name_c match.
        let result = repo
            .query_by_filter(
                store_id,
                NameFilter::new().property(vec![PropertyV2ValueFilter::new()
                    .property_id(EqualFilter::equal_to(mock_property_option().id))
                    .value_option_id(EqualFilter::equal_any(vec![
                        mock_property_option_a().id,
                        mock_property_option_b().id,
                    ]))]),
            )
            .unwrap();
        let ids: Vec<_> = result.into_iter().map(|n| n.name_row.id).collect();
        assert!(ids.contains(&mock_name_b().id));
        assert!(ids.contains(&mock_name_c().id));
        assert_eq!(ids.len(), 2);

        // value_number / value_real / value_date — each pinpoints name_a.
        for filter in [
            PropertyV2ValueFilter::new()
                .property_id(EqualFilter::equal_to(mock_property_number().id))
                .value_number(NumberRangeFilter::equal_to(42)),
            PropertyV2ValueFilter::new()
                .property_id(EqualFilter::equal_to(mock_property_real().id))
                .value_real(EqualFilter::equal_to(1.5)),
            PropertyV2ValueFilter::new()
                .property_id(EqualFilter::equal_to(mock_property_date().id))
                .value_date(DateFilter::equal_to(
                    NaiveDate::from_ymd_opt(2024, 1, 15).unwrap(),
                )),
        ] {
            let result = repo
                .query_by_filter(store_id, NameFilter::new().property(vec![filter]))
                .unwrap();
            assert_eq!(result.len(), 1);
            assert_eq!(result[0].name_row.id, mock_name_a().id);
        }

        // AND across multiple property conditions — only name_b has BOTH
        // text="xyz" and option=option_a.
        let result = repo
            .query_by_filter(
                store_id,
                NameFilter::new().property(vec![
                    PropertyV2ValueFilter::new()
                        .property_id(EqualFilter::equal_to(mock_property_text().id))
                        .value_text(StringFilter::equal_to("xyz")),
                    PropertyV2ValueFilter::new()
                        .property_id(EqualFilter::equal_to(mock_property_option().id))
                        .value_option_id(EqualFilter::equal_to(mock_property_option_a().id)),
                ]),
            )
            .unwrap();
        assert_eq!(result.len(), 1);
        assert_eq!(result[0].name_row.id, mock_name_b().id);

        // No row matches both text="abc" AND option=option_a — name_a has the
        // text but no option, name_b has the option but a different text.
        let result = repo
            .query_by_filter(
                store_id,
                NameFilter::new().property(vec![
                    PropertyV2ValueFilter::new()
                        .property_id(EqualFilter::equal_to(mock_property_text().id))
                        .value_text(StringFilter::equal_to("abc")),
                    PropertyV2ValueFilter::new()
                        .property_id(EqualFilter::equal_to(mock_property_option().id))
                        .value_option_id(EqualFilter::equal_to(mock_property_option_a().id)),
                ]),
            )
            .unwrap();
        assert_eq!(result.len(), 0);

        // table_name guard: an `item` row with the same value_text must NOT
        // surface in name results (proves the sub-query pins table_name="name").
        PropertyV2ValueRowRepository::new(&connection)
            .upsert_one(&PropertyV2ValueRow {
                id: "item_property_value_decoy".to_string(),
                table_name: "item".to_string(),
                record_id: "item_a".to_string(),
                property_id: mock_property_text().id,
                value_text: Some("abc".to_string()),
                ..Default::default()
            })
            .unwrap();
        let result = repo
            .query_by_filter(
                store_id,
                NameFilter::new().property(vec![PropertyV2ValueFilter::new()
                    .property_id(EqualFilter::equal_to(mock_property_text().id))
                    .value_text(StringFilter::equal_to("abc"))]),
            )
            .unwrap();
        assert_eq!(result.len(), 1);
        assert_eq!(result[0].name_row.id, mock_name_a().id);
    }
}
