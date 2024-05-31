// use async_graphql::*;

// use chrono::NaiveDate;
// use graphql_core::{
//     generic_inputs::NullableUpdateInput,
//     simple_generic_errors::{
//         DatabaseError, InternalError, RecordBelongsToAnotherStore, RecordNotFound,
//         UniqueValueViolation,
//     },
//     standard_graphql_error::{validate_auth, StandardGraphqlError},
//     ContextExt,
// };
// use graphql_types::types::NameNode;
// use service::{
//     auth::{Resource, ResourceAccessRequest},
//     name_properties::update::{UpdateAsset, UpdateAssetError as ServiceError},
//     NullableUpdate,
// };

// pub fn update_name_properties(
//     ctx: &Context<'_>,
//     store_id: &str,
//     input: UpdateNameProperties,
// ) -> Result<UpdateAssetResponse> {
//     let user = validate_auth(
//         ctx,
//         &ResourceAccessRequest {
//             // TODO: new permission? who should be allowed?
//             resource: Resource::QueryName,
//             store_id: Some(store_id.to_string()),
//         },
//     )?;

//     let service_provider = ctx.service_provider();
//     let service_context = service_provider.context(store_id.to_string(), user.user_id)?;

//     match service_provider
//         .general_service
//         .update_name_properties(&service_context, input.into())
//     {
//         Ok(name_properties) => Ok(UpdateNamePropertiesResponse::Response(
//             AssetNode::from_domain(name_properties),
//         )),
//         Err(error) => Ok(UpdateNamePropertiesResponse::Error(
//             UpdateNamePropertiesError {
//                 error: map_error(error)?,
//             },
//         )),
//     }
// }

// #[derive(InputObject)]
// pub struct UpdateNamePropertiesInput {
//     pub id: String,
//     pub properties: Option<String>,
// }

// impl From<UpdateNamePropertiesInput> for UpdateNameProperties {
//     fn from(UpdateNamePropertiesInput { id, properties }: UpdateNamePropertiesInput) -> Self {
//         UpdateNameProperties { id, properties }
//     }
// }

// #[derive(SimpleObject)]
// pub struct UpdateNamePropertiesError {
//     pub error: UpdateNamePropertiesErrorInterface,
// }

// #[derive(Union)]
// pub enum UpdateNamePropertiesResponse {
//     Error(UpdateNamePropertiesError),
//     Response(NameNode),
// }

// #[derive(Interface)]
// #[graphql(field(name = "description", type = "String"))]
// pub enum UpdateNamePropertiesErrorInterface {
//     NameNotFound(RecordNotFound),
//     RecordBelongsToAnotherStore(RecordBelongsToAnotherStore),
//     InternalError(InternalError),
//     DatabaseError(DatabaseError),
// }

// fn map_error(error: ServiceError) -> Result<UpdateNamePropertiesErrorInterface> {
//     use StandardGraphqlError::*;
//     let formatted_error = format!("{:#?}", error);

//     let graphql_error = match error {
//         // Standard Graphql Errors
//         ServiceError::AssetDoesNotExist => BadUserInput(formatted_error),
//         ServiceError::AssetDoesNotBelongToCurrentStore => BadUserInput(formatted_error),
//         ServiceError::LocationDoesNotBelongToStore => BadUserInput(formatted_error),
//         ServiceError::UpdatedRecordNotFound => InternalError(formatted_error),
//         ServiceError::DatabaseError(_) => InternalError(formatted_error),
//         ServiceError::SerialNumberAlreadyExists => BadUserInput(formatted_error),
//         ServiceError::LocationsAlreadyAssigned => BadUserInput(formatted_error),
//     };

//     Err(graphql_error.extend())
// }
