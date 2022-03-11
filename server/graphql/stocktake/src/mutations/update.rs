use async_graphql::*;

use chrono::NaiveDate;
use graphql_core::simple_generic_errors::StocktakeIsLocked;
use graphql_core::standard_graphql_error::{validate_auth, StandardGraphqlError};
use graphql_core::ContextExt;
use graphql_types::types::{StocktakeLineConnector, StocktakeNode, StocktakeNodeStatus};
use repository::StocktakeLine;
use service::{
    permission_validation::{Resource, ResourceAccessRequest},
    service_provider::{ServiceContext, ServiceProvider},
    stocktake::update::{
        UpdateStocktakeError as ServiceError, UpdateStocktakeInput as UpdateStocktake,
    },
};

#[derive(InputObject)]
pub struct UpdateStocktakeInput {
    pub id: String,
    pub comment: Option<String>,
    pub description: Option<String>,
    pub status: Option<StocktakeNodeStatus>,
    pub stocktake_date: Option<NaiveDate>,
    pub is_locked: Option<bool>,
}

pub struct SnapshotCountCurrentCountMismatch(Vec<StocktakeLine>);
#[Object]
impl SnapshotCountCurrentCountMismatch {
    pub async fn description(&self) -> &'static str {
        "Snapshot count doesn't match the current stock count"
    }

    pub async fn lines(&self) -> StocktakeLineConnector {
        StocktakeLineConnector::from_domain_vec(self.0.clone())
    }
}

#[derive(Interface)]
#[graphql(field(name = "description", type = "String"))]
pub enum UpdateStocktakeErrorInterface {
    SnapshotCountCurrentCountMismatch(SnapshotCountCurrentCountMismatch),
    StocktakeIsLocked(StocktakeIsLocked),
}

#[derive(SimpleObject)]
pub struct UpdateStocktakeError {
    pub error: UpdateStocktakeErrorInterface,
}

#[derive(Union)]
pub enum UpdateStocktakeResponse {
    Response(StocktakeNode),
    Error(UpdateStocktakeError),
}

pub fn update_stocktake(
    ctx: &Context<'_>,
    store_id: &str,
    input: UpdateStocktakeInput,
) -> Result<UpdateStocktakeResponse> {
    validate_auth(
        ctx,
        &ResourceAccessRequest {
            resource: Resource::MutateStocktake,
            store_id: Some(store_id.to_string()),
        },
    )?;

    let service_provider = ctx.service_provider();
    let service_ctx = service_provider.context()?;
    do_update_stocktake(&service_ctx, service_provider, store_id, input)
}

pub fn do_update_stocktake(
    service_ctx: &ServiceContext,
    service_provider: &ServiceProvider,
    store_id: &str,
    input: UpdateStocktakeInput,
) -> Result<UpdateStocktakeResponse> {
    let service = &service_provider.stocktake_service;
    let id = input.id.clone();
    match service.update_stocktake(&service_ctx, store_id, to_domain(input)) {
        Ok(stocktake) => Ok(UpdateStocktakeResponse::Response(StocktakeNode {
            stocktake,
        })),
        Err(err) => Ok(UpdateStocktakeResponse::Error(UpdateStocktakeError {
            error: map_error(err, &id)?,
        })),
    }
}

fn map_error(err: ServiceError, id: &str) -> Result<UpdateStocktakeErrorInterface> {
    let formatted_error = format!("Update stocktake {}: {:#?}", id, err);
    let graphql_error = match err {
        ServiceError::SnapshotCountCurrentCountMismatch(lines) => {
            return Ok(
                UpdateStocktakeErrorInterface::SnapshotCountCurrentCountMismatch(
                    SnapshotCountCurrentCountMismatch(lines),
                ),
            )
        }
        ServiceError::StocktakeIsLocked => {
            return Ok(UpdateStocktakeErrorInterface::StocktakeIsLocked(
                StocktakeIsLocked {},
            ))
        }
        // standard gql errors:
        ServiceError::DatabaseError(err) => err.into(),
        ServiceError::InternalError(err) => StandardGraphqlError::InternalError(err),
        ServiceError::InvalidStore => StandardGraphqlError::BadUserInput(formatted_error),
        ServiceError::StocktakeDoesNotExist => StandardGraphqlError::BadUserInput(formatted_error),
        ServiceError::CannotEditFinalised => StandardGraphqlError::BadUserInput(formatted_error),
        ServiceError::NoLines => StandardGraphqlError::BadUserInput(formatted_error),
    };

    Err(graphql_error.extend())
}

