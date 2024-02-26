#[cfg(test)]
mod query {
    use chrono::NaiveDateTime;
    use repository::{
        assets::asset::{AssetFilter, AssetSortField},
        mock::MockDataInserts,
        test_db::setup_all,
    };
    use repository::{EqualFilter, PaginationOption, Sort};

    use crate::{service_provider::ServiceProvider, ListError, SingleRecordError};

    #[actix_rt::test]
    async fn asset_service_pagination() {
        let (_, connection, connection_manager, _) =
            setup_all("test_asset_service_pagination", MockDataInserts::assets()).await;

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
            setup_all("test_asset_single_record", MockDataInserts::assets()).await;

        let service_provider = ServiceProvider::new(connection_manager, "app_data");
        let context = service_provider.basic_context().unwrap();
        let service = service_provider.asset_service;

        assert_eq!(
            service.get_asset(&context, "invalid_id".to_owned()),
            Err(SingleRecordError::NotFound("invalid_id".to_owned()))
        );

        let result = service.get_asset(&context, "asset_1a".to_owned()).unwrap();

        assert_eq!(result.asset_row.id, "asset_1a");
        assert_eq!(result.asset_row.temperature, 10.6);
    }

    #[actix_rt::test]
    async fn asset_service_filter() {
        let (_, connection, connection_manager, _) =
            setup_all("test_asset_filter", MockDataInserts::all()).await;

        let service_provider = ServiceProvider::new(connection_manager, "app_data");
        let service = service_provider.asset_service;

        let result = service
            .get_assets(
                &connection,
                None,
                Some(AssetFilter::new().id(EqualFilter::equal_to("asset_1a"))),
                None,
            )
            .unwrap();

        assert_eq!(result.count, 1);
        assert_eq!(result.rows[0].asset_row.id, "asset_1a");

        let result = service
            .get_assets(
                &connection,
                None,
                Some(AssetFilter::new().id(EqualFilter::equal_any(vec![
                    "asset_1a".to_owned(),
                    "asset_1b".to_owned(),
                ]))),
                None,
            )
            .unwrap();

        assert_eq!(result.count, 2);
        assert_eq!(result.rows[0].asset_row.id, "asset_1b");
        assert_eq!(result.rows[1].asset_row.id, "asset_1a");
    }

    #[actix_rt::test]
    async fn asset_service_sort() {
        let (mock_data, connection, connection_manager, _) =
            setup_all("test_asset_sort", MockDataInserts::all()).await;

        let service_provider = ServiceProvider::new(connection_manager, "app_data");
        let service = service_provider.asset_service;

        assert_eq!(result_assets, sorted_assets);
    }
}
