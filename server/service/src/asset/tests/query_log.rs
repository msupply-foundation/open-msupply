#[cfg(test)]

mod query {
    use repository::PaginationOption;
    use repository::{
        assets::asset_log::{AssetLogFilter, AssetLogSort, AssetLogSortField},
        mock::{asset_log::mock_asset_log_a, MockDataInserts},
        test_db::setup_all,
    };

    use crate::{service_provider::ServiceProvider, ListError, SingleRecordError};

    #[actix_rt::test]

    async fn asset_log_service_pagination() {
        let (_, connection, connection_manager, _) = setup_all(
            "test_asset_log_service_pagination",
            MockDataInserts::none().asset_logs(),
        )
        .await;

        let service_provider = ServiceProvider::new(connection_manager, "app_data");
        let service = service_provider.asset_service;

        assert_eq!(
            service.get_asset_logs(
                &connection,
                Some(PaginationOption {
                    limit: Some(2000),
                    offset: None,
                }),
                None,
                None
            ),
            Err(ListError::LimitAboveMax(1000))
        );

        assert_eq!(
            service.get_asset_logs(
                &connection,
                Some(PaginationOption {
                    limit: Some(0),
                    offset: None
                }),
                None,
                None
            ),
            Err(ListError::LimitBelowMin(1))
        )
    }

    #[actix_rt::test]
    async fn asset_log_service_single_record() {
        let (_, _, connection_manager, _) = setup_all(
            "test_asset_log_single_record",
            MockDataInserts::none().asset_logs(),
        )
        .await;

        let service_provider = ServiceProvider::new(connection_manager, "app_data");
        let context = service_provider.basic_context().unwrap();
        let service = service_provider.asset_service;

        assert_eq!(
            service.get_asset_log(&context, "invalid_id".to_owned()),
            Err(SingleRecordError::NotFound("invalid_id".to_owned()))
        );

        let result = service
            .get_asset_log(&context, mock_asset_log_a().id)
            .unwrap();

        assert_eq!(result.id, mock_asset_log_a().id);
    }
}
