#[cfg(test)]
mod repository_test {
    mod data {
        use chrono::{NaiveDate, NaiveDateTime};

        use crate::database::schema::{InvoiceRowStatus, MasterListNameJoinRow};

        use super::*;

        pub fn name_1() -> NameRow {
            NameRow {
                id: "name1".to_string(),
                name: "name_1".to_string(),
                code: "code1".to_string(),
                is_customer: false,
                is_supplier: false,
            }
        }

        pub fn name_2() -> NameRow {
            NameRow {
                id: "name2".to_string(),
                name: "name_2".to_string(),
                code: "code1".to_string(),
                is_customer: false,
                is_supplier: false,
            }
        }

        pub fn name_3() -> NameRow {
            NameRow {
                id: "name3".to_string(),
                name: "name_3".to_string(),
                code: "code2".to_string(),
                is_customer: true,
                is_supplier: false,
            }
        }

        pub fn store_1() -> StoreRow {
            StoreRow {
                id: "store1".to_string(),
                name_id: "name1".to_string(),
                code: "code1".to_string(),
            }
        }

        pub fn item_1() -> ItemRow {
            ItemRow {
                id: "item1".to_string(),
                name: "name1".to_string(),
                code: "code1".to_string(),
            }
        }

        pub fn item_2() -> ItemRow {
            ItemRow {
                id: "item2".to_string(),
                name: "item-2".to_string(),
                code: "code2".to_string(),
            }
        }

        pub fn stock_line_1() -> StockLineRow {
            StockLineRow {
                id: "StockLine1".to_string(),
                item_id: "item1".to_string(),
                store_id: "store1".to_string(),
                batch: Some("batch1".to_string()),
                available_number_of_packs: 6,
                pack_size: 1,
                cost_price_per_pack: 0.0,
                sell_price_per_pack: 0.0,
                total_number_of_packs: 1,
                expiry_date: None,
            }
        }

        pub fn master_list_1() -> MasterListRow {
            MasterListRow {
                id: "masterlist1".to_string(),
                name: "Master List 1".to_string(),
                code: "ML Code 1".to_string(),
                description: "ML Description 1".to_string(),
            }
        }

        pub fn master_list_upsert_1() -> MasterListRow {
            MasterListRow {
                id: "masterlist1".to_string(),
                name: "Master List 1".to_string(),
                code: "ML Code 1".to_string(),
                description: "ML Description 1".to_string(),
            }
        }

        pub fn master_list_line_1() -> MasterListLineRow {
            MasterListLineRow {
                id: "masterlistline1".to_string(),
                item_id: item_1().id.to_string(),
                master_list_id: master_list_1().id.to_string(),
            }
        }

        pub fn master_list_line_upsert_1() -> MasterListLineRow {
            MasterListLineRow {
                id: "masterlistline1".to_string(),
                item_id: item_2().id.to_string(),
                master_list_id: master_list_1().id.to_string(),
            }
        }

        pub fn master_list_name_join_1() -> MasterListNameJoinRow {
            MasterListNameJoinRow {
                id: "masterlistnamejoin1".to_string(),
                master_list_id: master_list_1().id.to_string(),
                name_id: name_1().id.to_string(),
            }
        }

        pub fn requisition_1() -> RequisitionRow {
            RequisitionRow {
                id: "requisition1".to_string(),
                name_id: name_1().id.to_string(),
                store_id: store_1().id.to_string(),
                type_of: RequisitionRowType::Imprest,
            }
        }

        pub fn requisition_2() -> RequisitionRow {
            RequisitionRow {
                id: "requisition2".to_string(),
                name_id: name_1().id.to_string(),
                store_id: store_1().id.to_string(),
                type_of: RequisitionRowType::Imprest,
            }
        }

        pub fn requisition_line_1() -> RequisitionLineRow {
            RequisitionLineRow {
                id: "requisitionline1".to_string(),
                requisition_id: requisition_1().id.to_string(),
                item_id: item_1().id.to_string(),
                actual_quantity: 0.4,
                suggested_quantity: 5.0,
            }
        }

