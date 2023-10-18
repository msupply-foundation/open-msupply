use async_graphql::*;

#[derive(InputObject)]
pub struct TaxInput {
    /// Set or unset the tax value (in percentage)
    pub percentage: Option<f64>,
}

#[derive(InputObject)]

pub struct LocationInput {
    pub location_id: Option<String>,
}
/// Update a nullable value
///
/// This struct is usually used as an optional value.
/// For example, in an API update input object like `mutableValue:  NullableUpdate | null | undefined`.
/// This is done to encode the following cases (using `mutableValue` from previous example):
/// 1) if `mutableValue` is `null | undefined`, nothing is updated
/// 2) if `mutableValue` object is set:
///   a) if `NullableUpdate.value` is `undefined | null`, the `mutableValue` is set to `null`
///   b) if `NullableUpdate.value` is set, the `mutableValue` is set to the provided `NullableUpdate.value`
#[derive(InputObject)]
#[graphql(concrete(name = "NullableStringUpdate", params(String)))]
pub struct NullableUpdate<T: InputType> {
    pub value: Option<T>,
}
