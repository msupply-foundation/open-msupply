use async_graphql::*;
use chrono::NaiveDate;
use graphql_core::{
    simple_generic_errors::{
        DatabaseError, InternalError, NoPermissionForThisStore, RecordAlreadyExist,
        UniqueValueViolation,
    },
    standard_graphql_error::{validate_auth, StandardGraphqlError},
    ContextExt,
};
use service::{
    asset::insert::{InsertAsset, InsertAssetError as ServiceError},
    auth::{Resource, ResourceAccessRequest},
    sync::CentralServerConfig,
};

use crate::types::AssetNode;

pub fn insert_asset(
    ctx: &Context<'_>,
    store_id: &str,
    input: InsertAssetInput,
) -> Result<InsertAssetResponse> {
    let user = validate_auth(
        ctx,
        &ResourceAccessRequest {
            resource: Resource::MutateAsset,
            store_id: Some(store_id.to_string()),
        },
    )?;

    // add store_id if not inserting from central server
    let asset_input;
    if !CentralServerConfig::is_central_server() {
        match &input.store_id {
            Some(input_store_id) => {
                if input_store_id != store_id {
                    return Ok(InsertAssetResponse::Error(InsertAssetError {
                        error: InsertAssetErrorInterface::PermissionError(NoPermissionForThisStore),
                    }));
                }
                asset_input = input;
            }
            None => {
                asset_input = {
                    InsertAssetInput {
                        store_id: Some(store_id.to_owned()),
                        ..input
                    }
                }
            }
        }
    } else {
        asset_input = input
    }

    let service_provider = ctx.service_provider();
    let service_context = service_provider.context(store_id.to_string(), user.user_id)?;

    match service_provider
        .asset_service
        .insert_asset(&service_context, asset_input.into())
    {
        Ok(asset) => Ok(InsertAssetResponse::Response(AssetNode::from_domain(asset))),
        Err(error) => Ok(InsertAssetResponse::Error(InsertAssetError {
            error: map_error(error)?,
        })),
    }
}

#[derive(InputObject, Clone)]
pub struct InsertAssetInput {
    pub id: String,
    pub store_id: Option<String>,
    pub notes: Option<String>,
    pub asset_number: Option<String>,
    pub serial_number: Option<String>,
    pub catalogue_item_id: Option<String>,
    pub category_id: Option<String>,
    pub class_id: Option<String>,
    pub type_id: Option<String>,
    pub installation_date: Option<NaiveDate>,
    pub replacement_date: Option<NaiveDate>,
    pub properties: Option<String>,
    pub donor_name_id: Option<String>,
    pub warranty_start: Option<NaiveDate>,
    pub warranty_end: Option<NaiveDate>,
    pub needs_replacement: Option<bool>,
}

impl From<InsertAssetInput> for InsertAsset {
    fn from(
        InsertAssetInput {
            id,
            store_id,
            notes,
            asset_number,
            serial_number,
            catalogue_item_id,
            installation_date,
            replacement_date,
            category_id,
            class_id,
            type_id,
            properties,
            donor_name_id,
            warranty_start,
            warranty_end,
            needs_replacement,
        }: InsertAssetInput,
    ) -> Self {
        InsertAsset {
            id,
            store_id,
            notes,
            asset_number,
            serial_number,
            catalogue_item_id,
            installation_date,
            replacement_date,
            category_id,
            class_id,
            type_id,
            properties,
            donor_name_id,
            warranty_start,
            warranty_end,
            needs_replacement,
        }
    }
}
#[derive(SimpleObject)]
pub struct InsertAssetError {
    pub error: InsertAssetErrorInterface,
}

#[derive(Union)]
pub enum InsertAssetResponse {
    Error(InsertAssetError),
    Response(AssetNode),
}

#[derive(Interface)]
#[graphql(field(name = "description", ty = "String"))]
pub enum InsertAssetErrorInterface {
    AssetAlreadyExists(RecordAlreadyExist),
    UniqueValueViolation(UniqueValueViolation),
    InternalError(InternalError),
    DatabaseError(DatabaseError),
    PermissionError(NoPermissionForThisStore),
}

fn map_error(error: ServiceError) -> Result<InsertAssetErrorInterface> {
    use StandardGraphqlError::*;
    let formatted_error = format!("{:#?}", error);

    let graphql_error = match error {
        // Standard Graphql Errors
        ServiceError::AssetAlreadyExists => BadUserInput(formatted_error),
        ServiceError::CreatedRecordNotFound => InternalError(formatted_error),
        ServiceError::DatabaseError(_) => InternalError(formatted_error),
        ServiceError::SerialNumberAlreadyExists => BadUserInput(formatted_error),
        ServiceError::AssetNumberAlreadyExists => BadUserInput(formatted_error),
    };

    Err(graphql_error.extend())
}

#[cfg(test)]
mod test {

    use async_graphql::EmptyMutation;
    use graphql_core::{assert_graphql_query, test_helpers::setup_graphql_test};
    use repository::{assets::asset::Asset, mock::MockDataInserts, StorageConnectionManager};
    use serde_json::json;

    use service::{
        asset::{
            insert::{InsertAsset, InsertAssetError},
            AssetServiceTrait,
        },
        service_provider::{ServiceContext, ServiceProvider},
    };

    use crate::AssetMutations;

    type InsertAssetMethod = dyn Fn(InsertAsset) -> Result<Asset, InsertAssetError> + Sync + Send;

    pub struct TestService(pub Box<InsertAssetMethod>);

    impl AssetServiceTrait for TestService {
        fn insert_asset(
            &self,
            _: &ServiceContext,
            input: InsertAsset,
        ) -> Result<Asset, InsertAssetError> {
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
    async fn test_graphql_insert_asset_success() {
        let (_, _, connection_manager, settings) = setup_graphql_test(
            EmptyMutation,
            AssetMutations,
            "test_graphql_insert_asset_success",
            MockDataInserts::all(),
        )
        .await;

        let mutation = r#"
        mutation ($input: InsertAssetInput!) {
            insertAsset(input: $input, storeId: \"store_a\") {
              ... on AssetNode {
                id
                notes
                assetNumber
              }
            }
          }
        "#;

        let variables = Some(json!({
          "input": {
            "id": "n/a",
            "notes": "notes",
            "assetNumber": "asset_number",
          }
        }));

        // Record Already Exists
        let test_service = TestService(Box::new(|_| {
            Ok(Asset {
                id: "id".to_owned(),
                notes: Some("notes".to_owned()),
                asset_number: Some("asset_number".to_owned()),
                ..Default::default()
            })
        }));

        let expected = json!({
            "insertAsset": {
                "id": "id",
                "notes": "notes",
                "assetNumber": "asset_number",
            }
          }
        );

        assert_graphql_query!(
            &settings,
            mutation,
            &variables,
            &expected,
            Some(service_provider(test_service, &connection_manager))
        );
    }
}
