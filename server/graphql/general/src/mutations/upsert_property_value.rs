use async_graphql::*;
use chrono::NaiveDate;

use graphql_core::{standard_graphql_error::validate_auth, ContextExt};
use graphql_types::types::{PropertyParentTableEnum, PropertyValueNode};
use service::{
    auth::{Resource, ResourceAccessRequest},
    property::{
        get_property_values, upsert_property_value, PropertyServiceError,
        PropertyValueInput as ServicePropertyValueInput,
        UpsertPropertyValueInput as ServiceUpsertInput,
    },
};

use crate::mutations::property_errors::property_service_error_to_graphql;

// Tagged input — async-graphql emits this as a `@oneOf` GraphQL input,
// guaranteeing exactly one variant is present per request. Client codegen
// turns it into a TypeScript discriminated union.
#[derive(OneofObject)]
pub enum PropertyValueGqlInput {
    Text(String),
    Number(i32),
    Real(f64),
    Date(NaiveDate),
    OptionId(String),
}

impl From<PropertyValueGqlInput> for ServicePropertyValueInput {
    fn from(v: PropertyValueGqlInput) -> Self {
        match v {
            PropertyValueGqlInput::Text(s) => ServicePropertyValueInput::Text(s),
            PropertyValueGqlInput::Number(n) => ServicePropertyValueInput::Number(n),
            PropertyValueGqlInput::Real(r) => ServicePropertyValueInput::Real(r),
            PropertyValueGqlInput::Date(d) => ServicePropertyValueInput::Date(d),
            PropertyValueGqlInput::OptionId(id) => ServicePropertyValueInput::Option(id),
        }
    }
}

#[derive(InputObject)]
pub struct UpsertPropertyValueGqlInput {
    pub id: String,
    pub table: PropertyParentTableEnum,
    pub record_id: String,
    pub property_id: String,
    pub value: PropertyValueGqlInput,
}

pub fn upsert_property_value_mutation(
    ctx: &Context<'_>,
    input: UpsertPropertyValueGqlInput,
) -> Result<PropertyValueNode> {
    validate_auth(
        ctx,
        &ResourceAccessRequest {
            resource: Resource::MutateProperty,
            store_id: None,
        },
    )?;

    let connection_manager = ctx.get_connection_manager();
    let table = input.table;
    let record_id = input.record_id.clone();
    let property_id = input.property_id.clone();

    let service_input = ServiceUpsertInput {
        id: input.id,
        table: table.into(),
        record_id: input.record_id,
        property_id: input.property_id,
        value: input.value.into(),
    };

    upsert_property_value(connection_manager, service_input)
        .map_err(property_service_error_to_graphql)?;

    // Re-read so we return the canonical joined node (including option name etc).
    let values = get_property_values(connection_manager, table.into(), &record_id)
        .map_err(property_service_error_to_graphql)?;
    let node = values
        .into_iter()
        .find(|v| v.value.property_id == property_id)
        .ok_or_else(|| {
            property_service_error_to_graphql(PropertyServiceError::PropertyNotFound(property_id))
        })?;

    Ok(PropertyValueNode::from_domain(node))
}