        pub fn requisition_line_2() -> RequisitionLineRow {
            RequisitionLineRow {
                id: "requisitionline2".to_string(),
                requisition_id: requisition_1().id.to_string(),
                item_id: item_1().id.to_string(),
                actual_quantity: 100.4,
                suggested_quantity: 54.0,
            }
        }

        pub fn requisition_line_3() -> RequisitionLineRow {
            RequisitionLineRow {
                id: "requisitionline3".to_string(),
                requisition_id: requisition_2().id.to_string(),
                item_id: item_2().id.to_string(),
                actual_quantity: 100.4,
                suggested_quantity: 54.0,
            }
        }

        pub fn invoice_1() -> InvoiceRow {
            InvoiceRow {
                id: "invoice1".to_string(),
                name_id: name_1().id.to_string(),
                store_id: store_1().id.to_string(),
                invoice_number: 12,
                r#type: InvoiceRowType::SupplierInvoice,
                status: InvoiceRowStatus::Draft,
                comment: Some("".to_string()),
                their_reference: Some("".to_string()),
                // Note: keep nsecs small enough for Postgres which has limited precision.
                entry_datetime: NaiveDateTime::from_timestamp(1000, 0),
                confirm_datetime: Some(NaiveDateTime::from_timestamp(1001, 0)),
                finalised_datetime: Some(NaiveDateTime::from_timestamp(1002, 0)),
            }
        }

        pub fn invoice_2() -> InvoiceRow {
            InvoiceRow {
                id: "invoice2".to_string(),
                name_id: name_1().id.to_string(),
                store_id: store_1().id.to_string(),
                invoice_number: 12,
                r#type: InvoiceRowType::CustomerInvoice,
                status: InvoiceRowStatus::Draft,
                comment: Some("".to_string()),
                their_reference: Some("".to_string()),
                entry_datetime: NaiveDateTime::from_timestamp(2000, 0),
                confirm_datetime: Some(NaiveDateTime::from_timestamp(2001, 0)),
                finalised_datetime: Some(NaiveDateTime::from_timestamp(2002, 0)),
            }
        }

        pub fn invoice_line_1() -> InvoiceLineRow {
            InvoiceLineRow {
                id: "test1".to_string(),
                item_id: item_1().id.to_string(),
                invoice_id: invoice_1().id.to_string(),
                stock_line_id: None,
                batch: Some("".to_string()),
                expiry_date: Some(NaiveDate::from_ymd(2020, 9, 1)),
                pack_size: 1,
                cost_price_per_pack: 0.0,
                sell_price_per_pack: 0.0,
                total_after_tax: 1.0,
                available_number_of_packs: 1,
                total_number_of_packs: 1,
            }
        }
        pub fn invoice_line_2() -> InvoiceLineRow {
            InvoiceLineRow {
                id: "test2-with-optional".to_string(),
                item_id: item_1().id.to_string(),
                invoice_id: invoice_1().id.to_string(),
                stock_line_id: None,
                batch: Some("".to_string()),
                expiry_date: Some(NaiveDate::from_ymd(2020, 9, 3)),
                pack_size: 1,
                cost_price_per_pack: 0.0,
                sell_price_per_pack: 0.0,
                total_after_tax: 2.0,
                available_number_of_packs: 1,
                total_number_of_packs: 1,
            }
        }

        pub fn invoice_line_3() -> InvoiceLineRow {
            InvoiceLineRow {
                id: "test3".to_string(),
                item_id: item_2().id.to_string(),
                invoice_id: invoice_2().id.to_string(),
                stock_line_id: None,
                batch: Some("".to_string()),
                expiry_date: Some(NaiveDate::from_ymd(2020, 9, 5)),
                pack_size: 1,
                cost_price_per_pack: 0.0,
                sell_price_per_pack: 0.0,
                total_after_tax: 3.0,
                available_number_of_packs: 1,
                total_number_of_packs: 1,
            }
        }

        pub fn user_account_1() -> UserAccountRow {
            UserAccountRow {
                id: "user1".to_string(),
                username: "user 1".to_string(),
                password: "p1".to_string(),
                email: Some("email".to_string()),
            }
        }

        pub fn user_account_2() -> UserAccountRow {
            UserAccountRow {
                id: "user2".to_string(),
                username: "user 2".to_string(),
                password: "p2".to_string(),
                email: None,
            }
        }

