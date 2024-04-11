use async_graphql::*;
use graphql_core::{
    simple_generic_errors::{
        DatabaseError, InternalError, RecordAlreadyExist, UniqueValueViolation,
    },
    standard_graphql_error::{validate_auth, StandardGraphqlError},
    ContextExt,
};
use service::{
    asset::insert_log_reason::{InsertAssetLogReason, InsertAssetLogReasonError as ServiceError},
    auth::{Resource, ResourceAccessRequest},
};

use crate::types::{AssetLogReasonNode, AssetLogStatusInput};

pub fn insert_asset_log_reason(
    ctx: &Context<'_>,
    input: InsertAssetLogReasonInput,
) -> Result<InsertAssetLogReasonResponse> {
    let user = validate_auth(
        ctx,
        &ResourceAccessRequest {
            resource: Resource::MutateAsset,
            store_id: None,
        },
    )?;

    let service_provider = ctx.service_provider();
    let service_context = service_provider.context("".to_string(), user.user_id)?;

    match service_provider
        .asset_service
        .insert_asset_log_reason(&service_context, input.into())
    {
        Ok(asset_log_reason) => Ok(InsertAssetLogReasonResponse::Response(
            AssetLogReasonNode::from_domain(asset_log_reason),
        )),
        Err(error) => Ok(InsertAssetLogReasonResponse::Error(
            InsertAssetLogReasonError {
                error: map_error(error)?,
            },
        )),
    }
}

#[derive(InputObject)]

pub struct InsertAssetLogReasonInput {
    pub id: String,
    pub asset_log_status: AssetLogStatusInput,
    pub reason: String,
}
impl From<InsertAssetLogReasonInput> for InsertAssetLogReason {
    fn from(
        InsertAssetLogReasonInput {
            id,
            asset_log_status,
            reason,
        }: InsertAssetLogReasonInput,
    ) -> Self {
        InsertAssetLogReason {
            id,
            asset_log_status: asset_log_status.to_domain(),
            reason,
        }
    }
}

#[derive(SimpleObject)]
pub struct InsertAssetLogReasonError {
    pub error: InsertAssetLogReasonErrorInterface,
}

#[derive(Union)]
pub enum InsertAssetLogReasonResponse {
    Error(InsertAssetLogReasonError),
    Response(AssetLogReasonNode),
}

#[derive(Interface)]
#[graphql(field(name = "description", type = "String"))]
pub enum InsertAssetLogReasonErrorInterface {
    AssetLogReasonAlreadyExists(RecordAlreadyExist),
    UniqueValueViolation(UniqueValueViolation),
    InternalError(InternalError),
    DatabaseError(DatabaseError),
}

fn map_error(error: ServiceError) -> Result<InsertAssetLogReasonErrorInterface> {
    use StandardGraphqlError::*;
    let formatted_error = format!("{:?}", error);

    let graphql_error = match error {
        ServiceError::AssetLogReasonAlreadyExists => BadUserInput(formatted_error),
        ServiceError::CreatedRecordNotFound => InternalError(formatted_error),
        ServiceError::DatabaseError(_) => InternalError(formatted_error),
        ServiceError::InsufficientPermission => BadUserInput(formatted_error),
        ServiceError::AssetLogStatusNotExist => BadUserInput(formatted_error),
    };

    Err(graphql_error.extend())
}

#[cfg(test)]

mod test {
    use async_graphql::EmptyMutation;
    use graphql_core::{assert_graphql_query, test_helpers::setup_graphql_test};
    use repository::{
        asset_log_row::AssetLogStatus, assets::asset_log_reason::AssetLogReason,
        mock::MockDataInserts, StorageConnectionManager,
    };
    use serde_json::json;

    use service::{
        asset::{
            insert_log_reason::{InsertAssetLogReason, InsertAssetLogReasonError},
            AssetServiceTrait,
        },
        service_provider::{ServiceContext, ServiceProvider},
    };

    use crate::AssetLogReasonMutations;

    type InsertAssetLogReasonMethod = dyn Fn(InsertAssetLogReason) -> Result<AssetLogReason, InsertAssetLogReasonError>
        + Sync
        + Send;

    pub struct TestService(pub Box<InsertAssetLogReasonMethod>);
    impl AssetServiceTrait for TestService {
        fn insert_asset_log_reason(
            &self,
            _: &ServiceContext,
            input: InsertAssetLogReason,
        ) -> Result<AssetLogReason, InsertAssetLogReasonError> {
            (self.0)(input)
        }
    }

    pub fn service_provider(
        asset_service: TestService,
        connection_manager: &StorageConnectionManager,
    ) -> ServiceProvider {
        let mut service_provider = ServiceProvider::new(connection_manager.clone(), "app_data");
        service_provider.asset_service = Box::new(asset_service);
        service_provider
    }

    #[actix_rt::test]
    async fn test_graphql_insert_asset_log_success() {
        let (_, _, connection_manager, settings) = setup_graphql_test(
            EmptyMutation,
            AssetLogReasonMutations,
            "test_graphql_insert_asset_log_success",
            MockDataInserts::all(),
        )
        .await;

        let mutation = r#"
        mutation ($input: InsertAssetLogReasonInput!) {
            insertAssetLogReason(input: $input, storeId: \"store_a\") {
                ... on AssetLogReasonNode {
                    id
                    assetLogStatus
                    reason
                }
            }
        }
        "#;

        let variables = Some(json!({
            "input": {
                "id": "n/a",
                "assetLogStatus": AssetLogStatus::Functioning,
                "reason": "reason",
            }
        }));

        // Record already exists
        let test_service = TestService(Box::new(|_| {
            Ok(AssetLogReason {
                id: "id".to_owned(),
                asset_log_status: AssetLogStatus::Functioning,
                reason: "reason".to_owned(),
                ..Default::default()
            })
        }));

        let expected = json!({
            "insertAssetLogReason": {
                "id": "id",
                "assetLogStatus": AssetLogStatus::Functioning,
                "reason": "reason",
            }
        });
        assert_graphql_query!(
            &settings,
            mutation,
            &variables,
            &expected,
            Some(service_provider(test_service, &connection_manager))
        );
    }
}
