#[cfg(test)]
mod query {
    use repository::{
        assets::asset::AssetFilter,
        mock::{asset::mock_asset_a, MockDataInserts},
        test_db::setup_all,
    };
    use repository::{EqualFilter, PaginationOption, StringFilter};

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

        // check double filters with no result returned
        let result = service
            .get_assets(
                &connection,
                None,
                Some(
                    AssetFilter::new()
                        .id(EqualFilter::equal_to(&mock_asset_a().id))
                        .serial_number(StringFilter::equal_to("serial_number")),
                ),
                None,
            )
            .unwrap();

        assert_eq!(result.count, 0);
    }
}
