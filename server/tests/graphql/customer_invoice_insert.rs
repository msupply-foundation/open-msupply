#![allow(where_clauses_object_safety)]

mod graphql {
    use crate::graphql::assert_gql_query;
    use remote_server::{
        database::{
            mock::{mock_name_store_joins, mock_names, mock_stores},
            repository::{
                get_repositories, NameRepository, NameStoreJoinRepository,
                StorageConnectionManager, StoreRepository,
            },
            schema::{NameRow, NameStoreJoinRow, StoreRow},
        },
        util::test_db,
    };
    use serde_json::json;

    #[actix_rt::test]
    async fn test_graphql_customer_invoice_insert() {
        let settings = test_db::get_test_settings("omsupply-database-gql-customer_invoice_insert");
        test_db::setup(&settings.database).await;
        let repositories = get_repositories(&settings).await;
        let connection_manager = repositories.get::<StorageConnectionManager>().unwrap();
        let connection = connection_manager.connection().unwrap();

        // setup
        let name_repository = NameRepository::new(&connection);
        let store_repository = StoreRepository::new(&connection);
        let name_store_repository = NameStoreJoinRepository::new(&connection);
        let mock_names: Vec<NameRow> = mock_names();
        let mock_stores: Vec<StoreRow> = mock_stores();
        let mock_name_store_joins: Vec<NameStoreJoinRow> = mock_name_store_joins();
        for name in &mock_names {
            name_repository.insert_one(&name).await.unwrap();
        }
        for store in mock_stores {
            store_repository.insert_one(&store).await.unwrap();
        }
        for name_store_join in &mock_name_store_joins {
            name_store_repository.upsert_one(name_store_join).unwrap();
        }

        let other_party_supplier = &mock_names[2];
        let other_party_customer = &mock_names[0];

        let query = r#"mutation InsertCustomerInvoice($input: InsertCustomerInvoiceInput!) {
            insertCustomerInvoice(input: $input) {
                ... on InsertCustomerInvoiceError {
                  error {
                    __typename
                  }
                }
                ... on NodeError {
                  error {
                    __typename
                  }
                }
                ... on InvoiceNode {
                    id
                    otherPartyId
                    comment
                }
            }
        }"#;

        // OtherPartyNotACustomerError
        let variables = Some(json!({
          "input": {
            "id": "ci_insert_1",
            "otherPartyId": other_party_supplier.id,
          }
        }));
        let expected = json!({
            "insertCustomerInvoice": {
              "error": {
                "__typename": "OtherPartyNotACustomerError"
              }
            }
          }
        );
        assert_gql_query(&settings, query, &variables, &expected).await;

        // ForeignKeyError (OtherPartyIdNotFoundError)
        let foreign_key_query = r#"mutation InsertCustomerInvoice($input: InsertCustomerInvoiceInput!) {
          insertCustomerInvoice(input: $input) {
              ... on InsertCustomerInvoiceError {
                error {
                  ... on ForeignKeyError {
                    __typename
                    key
                  }
                }
              }
          }
        }"#;
        let variables = Some(json!({
          "input": {
            "id": "ci_insert_1",
            "otherPartyId": "not existing",
          }
        }));
        let expected = json!({
            "insertCustomerInvoice": {
              "error": {
                "__typename": "ForeignKeyError",
                "key": "OTHER_PARTY_ID"
              }
            }
          }
        );
        assert_gql_query(&settings, foreign_key_query, &variables, &expected).await;

        // Test succeeding insert
        let variables = Some(json!({
          "input": {
            "id": "ci_insert_1",
            "otherPartyId": other_party_customer.id,
            "comment": "ci comment"
          }
        }));
        let expected = json!({
            "insertCustomerInvoice": {
              "id": "ci_insert_1",
              "otherPartyId": other_party_customer.id,
              "comment": "ci comment",
            }
          }
        );
        assert_gql_query(&settings, query, &variables, &expected).await;

        // RecordAlreadyExist,
        let variables = Some(json!({
          "input": {
            "id": "ci_insert_1",
            "otherPartyId": other_party_customer.id,
          }
        }));
        let expected = json!({
            "insertCustomerInvoice": {
              "error": {
                "__typename": "RecordAlreadyExist"
              }
            }
          }
        );
        assert_gql_query(&settings, query, &variables, &expected).await;
    }
}
