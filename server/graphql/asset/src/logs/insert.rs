use async_graphql::*;
use graphql_core::{
    simple_generic_errors::{
        DatabaseError, InternalError, RecordAlreadyExist, UniqueValueViolation,
    },
    standard_graphql_error::{validate_auth, StandardGraphqlError},
    ContextExt,
};
use service::{
    asset::insert_log::{InsertAssetLog, InsertAssetLogError as ServiceError},
    auth::{Resource, ResourceAccessRequest},
};

use crate::types::AssetLogNode;

pub fn insert_asset_log(
    ctx: &Context<'_>,
    store_id: &str,
    input: InsertAssetLogInput,
) -> Result<InsertAssetLogResponse> {
    let user = validate_auth(
        ctx,
        &ResourceAccessRequest {
            resource: Resource::MutateAssetLog,
            store_id: Some(store_id.to_string()),
        },
    )?;

    let service_provider = ctx.service_provider();
    let service_context = service_provider.context(store_id.to_string(), user.user_id)?;

    match service_provider
        .asset_service
        .insert_asset_log(&service_context, input.into())
    {
        Ok(asset_log) => Ok(InsertAssetLogResponse::Response(AssetLogNode::from_domain(
            asset_log,
        ))),
        Err(error) => Ok(InsertAssetLogResponse::Error(InsertAssetLogError {
            error: map_error(error)?,
        })),
    }
}

#[derive(InputObject)]

pub struct InsertAssetLogInput {
    pub id: String,
    pub asset_id: String,
    pub user_id: String,
    pub status: Option<String>,
    pub reason: Option<String>,
    pub comment: Option<String>,
    pub r#type: Option<String>,
}

impl From<InsertAssetLogInput> for InsertAssetLog {
    fn from(
        InsertAssetLogInput {
            id,
            asset_id,
            user_id,
            status,
            reason,
            comment,
            r#type,
        }: InsertAssetLogInput,
    ) -> Self {
        InsertAssetLog {
            id,
            asset_id,
            user_id,
            status,
            reason,
            comment,
            r#type,
        }
    }
}

#[derive(SimpleObject)]
pub struct InsertAssetLogError {
    pub error: InsertAssetLogErrorInterface,
}

#[derive(Union)]
pub enum InsertAssetLogResponse {
    Error(InsertAssetLogError),
    Response(AssetLogNode),
}

#[derive(Interface)]
#[graphql(field(name = "description", type = "String"))]
pub enum InsertAssetLogErrorInterface {
    AssetLogAlreadyExists(RecordAlreadyExist),
    UniqueValueViolation(UniqueValueViolation),
    InternalError(InternalError),
    DatabaseError(DatabaseError),
}

fn map_error(error: ServiceError) -> Result<InsertAssetLogErrorInterface> {
    use StandardGraphqlError::*;
    let formatted_error = format!("{:?}", error);

    let graphql_error = match error {
        // Standard Graphql Errors
        ServiceError::AssetLogAlreadyExists => BadUserInput(formatted_error),
        ServiceError::CreatedRecordNotFound => InternalError(formatted_error),
        ServiceError::DatabaseError(_) => InternalError(formatted_error),
        ServiceError::AssetDoesNotExist => BadUserInput(formatted_error),
        ServiceError::InsufficientPermission => BadUserInput(formatted_error),
    };

    Err(graphql_error.extend())
}

#[cfg(test)]

mod test {
    use async_graphql::EmptyMutation;
    use graphql_core::{assert_graphql_query, test_helpers::setup_graphl_test};
    use repository::{
        assets::asset_log::AssetLog, mock::MockDataInserts, StorageConnectionManager,
    };
    use serde_json::json;

    use service::{
        asset::{
            insert_log::{InsertAssetLog, InsertAssetLogError},
            AssetServiceTrait,
        },
        service_provider::{ServiceContext, ServiceProvider},
    };

    use crate::AssetLogs;

    type InsertAssetLogMethod =
        dyn Fn(InsertAssetLog) -> Result<AssetLog, InsertAssetLogError> + Sync + Send;

    pub struct TestService(pub Box<InsertAssetLogMethod>);
    impl AssetServiceTrait for TestService {
        fn insert_asset_log(
            &self,
            _: &ServiceContext,
            input: InsertAssetLog,
        ) -> Result<AssetLog, InsertAssetLogError> {
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
        let (_, _, connection_manager, settings) = setup_graphl_test(
            EmptyMutation,
            AssetLogs,
            "test_graphql_insert_asset_log_success",
            MockDataInserts::all(),
        )
        .await;

        let mutation = r#"
        mutation ($input: InsertAssetLogInput!) {
            insertAssetLog(input: $input, storeId: \"store_a\") {
                ... on AssetLogNode {
                    id
                    assetId
                    status
                }
            }
        }
        "#;

        let variables = Some(json!({
            "input": {
                "id": "n/a",
                "assetId": "asset_a",
                "status": "status",
            }
        }));

        // Record already exists
        let test_service = TestService(Box::new(|_| {
            Ok(AssetLog {
                id: "id".to_owned(),
                asset_id: "asset_a".to_owned(),
                status: Some("status".to_owned()),
                ..Default::default()
            })
        }));

        let expected = json!({
            "insertAssetLog": {
                "id": "id",
                "assetId": "asset_a",
                "status": "status",
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