        pub fn central_sync_buffer_row_a() -> CentralSyncBufferRow {
            CentralSyncBufferRow {
                id: 1,
                table_name: "store".to_string(),
                record_id: "store_a".to_string(),
                data: r#"{ "ID": "store_a" }"#.to_string(),
            }
        }

        pub fn central_sync_buffer_row_b() -> CentralSyncBufferRow {
            CentralSyncBufferRow {
                id: 2,
                table_name: "store".to_string(),
                record_id: "store_b".to_string(),
                data: r#"{ "ID": "store_b" }"#.to_string(),
            }
        }
    }

    use crate::{
        database::{
            repository::{
                get_repositories, repository::MasterListRepository, CentralSyncBufferRepository,
                CustomerInvoiceRepository, InvoiceLineQueryRepository, InvoiceLineRepository,
                InvoiceRepository, ItemRepository, MasterListLineRepository,
                MasterListNameJoinRepository, NameQueryFilter, NameQueryRepository, NameQuerySort,
                NameQuerySortField, NameRepository, RequisitionLineRepository,
                RequisitionRepository, SimpleStringFilter, StockLineRepository,
                StorageConnectionManager, StoreRepository, UserAccountRepository,
            },
            schema::{
                CentralSyncBufferRow, InvoiceLineRow, InvoiceRow, InvoiceRowType, ItemRow,
                MasterListLineRow, MasterListRow, NameRow, RequisitionLineRow, RequisitionRow,
                RequisitionRowType, StockLineRow, StoreRow, UserAccountRow,
            },
        },
        util::test_db,
    };

    #[actix_rt::test]
    async fn test_name_repository() {
        let settings = test_db::get_test_settings("omsupply-database-name-repository");
        test_db::setup(&settings.database).await;
        let registry = get_repositories(&settings).await;
        let connection_manager = registry.get::<StorageConnectionManager>().unwrap();
        let connection = connection_manager.connection().unwrap();

        let repo = NameRepository::new(&connection);
        let name_1 = data::name_1();
        repo.insert_one(&name_1).await.unwrap();
        let loaded_item = repo.find_one_by_id(name_1.id.as_str()).await.unwrap();
        assert_eq!(name_1, loaded_item);
    }

    #[actix_rt::test]
    async fn test_name_query_repository_all_filter_sort() {
        let settings =
            test_db::get_test_settings("omsupply-database-name-query-repository-all-filter-sort");
        test_db::setup(&settings.database).await;
        let registry = get_repositories(&settings).await;
        let connection_manager = registry.get::<StorageConnectionManager>().unwrap();
        let connection = connection_manager.connection().unwrap();

        // setup
        let name_repo = NameRepository::new(&connection);
        name_repo.insert_one(&data::name_1()).await.unwrap();
        name_repo.insert_one(&data::name_2()).await.unwrap();
        name_repo.insert_one(&data::name_3()).await.unwrap();

        let repo = registry.get::<NameQueryRepository>().unwrap();
        // test filter:
        let result = repo
            .all(
                &None,
                &Some(NameQueryFilter {
                    name: Some(SimpleStringFilter {
                        equal_to: Some("name_1".to_string()),
                        like: None,
                    }),
                    code: None,
                    is_customer: None,
                    is_supplier: None,
                }),
                &None,
            )
            .unwrap();
        assert_eq!(result.len(), 1);
        assert_eq!(result.get(0).unwrap().name, "name_1");

        let result = repo
            .all(
                &None,
                &Some(NameQueryFilter {
                    name: Some(SimpleStringFilter {
                        equal_to: None,
                        like: Some("me_".to_string()),
                    }),
                    code: None,
                    is_customer: None,
                    is_supplier: None,
                }),
                &None,
            )
            .unwrap();
        assert_eq!(result.len(), 3);

        let result = repo
            .all(
                &None,
                &Some(NameQueryFilter {
                    name: None,
                    code: Some(SimpleStringFilter {
                        equal_to: Some("code1".to_string()),
                        like: None,
                    }),
                    is_customer: None,
                    is_supplier: None,
                }),
                &None,
            )
            .unwrap();
        assert_eq!(result.len(), 2);

        /* TODO currently no way to add name_store_join rows for the following tests:
        let result = repo
            .all(
                &None,
                &Some(NameQueryFilter {
                    name: None,
                    code: None,
                    is_customer: Some(true),
                    is_supplier: None,
                }),
            )
            .unwrap();
        assert_eq!(result.len(), 1);
        assert_eq!(result.get(0).unwrap().name, "name_3");

        let result = repo
            .all(
                &None,
                &Some(NameQueryFilter {
                    name: None,
                    code: None,
                    is_customer: None,
                    is_supplier: Some(true),
                }),
            )
            .unwrap();
        assert!(result.len() == 1);
        result.iter().find(|it| it.name == "name_1").unwrap();
        result.iter().find(|it| it.name == "name_2").unwrap();
        */

        let result = repo
            .all(
                &None,
                &None,
                &Some(NameQuerySort {
                    key: NameQuerySortField::Code,
                    desc: Some(true),
                }),
            )
            .unwrap();
        assert_eq!(result.get(0).unwrap().code, "code2");
    }

