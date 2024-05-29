use async_graphql::*;
use graphql_core::{
    standard_graphql_error::{validate_auth, StandardGraphqlError},
    ContextExt,
};
use repository::SiteRow;
use service::site::{CreateSite, CreateSiteError, SiteService};

#[derive(InputObject)]
#[graphql(name = "InsertSiteInput")]
pub struct InsertSiteInput {
    pub id: String,
    pub site_id: i32,
    pub hardware_id: String,
    pub name: String,
    pub password: String,
}

#[derive(Union)]
#[graphql(name = "InsertSiteResponse")]
pub enum InsertResponse {
    Response(SiteNode),
}

pub fn insert_site(
    ctx: &Context<'_>,
    InsertSiteInput {
        id,
        site_id,
        hardware_id,
        name,
        password,
    }: InsertSiteInput,
) -> Result<InsertResponse> {
    // validate_auth(
    //     ctx,
    //     &ResourceAccessRequest {
    //         resource: Resource::ServerAdmin,
    //         store_id: Some(store_id.to_string()),
    //     },
    // )?;

    let service_provider = ctx.service_provider();
    let service_context = service_provider.basic_context()?;

    let site_service = SiteService::new(&service_context.connection);

    let res = site_service.create_site(CreateSite {
        id,
        site_id,
        hardware_id,
        name,
        password,
    });

    map_response(res)
}

pub struct SiteNode {
    site: SiteRow,
}

#[Object]
impl SiteNode {
    pub async fn id(&self) -> &str {
        &self.site.id
    }

    pub async fn site_id(&self) -> &i32 {
        &self.site.site_id
    }

    pub async fn name(&self) -> &str {
        &self.site.name
    }
}

impl SiteNode {
    pub fn from_domain(site: SiteRow) -> SiteNode {
        SiteNode { site }
    }

    pub fn from_vec(sites: Vec<SiteRow>) -> Vec<SiteNode> {
        sites.into_iter().map(SiteNode::from_domain).collect()
    }
}

fn map_response(from: Result<SiteRow, CreateSiteError>) -> Result<InsertResponse> {
    let result = match from {
        Ok(site) => InsertResponse::Response(SiteNode::from_domain(site)),
        // todo map error
        Err(error) => Err(StandardGraphqlError::InternalError(format!("{:?}", error)).extend())?,
    };

    Ok(result)
}

// fn map_error(error: ServiceError) -> Result<ErrorInterface> {
//     use StandardGraphqlError::*;
//     let formatted_error = format!("{:#?}", error);

//     let graphql_error = match error {
//         ServiceError::VariantWithPackSizeAlreadyExists => {
//             return Ok(ErrorInterface::VariantWithPackSizeAlreadyExists(
//                 VariantWithPackSizeAlreadyExists,
//             ))
//         }
//         ServiceError::CannotAddPackSizeOfZero => {
//             return Ok(ErrorInterface::CannotAddPackSizeOfZero(
//                 CannotAddPackSizeOfZero,
//             ))
//         }
//         ServiceError::CannotAddWithNoAbbreviationAndName => {
//             return Ok(ErrorInterface::CannotAddWithNoAbbreviationAndName(
//                 CannotAddWithNoAbbreviationAndName,
//             ))
//         }

//         ServiceError::ItemDoesNotExist | ServiceError::SiteAlreadyExists => {
//             BadUserInput(formatted_error)
//         }
//         ServiceError::DatabaseError(_) | ServiceError::CreatedRecordNotFound => {
//             InternalError(formatted_error)
//         }
//     };

//     Err(graphql_error.extend())
// }
