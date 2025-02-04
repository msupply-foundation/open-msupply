use async_graphql::*;
use graphql_core::generic_filters::{EqualFilterInput, StringFilterInput};
use graphql_core::standard_graphql_error::validate_auth;
use graphql_core::ContextExt;
use graphql_types::types::AbbreviationNode;
use repository::abbreviation::AbbreviationFilter;
use repository::{EqualFilter, StringFilter};
use service::abbreviation::get_all_abbreviations;
use service::auth::{Resource, ResourceAccessRequest};

#[derive(InputObject, Clone)]
pub struct AbbreviationFilterInput {
    pub id: Option<EqualFilterInput<String>>,
    pub text: Option<StringFilterInput>,
}

impl AbbreviationFilterInput {
    pub fn to_domain(self) -> AbbreviationFilter {
        AbbreviationFilter {
            id: self.id.map(EqualFilter::from),
            text: self.text.map(StringFilter::from),
        }
    }
}

pub fn abbreviations(
    ctx: &Context<'_>,
    filter: Option<AbbreviationFilterInput>,
) -> Result<Vec<AbbreviationNode>> {
    validate_auth(
        ctx,
        &ResourceAccessRequest {
            resource: Resource::NoPermissionRequired,
            store_id: None,
        },
    )?;

    let connection_manager = ctx.get_connection_manager();
    // let rows = get_all_abbreviations(connection_manager, filter.to_domain())?;
    let rows = get_all_abbreviations(connection_manager, filter.map(|filter| filter.to_domain()))?;

    Ok(AbbreviationNode::from_vec(rows))
}
