mod graphql {

    use async_graphql::EmptyMutation;
    use graphql_core::{
        assert_graphql_query, assert_standard_graphql_error, test_helpers::setup_graphql_test,
    };
    use repository::{
        mock::{
            mock_name_a, mock_name_linked_to_store, mock_name_not_linked_to_store,
            mock_store_linked_to_name, MockDataInserts,
        },
        EqualFilter, Name, NameFilter, NameLinkRow, NameSort, NameSortField, NameType,
        PaginationOption, StorageConnectionManager, StringFilter,
    };
    use serde_json::json;
    use service::{
        name::NameServiceTrait,
        service_provider::{ServiceContext, ServiceProvider},
        ListError, ListResult,
    };

    use crate::GeneralQueries;

    type GetName = dyn Fn(
            &str,
            Option<PaginationOption>,
            Option<NameFilter>,
            Option<NameSort>,
        ) -> Result<ListResult<Name>, ListError>
        + Sync
        + Send;

    pub struct TestService(pub Box<GetName>);

    impl NameServiceTrait for TestService {
        fn get_names(
            &self,
            _: &ServiceContext,
            store_id: &str,
            pagination: Option<PaginationOption>,
            filter: Option<NameFilter>,
            sort: Option<NameSort>,
        ) -> Result<ListResult<Name>, ListError> {
            self.0(store_id, pagination, filter, sort)
        }
    }

    fn service_provider(
        test_service: TestService,
        connection_manager: &StorageConnectionManager,
    ) -> ServiceProvider {
        let mut service_provider = ServiceProvider::new(connection_manager.clone());
        service_provider.name_service = Box::new(test_service);
        service_provider
    }

    #[actix_rt::test]
    async fn test_graphql_get_names() {
        let (_, _, connection_manager, settings) = setup_graphql_test(
            GeneralQueries,
            EmptyMutation,
            "test_graphql_get_names",
            MockDataInserts::all(),
        )
        .await;

        let query = r#"
        query($storeId: String!, $page: PaginationInput, $filter: NameFilterInput, $sort: [NameSortInput!]) {
            names(filter: $filter, page: $page, sort: $sort, storeId: $storeId) {
              ... on NameConnector {
                nodes {
                  id
                }
                totalCount
              }
            }
        }
        "#;

        // Test list error
        let test_service = TestService(Box::new(|_, _, _, _| Err(ListError::LimitBelowMin(20))));

        let variables = json!({
          "storeId": "store_a"
        });

        let expected_message = "Bad user input";
        assert_standard_graphql_error!(
            &settings,
            &query,
            &Some(variables),
            &expected_message,
            None,
            Some(service_provider(test_service, &connection_manager))
        );

        // All variables and result
        let variables = json!({
          "storeId": "store_a",
          "page": {
            "first": 10,
            "offset": 20,
          },
          "sort": [{
            "key": "code",
            "desc": true
          }],
          "filter": {
            "id": {
                "notEqualTo": "id_not_equal_to"
            },
            "name": {
                "like": "name like"
            },
            "code": {
                "equalTo": "code equal to"
            },
            "isCustomer": true,
            "isSupplier": false,
            "isStore": true,
            "storeCode": {
              "like": "store code like"
            },
            "isVisible": false,
            "isSystemName": true,
            "type": { "equalTo": "STORE" },
            "phone": {
              "equalTo": "01234"
            },
            "address1": {
              "equalTo": "address1"
            },
            "address2": {
              "equalTo": "address2"
            },
            "country": {
              "equalTo": "country"
            },
            "email": {
              "equalTo": "email"
            },
          }
        });

        let expected = json!({
              "names": {
                  "nodes": [{
                      "id": mock_name_a().id,
                  }],
                  "totalCount": 1_i32
              }
          }
        );

        let test_service = TestService(Box::new(|store_id, page, filter, sort| {
            assert_eq!(store_id, "store_a");
            assert_eq!(
                sort,
                Some(NameSort {
                    key: NameSortField::Code,
                    desc: Some(true)
                })
            );
            assert_eq!(
                page,
                Some(PaginationOption {
                    offset: Some(20),
                    limit: Some(10)
                })
            );
            let NameFilter {
                id,
                name,
                code,
                is_customer,
                is_supplier,
                is_manufacturer,
                is_store,
                store_code,
                is_visible,
                is_system_name,
                r#type,
                phone,
                address1,
                address2,
                country,
                email,
                is_donor,
                code_or_name: _,
                supplying_store_id: _,
                name_link_id: _,
            } = filter.unwrap();

            assert_eq!(id, Some(EqualFilter::not_equal_to("id_not_equal_to")));
            assert_eq!(name, Some(StringFilter::like("name like")));
            assert_eq!(code, Some(StringFilter::equal_to("code equal to")));

            assert_eq!(is_customer, Some(true));
            assert_eq!(is_supplier, Some(false));
            assert_eq!(is_manufacturer, None);
            assert_eq!(is_donor, None);
            assert_eq!(is_store, Some(true));
            assert_eq!(store_code, Some(StringFilter::like("store code like")));
            assert_eq!(is_visible, Some(false));
            assert_eq!(is_system_name, Some(true));
            assert_eq!(r#type, Some(NameType::Store.equal_to()));

            assert_eq!(phone, Some(StringFilter::equal_to("01234")));
            assert_eq!(address1, Some(StringFilter::equal_to("address1")));
            assert_eq!(address2, Some(StringFilter::equal_to("address2")));
            assert_eq!(country, Some(StringFilter::equal_to("country")));
            assert_eq!(email, Some(StringFilter::equal_to("email")));

            Ok(ListResult {
                rows: vec![Name {
                    name_row: mock_name_a(),
                    name_store_join_row: None,
                    store_row: None,
                    properties: None,
                    name_link_row: NameLinkRow {
                        id: "test_id".to_string(),
                        name_id: "test_id".to_string(),
                    },
                }],
                count: 1,
            })
        }));

        assert_graphql_query!(
            &settings,
            query,
            &Some(variables),
            &expected,
            Some(service_provider(test_service, &connection_manager))
        );
    }

    #[actix_rt::test]
    async fn test_graphql_names_query_loaders() {
        let (_, _, _, settings) = setup_graphql_test(
            GeneralQueries,
            EmptyMutation,
            "test_graphql_names_query_loaders",
            MockDataInserts::all(),
        )
        .await;

        let query = r#"query Names($filter: NameFilterInput!) {
              names(filter: $filter, storeId: \"store_a\"){
                  ... on NameConnector {
                    nodes {
                        store {
                          id
                        }
                    }
                  }
              }
            }"#;

        // Test store loader, name linked to store
        let variables = Some(json!({
          "filter": {
            "id": { "equalTo": mock_name_linked_to_store().id }
          }
        }));

        let expected = json!({
          "names": {
              "nodes": [
               {
                "store": {
                  "id": mock_store_linked_to_name().id,
                }
               }
              ]
            }
          }
        );
        assert_graphql_query!(&settings, query, &variables, &expected, None);

        let variables = Some(json!({
          "filter": {
            "id": { "equalTo": mock_name_not_linked_to_store().id }
          }
        }));

        let expected = json!({
          "names": {
              "nodes": [
               {
                "store": null
               }
              ]
            }
          }
        );
        assert_graphql_query!(&settings, query, &variables, &expected, None);
    }
}
