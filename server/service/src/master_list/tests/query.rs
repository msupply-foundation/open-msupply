#[cfg(test)]
mod query {
    use repository::mock::mock_store_a;
    use repository::{mock::MockDataInserts, test_db::setup_all, MasterListFilter};
    use repository::{EqualFilter, StringFilter};

    use crate::service_provider::ServiceProvider;

    #[actix_rt::test]
    async fn master_list_service_filter() {
        let (_, _, connection_manager, _) =
            setup_all("test_master_list_filter", MockDataInserts::all()).await;

        let service_provider = ServiceProvider::new(connection_manager, "app_data");
        let context = service_provider.basic_context().unwrap();
        let service = service_provider.master_list_service;

        let result = service
            .get_master_lists(
                &context,
                None,
                Some(
                    MasterListFilter::new()
                        .exists_for_name_id(EqualFilter::equal_to("id_master_list_filter_test")),
                ),
                None,
            )
            .unwrap();

        assert_eq!(result.count, 1);
        assert_eq!(result.rows[0].id, "item_query_test1");

        let result = service
            .get_master_lists(
                &context,
                None,
                Some(
                    MasterListFilter::new()
                        .exists_for_name(StringFilter::like("e_master_list_filter_te")),
                ),
                None,
            )
            .unwrap();

        let master_list_row = result.rows[0].clone();
        assert_eq!(result.count, 1);
        assert_eq!(result.rows[0].id, "master_list_filter_test");

        //Test filter on exists_for_store_id "store_a" finds something
        let result = service
            .get_master_lists(
                &context,
                None,
                Some(MasterListFilter::new().exists_for_store_id(EqualFilter::equal_to("store_a"))),
                None,
            )
            .unwrap();
        assert!(result.count >= 1);

        let result = service
            .get_master_lists(
                &context,
                None,
                Some(
                    MasterListFilter::new()
                        .exists_for_store_id(EqualFilter::equal_to("not_a_real_store")),
                ),
                None,
            )
            .unwrap();
        assert_eq!(result.count, 0);
    }
}
