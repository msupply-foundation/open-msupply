use async_graphql::*;
use graphql_core::{
    simple_generic_errors::{DatabaseError, RecordBelongsToAnotherStore, RecordNotFound},
    standard_graphql_error::{validate_auth, StandardGraphqlError},
    ContextExt,
};

use graphql_types::types::{DeleteResponse, InvoiceLineConnector, StockLineConnector};
use service::{
    asset::delete::{DeleteAsset, DeleteAssetError as ServiceError},
    auth::{Resource, ResourceAccessRequest},
};

pub fn delete_asset(
    ctx: &Context<'_>,
    store_id: &str,
    input: DeleteAssetInput,
) -> Result<DeleteAssetResponse> {
    let user = validate_auth(
        ctx,
        &ResourceAccessRequest {
            resource: Resource::MutateAsset,
            store_id: Some(store_id.to_string()),
        },
    )?;

    let service_provider = ctx.service_provider();
    let service_context = service_provider.context(store_id.to_string(), user.user_id)?;

    match service_provider
        .asset_service
        .delete_asset(&service_context, input.into())
    {
        Ok(asset_id) => Ok(DeleteAssetResponse::Response(DeleteResponse(asset_id))),
        Err(error) => Ok(DeleteAssetResponse::Error(DeleteAssetError {
            error: map_error(error)?,
        })),
    }
}

#[derive(InputObject)]
pub struct DeleteAssetInput {
    pub id: String,
}

impl From<DeleteAssetInput> for DeleteAsset {
    fn from(DeleteAssetInput { id }: DeleteAssetInput) -> Self {
        DeleteAsset { id }
    }
}

#[derive(SimpleObject)]
pub struct DeleteAssetError {
    pub error: DeleteAssetErrorInterface,
}

#[derive(Union)]
pub enum DeleteAssetResponse {
    Error(DeleteAssetError),
    Response(DeleteResponse),
}

#[derive(Interface)]
#[graphql(field(name = "description", type = "String"))]
pub enum DeleteAssetErrorInterface {
    AssetNotFound(RecordNotFound),
    RecordBelongsToAnotherStore(RecordBelongsToAnotherStore),
    AssetInUse(AssetInUse),
    DatabaseError(DatabaseError),
}

fn map_error(error: ServiceError) -> Result<DeleteAssetErrorInterface> {
    use StandardGraphqlError::*;
    let formatted_error = format!("{:#?}", error);

    let graphql_error = match error {
        // Structured Errors
        ServiceError::AssetInUse(asset_in_use) => {
            return Ok(DeleteAssetErrorInterface::AssetInUse(AssetInUse {
                stock_lines: StockLineConnector::from_vec(asset_in_use.stock_lines),
                invoice_lines: InvoiceLineConnector::from_vec(asset_in_use.invoice_lines),
            }));
        }

        // Standard Graphql Errors
        ServiceError::AssetDoesNotExist => BadUserInput(formatted_error),
        ServiceError::AssetDoesNotBelongToCurrentStore => BadUserInput(formatted_error),
        ServiceError::DatabaseError(_) => InternalError(formatted_error),
    };

    Err(graphql_error.extend())
}

pub struct AssetInUse {
    stock_lines: StockLineConnector,
    invoice_lines: InvoiceLineConnector,
}

#[Object]
impl AssetInUse {
    pub async fn description(&self) -> &'static str {
        "Asset in use"
    }

    pub async fn stock_lines(&self) -> &StockLineConnector {
        &self.stock_lines
    }

    pub async fn invoice_lines(&self) -> &InvoiceLineConnector {
        &self.invoice_lines
    }
}

#[cfg(test)]
mod test {
    use async_graphql::EmptyMutation;
    use graphql_core::{
        assert_graphql_query, assert_standard_graphql_error, test_helpers::setup_graphl_test,
    };
    use repository::{
        mock::{
            mock_item_a, mock_outbound_shipment_a, mock_outbound_shipment_a_invoice_lines,
            mock_stock_line_a, MockDataInserts,
        },
        InvoiceLine, StockLine, StorageConnectionManager,
    };
    use serde_json::json;

    use service::{
        asset::{
            delete::{AssetInUse, DeleteAsset, DeleteAssetError},
            AssetServiceTrait,
        },
        service_provider::{ServiceContext, ServiceProvider},
    };