    #[actix_rt::test]
    async fn test_store_repository() {
        let settings = test_db::get_test_settings("omsupply-database-store-repository");
        test_db::setup(&settings.database).await;
        let registry = get_repositories(&settings).await;
        let connection_manager = registry.get::<StorageConnectionManager>().unwrap();
        let connection = connection_manager.connection().unwrap();

        // setup
        NameRepository::new(&connection)
            .insert_one(&data::name_1())
            .await
            .unwrap();

        let repo = StoreRepository::new(&connection);
        let store_1 = data::store_1();
        repo.insert_one(&store_1).await.unwrap();
        let loaded_item = repo.find_one_by_id(store_1.id.as_str()).unwrap();
        assert_eq!(store_1, loaded_item);
    }

    #[actix_rt::test]
    async fn test_stock_line() {
        let settings = test_db::get_test_settings("omsupply-database-item-line-repository");
        test_db::setup(&settings.database).await;
        let registry = get_repositories(&settings).await;
        let connection_manager = registry.get::<StorageConnectionManager>().unwrap();
        let connection = connection_manager.connection().unwrap();

        // setup
        let item_repo = ItemRepository::new(&connection);
        item_repo.insert_one(&data::item_1()).await.unwrap();
        let name_repo = NameRepository::new(&connection);
        name_repo.insert_one(&data::name_1()).await.unwrap();
        let store_repo = StoreRepository::new(&connection);
        store_repo.insert_one(&data::store_1()).await.unwrap();

        // test insert
        let stock_line = data::stock_line_1();
        let stock_line_repo = registry.get::<StockLineRepository>().unwrap();
        stock_line_repo.insert_one(&stock_line).await.unwrap();
        let loaded_item = stock_line_repo
            .find_one_by_id(stock_line.id.as_str())
            .await
            .unwrap();
        assert_eq!(stock_line, loaded_item);
    }

    #[actix_rt::test]
    async fn test_master_list_repository() {
        let settings = test_db::get_test_settings("omsupply-database-master-list-repository");
        test_db::setup(&settings.database).await;
        let registry = get_repositories(&settings).await;
        let connection_manager = registry.get::<StorageConnectionManager>().unwrap();
        let connection = connection_manager.connection().unwrap();

        let repo = MasterListRepository::new(&connection);

        let master_list_1 = data::master_list_1();
        repo.upsert_one(&master_list_1).unwrap();
        let loaded_item = repo
            .find_one_by_id(master_list_1.id.as_str())
            .await
            .unwrap();
        assert_eq!(master_list_1, loaded_item);

        let master_list_upsert_1 = data::master_list_upsert_1();
        repo.upsert_one(&master_list_upsert_1).unwrap();
        let loaded_item = repo
            .find_one_by_id(master_list_upsert_1.id.as_str())
            .await
            .unwrap();
        assert_eq!(master_list_upsert_1, loaded_item);
    }

