use async_graphql::*;

use graphql_types::types::{FormSchemaFilterInput, FormSchemaNode};
use repository::{FormSchemaSort, FormSchemaSortField, PaginationOption};
use service::auth::{Resource, ResourceAccessRequest};

use graphql_core::{
    pagination::PaginationInput, standard_graphql_error::validate_auth, ContextExt,
};

#[derive(Enum, Copy, Clone, PartialEq, Eq)]
#[graphql(rename_items = "camelCase")]
pub enum FormSchemaSortFieldInput {
    Id,
}

#[derive(InputObject)]
pub struct FormSchemaSortInput {
    /// Sort query result by `key`
    key: FormSchemaSortFieldInput,
    /// Sort query result is sorted descending or ascending (if not provided the default is
    /// ascending)
    desc: Option<bool>,
}

impl FormSchemaSortInput {
    fn to_domain(&self) -> FormSchemaSort {
        FormSchemaSort {
            key: match self.key {
                FormSchemaSortFieldInput::Id => FormSchemaSortField::Id,
            },
            desc: self.desc,
        }
    }
}

#[derive(SimpleObject)]
pub struct FormSchemaConnector {
    pub total_count: u32,
    pub nodes: Vec<FormSchemaNode>,
}

#[derive(Union)]
pub enum FormSchemaResponse {
    Response(FormSchemaConnector),
}

pub fn form_schemas(
    ctx: &Context<'_>,
    page: Option<PaginationInput>,
    filter: Option<FormSchemaFilterInput>,
    sort: Option<Vec<FormSchemaSortInput>>,
) -> Result<FormSchemaResponse> {
    validate_auth(
        ctx,
        &ResourceAccessRequest {
            resource: Resource::QueryJsonSchema,
            store_id: None,
        },
    )?;

    let service_provider = ctx.service_provider();
    let context = service_provider.basic_context()?;

    let schemas = service_provider.form_schema_service.form_schemas(
        &context,
        page.map(PaginationOption::from),
        filter.map(|filter| filter.to_domain()),
        sort.and_then(|mut sort_list| sort_list.pop())
            .map(|sort| sort.to_domain()),
    )?;

    let nodes: Vec<FormSchemaNode> = schemas
        .rows
        .into_iter()
        .map(|schema| FormSchemaNode { schema })
        .collect();
    Ok(FormSchemaResponse::Response(FormSchemaConnector {
        total_count: schemas.count,
        nodes,
    }))
}
