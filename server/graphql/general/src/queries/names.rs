use async_graphql::{Context, Enum, InputObject, Result, SimpleObject, Union};
use graphql_core::{
    generic_filters::{
        DateFilterInput, EqualFilterBigFloatingNumberInput, EqualFilterNumberInput,
        EqualFilterStringInput, StringFilterInput,
    },
    map_filter,
    pagination::PaginationInput,
    standard_graphql_error::{validate_auth, StandardGraphqlError},
    ContextExt,
};
use graphql_types::types::{NameNode, NameNodeType};
use repository::{DateFilter, EqualFilter, NameType, PaginationOption, StringFilter};
use repository::{
    LegacyPropertyFilter, Name, NameFilter, NameSort, NameSortField, NumberRangeFilter,
    PropertyV2ValueFilter,
};

use service::{
    auth::{Resource, ResourceAccessRequest},
    ListResult,
};

#[derive(Enum, Copy, Clone, PartialEq, Eq)]
#[graphql(rename_items = "camelCase")]
pub enum NameSortFieldInput {
    Name,
    Code,
    /// Perf-comparison: sort by a legacy name property value, reading the
    /// text-JSON source column. Requires `propertyKey` on the sort input.
    LegacyProperty,
    /// Same as `LegacyProperty` but reads the read-only JSONB twin column.
    LegacyPropertyJsonb,
    /// Perf-comparison: sort by a V2 (KDD prototype) property value via a
    /// correlated subquery over `property_v2_value`. `propertyKey` must hold
    /// the property_v2 id.
    PropertyV2,
}

#[derive(InputObject)]
pub struct NameSortInput {
    /// Sort query result by `key`
    key: NameSortFieldInput,
    /// Sort query result is sorted descending or ascending (if not provided the default is
    /// ascending)
    desc: Option<bool>,
    /// Required when `key` is `LegacyProperty` or `LegacyPropertyJsonb`. The
    /// JSON property key to sort on (must match a name property definition).
    property_key: Option<String>,
}

#[derive(InputObject, Clone)]
pub struct NameFilterInput {
    pub id: Option<EqualFilterStringInput>,
    /// Filter by name
    pub name: Option<StringFilterInput>,
    /// Filter by code
    pub code: Option<StringFilterInput>,
    /// Filter by customer property
    pub is_customer: Option<bool>,
    /// Filter by supplier property
    pub is_supplier: Option<bool>,
    /// Filter by manufacturer property
    pub is_manufacturer: Option<bool>,
    /// Filter by donor property
    pub is_donor: Option<bool>,
    /// Is this name a store
    pub is_store: Option<bool>,
    /// Code of the store if store is linked to name
    pub store_code: Option<StringFilterInput>,
    /// Visibility in current store (based on store_id parameter and existence of name_store_join record)
    pub is_visible: Option<bool>,
    /// Show system names (defaults to false)
    /// System names don't have name_store_join thus if queried with true filter, is_visible filter should also be true or null
    /// if is_visible is set to true and is_system_name is also true no system names will be returned
    pub is_system_name: Option<bool>,
    /// Filter by the name type
    pub r#type: Option<EqualFilterTypeInput>,

    pub phone: Option<StringFilterInput>,
    pub address1: Option<StringFilterInput>,
    pub address2: Option<StringFilterInput>,
    pub country: Option<StringFilterInput>,
    pub email: Option<StringFilterInput>,

    /// Search filter across name or code
    pub code_or_name: Option<StringFilterInput>,

    pub supplying_store_id: Option<EqualFilterStringInput>,

    /// Filter by relational property values. Multiple entries AND together —
    /// a name must satisfy every condition to be returned.
    pub property: Option<Vec<PropertyV2ValueFilterInput>>,

    /// Perf-comparison: filter by legacy JSON property values via the
    /// text-JSON source column (parsed per row).
    pub legacy_property: Option<Vec<LegacyPropertyFilterInput>>,

    /// Perf-comparison twin reading the read-only JSONB column instead.
    pub legacy_property_jsonb: Option<Vec<LegacyPropertyFilterInput>>,
}

#[derive(InputObject, Clone)]
pub struct LegacyPropertyFilterInput {
    /// Property key as defined in `name_property` — restricted to ASCII
    /// alphanumeric/underscore characters server-side.
    pub key: String,
    /// Text/option-style filter — applies against the JSON-extracted value
    /// treated as text. Mutually exclusive with `numberValue` in practice
    /// (set whichever matches the property's value type).
    pub value: Option<StringFilterInput>,
    /// Range filter for integer-valued JSON properties.
    pub number_value: Option<NumberRangeFilterInput>,
}

impl From<LegacyPropertyFilterInput> for LegacyPropertyFilter {
    fn from(f: LegacyPropertyFilterInput) -> Self {
        LegacyPropertyFilter {
            key: f.key,
            value: f.value.map(StringFilter::from),
            number_value: f.number_value.map(NumberRangeFilter::from),
        }
    }
}

#[derive(InputObject, Clone)]
pub struct PropertyV2ValueFilterInput {
    /// Anchors the condition to a single property definition. Required —
    /// without it the condition would match across unrelated properties.
    pub property_id: EqualFilterStringInput,
    pub value_text: Option<StringFilterInput>,
    pub value_option_id: Option<EqualFilterStringInput>,
    /// Range filter on `value_number`; equality is `min == max`.
    pub value_number: Option<NumberRangeFilterInput>,
    pub value_real: Option<EqualFilterBigFloatingNumberInput>,
    pub value_date: Option<DateFilterInput>,
}