    #[actix_rt::test]
    async fn test_master_list_line_repository() {
        let settings = test_db::get_test_settings("omsupply-database-master-list-line-repository");
        test_db::setup(&settings.database).await;
        let registry = get_repositories(&settings).await;
        let connection_manager = registry.get::<StorageConnectionManager>().unwrap();
        let connection = connection_manager.connection().unwrap();

        // setup
        let item_repo = ItemRepository::new(&connection);
        item_repo.insert_one(&data::item_1()).await.unwrap();
        item_repo.insert_one(&data::item_2()).await.unwrap();
        MasterListRepository::new(&connection)
            .upsert_one(&data::master_list_1())
            .unwrap();

        let repo = MasterListLineRepository::new(&connection);
        let master_list_line_1 = data::master_list_line_1();
        repo.upsert_one(&master_list_line_1).unwrap();
        let loaded_item = repo
            .find_one_by_id(master_list_line_1.id.as_str())
            .await
            .unwrap();
        assert_eq!(master_list_line_1, loaded_item);

        let master_list_line_upsert_1 = data::master_list_line_upsert_1();
        repo.upsert_one(&master_list_line_upsert_1).unwrap();
        let loaded_item = repo
            .find_one_by_id(master_list_line_upsert_1.id.as_str())
            .await
            .unwrap();
        assert_eq!(master_list_line_upsert_1, loaded_item);
    }

    #[actix_rt::test]
    async fn test_master_list_name_join_repository() {
        let settings =
            test_db::get_test_settings("omsupply-database-master-list-name-join-repository");
        test_db::setup(&settings.database).await;
        let registry = get_repositories(&settings).await;
        let connection_manager = registry.get::<StorageConnectionManager>().unwrap();
        let connection = connection_manager.connection().unwrap();

        // setup
        let name_repo = NameRepository::new(&connection);
        name_repo.insert_one(&data::name_1()).await.unwrap();
        MasterListRepository::new(&connection)
            .upsert_one(&data::master_list_1())
            .unwrap();

        let repo = MasterListNameJoinRepository::new(&connection);
        let master_list_name_join_1 = data::master_list_name_join_1();
        MasterListNameJoinRepository::new(&connection)
            .upsert_one(&master_list_name_join_1)
            .unwrap();
        let loaded_item = repo
            .find_one_by_id(master_list_name_join_1.id.as_str())
            .await
            .unwrap();
        assert_eq!(master_list_name_join_1, loaded_item);
    }

    #[actix_rt::test]
    async fn test_requisition_repository() {
        let settings = test_db::get_test_settings("omsupply-database-requisition-repository");
        test_db::setup(&settings.database).await;
        let registry = get_repositories(&settings).await;
        let connection_manager = registry.get::<StorageConnectionManager>().unwrap();
        let connection = connection_manager.connection().unwrap();

        // setup
        let name_repo = NameRepository::new(&connection);
        name_repo.insert_one(&data::name_1()).await.unwrap();
        let store_repo = StoreRepository::new(&connection);
        store_repo.insert_one(&data::store_1()).await.unwrap();

        let repo = registry.get::<RequisitionRepository>().unwrap();

        let item1 = data::requisition_1();
        repo.insert_one(&item1).await.unwrap();
        let loaded_item = repo.find_one_by_id(item1.id.as_str()).await.unwrap();
        assert_eq!(item1, loaded_item);

        let item2 = data::requisition_2();
        repo.insert_one(&item2).await.unwrap();
        let loaded_item = repo.find_one_by_id(item2.id.as_str()).await.unwrap();
        assert_eq!(item2, loaded_item);
    }

    #[actix_rt::test]
    async fn test_requisition_line_repository() {
        let settings = test_db::get_test_settings("omsupply-database-requisition-line-repository");
        test_db::setup(&settings.database).await;
        let registry = get_repositories(&settings).await;
        let connection_manager = registry.get::<StorageConnectionManager>().unwrap();
        let connection = connection_manager.connection().unwrap();

        // setup
        let item_repo = ItemRepository::new(&connection);
        item_repo.insert_one(&data::item_1()).await.unwrap();
        item_repo.insert_one(&data::item_2()).await.unwrap();
        let name_repo = NameRepository::new(&connection);
        name_repo.insert_one(&data::name_1()).await.unwrap();
        let store_repo = StoreRepository::new(&connection);
        store_repo.insert_one(&data::store_1()).await.unwrap();
        let requisition_repo = registry.get::<RequisitionRepository>().unwrap();
        requisition_repo
            .insert_one(&data::requisition_1())
            .await
            .unwrap();
        requisition_repo
            .insert_one(&data::requisition_2())
            .await
            .unwrap();

        let repo = registry.get::<RequisitionLineRepository>().unwrap();
        let item1 = data::requisition_line_1();
        repo.insert_one(&item1).await.unwrap();
        let loaded_item = repo.find_one_by_id(item1.id.as_str()).await.unwrap();
        assert_eq!(item1, loaded_item);

        // find_many_by_requisition_id test:
        let item2 = data::requisition_line_2();
        repo.insert_one(&item2).await.unwrap();

        // add some noise, i.e. item3 should not be in the results
        let item3 = data::requisition_line_3();
        repo.insert_one(&item3).await.unwrap();
        let all_items = repo
            .find_many_by_requisition_id(&item1.requisition_id)
            .await
            .unwrap();
        assert_eq!(2, all_items.len());
    }

