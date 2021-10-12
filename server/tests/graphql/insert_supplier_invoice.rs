mod graphql {
    use std::{fs, path::Path};

    use crate::graphql::assert_gql_query;
    use chrono::{Duration, Utc};
    use remote_server::{
        database::{
            mock::{mock_items, mock_name_store_joins, mock_names, mock_stores},
            repository::{
                InvoiceQueryRepository, ItemRepository, NameRepository, NameStoreJoinRepository,
                StoreRepository,
            },
            schema::{ItemRow, NameRow, NameStoreJoinRow, StoreRow},
        },
        domain::{invoice::InvoiceFilter, DatetimeFilter, Pagination},
        server::service::graphql::schema::types::{InvoiceNodeStatus, InvoiceNodeType},
        util::test_db,
    };
    use serde::Serialize;
    use serde_json::json;

    #[derive(Serialize)]
    #[serde(rename_all = "camelCase")]
    struct NameNode {
        id: String,
        name: String,
        code: String,
        is_customer: bool,
        is_supplier: bool,
    }

    impl From<(&NameStoreJoinRow, &NameRow)> for NameNode {
        fn from((nj, n): (&NameStoreJoinRow, &NameRow)) -> Self {
            NameNode {
                id: n.id.to_string(),
                name: n.name.to_string(),
                code: n.code.to_string(),
                is_customer: nj.name_is_customer,
                is_supplier: nj.name_is_supplier,
            }
        }
    }

    #[actix_rt::test]
    async fn test_insert_supplier_invoice() {
        let (settings, connection) = test_db::setup_all("test_insert_supplier_invoice_query").await;

        let name_repository = NameRepository::new(&connection);
        let store_repository = StoreRepository::new(&connection);
        let name_store_repository = NameStoreJoinRepository::new(&connection);

        let mock_names: Vec<NameRow> = mock_names();
        let mock_stores: Vec<StoreRow> = mock_stores();
        let mock_items: Vec<ItemRow> = mock_items();
        let mock_name_store_joins: Vec<NameStoreJoinRow> = mock_name_store_joins();
        let item_repository = ItemRepository::new(&connection);

        for name in &mock_names {
            name_repository.insert_one(&name).await.unwrap();
        }

        for store in &mock_stores {
            store_repository.insert_one(&store).await.unwrap();
        }

        for name_store_join in &mock_name_store_joins {
            name_store_repository.upsert_one(name_store_join).unwrap();
        }

        for item in mock_items {
            item_repository.insert_one(&item).await.unwrap();
        }

        let query = fs::read_to_string(Path::new(
            "tests/graphql/queries/insert_supplier_invoice_full.graphql",
        ))
        .unwrap();
        // Test ForeingKeyError
        let variables = Some(json!({
          "id": "new_invoice",
          "otherPartyId": "invalid",
          "status": InvoiceNodeStatus::Draft,
        }));
        let expected = json!( {
            "insertSupplierInvoice": {
              "__typename": "InsertSupplierInvoiceError",
              "error": {
                "__typename": "ForeignKeyError",
                "description": "FK record doesn't exist",
                "key": "OTHER_PARTY_ID"
              }
            }
        });
        assert_gql_query(&settings, &query, &variables, &expected).await;

        // Test OtherPartyNotASupplier
        let not_supplier_name_join = mock_name_store_joins
            .iter()
            .find(|nsj| !nsj.name_is_supplier)
            .unwrap();
        let not_supplier_name = mock_names
            .iter()
            .find(|n| n.id == not_supplier_name_join.name_id)
            .unwrap();
        let variables = Some(json!({
          "id": "new_invoice",
          "otherPartyId": not_supplier_name_join.name_id,
          "status": InvoiceNodeStatus::Draft,
        }));

        let expected = json!( {
          "insertSupplierInvoice": {
            "__typename": "InsertSupplierInvoiceError",
            "error": {
              "__typename": "OtherPartyNotASupplier",
              "description": "Other party name is not a supplier",
              "otherParty": NameNode::from((not_supplier_name_join, not_supplier_name))
            }
          }
        });

        assert_gql_query(&settings, &query, &variables, &expected).await;
        // Test Success
        let start = Utc::now().naive_utc();
        let end = Utc::now()
            .naive_utc()
            .checked_add_signed(Duration::seconds(5))
            .unwrap();
        let invoice_id = "new_invoice";

        let supplier_name_join = mock_name_store_joins
            .iter()
            .find(|nsj| nsj.name_is_supplier)
            .unwrap();
        let supplier_name = mock_names
            .iter()
            .find(|n| n.id == supplier_name_join.name_id)
            .unwrap();

        let variables = Some(json!({
          "id": invoice_id,
          "otherPartyId": supplier_name_join.name_id,
          "status": InvoiceNodeStatus::Draft,
        }));

        let expected = json!( {
          "insertSupplierInvoice": {
            "id": invoice_id,
            "status": InvoiceNodeStatus::Draft,
            "type": InvoiceNodeType::SupplierInvoice
          }
        });

        let query = fs::read_to_string(Path::new(
            "tests/graphql/queries/insert_supplier_invoice_partial.graphql",
        ))
        .unwrap();
        assert_gql_query(&settings, &query, &variables, &expected).await;

        let invoice = InvoiceQueryRepository::new(&connection)
            .query(
                Pagination::one(),
                Some(
                    InvoiceFilter::new()
                        .match_id(invoice_id)
                        .set_entry_datetime(DatetimeFilter::date_range(start, end)),
                ),
                None,
            )
            .unwrap()
            .pop()
            .unwrap();

        assert_eq!(invoice.id, invoice_id);
        assert_eq!(invoice.other_party_name, supplier_name.name);
        assert_eq!(invoice.confirm_datetime, None);
        assert_eq!(invoice.finalised_datetime, None);

        // Test RecordAlreadyExist
        let expected = json!( {
          "insertSupplierInvoice": {
            "__typename": "InsertSupplierInvoiceError",
            "error": {
              "__typename": "RecordAlreadyExist",
              "description": "Record already exists",
            }
          }
        });
        let query = fs::read_to_string(Path::new(
            "tests/graphql/queries/insert_supplier_invoice_full.graphql",
        ))
        .unwrap();
        assert_gql_query(&settings, &query, &variables, &expected).await;

        // Test Confirmed
        let start = Utc::now().naive_utc();
        let end = Utc::now()
            .naive_utc()
            .checked_add_signed(Duration::seconds(5))
            .unwrap();
        let invoice_id = "new_invoice2";

        let variables = Some(json!({
          "id": invoice_id,
          "otherPartyId": supplier_name_join.name_id,
          "status": InvoiceNodeStatus::Confirmed,
        }));

        let expected = json!( {
          "insertSupplierInvoice": {
            "id": invoice_id,
            "status": InvoiceNodeStatus::Confirmed,
            "type": InvoiceNodeType::SupplierInvoice
          }
        });

        let query = fs::read_to_string(Path::new(
            "tests/graphql/queries/insert_supplier_invoice_partial.graphql",
        ))
        .unwrap();
        assert_gql_query(&settings, &query, &variables, &expected).await;

        let invoice = InvoiceQueryRepository::new(&connection)
            .query(
                Pagination::one(),
                Some(
                    InvoiceFilter::new()
                        .match_id(invoice_id)
                        .set_entry_datetime(DatetimeFilter::date_range(start, end))
                        .set_confirm_datetime(DatetimeFilter::date_range(start, end)),
                ),
                None,
            )
            .unwrap()
            .pop()
            .unwrap();

        assert_eq!(invoice.id, invoice_id);
        assert_eq!(invoice.finalised_datetime, None);
        assert_eq!(invoice.comment, None);
        assert_eq!(invoice.their_reference, None);

        // Test Finaized, comment and thier_reference
        let start = Utc::now().naive_utc();
        let end = Utc::now()
            .naive_utc()
            .checked_add_signed(Duration::seconds(5))
            .unwrap();
        let invoice_id = "new_invoice3";
        let comment = "comment";
        let their_reference = "reference";
        let variables = Some(json!({
          "id": invoice_id,
          "otherPartyId": supplier_name_join.name_id,
          "status": InvoiceNodeStatus::Finalised,
          "comment": comment,
          "theirReference": their_reference,
        }));

        let expected = json!( {
          "insertSupplierInvoice": {
            "id": invoice_id,
            "status": InvoiceNodeStatus::Finalised,
            "type": InvoiceNodeType::SupplierInvoice
          }
        });

        assert_gql_query(&settings, &query, &variables, &expected).await;

        let invoice = InvoiceQueryRepository::new(&connection)
            .query(
                Pagination::one(),
                Some(
                    InvoiceFilter::new()
                        .match_id(invoice_id)
                        .set_entry_datetime(DatetimeFilter::date_range(start, end))
                        .set_confirm_datetime(DatetimeFilter::date_range(start, end))
                        .set_finalised_datetime(DatetimeFilter::date_range(start, end)),
                ),
                None,
            )
            .unwrap()
            .pop()
            .unwrap();

        assert_eq!(invoice.id, invoice_id);
        assert_eq!(invoice.comment, Some(comment.to_string()));
        assert_eq!(invoice.their_reference, Some(their_reference.to_string()));
    }
}
