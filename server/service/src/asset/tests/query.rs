#[cfg(test)]
mod query {
    use repository::{
        assets::asset::{AssetFilter, AssetSort, AssetSortField},
        mock::{
            asset::{mock_asset_a, mock_asset_b},
            MockDataInserts,
        },
        test_db::setup_all,
    };
    use repository::{EqualFilter, PaginationOption};

    use crate::{service_provider::ServiceProvider, ListError, SingleRecordError};

    #[actix_rt::test]
    async fn asset_service_pagination() {
        let (_, connection, connection_manager, _) = setup_all(
            "test_asset_service_pagination",
            MockDataInserts::none().assets(),
        )
        .await;

        let service_provider = ServiceProvider::new(connection_manager, "app_data");
        let service = service_provider.asset_service;

        assert_eq!(
            service.get_assets(
                &connection,
                Some(PaginationOption {
                    limit: Some(2000),
                    offset: None
                }),
                None,
                None,
            ),
            Err(ListError::LimitAboveMax(1000))
        );

        assert_eq!(
            service.get_assets(
                &connection,
                Some(PaginationOption {
                    limit: Some(0),
                    offset: None,
                }),
                None,
                None,
            ),
            Err(ListError::LimitBelowMin(1))
        );
    }

    #[actix_rt::test]
    async fn asset_service_single_record() {
        let (_, _, connection_manager, _) =
            setup_all("test_asset_single_record", MockDataInserts::none().assets()).await;

        let service_provider = ServiceProvider::new(connection_manager, "app_data");
        let context = service_provider.basic_context().unwrap();
        let service = service_provider.asset_service;

        assert_eq!(
            service.get_asset(&context, "invalid_id".to_owned()),
            Err(SingleRecordError::NotFound("invalid_id".to_owned()))
        );

        let result = service.get_asset(&context, mock_asset_a().id).unwrap();

        assert_eq!(result.id, mock_asset_a().id);
    }

    #[actix_rt::test]
    async fn asset_service_filter() {
        let (_, connection, connection_manager, _) =
            setup_all("test_asset_filter", MockDataInserts::none().assets()).await;

        let service_provider = ServiceProvider::new(connection_manager, "app_data");
        let service = service_provider.asset_service;

        // In mock data we have
        // asset_a - Class:Cold Chain Equipment Category:Refrigerators and freezers	Type:Vaccine/Waterpacks freezer
        // asset_b - Class:Cold Chain Equipment Category:Insulated Containers	Type:Vaccine Carrier LR 3L

        // 0. Check id filter
        let result = service
            .get_assets(
                &connection,
                None,
                Some(AssetFilter::new().id(EqualFilter::equal_to(&mock_asset_a().id))),
                None,
            )
            .unwrap();

        assert_eq!(result.count, 1);
        assert_eq!(result.rows[0].id, mock_asset_a().id);

        // 1. Get assets with category = Refrigerators and freezers
        // We expect just 1 result

        let result = service
            .get_assets(
                &connection,
                None,
                Some(AssetFilter::new().category_id(EqualFilter::equal_to(
                    "02cbea92-d5bf-4832-863b-c04e093a7760",
                ))),
                None,
            )
            .unwrap();

        assert_eq!(result.count, 1);
        assert_eq!(result.rows[0].id, mock_asset_a().id);

        // 2. Get assets with type = Vaccine/Waterpacks freezer
        // We expect just 1 result
        let result = service
            .get_assets(
                &connection,
                None,
                Some(AssetFilter::new().category_id(EqualFilter::equal_to(
                    "b7eea921-5a14-44cc-b5e0-ea59f2e9cb8d",
                ))),
                None,
            )
            .unwrap();

        assert_eq!(result.count, 1);
        assert_eq!(result.rows[0].id, mock_asset_b().id);

        // 3. Get assets with category = Cold Chain Equipment
        // We expect 2 results
        let result = service
            .get_assets(
                &connection,
                None,
                Some(AssetFilter::new().class_id(EqualFilter::equal_to(
                    "fad280b6-8384-41af-84cf-c7b6b4526ef0",
                ))),
                Some(AssetSort {
                    key: AssetSortField::Name,
                    desc: Some(false),
                }),
            )
            .unwrap();

        assert_eq!(result.count, 2);
        assert_eq!(result.rows[0].id, mock_asset_a().id);
        assert_eq!(result.rows[1].id, mock_asset_b().id);
    }
}
