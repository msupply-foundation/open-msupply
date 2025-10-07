use async_graphql::*;
use chrono::NaiveDate;

use graphql_core::simple_generic_errors::CannotEditStocktake;
use graphql_core::standard_graphql_error::{validate_auth, StandardGraphqlError};
use graphql_core::ContextExt;
use graphql_types::types::StocktakeNode;
use repository::Stocktake;
use service::{
    auth::{Resource, ResourceAccessRequest},
    stocktake::{InsertStocktake as ServiceInput, InsertStocktakeError as ServiceError},
};

#[derive(InputObject)]
#[graphql(name = "InsertStocktakeInput")]
pub struct InsertInput {
    pub id: String,
    pub is_all_items_stocktake: Option<bool>,
    pub master_list_id: Option<String>,
    pub include_all_master_list_items: Option<bool>,
    pub location_id: Option<String>,
    pub vvm_status_id: Option<String>,
    pub expires_before: Option<NaiveDate>,
    pub is_initial_stocktake: Option<bool>,
    pub create_blank_stocktake: Option<bool>,
    pub comment: Option<String>,
    pub description: Option<String>,
}

#[derive(Union)]
#[graphql(name = "InsertStocktakeResponse")]
pub enum InsertResponse {
    Response(StocktakeNode),
}

#[derive(Interface)]
#[graphql(name = "InsertStocktakeErrorInterface")]
#[graphql(field(name = "description", ty = "String"))]
pub enum InsertErrorInterface {
    CannotEditStocktake(CannotEditStocktake),
}

#[derive(SimpleObject)]
#[graphql(name = "InsertStocktakeError")]
pub struct InsertError {
    pub error: InsertErrorInterface,
}

pub fn insert(ctx: &Context<'_>, store_id: &str, input: InsertInput) -> Result<InsertResponse> {
    let user = validate_auth(
        ctx,
        &ResourceAccessRequest {
            resource: Resource::MutateStocktake,
            store_id: Some(store_id.to_string()),
        },
    )?;

    let service_provider = ctx.service_provider();
    let service_context = service_provider.context(store_id.to_string(), user.user_id)?;
    map_response(
        service_provider
            .stocktake_service
            .insert_stocktake(&service_context, input.to_domain()),
    )
}

pub fn map_response(from: Result<Stocktake, ServiceError>) -> Result<InsertResponse> {
    match from {
        Ok(stocktake) => Ok(InsertResponse::Response(StocktakeNode::from_domain(
            stocktake,
        ))),
        Err(error) => {
            use StandardGraphqlError::*;
            let formatted_error = format!("{:#?}", error);

            let graphql_error = match error {
                ServiceError::InvalidStore => BadUserInput(formatted_error),
                ServiceError::StocktakeAlreadyExists => BadUserInput(formatted_error),
                ServiceError::InitialStocktakeAlreadyExists => BadUserInput(formatted_error),
                ServiceError::InternalError(err) => InternalError(err),
                ServiceError::DatabaseError(_) => InternalError(formatted_error),
                ServiceError::InvalidMasterList => BadUserInput(formatted_error),
                ServiceError::InvalidLocation => BadUserInput(formatted_error),
                ServiceError::InvalidArguments => BadUserInput(formatted_error),
            };

            Err(graphql_error.extend())
        }
    }
}

impl InsertInput {
    pub fn to_domain(self) -> ServiceInput {
        let InsertInput {
            id,
            location_id,
            is_all_items_stocktake,
            master_list_id,
            vvm_status_id,
            include_all_master_list_items,
            expires_before,
            create_blank_stocktake,
            is_initial_stocktake,
            comment,
            description,
        } = self;

        ServiceInput {
            id,
            comment,
            is_all_items_stocktake,
            location_id,
            master_list_id,
            vvm_status_id,
            include_all_master_list_items,
            expires_before,
            is_initial_stocktake,
            description,
            create_blank_stocktake,
        }
    }
}

#[cfg(test)]
mod test {
    use async_graphql::EmptyMutation;
    use graphql_core::{assert_graphql_query, test_helpers::setup_graphql_test};
    use repository::{mock::MockDataInserts, Stocktake, StocktakeRow, StorageConnectionManager};
    use serde_json::json;
    use service::{
        service_provider::{ServiceContext, ServiceProvider},
        stocktake::{
            StocktakeServiceTrait, {InsertStocktake, InsertStocktakeError},
        },
    };

    use crate::StocktakeMutations;

    type ServiceMethod = dyn Fn(&ServiceContext, InsertStocktake) -> Result<Stocktake, InsertStocktakeError>
        + Sync
        + Send;

    pub struct TestService(pub Box<ServiceMethod>);

    impl StocktakeServiceTrait for TestService {
        fn insert_stocktake(
            &self,
            ctx: &ServiceContext,
            input: InsertStocktake,
        ) -> Result<Stocktake, InsertStocktakeError> {
            (self.0)(ctx, input)
        }
    }

    pub fn service_provider(
        test_service: TestService,
        connection_manager: &StorageConnectionManager,
    ) -> ServiceProvider {
        let mut service_provider = ServiceProvider::new(connection_manager.clone());
        service_provider.stocktake_service = Box::new(test_service);
        service_provider
    }

    #[actix_rt::test]
    async fn test_graphql_stocktake_insert() {
        let (_, _, connection_manager, settings) = setup_graphql_test(
            EmptyMutation,
            StocktakeMutations,
            "omsupply-database-gql-stocktake_insert",
            MockDataInserts::all(),
        )
        .await;

        let query = r#"mutation InsertStocktake($storeId: String, $input: InsertStocktakeInput!) {
            insertStocktake(storeId: $storeId, input: $input) {
                ... on StocktakeNode {                    
                        id
                }
            }
        }"#;

        // success
        let test_service = TestService(Box::new(|_, input| {
            assert_eq!(
                input,
                InsertStocktake {
                    id: "id1".to_string(),
                    comment: Some("comment".to_string()),
                    description: Some("description".to_string()),
                    is_initial_stocktake: Some(true),
                    ..Default::default()
                }
            );
            // StocktakeNode result is checked in queries
            Ok(StocktakeRow {
                id: "id1".to_string(),
                ..Default::default()
            })
        }));
        let variables = Some(json!({
            "storeId": "store id",
            "input": {
              "id": "id1",
              "comment": "comment",
              "description": "description",
              "isInitialStocktake": Some(true)
            }
        }));
        let expected = json!({
            "insertStocktake": {
              "id": "id1",
            }
          }
        );
        assert_graphql_query!(
            &settings,
            query,
            &variables,
            &expected,
            Some(service_provider(test_service, &connection_manager))
        );
    }
}