fn to_domain(
    UpdateStocktakeInput {
        id,
        comment,
        description,
        status,
        is_locked,
        stocktake_date,
    }: UpdateStocktakeInput,
) -> UpdateStocktake {
    UpdateStocktake {
        id,
        comment,
        description,
        status: status.map(|s| s.to_domain()),
        stocktake_date,
        is_locked,
    }
}

#[cfg(test)]
mod graphql {
    use async_graphql::EmptyMutation;
    use chrono::NaiveDate;
    use graphql_core::{assert_graphql_query, test_helpers::setup_graphl_test};
    use repository::{
        mock::MockDataInserts,
        schema::{StocktakeRow, StocktakeStatus},
        StorageConnectionManager,
    };
    use serde_json::json;
    use service::{
        service_provider::{ServiceContext, ServiceProvider},
        stocktake::{
            update::{UpdateStocktakeError, UpdateStocktakeInput},
            StocktakeServiceTrait,
        },
    };

    use crate::StocktakeMutations;

    type UpdateMethod = dyn Fn(
            &ServiceContext,
            &str,
            UpdateStocktakeInput,
        ) -> Result<StocktakeRow, UpdateStocktakeError>
        + Sync
        + Send;

    pub struct TestService(pub Box<UpdateMethod>);

    impl StocktakeServiceTrait for TestService {
        fn update_stocktake(
            &self,
            ctx: &ServiceContext,
            store_id: &str,
            input: UpdateStocktakeInput,
        ) -> Result<StocktakeRow, UpdateStocktakeError> {
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
    async fn test_graphql_stocktake_update() {
        let (_, _, connection_manager, settings) = setup_graphl_test(
            EmptyMutation,
            StocktakeMutations,
            "omsupply-database-gql-stocktake_update",
            MockDataInserts::all(),
        )
        .await;

        let query = r#"mutation UpdateStocktake($storeId: String, $input: UpdateStocktakeInput!) {
            updateStocktake(storeId: $storeId, input: $input) {
                ... on UpdateStocktakeError {
                  error {
                    __typename
                  }
                }
                ... on StocktakeNode {                    
                        id
                }
            }
        }"#;

        let variables = Some(json!({
            "storeId": "store id",
            "input": {
                "id": "stocktake id"
            }
        }));

        // Stocktake is locked mapping
        let test_service = TestService(Box::new(|_, _, _| {
            Err(UpdateStocktakeError::StocktakeIsLocked)
        }));

        let expected = json!({
            "updateStocktake": {
              "error": {
                "__typename": "StocktakeIsLocked"
              }
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

        // SnapshotCountCurrentCountMismatch
        let test_service = TestService(Box::new(|_, _, _| {
            Err(UpdateStocktakeError::SnapshotCountCurrentCountMismatch(
                vec![],
            ))
        }));

        let expected = json!({
            "updateStocktake": {
              "error": {
                "__typename": "SnapshotCountCurrentCountMismatch"
              }
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

        // success
        let test_service = TestService(Box::new(|_, _, _| {
            Ok(StocktakeRow {
                id: "id1".to_string(),
                user_id: "".to_string(),
                stocktake_number: 123,
                store_id: "store id".to_string(),
                comment: Some("comment".to_string()),
                description: Some("description".to_string()),
                status: StocktakeStatus::Finalised,
                created_datetime: NaiveDate::from_ymd(2022, 1, 22).and_hms(15, 16, 0),
                stocktake_date: Some(NaiveDate::from_ymd(2022, 01, 24)),
                finalised_datetime: Some(NaiveDate::from_ymd(2022, 1, 23).and_hms(15, 16, 0)),
                inventory_adjustment_id: Some("inv id".to_string()),
                is_locked: false,
            })
        }));

        let expected = json!({
            "updateStocktake": {
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