    #[actix_rt::test]
    async fn test_invoice_repository() {
        let settings = test_db::get_test_settings("omsupply-database-invoice-repository");
        test_db::setup(&settings.database).await;
        let registry = get_repositories(&settings).await;
        let connection_manager = registry.get::<StorageConnectionManager>().unwrap();
        let connection = connection_manager.connection().unwrap();

        // setup
        let name_repo = NameRepository::new(&connection);
        name_repo.insert_one(&data::name_1()).await.unwrap();
        let store_repo = StoreRepository::new(&connection);
        store_repo.insert_one(&data::store_1()).await.unwrap();

        let repo = InvoiceRepository::new(&connection);
        let customer_invoice_repo = CustomerInvoiceRepository::new(&connection);

        let item1 = data::invoice_1();
        repo.insert_one(&item1).await.unwrap();
        let loaded_item = repo.find_one_by_id(item1.id.as_str()).await.unwrap();
        assert_eq!(item1, loaded_item);

        // customer invoice
        let item1 = data::invoice_2();
        repo.insert_one(&item1).await.unwrap();
        let loaded_item = customer_invoice_repo
            .find_many_by_name_id(&item1.name_id)
            .await
            .unwrap();
        assert_eq!(1, loaded_item.len());

        let loaded_item = customer_invoice_repo
            .find_many_by_store_id(&item1.store_id)
            .unwrap();
        assert_eq!(1, loaded_item.len());
    }

    #[actix_rt::test]
    async fn test_invoice_line_repository() {
        let settings = test_db::get_test_settings("omsupply-database-invoice-line-repository");
        test_db::setup(&settings.database).await;
        let registry = get_repositories(&settings).await;
        let connection_manager = registry.get::<StorageConnectionManager>().unwrap();
        let connection = connection_manager.connection().unwrap();

        // setup
        let item_repo = ItemRepository::new(&connection);
        item_repo.insert_one(&data::item_1()).await.unwrap();
        item_repo.insert_one(&data::item_2()).await.unwrap();
        let name_repo = NameRepository::new(&connection);
        name_repo.insert_one(&data::name_1()).await.unwrap();
        let store_repo = StoreRepository::new(&connection);
        store_repo.insert_one(&data::store_1()).await.unwrap();
        let stock_line_repo = registry.get::<StockLineRepository>().unwrap();
        stock_line_repo
            .insert_one(&data::stock_line_1())
            .await
            .unwrap();
        let invoice_repo = InvoiceRepository::new(&connection);
        invoice_repo.insert_one(&data::invoice_1()).await.unwrap();
        invoice_repo.insert_one(&data::invoice_2()).await.unwrap();

        let repo = InvoiceLineRepository::new(&connection);
        let item1 = data::invoice_line_1();
        repo.insert_one(&item1).await.unwrap();
        let loaded_item = repo.find_one_by_id(item1.id.as_str()).unwrap();
        assert_eq!(item1, loaded_item);

        // row with optional field
        let item2_optional = data::invoice_line_2();
        repo.insert_one(&item2_optional).await.unwrap();
        let loaded_item = repo.find_one_by_id(item2_optional.id.as_str()).unwrap();
        assert_eq!(item2_optional, loaded_item);

        // find_many_by_invoice_id:
        // add item that shouldn't end up in the results:
        let item3 = data::invoice_line_3();
        repo.insert_one(&item3).await.unwrap();
        let all_items = repo.find_many_by_invoice_id(&item1.invoice_id).unwrap();
        assert_eq!(2, all_items.len());
    }

