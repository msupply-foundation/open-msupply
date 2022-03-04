use async_graphql::*;
use chrono::NaiveDateTime;

use graphql_core::standard_graphql_error::{validate_auth, StandardGraphqlError};
use graphql_core::ContextExt;
use graphql_types::types::StocktakeNode;
use service::{
    permission_validation::{Resource, ResourceAccessRequest},
    service_provider::{ServiceContext, ServiceProvider},
    stocktake::insert::{
        InsertStocktakeError as ServiceError, InsertStocktakeInput as InsertStocktake,
    },
};

#[derive(InputObject)]
pub struct InsertStocktakeInput {
    pub id: String,
    pub comment: Option<String>,
    pub description: Option<String>,
    pub created_datetime: NaiveDateTime,
    pub is_locked: Option<bool>,
}

#[derive(Union)]
pub enum InsertStocktakeResponse {
    Response(StocktakeNode),
}

pub fn insert_stocktake(
    ctx: &Context<'_>,
    store_id: &str,
    input: InsertStocktakeInput,
) -> Result<InsertStocktakeResponse> {
    validate_auth(
        ctx,
        &ResourceAccessRequest {
            resource: Resource::MutateStocktake,
            store_id: Some(store_id.to_string()),
        },
    )?;

    let service_provider = ctx.service_provider();
    let service_ctx = service_provider.context()?;
    do_insert_stocktake(&service_ctx, service_provider, store_id, input)
}

pub fn do_insert_stocktake(
    service_ctx: &ServiceContext,
    service_provider: &ServiceProvider,
    store_id: &str,
    input: InsertStocktakeInput,
) -> Result<InsertStocktakeResponse> {
    let service = &service_provider.stocktake_service;
    let id = input.id.clone();
    match service.insert_stocktake(&service_ctx, store_id, to_domain(input)) {
        Ok(stocktake) => Ok(InsertStocktakeResponse::Response(StocktakeNode {
            stocktake,
        })),
        Err(err) => {
            let formatted_error = format!("Insert stocktake {}: {:#?}", id, err);
            let graphql_error = match err {
                ServiceError::DatabaseError(err) => err.into(),
                ServiceError::InternalError(err) => StandardGraphqlError::InternalError(err),
                ServiceError::InvalidStore => StandardGraphqlError::BadUserInput(formatted_error),
                ServiceError::StocktakeAlreadyExists => {
                    StandardGraphqlError::BadUserInput(formatted_error)
                }
            };
            Err(graphql_error.extend())
        }
    }
}

fn to_domain(
    InsertStocktakeInput {
        id,
        comment,
        description,
        created_datetime,
        is_locked,
    }: InsertStocktakeInput,
) -> InsertStocktake {
    InsertStocktake {
        id,
        comment,
        description,
        created_datetime,
        is_locked,
    }
}

#[cfg(test)]
mod test {
    use async_graphql::EmptyMutation;
    use chrono::NaiveDate;
    use graphql_core::{assert_graphql_query, test_helpers::setup_graphl_test};
    use repository::{
        mock::MockDataInserts,
        schema::{StocktakeRow, StocktakeStatus},
        Stocktake, StorageConnectionManager,
    };
    use serde_json::json;
    use service::{
        service_provider::{ServiceContext, ServiceProvider},
        stocktake::{
            insert::{InsertStocktakeError, InsertStocktakeInput},
            StocktakeServiceTrait,
        },
    };

    use crate::StocktakeMutations;

    type ServiceMethod = dyn Fn(&ServiceContext, &str, InsertStocktakeInput) -> Result<Stocktake, InsertStocktakeError>
        + Sync
        + Send;

    pub struct TestService(pub Box<ServiceMethod>);

    impl StocktakeServiceTrait for TestService {
        fn insert_stocktake(
            &self,
            ctx: &ServiceContext,
            store_id: &str,
            input: InsertStocktakeInput,
        ) -> Result<Stocktake, InsertStocktakeError> {
            (self.0)(ctx, store_id, input)
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
        let (_, _, connection_manager, settings) = setup_graphl_test(
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
        let test_service = TestService(Box::new(|_, _, _| {
            Ok(StocktakeRow {
                id: "id1".to_string(),
                stocktake_number: 123,
                store_id: "store id".to_string(),
                comment: Some("comment".to_string()),
                description: Some("description".to_string()),
                status: StocktakeStatus::Finalised,
                created_datetime: NaiveDate::from_ymd(2022, 1, 22).and_hms(15, 16, 0),
                finalised_datetime: Some(NaiveDate::from_ymd(2022, 1, 23).and_hms(15, 16, 0)),
                inventory_adjustment_id: Some("inv id".to_string()),
                is_locked: false,
            })
        }));
        let variables = Some(json!({
            "storeId": "store id",
            "input": {
                "id": "id1",
                "comment": "comment",
                "description": "description",
                "createdDatetime": "2022-01-22T15:16:00",
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