    use crate::AssetMutations;

    type DeleteAssetMethod = dyn Fn(DeleteAsset) -> Result<String, DeleteAssetError> + Sync + Send;

    pub struct TestService(pub Box<DeleteAssetMethod>);

    impl AssetServiceTrait for TestService {
        fn delete_asset(
            &self,
            _: &ServiceContext,
            input: DeleteAsset,
        ) -> Result<String, DeleteAssetError> {
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
    async fn test_graphql_delete_asset_errors() {
        let (_, _, connection_manager, settings) = setup_graphl_test(
            EmptyMutation,
            AssetMutations,
            "test_graphql_delete_asset_errors",
            MockDataInserts::all(),
        )
        .await;

        let mutation = r#"
        mutation ($input: DeleteAssetInput!) {
            deleteAsset(input: $input, storeId: \"store_a\") {
              ... on DeleteAssetError {
                error {
                  __typename
                }
              }
            }
          }
        "#;

        let variables = Some(json!({
          "input": {
            "id": "n/a",
          }
        }));

        // Record Not Found
        let test_service = TestService(Box::new(|_| Err(DeleteAssetError::AssetDoesNotExist)));
        let expected_message = "Bad user input";

        assert_standard_graphql_error!(
            &settings,
            mutation,
            &variables,
            &expected_message,
            None,
            Some(service_provider(test_service, &connection_manager))
        );

        // Not current store asset
        let test_service = TestService(Box::new(|_| {
            Err(DeleteAssetError::AssetDoesNotBelongToCurrentStore)
        }));
        let expected_message = "Bad user input";

        assert_standard_graphql_error!(
            &settings,
            mutation,
            &variables,
            &expected_message,
            None,
            Some(service_provider(test_service, &connection_manager))
        );

        // Asset in use
        let mutation = r#"
        mutation ($input: DeleteAssetInput!) {
            deleteAsset(input: $input, storeId: \"store_a\") {
              ... on DeleteAssetError {
                error {
                  __typename
                  ... on AssetInUse {
                    stockLines {
                      nodes {
                        id
                      }
                    }
                    invoiceLines {
                      nodes {
                        id
                      }
                    }
                  }
                }
              }
            }
          }
        "#;

        pub fn successful_invoice_line() -> InvoiceLine {
            InvoiceLine {
                invoice_line_row: mock_outbound_shipment_a_invoice_lines()[0].clone(),
                invoice_row: mock_outbound_shipment_a(),
                item_row: mock_item_a(),
                asset_row_option: None,
                stock_line_option: None,
            }
        }

        let test_service = TestService(Box::new(|_| {
            Err(DeleteAssetError::AssetInUse(AssetInUse {
                stock_lines: vec![StockLine {
                    stock_line_row: mock_stock_line_a(),
                    item_row: mock_item_a(),
                    asset_row: None,
                    supplier_name_row: None,
                    barcode_row: None,
                }],
                invoice_lines: vec![successful_invoice_line()],
            }))
        }));

        // let invoice_line_ids = stock_lines.iter();
        let out_line = successful_invoice_line();
        let expected = json!({
            "deleteAsset": {
              "error": {
                "__typename": "AssetInUse",
                "stockLines": {
                  "nodes": [{"id": mock_stock_line_a().id}]
                },
                "invoiceLines": {
                  "nodes": [{"id": out_line.invoice_line_row.id}]
                }
              }
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

    #[actix_rt::test]
    async fn test_graphql_delete_asset_success() {
        let (_, _, connection_manager, settings) = setup_graphl_test(
            EmptyMutation,
            AssetMutations,
            "test_graphql_delete_asset_success",
            MockDataInserts::all(),
        )
        .await;

        let mutation = r#"
        mutation ($input: DeleteAssetInput!) {
            deleteAsset(input: $input, storeId: \"store_a\") {
              ... on DeleteResponse {
                id
              }
            }
          }
        "#;

        let variables = Some(json!({
          "input": {
            "id": "n/a",

          }
        }));

        let test_service = TestService(Box::new(|_| Ok("deleted".to_owned())));

        let expected = json!({
            "deleteAsset": {
                "id": "deleted",
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
