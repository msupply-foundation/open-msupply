use async_graphql::*;
use chrono::NaiveDate;

use graphql_core::generic_inputs::NullableUpdateInput;
use graphql_core::simple_generic_errors::CannotEditStocktake;
use graphql_core::standard_graphql_error::{validate_auth, StandardGraphqlError};
use graphql_core::ContextExt;
use graphql_types::types::StocktakeNode;
use repository::Stocktake;
use service::NullableUpdate;
use service::{
    auth::{Resource, ResourceAccessRequest},
    stocktake::{InsertStocktake as ServiceInput, InsertStocktakeError as ServiceError},
};

#[derive(InputObject)]
#[graphql(name = "InsertStocktakeInput")]
pub struct InsertInput {
    pub id: String,
    pub comment: Option<String>,
    pub description: Option<String>,
    pub is_locked: Option<bool>,
    pub stocktake_date: Option<NaiveDate>,
    pub master_list_id: Option<String>,
    pub location: Option<NullableUpdateInput<String>>,
    pub items_have_stock: Option<bool>,
    pub expires_before: Option<NaiveDate>,
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
            comment,
            description,
            stocktake_date,
            is_locked,
            location,
            master_list_id,
            items_have_stock,
            expires_before,
        } = self;

        ServiceInput {
            id,
            comment,
            description,
            stocktake_date,
            is_locked,
            location: location.map(|location| NullableUpdate {
                value: location.value,
            }),
            master_list_id,
            items_have_stock,
            expires_before,
        }
    }
}

#[cfg(test)]
mod test {
    use async_graphql::EmptyMutation;
    use chrono::NaiveDate;
    use graphql_core::{assert_graphql_query, test_helpers::setup_graphql_test};
    use repository::{mock::MockDataInserts, Stocktake, StocktakeRow, StorageConnectionManager};
    use serde_json::json;
    use service::{
        service_provider::{ServiceContext, ServiceProvider},
        stocktake::{
            StocktakeServiceTrait, {InsertStocktake, InsertStocktakeError},
        },
    };
    use util::inline_init;

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
        let mut service_provider = ServiceProvider::new(connection_manager.clone(), "app_data");
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
                    stocktake_date: Some(NaiveDate::from_ymd_opt(2022, 1, 3).unwrap()),
                    is_locked: Some(true),
                    location: None,
                    master_list_id: None,
                    items_have_stock: None,
                    expires_before: None
                }
            );
            // StocktakeNode result is checked in queries
            Ok(inline_init(|r: &mut StocktakeRow| r.id = "id1".to_string()))
        }));
        let variables = Some(json!({
            "storeId": "store id",
            "input": {
              "id": "id1",
              "comment": "comment",
              "description": "description",
              "stocktakeDate": "2022-01-03",
              "isLocked": true
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
