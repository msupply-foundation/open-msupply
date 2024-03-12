mod mutations;
use self::mutations::*;
mod logs;
use self::logs::*;

use async_graphql::*;
use graphql_core::{
    pagination::PaginationInput,
    standard_graphql_error::{validate_auth, StandardGraphqlError},
    ContextExt,
};
mod types;
use repository::{assets::asset::AssetFilter, PaginationOption};
use service::auth::{Resource, ResourceAccessRequest};
use types::AssetLogFilterInput;
use types::AssetLogSortInput;
use types::AssetLogsResponse;
use types::{AssetConnector, AssetFilterInput, AssetSortInput, AssetsResponse};

#[derive(Default, Clone)]
pub struct AssetQueries;

#[Object]
impl AssetQueries {
    /// Query omSupply "assets" entries
    pub async fn assets(
        &self,
        ctx: &Context<'_>,
        store_id: String,
        #[graphql(desc = "Pagination option (first and offset)")] page: Option<PaginationInput>,
        #[graphql(desc = "Filter options")] filter: Option<AssetFilterInput>,
        #[graphql(desc = "Sort options (only first sort input is evaluated for this endpoint)")]
        sort: Option<Vec<AssetSortInput>>,
    ) -> Result<AssetsResponse> {
        let user = validate_auth(
            ctx,
            &ResourceAccessRequest {
                resource: Resource::QueryAsset,
                store_id: Some(store_id.clone()),
            },
        )?;

        let service_provider = ctx.service_provider();
        let service_context = service_provider.context(store_id.clone(), user.user_id)?;

        let assets = service_provider
            .asset_service
            .get_assets(
                &service_context.connection,
                page.map(PaginationOption::from),
                filter.map(AssetFilter::from),
                // Currently only one sort option is supported, use the first from the list.
                sort.and_then(|mut sort_list| sort_list.pop())
                    .map(|sort| sort.to_domain()),
            )
            .map_err(StandardGraphqlError::from_list_error)?;

        Ok(AssetsResponse::Response(AssetConnector::from_domain(
            assets,
        )))
    }
}

#[derive(Default, Clone)]
pub struct AssetMutations;

#[Object]
impl AssetMutations {
    async fn insert_asset(
        &self,
        ctx: &Context<'_>,
        store_id: String,
        input: InsertAssetInput,
    ) -> Result<InsertAssetResponse> {
        insert_asset(ctx, &store_id, input)
    }

    async fn update_asset(
        &self,
        ctx: &Context<'_>,
        store_id: String,
        input: UpdateAssetInput,
    ) -> Result<UpdateAssetResponse> {
        update_asset(ctx, &store_id, input)
    }

    async fn delete_asset(
        &self,
        ctx: &Context<'_>,
        store_id: String,
        asset_id: String,
    ) -> Result<DeleteAssetResponse> {
        delete_asset(ctx, &store_id, &asset_id)
    }
}

#[derive(Default, Clone)]
pub struct AssetLogQueries;

#[Object]
impl AssetLogQueries {
    async fn asset_logs(
        &self,
        ctx: &Context<'_>,
        store_id: String,
        page: Option<PaginationInput>,
        filter: Option<AssetLogFilterInput>,
        sort: Option<Vec<AssetLogSortInput>>,
    ) -> Result<AssetLogsResponse> {
        asset_logs(ctx, store_id, page, filter, sort)
    }
}

#[derive(Default, Clone)]
pub struct AssetLogMutations;

#[Object]
impl AssetLogMutations {
    async fn insert_asset_log(
        &self,
        ctx: &Context<'_>,
        store_id: String,
        input: InsertAssetLogInput,
    ) -> Result<InsertAssetLogResponse> {
        insert_asset_log(ctx, &store_id, input)
    }
}

#[cfg(test)]
mod test {
    use async_graphql::EmptyMutation;
    use graphql_core::assert_graphql_query;
    use graphql_core::test_helpers::setup_graphl_test;

    use repository::{
        assets::asset::{Asset, AssetFilter, AssetSort},
        mock::MockDataInserts,
        StorageConnectionManager,
    };
    use repository::{PaginationOption, StorageConnection};
    use serde_json::json;

    use service::{
        asset::AssetServiceTrait, service_provider::ServiceProvider, ListError, ListResult,
    };

    use crate::AssetQueries;

    type GetAssets = dyn Fn(
            Option<PaginationOption>,
            Option<AssetFilter>,
            Option<AssetSort>,
        ) -> Result<ListResult<Asset>, ListError>
        + Sync
        + Send;

    pub struct TestService(pub Box<GetAssets>);

    impl AssetServiceTrait for TestService {
        fn get_assets(
            &self,
            _: &StorageConnection,
            pagination: Option<PaginationOption>,
            filter: Option<AssetFilter>,
            sort: Option<AssetSort>,
        ) -> Result<ListResult<Asset>, ListError> {
            (self.0)(pagination, filter, sort)
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
    async fn test_graphql_assets_success() {
        let (_, _, connection_manager, settings) = setup_graphl_test(
            AssetQueries,
            EmptyMutation,
            "test_graphql_assets_success",
            MockDataInserts::all(),
        )
        .await;

        let query = r#"
        query {
            assets(storeId: \"store_a\") {
              ... on AssetConnector {
                nodes {
                  id
                  notes
                  code
                }
                totalCount
              }
            }
        }
        "#;

        // Test single record
        let test_service = TestService(Box::new(|_, _, _| {
            Ok(ListResult {
                rows: vec![Asset {
                    id: "test_id".to_owned(),
                    notes: Some("test_note".to_owned()),
                    code: "test_code".to_owned(),
                    ..Default::default()
                }],
                count: 1,
            })
        }));

        let expected = json!({
              "assets": {
                  "nodes": [
                      {
                          "id": "test_id",
                          "notes": "test_note",
                          "code": "test_code",
                      },
                  ],
                  "totalCount": 1
              }
          }
        );

        assert_graphql_query!(
            &settings,
            query,
            &None,
            &expected,
            Some(service_provider(test_service, &connection_manager))
        );

        // Test no records

        let test_service = TestService(Box::new(|_, _, _| {
            Ok(ListResult {
                rows: Vec::new(),
                count: 0,
            })
        }));

        let expected = json!({
              "assets": {
                  "nodes": [

                  ],
                  "totalCount": 0
              }
          }
        );

        assert_graphql_query!(
            &settings,
            query,
            &None,
            &expected,
            Some(service_provider(test_service, &connection_manager))
        );
    }
}
