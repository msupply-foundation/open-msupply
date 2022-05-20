#[cfg(test)]
mod query {
    use repository::{mock::MockDataInserts, test_db::setup_all, MasterListFilter};
    use repository::{EqualFilter, SimpleStringFilter};

    use crate::service_provider::ServiceProvider;

    #[actix_rt::test]
    async fn master_list_service_filter() {
        let (_, _, connection_manager, _) =
            setup_all("test_master_list_filter", MockDataInserts::all()).await;

        let service_provider = ServiceProvider::new(connection_manager);
        let context = service_provider.context().unwrap();
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
        assert_eq!(result.rows[0].id, "master_list_filter_test");

        let result = service
            .get_master_lists(
                &context,
                None,
                Some(
                    MasterListFilter::new()
                        .exists_for_name(SimpleStringFilter::like("e_master_list_filter_te")),
                ),
                None,
            )
            .unwrap();

        let master_list_row = result.rows[0].clone();
        assert_eq!(result.count, 1);
        assert_eq!(master_list_row.id, "master_list_filter_test");
        assert_eq!(master_list_row.name, "name_master_list_filter_test");

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

        //Test filter for non existent store finds nothing
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
