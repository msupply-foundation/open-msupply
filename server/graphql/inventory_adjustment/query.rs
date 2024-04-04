// use async_graphql::*;
// use graphql_core::{
//     simple_generic_errors::NodeError, standard_graphql_error::validate_auth, ContextExt,
// };
// use graphql_types::types::{RepackConnector, RepackNode};
// use service::auth::{Resource, ResourceAccessRequest};

// #[derive(Union)]
// pub enum RepackResponse {
//     Error(NodeError),
//     Response(RepackNode),
// }

// pub async fn get_repack(
//     ctx: &Context<'_>,
//     store_id: String,
//     invoice_id: &str,
// ) -> Result<RepackResponse> {
//     let user = validate_auth(
//         ctx,
//         &ResourceAccessRequest {
//             resource: Resource::QueryStockLine,
//             store_id: Some(store_id.clone()),
//         },
//     )?;

//     let service_provider = ctx.service_provider();
//     let service_context = service_provider.context(store_id.clone(), user.user_id)?;
//     let repack_service = &service_provider.repack_service;

//     let repack = repack_service.get_repack(&service_context, invoice_id)?;

//     let response = RepackResponse::Response(RepackNode::from_domain(repack));

//     Ok(response)
// }

// pub async fn get_repacks_by_stock_line(
//     ctx: &Context<'_>,
//     store_id: String,
//     stock_line_id: &str,
// ) -> Result<RepackConnector> {
//     let user = validate_auth(
//         ctx,
//         &ResourceAccessRequest {
//             resource: Resource::QueryStockLine,
//             store_id: Some(store_id.clone()),
//         },
//     )?;

//     let service_provider = ctx.service_provider();
//     let service_context = service_provider.context(store_id.clone(), user.user_id)?;
//     let repack_service = &service_provider.repack_service;

//     let repacks = repack_service.get_repacks_by_stock_line(&service_context, stock_line_id)?;

//     let response = RepackConnector::from_vec(repacks);

//     Ok(response)
// }
