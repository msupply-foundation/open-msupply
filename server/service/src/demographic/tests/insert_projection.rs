#[cfg(test)]

mod query {
    use repository::{
        mock::{mock_store_a, MockDataInserts},
        test_db::setup_all,
    };

    use crate::{
        demographic::insert_demographic_projection::{
            InsertDemographicProjection, InsertDemographicProjectionError,
        },
        service_provider::ServiceProvider,
    };

    #[actix_rt::test]
    async fn projection_insert() {
        let (_, _connection, connection_manager, _) =
            setup_all("projection_insert", MockDataInserts::none().stores()).await;

        let service_provider = ServiceProvider::new(connection_manager, "app_data");
        let ctx = service_provider
            .context(mock_store_a().id, "".to_string())
            .unwrap();
        let service = service_provider.demographic_service;

        // check we can insert
        let id = "test_id".to_string();
        let id_2 = "test_id_2".to_string();
        let base_year_1 = 2024;
        let base_year_2 = 2025;
        let projection = service
            .insert_demographic_projection(
                &ctx,
                InsertDemographicProjection {
                    id: id.clone(),
                    base_year: base_year_1,
                    ..Default::default()
                },
            )
            .unwrap();

        assert_eq!(projection.id, id);

        // Check we can't insert duplicate id
        assert_eq!(
            service.insert_demographic_projection(
                &ctx,
                InsertDemographicProjection {
                    id: id.clone(),
                    base_year: base_year_2,
                    ..Default::default()
                },
            ),
            Err(InsertDemographicProjectionError::DemographicProjectionAlreadyExists)
        );

        // Check we can't insert duplicate base_year
        assert_eq!(
            service.insert_demographic_projection(
                &ctx,
                InsertDemographicProjection {
                    id: id_2.clone(),
                    base_year: base_year_1,
                    ..Default::default()
                },
            ),
            Err(InsertDemographicProjectionError::DemographicProjectionBaseYearAlreadyExists)
        );

        // Check insert will work for different year and id
        let projection = service
            .insert_demographic_projection(
                &ctx,
                InsertDemographicProjection {
                    id: id_2.clone(),
                    base_year: base_year_2,
                    ..Default::default()
                },
            )
            .unwrap();
        assert_eq!(projection.id, id_2);
    }
}