    #[actix_rt::test]
    async fn test_invoice_line_query_repository() {
        let settings =
            test_db::get_test_settings("omsupply-database-invoice-line-query-repository");
        test_db::setup(&settings.database).await;
        let registry = get_repositories(&settings).await;
        let connection_manager = registry.get::<StorageConnectionManager>().unwrap();
        let connection = connection_manager.connection().unwrap();

        // setup
        let item_repo = ItemRepository::new(&connection);
        item_repo.insert_one(&data::item_1()).await.unwrap();
        item_repo.insert_one(&data::item_2()).await.unwrap();
        let name_repo = NameRepository::new(&connection);
        name_repo.insert_one(&data::name_1()).await.unwrap();
        let store_repo = StoreRepository::new(&connection);
        store_repo.insert_one(&data::store_1()).await.unwrap();
        let stock_line_repo = registry.get::<StockLineRepository>().unwrap();
        stock_line_repo
            .insert_one(&data::stock_line_1())
            .await
            .unwrap();
        let invoice_repo = InvoiceRepository::new(&connection);
        invoice_repo.insert_one(&data::invoice_1()).await.unwrap();
        invoice_repo.insert_one(&data::invoice_2()).await.unwrap();
        let repo = InvoiceLineRepository::new(&connection);
        let item1 = data::invoice_line_1();
        repo.insert_one(&item1).await.unwrap();
        let item2 = data::invoice_line_2();
        repo.insert_one(&item2).await.unwrap();
        let item3 = data::invoice_line_3();
        repo.insert_one(&item3).await.unwrap();

        // line stats
        let repo = InvoiceLineQueryRepository::new(&connection);
        let result = repo.stats(&vec![data::invoice_1().id]).unwrap();
        let stats_invoice_1 = result.get(0).unwrap();
        assert_eq!(stats_invoice_1.invoice_id, data::invoice_1().id);
        assert_eq!(stats_invoice_1.total_after_tax, 3.0);
    }

    #[actix_rt::test]
    async fn test_user_account_repository() {
        let settings = test_db::get_test_settings("omsupply-database-user-account-repository");
        test_db::setup(&settings.database).await;
        let registry = get_repositories(&settings).await;

        let repo = registry.get::<UserAccountRepository>().unwrap();
        let item1 = data::user_account_1();
        repo.insert_one(&item1).await.unwrap();
        let loaded_item = repo.find_one_by_id(item1.id.as_str()).await.unwrap();
        assert_eq!(item1, loaded_item);

        // optional email
        let item2 = data::user_account_2();
        repo.insert_one(&item2).await.unwrap();
        let loaded_item = repo.find_one_by_id(item2.id.as_str()).await.unwrap();
        assert_eq!(item2, loaded_item);
    }

    #[actix_rt::test]
    async fn test_central_sync_buffer() {
        let settings = test_db::get_test_settings("omsupply-database-central-sync_buffer");
        test_db::setup(&settings.database).await;
        let registry = get_repositories(&settings).await;
        let connection_manager = registry.get::<StorageConnectionManager>().unwrap();
        let connection = connection_manager.connection().unwrap();

        let repo = CentralSyncBufferRepository::new(&connection);
        let central_sync_buffer_row_a = data::central_sync_buffer_row_a();
        let central_sync_buffer_row_b = data::central_sync_buffer_row_b();

        // `insert_one` inserts valid sync buffer row.
        repo.insert_one(&central_sync_buffer_row_a).await.unwrap();
        let result = repo.pop_one().await.unwrap();
        assert_eq!(central_sync_buffer_row_a, result);

        // `pop` returns buffered records in FIFO order.
        repo.insert_one(&central_sync_buffer_row_a).await.unwrap();
        repo.insert_one(&central_sync_buffer_row_b).await.unwrap();
        let result = repo.pop_one().await.unwrap();
        assert_eq!(central_sync_buffer_row_a, result);

        // `remove_all` removes all buffered records.
        repo.remove_all().await.unwrap();
        let result = repo.pop_one().await;
        assert!(result.is_err());
    }
}