/// Range filter for integer-typed property values shared by the legacy and
/// V2 number filter inputs. `min`/`max` both optional; equality is min=max.
#[derive(InputObject, Clone)]
pub struct NumberRangeFilterInput {
    pub min: Option<i32>,
    pub max: Option<i32>,
}

impl From<NumberRangeFilterInput> for NumberRangeFilter {
    fn from(f: NumberRangeFilterInput) -> Self {
        NumberRangeFilter {
            min: f.min,
            max: f.max,
        }
    }
}

impl From<PropertyV2ValueFilterInput> for PropertyV2ValueFilter {
    fn from(f: PropertyV2ValueFilterInput) -> Self {
        let PropertyV2ValueFilterInput {
            property_id,
            value_text,
            value_option_id,
            value_number,
            value_real,
            value_date,
        } = f;
        PropertyV2ValueFilter {
            id: None,
            table_name: None,
            record_id: None,
            property_id: Some(EqualFilter::from(property_id)),
            value_text: value_text.map(StringFilter::from),
            value_option_id: value_option_id.map(EqualFilter::from),
            value_number: value_number.map(NumberRangeFilter::from),
            value_real: value_real.map(EqualFilter::from),
            value_date: value_date.map(DateFilter::from),
        }
    }
}

#[derive(SimpleObject)]
pub struct NameConnector {
    total_count: u32,
    nodes: Vec<NameNode>,
}

#[derive(Union)]
pub enum NamesResponse {
    Response(NameConnector),
}

#[derive(InputObject, Clone)]
pub struct EqualFilterTypeInput {
    pub equal_to: Option<NameNodeType>,
    pub equal_any: Option<Vec<NameNodeType>>,
    pub not_equal_to: Option<NameNodeType>,
    pub not_equal_all: Option<Vec<NameNodeType>>,
}

pub fn get_names(
    ctx: &Context<'_>,
    store_id: String,
    page: Option<PaginationInput>,
    filter: Option<NameFilterInput>,
    sort: Option<Vec<NameSortInput>>,
) -> Result<NamesResponse> {
    let user = validate_auth(
        ctx,
        &ResourceAccessRequest {
            resource: Resource::QueryName,
            store_id: Some(store_id.clone()),
        },
    )?;

    let service_provider = ctx.service_provider();
    let service_context = service_provider.context(store_id.clone(), user.user_id)?;

    let names = service_provider
        .name_service
        .get_names(
            &service_context,
            &store_id,
            page.map(PaginationOption::from),
            filter.map(|filter| filter.to_domain()),
            // Currently only one sort option is supported, use the first from the list.
            sort.and_then(|mut sort_list| sort_list.pop())
                .map(|sort| sort.to_domain()),
        )
        .map_err(StandardGraphqlError::from_list_error)?;

    Ok(NamesResponse::Response(NameConnector::from_domain(names)))
}

impl NameFilterInput {
    pub fn to_domain(self) -> NameFilter {
        let NameFilterInput {
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
            property,
            legacy_property,
            legacy_property_jsonb,
        } = self;

        NameFilter {
            id: id.map(EqualFilter::from),
            name: name.map(StringFilter::from),
            code: code.map(StringFilter::from),
            store_code: store_code.map(StringFilter::from),
            code_or_name: code_or_name.map(StringFilter::from),
            is_customer,
            is_supplier,
            is_manufacturer,
            is_donor,
            is_store,
            is_visible,
            is_system_name: is_system_name.or(Some(false)),
            r#type: r#type.map(|t| map_filter!(t, NameType::from)),
            phone: phone.map(StringFilter::from),
            address1: address1.map(StringFilter::from),
            address2: address2.map(StringFilter::from),
            country: country.map(StringFilter::from),
            email: email.map(StringFilter::from),
            supplying_store_id: supplying_store_id.map(EqualFilter::from),
            store: None,
            property: property
                .map(|filters| filters.into_iter().map(PropertyV2ValueFilter::from).collect()),
            legacy_property: legacy_property
                .map(|filters| filters.into_iter().map(LegacyPropertyFilter::from).collect()),
            legacy_property_jsonb: legacy_property_jsonb
                .map(|filters| filters.into_iter().map(LegacyPropertyFilter::from).collect()),
        }
    }
}

impl NameConnector {
    pub fn from_domain(names: ListResult<Name>) -> NameConnector {
        NameConnector {
            total_count: names.count,
            nodes: names.rows.into_iter().map(NameNode::from_domain).collect(),
        }
    }
}

impl NameSortInput {
    pub fn to_domain(self) -> NameSort {
        use NameSortField as to;
        use NameSortFieldInput as from;
        // `propertyKey` is required when sorting by a legacy property — fall
        // back to `Name` if missing to keep the resolver infallible. The
        // frontend always sends it for the legacy-sort variants.
        let property_key = self.property_key.unwrap_or_default();
        let key = match self.key {
            from::Name => to::Name,
            from::Code => to::Code,
            from::LegacyProperty => to::LegacyProperty(property_key),
            from::LegacyPropertyJsonb => to::LegacyPropertyJsonb(property_key),
            from::PropertyV2 => to::PropertyV2(property_key),
        };

        NameSort {
            key,
            desc: self.desc,
        }
    }
}
