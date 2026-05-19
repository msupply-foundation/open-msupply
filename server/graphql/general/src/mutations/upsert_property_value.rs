use async_graphql::*;
use chrono::NaiveDate;

use graphql_core::{standard_graphql_error::validate_auth, ContextExt};
use graphql_types::types::{PropertyV2ParentTableEnum, PropertyV2ValueNode};
use service::{
    auth::{Resource, ResourceAccessRequest},
    property_v2::{
        get_property_v2_values, upsert_property_v2_value, PropertyV2ServiceError,
        PropertyV2ValueInput as ServicePropertyValueInput,
        UpsertPropertyV2ValueInput as ServiceUpsertInput,
    },
};

use crate::mutations::property_errors::property_service_error_to_graphql;

// Tagged input — async-graphql emits this as a `@oneOf` GraphQL input,
// guaranteeing exactly one variant is present per request. Client codegen
// turns it into a TypeScript discriminated union.
#[derive(OneofObject)]
pub enum PropertyV2ValueGqlInput {
    Text(String),
    Number(i32),
    Real(f64),
    Date(NaiveDate),
    OptionId(String),
}

impl From<PropertyV2ValueGqlInput> for ServicePropertyValueInput {
    fn from(v: PropertyV2ValueGqlInput) -> Self {
        match v {
            PropertyV2ValueGqlInput::Text(s) => ServicePropertyValueInput::Text(s),
            PropertyV2ValueGqlInput::Number(n) => ServicePropertyValueInput::Number(n),
            PropertyV2ValueGqlInput::Real(r) => ServicePropertyValueInput::Real(r),
            PropertyV2ValueGqlInput::Date(d) => ServicePropertyValueInput::Date(d),
            PropertyV2ValueGqlInput::OptionId(id) => ServicePropertyValueInput::Option(id),
        }
    }
}

#[derive(InputObject)]
pub struct UpsertPropertyV2ValueGqlInput {
    pub id: String,
    pub table: PropertyV2ParentTableEnum,
    pub record_id: String,
    pub property_id: String,
    pub value: PropertyV2ValueGqlInput,
}

pub fn upsert_property_v2_value_mutation(
    ctx: &Context<'_>,
    input: UpsertPropertyV2ValueGqlInput,
) -> Result<PropertyV2ValueNode> {
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

    upsert_property_v2_value(connection_manager, service_input)
        .map_err(property_service_error_to_graphql)?;

    // Re-read so we return the canonical joined node (including option name etc).
    let values = get_property_v2_values(connection_manager, table.into(), &record_id)
        .map_err(property_service_error_to_graphql)?;
    let node = values
        .into_iter()
        .find(|v| v.value.property_id == property_id)
        .ok_or_else(|| {
            property_service_error_to_graphql(PropertyV2ServiceError::PropertyNotFound(property_id))
        })?;

    Ok(PropertyV2ValueNode::from_domain(node))
}
