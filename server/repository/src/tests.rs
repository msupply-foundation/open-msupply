#[cfg(test)]
mod repository_test {
    mod data {
        use chrono::{NaiveDate, NaiveDateTime};
        use util::inline_init;

        use crate::schema::*;

        pub fn name_1() -> NameRow {
            NameRow {
                id: "name1".to_string(),
                name: "name_1".to_string(),
                code: "code1".to_string(),
                is_customer: false,
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
                unit_id: None,
                r#type: ItemRowType::Stock,
            }
        }

        pub fn item_2() -> ItemRow {
            ItemRow {
                id: "item2".to_string(),
                name: "item-2".to_string(),
                code: "code2".to_string(),
                unit_id: None,
                r#type: ItemRowType::Stock,
            }
        }

        pub fn item_service_1() -> ItemRow {
            ItemRow {
                id: "item_service_1".to_string(),
                name: "item_service_name_1".to_string(),
                code: "item_service_code_1".to_string(),
                unit_id: None,
                r#type: ItemRowType::Service,
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
                expiry_date: Some(NaiveDate::from_ymd(2021, 12, 13)),
                on_hold: false,
                note: None,
                location_id: None,
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

        pub fn invoice_1() -> InvoiceRow {
            inline_init(|r: &mut InvoiceRow| {
                r.id = "invoice1".to_string();
                r.name_id = name_1().id.to_string();
                r.store_id = store_1().id.to_string();
                r.invoice_number = 12;
                r.r#type = InvoiceRowType::InboundShipment;
                r.status = InvoiceRowStatus::New;
                r.comment = Some("".to_string());
                r.their_reference = Some("".to_string());
                // Note: keep nsecs small enough for Postgres which has limited precision;
                r.created_datetime = NaiveDateTime::from_timestamp(1000, 0);
            })
        }

        pub fn invoice_2() -> InvoiceRow {
            inline_init(|r: &mut InvoiceRow| {
                r.id = "invoice2".to_string();
                r.name_id = name_1().id.to_string();
                r.store_id = store_1().id.to_string();
                r.invoice_number = 12;
                r.r#type = InvoiceRowType::OutboundShipment;
                r.status = InvoiceRowStatus::New;
                r.comment = Some("".to_string());
                r.their_reference = Some("".to_string());
                r.created_datetime = NaiveDateTime::from_timestamp(2000, 0);
            })
        }

        pub fn invoice_line_1() -> InvoiceLineRow {
            InvoiceLineRow {
                id: "test1".to_string(),
                item_id: item_1().id.to_string(),
                item_name: item_1().name.to_string(),
                item_code: item_1().code.to_string(),
                invoice_id: invoice_1().id.to_string(),
                stock_line_id: None,
                batch: Some("".to_string()),
                expiry_date: Some(NaiveDate::from_ymd(2020, 9, 1)),
                pack_size: 1,
                cost_price_per_pack: 0.0,
                sell_price_per_pack: 0.0,
                total_before_tax: 1.0,
                total_after_tax: 1.0,
                tax: None,
                r#type: InvoiceLineRowType::StockIn,
                number_of_packs: 1,
                note: None,
                location_id: None,
            }
        }
        pub fn invoice_line_2() -> InvoiceLineRow {
            InvoiceLineRow {
                id: "test2-with-optional".to_string(),
                item_id: item_1().id.to_string(),
                item_name: item_1().name.to_string(),
                item_code: item_1().code.to_string(),
                invoice_id: invoice_1().id.to_string(),
                stock_line_id: None,
                batch: Some("".to_string()),
                expiry_date: Some(NaiveDate::from_ymd(2020, 9, 3)),
                pack_size: 1,
                cost_price_per_pack: 0.0,
                sell_price_per_pack: 0.0,
                total_before_tax: 2.0,
                total_after_tax: 2.0,
                tax: None,
                r#type: InvoiceLineRowType::StockOut,
                number_of_packs: 1,
                note: None,
                location_id: None,
            }
        }

        pub fn invoice_line_3() -> InvoiceLineRow {
            InvoiceLineRow {
                id: "test3".to_string(),
                item_id: item_2().id.to_string(),
                item_name: item_2().name.to_string(),
                item_code: item_2().code.to_string(),
                invoice_id: invoice_2().id.to_string(),
                stock_line_id: None,
                batch: Some("".to_string()),
                expiry_date: Some(NaiveDate::from_ymd(2020, 9, 5)),
                pack_size: 1,
                cost_price_per_pack: 0.0,
                sell_price_per_pack: 0.0,
                total_before_tax: 3.0,
                total_after_tax: 3.0,
                tax: None,
                r#type: InvoiceLineRowType::StockOut,
                number_of_packs: 1,
                note: None,
                location_id: None,
            }
        }

        pub fn invoice_line_service() -> InvoiceLineRow {
            InvoiceLineRow {
                id: "test_service_item".to_string(),
                item_id: item_service_1().id.to_string(),
                item_name: item_service_1().name.to_string(),
                item_code: item_service_1().code.to_string(),
                invoice_id: invoice_1().id.to_string(),
                stock_line_id: None,
                batch: Some("".to_string()),
                expiry_date: Some(NaiveDate::from_ymd(2021, 12, 6)),
                pack_size: 1,
                cost_price_per_pack: 0.0,
                sell_price_per_pack: 0.0,
                total_before_tax: 10.0,
                total_after_tax: 15.0,
                tax: None,
                r#type: InvoiceLineRowType::Service,
                number_of_packs: 1,
                note: None,
                location_id: None,
            }
        }

        pub fn user_account_1() -> UserAccountRow {
            UserAccountRow {
                id: "user1".to_string(),
                username: "user 1".to_string(),
                hashed_password: "p1".to_string(),
                email: Some("email".to_string()),
            }
        }

        pub fn user_account_2() -> UserAccountRow {
            UserAccountRow {
                id: "user2".to_string(),
                username: "user 2".to_string(),
                hashed_password: "p2".to_string(),
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

    use std::convert::TryInto;

    use crate::{
        database_settings::get_storage_connection_manager,
        mock::{
            mock_draft_request_requisition_line, mock_draft_request_requisition_line2,
            mock_inbound_shipment_number_store_a, mock_master_list_master_list_line_filter_test,
            mock_outbound_shipment_number_store_a, mock_request_draft_requisition,
            mock_request_draft_requisition2, mock_stocktake_a, mock_stocktake_b,
            mock_stocktake_no_line_a, mock_stocktake_no_line_b, mock_test_master_list_name1,
            mock_test_master_list_name2, mock_test_master_list_name_filter1,
            mock_test_master_list_name_filter2, mock_test_master_list_name_filter3,
            mock_test_master_list_store1, MockDataInserts,
        },
        schema::{
            ChangelogAction, ChangelogRow, ChangelogTableName, KeyValueType, NumberRowType,
            RequisitionRowStatus,
        },
        test_db, CentralSyncBufferRepository, ChangelogRepository, InvoiceLineRepository,
        InvoiceLineRowRepository, InvoiceRepository, ItemRepository, KeyValueStoreRepository,
        MasterListFilter, MasterListLineFilter, MasterListLineRepository,
        MasterListLineRowRepository, MasterListNameJoinRepository, MasterListRepository,
        MasterListRowRepository, NameRepository, NumberRowRepository, OutboundShipmentRepository,
        RequisitionFilter, RequisitionLineFilter, RequisitionLineRepository,
        RequisitionLineRowRepository, RequisitionRepository, RequisitionRowRepository,
        StockLineFilter, StockLineRepository, StockLineRowRepository, StocktakeRowRepository,
        StoreRowRepository, UserAccountRowRepository,
    };
    use crate::{DateFilter, EqualFilter, SimpleStringFilter};
    use chrono::Duration;
    use diesel::{sql_query, sql_types::Text, RunQueryDsl};
    use util::inline_edit;

    #[actix_rt::test]
    async fn test_name_repository() {
        let settings = test_db::get_test_db_settings("omsupply-database-name-repository");
        test_db::setup(&settings).await;
        let connection_manager = get_storage_connection_manager(&settings);
        let connection = connection_manager.connection().unwrap();

        let repo = NameRepository::new(&connection);
        let name_1 = data::name_1();
        repo.insert_one(&name_1).await.unwrap();
        let loaded_item = repo.find_one_by_id(name_1.id.as_str()).unwrap().unwrap();
        assert_eq!(name_1, loaded_item);
    }

    #[actix_rt::test]
    async fn test_store_repository() {
        let settings = test_db::get_test_db_settings("omsupply-database-store-repository");
        test_db::setup(&settings).await;
        let connection_manager = get_storage_connection_manager(&settings);
        let connection = connection_manager.connection().unwrap();

        // setup
        NameRepository::new(&connection)
            .insert_one(&data::name_1())
            .await
            .unwrap();

        let repo = StoreRowRepository::new(&connection);
        let store_1 = data::store_1();
        repo.insert_one(&store_1).await.unwrap();
        let loaded_item = repo.find_one_by_id(store_1.id.as_str()).unwrap().unwrap();
        assert_eq!(store_1, loaded_item);
    }

    #[actix_rt::test]
    async fn test_stock_line() {
        let settings = test_db::get_test_db_settings("omsupply-database-item-line-repository");
        test_db::setup(&settings).await;
        let connection_manager = get_storage_connection_manager(&settings);
        let connection = connection_manager.connection().unwrap();

        // setup
        let item_repo = ItemRepository::new(&connection);
        item_repo.insert_one(&data::item_1()).await.unwrap();
        let name_repo = NameRepository::new(&connection);
        name_repo.insert_one(&data::name_1()).await.unwrap();
        let store_repo = StoreRowRepository::new(&connection);
        store_repo.insert_one(&data::store_1()).await.unwrap();

        // test insert
        let stock_line = data::stock_line_1();
        let stock_line_repo = StockLineRowRepository::new(&connection);
        stock_line_repo.upsert_one(&stock_line).unwrap();
        let loaded_item = stock_line_repo
            .find_one_by_id(stock_line.id.as_str())
            .unwrap();
        assert_eq!(stock_line, loaded_item);
    }

    #[actix_rt::test]
    async fn test_stock_line_query() {
        let settings =
            test_db::get_test_db_settings("omsupply-database-item-line-query-repository");
        test_db::setup(&settings).await;
        let connection_manager = get_storage_connection_manager(&settings);
        let connection = connection_manager.connection().unwrap();

        // setup
        let item_repo = ItemRepository::new(&connection);
        item_repo.insert_one(&data::item_1()).await.unwrap();
        let name_repo = NameRepository::new(&connection);
        name_repo.insert_one(&data::name_1()).await.unwrap();
        let store_repo = StoreRowRepository::new(&connection);
        store_repo.insert_one(&data::store_1()).await.unwrap();
        let stock_line = data::stock_line_1();
        let stock_line_repo = StockLineRowRepository::new(&connection);
        stock_line_repo.upsert_one(&stock_line).unwrap();

        // test expiry data filter
        let expiry_date = stock_line.expiry_date.unwrap();
        let stock_line_repo = StockLineRepository::new(&connection);
        let result = stock_line_repo
            .query_by_filter(StockLineFilter::new().expiry_date(DateFilter {
                equal_to: None,
                before_or_equal_to: Some(expiry_date - Duration::days(1)),
                after_or_equal_to: None,
            }))
            .unwrap();
        assert_eq!(result.len(), 0);
        let result = stock_line_repo
            .query_by_filter(StockLineFilter::new().expiry_date(DateFilter {
                equal_to: None,
                before_or_equal_to: Some(expiry_date),
                after_or_equal_to: None,
            }))
            .unwrap();
        assert_eq!(result.len(), 1);
        let result = stock_line_repo
            .query_by_filter(StockLineFilter::new().expiry_date(DateFilter {
                equal_to: None,
                before_or_equal_to: Some(expiry_date + Duration::days(1)),
                after_or_equal_to: None,
            }))
            .unwrap();
        assert_eq!(result.len(), 1);
    }

    #[actix_rt::test]
    async fn test_master_list_row_repository() {
        let settings = test_db::get_test_db_settings("test_master_list_row_repository");
        test_db::setup(&settings).await;
        let connection_manager = get_storage_connection_manager(&settings);
        let connection = connection_manager.connection().unwrap();

        let repo = MasterListRowRepository::new(&connection);

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
    async fn test_master_list_repository() {
        let (_, connection, _, _) =
            test_db::setup_all("test_master_list_repository", MockDataInserts::all()).await;

        let repo = MasterListRepository::new(&connection);

        let id_rows: Vec<String> = repo
            .query_by_filter(
                MasterListFilter::new()
                    .exists_for_name_id(EqualFilter::equal_to(&mock_test_master_list_name1().id)),
            )
            .unwrap()
            .into_iter()
            .map(|r| r.id)
            .collect();

        assert_eq!(
            id_rows,
            vec![
                mock_test_master_list_name_filter1().master_list.id,
                mock_test_master_list_name_filter3().master_list.id
            ]
        );

        let id_rows: Vec<String> = repo
            .query_by_filter(
                MasterListFilter::new()
                    .exists_for_name_id(EqualFilter::equal_to(&mock_test_master_list_name2().id)),
            )
            .unwrap()
            .into_iter()
            .map(|r| r.id)
            .collect();

        assert_eq!(
            id_rows,
            vec![
                mock_test_master_list_name_filter1().master_list.id,
                mock_test_master_list_name_filter2().master_list.id
            ]
        );

        let id_rows: Vec<String> = repo
            .query_by_filter(
                MasterListFilter::new()
                    .exists_for_store_id(EqualFilter::equal_to(&mock_test_master_list_store1().id)),
            )
            .unwrap()
            .into_iter()
            .map(|r| r.id)
            .collect();

        assert_eq!(
            id_rows,
            vec![
                mock_test_master_list_name_filter2().master_list.id,
                mock_test_master_list_name_filter3().master_list.id
            ]
        );

        let id_rows: Vec<String> = repo
            .query_by_filter(
                MasterListFilter::new()
                    .exists_for_name(SimpleStringFilter::like("test_master_list_name")),
            )
            .unwrap()
            .into_iter()
            .map(|r| r.id)
            .collect();

        assert_eq!(
            id_rows,
            vec![
                mock_test_master_list_name_filter1().master_list.id,
                mock_test_master_list_name_filter2().master_list.id,
                mock_test_master_list_name_filter3().master_list.id
            ]
        )
    }

    #[actix_rt::test]
    async fn test_master_list_line_repository() {
        let settings =
            test_db::get_test_db_settings("omsupply-database-master-list-line-repository");
        test_db::setup(&settings).await;
        let connection_manager = get_storage_connection_manager(&settings);
        let connection = connection_manager.connection().unwrap();

        // setup
        let item_repo = ItemRepository::new(&connection);
        item_repo.insert_one(&data::item_1()).await.unwrap();
        item_repo.insert_one(&data::item_2()).await.unwrap();
        MasterListRowRepository::new(&connection)
            .upsert_one(&data::master_list_1())
            .unwrap();

        let repo = MasterListLineRowRepository::new(&connection);
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
            test_db::get_test_db_settings("omsupply-database-master-list-name-join-repository");
        test_db::setup(&settings).await;
        let connection_manager = get_storage_connection_manager(&settings);
        let connection = connection_manager.connection().unwrap();

        // setup
        let name_repo = NameRepository::new(&connection);
        name_repo.insert_one(&data::name_1()).await.unwrap();
        MasterListRowRepository::new(&connection)
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
    async fn test_invoice_repository() {
        let settings = test_db::get_test_db_settings("omsupply-database-invoice-repository");
        test_db::setup(&settings).await;
        let connection_manager = get_storage_connection_manager(&settings);
        let connection = connection_manager.connection().unwrap();

        // setup
        let name_repo = NameRepository::new(&connection);
        name_repo.insert_one(&data::name_1()).await.unwrap();
        let store_repo = StoreRowRepository::new(&connection);
        store_repo.insert_one(&data::store_1()).await.unwrap();

        let repo = InvoiceRepository::new(&connection);
        let outbound_shipment_repo = OutboundShipmentRepository::new(&connection);

        let item1 = data::invoice_1();
        repo.upsert_one(&item1).unwrap();
        let loaded_item = repo.find_one_by_id(item1.id.as_str()).unwrap();
        assert_eq!(item1, loaded_item);

        // outbound shipment
        let item1 = data::invoice_2();
        repo.upsert_one(&item1).unwrap();
        let loaded_item = outbound_shipment_repo
            .find_many_by_name_id(&item1.name_id)
            .await
            .unwrap();
        assert_eq!(1, loaded_item.len());

        let loaded_item = outbound_shipment_repo
            .find_many_by_store_id(&item1.store_id)
            .unwrap();
        assert_eq!(1, loaded_item.len());
    }

    #[actix_rt::test]
    async fn test_invoice_line_repository() {
        let settings = test_db::get_test_db_settings("omsupply-database-invoice-line-repository");
        test_db::setup(&settings).await;
        let connection_manager = get_storage_connection_manager(&settings);
        let connection = connection_manager.connection().unwrap();

        // setup
        let item_repo = ItemRepository::new(&connection);
        item_repo.insert_one(&data::item_1()).await.unwrap();
        item_repo.insert_one(&data::item_2()).await.unwrap();
        let name_repo = NameRepository::new(&connection);
        name_repo.insert_one(&data::name_1()).await.unwrap();
        let store_repo = StoreRowRepository::new(&connection);
        store_repo.insert_one(&data::store_1()).await.unwrap();
        let stock_line_repo = StockLineRowRepository::new(&connection);
        stock_line_repo.upsert_one(&data::stock_line_1()).unwrap();
        let invoice_repo = InvoiceRepository::new(&connection);
        invoice_repo.upsert_one(&data::invoice_1()).unwrap();
        invoice_repo.upsert_one(&data::invoice_2()).unwrap();

        let repo = InvoiceLineRowRepository::new(&connection);
        let item1 = data::invoice_line_1();
        repo.upsert_one(&item1).unwrap();
        let loaded_item = repo.find_one_by_id(item1.id.as_str()).unwrap();
        assert_eq!(item1, loaded_item);

        // row with optional field
        let item2_optional = data::invoice_line_2();
        repo.upsert_one(&item2_optional).unwrap();
        let loaded_item = repo.find_one_by_id(item2_optional.id.as_str()).unwrap();
        assert_eq!(item2_optional, loaded_item);

        // find_many_by_invoice_id:
        // add item that shouldn't end up in the results:
        let item3 = data::invoice_line_3();
        repo.upsert_one(&item3).unwrap();
        let all_items = repo.find_many_by_invoice_id(&item1.invoice_id).unwrap();
        assert_eq!(2, all_items.len());
    }

    #[actix_rt::test]
    async fn test_invoice_line_query_repository() {
        let settings =
            test_db::get_test_db_settings("omsupply-database-invoice-line-query-repository");
        test_db::setup(&settings).await;
        let connection_manager = get_storage_connection_manager(&settings);
        let connection = connection_manager.connection().unwrap();

        // setup
        let item_repo = ItemRepository::new(&connection);
        item_repo.insert_one(&data::item_1()).await.unwrap();
        item_repo.insert_one(&data::item_2()).await.unwrap();
        item_repo.insert_one(&data::item_service_1()).await.unwrap();
        let name_repo = NameRepository::new(&connection);
        name_repo.insert_one(&data::name_1()).await.unwrap();
        let store_repo = StoreRowRepository::new(&connection);
        store_repo.insert_one(&data::store_1()).await.unwrap();
        let stock_line_repo = StockLineRowRepository::new(&connection);
        stock_line_repo.upsert_one(&data::stock_line_1()).unwrap();
        let invoice_repo = InvoiceRepository::new(&connection);
        invoice_repo.upsert_one(&data::invoice_1()).unwrap();
        invoice_repo.upsert_one(&data::invoice_2()).unwrap();
        let repo = InvoiceLineRowRepository::new(&connection);
        let item1 = data::invoice_line_1();
        repo.upsert_one(&item1).unwrap();
        let item2 = data::invoice_line_2();
        repo.upsert_one(&item2).unwrap();
        let item3 = data::invoice_line_3();
        repo.upsert_one(&item3).unwrap();
        let service_item = data::invoice_line_service();
        repo.upsert_one(&service_item).unwrap();

        // line stats
        let repo = InvoiceLineRepository::new(&connection);
        let invoice_1_id = data::invoice_1().id;
        let result = repo.stats(&vec![invoice_1_id.clone()]).unwrap();
        let stats_invoice_1 = result
            .into_iter()
            .find(|row| row.invoice_id == invoice_1_id)
            .unwrap();
        assert_eq!(
            stats_invoice_1,
            inline_edit(&stats_invoice_1, |mut u| {
                u.invoice_id = invoice_1_id;
                u.total_before_tax = 13.0;
                u.total_after_tax = 18.0;
                u.stock_total_before_tax = 3.0;
                u.stock_total_after_tax = 3.0;
                u.service_total_before_tax = 10.0;
                u.service_total_after_tax = 15.0;
                u
            })
        );
    }

    #[actix_rt::test]
    async fn test_user_account_repository() {
        let settings = test_db::get_test_db_settings("omsupply-database-user-account-repository");
        test_db::setup(&settings).await;
        let connection_manager = get_storage_connection_manager(&settings);
        let connection = connection_manager.connection().unwrap();

        let repo = UserAccountRowRepository::new(&connection);
        let item1 = data::user_account_1();
        repo.insert_one(&item1).unwrap();
        let loaded_item = repo.find_one_by_id(item1.id.as_str()).unwrap();
        assert_eq!(item1, loaded_item.unwrap());

        // optional email
        let item2 = data::user_account_2();
        repo.insert_one(&item2).unwrap();
        let loaded_item = repo.find_one_by_id(item2.id.as_str()).unwrap();
        assert_eq!(item2, loaded_item.unwrap());
    }

    #[actix_rt::test]
    async fn test_central_sync_buffer() {
        let settings = test_db::get_test_db_settings("omsupply-database-central-sync_buffer");
        test_db::setup(&settings).await;
        let connection_manager = get_storage_connection_manager(&settings);
        let connection = connection_manager.connection().unwrap();

        let repo = CentralSyncBufferRepository::new(&connection);
        let central_sync_buffer_row_a = data::central_sync_buffer_row_a();
        let central_sync_buffer_row_b = data::central_sync_buffer_row_b();

        // `insert_one` inserts some sync entries
        repo.insert_one(&central_sync_buffer_row_a).await.unwrap();
        repo.insert_one(&central_sync_buffer_row_b).await.unwrap();

        // `remove_all` removes all buffered records.
        repo.remove_all().await.unwrap();
        let result = repo
            .get_sync_entries(&central_sync_buffer_row_a.table_name)
            .await
            .unwrap();
        assert!(result.is_empty());
    }

    #[actix_rt::test]
    async fn test_number() {
        let (_, connection, _, _) = test_db::setup_all("test_number", MockDataInserts::all()).await;

        let repo = NumberRowRepository::new(&connection);

        let inbound_shipment_store_a_number = mock_inbound_shipment_number_store_a();
        let outbound_shipment_store_b_number = mock_outbound_shipment_number_store_a();

        let result = repo
            .find_one_by_type_and_store(&NumberRowType::InboundShipment, "store_a")
            .unwrap();
        assert_eq!(result, Some(inbound_shipment_store_a_number));

        let result = repo
            .find_one_by_type_and_store(&NumberRowType::OutboundShipment, "store_a")
            .unwrap();
        assert_eq!(result, Some(outbound_shipment_store_b_number));

        // Test not existing
        let result = repo
            .find_one_by_type_and_store(&NumberRowType::OutboundShipment, "store_b")
            .unwrap();
        assert_eq!(result, None);
    }

    #[actix_rt::test]
    async fn test_changelog() {
        let (_, connection, _, _) =
            test_db::setup_all("test_changelog", MockDataInserts::none().names().stores()).await;

        // use stock take entries to populate the changelog (via the trigger)
        let stocktake_repo = StocktakeRowRepository::new(&connection);
        let repo = ChangelogRepository::new(&connection);

        // single entry:
        let stocktake_a = mock_stocktake_a();
        stocktake_repo.upsert_one(&stocktake_a).unwrap();
        let mut result = repo.changelogs(0, 10).unwrap();
        assert_eq!(1, result.len());
        let log_entry = result.pop().unwrap();
        assert_eq!(
            log_entry,
            ChangelogRow {
                id: 1,
                table_name: ChangelogTableName::Stocktake,
                row_id: stocktake_a.id.clone(),
                row_action: ChangelogAction::Upsert,
            }
        );

        // querying from the first entry should give the same result:
        assert_eq!(
            repo.changelogs(0, 10).unwrap(),
            repo.changelogs(1, 10).unwrap()
        );

        // update the entry
        let mut stocktake_a_update = mock_stocktake_a();
        stocktake_a_update.comment = Some("updated".to_string());
        stocktake_repo.upsert_one(&stocktake_a_update).unwrap();
        let mut result = repo.changelogs((log_entry.id + 1) as u64, 10).unwrap();
        assert_eq!(1, result.len());
        let log_entry = result.pop().unwrap();
        assert_eq!(
            log_entry,
            ChangelogRow {
                id: 2,
                table_name: ChangelogTableName::Stocktake,
                row_id: stocktake_a.id.clone(),
                row_action: ChangelogAction::Upsert,
            }
        );

        // query the full list from cursor=0
        let mut result = repo.changelogs(0, 10).unwrap();
        assert_eq!(1, result.len());
        let log_entry = result.pop().unwrap();
        assert_eq!(
            log_entry,
            ChangelogRow {
                id: 2,
                table_name: ChangelogTableName::Stocktake,
                row_id: stocktake_a.id.clone(),
                row_action: ChangelogAction::Upsert,
            }
        );

        // add another entry
        let stocktake_b = mock_stocktake_b();
        stocktake_repo.upsert_one(&stocktake_b).unwrap();
        let result = repo.changelogs(0, 10).unwrap();
        assert_eq!(2, result.len());
        assert_eq!(
            result,
            vec![
                ChangelogRow {
                    id: 2,
                    table_name: ChangelogTableName::Stocktake,
                    row_id: stocktake_a.id.clone(),
                    row_action: ChangelogAction::Upsert,
                },
                ChangelogRow {
                    id: 3,
                    table_name: ChangelogTableName::Stocktake,
                    row_id: stocktake_b.id.clone(),
                    row_action: ChangelogAction::Upsert,
                }
            ]
        );

        // delete an entry
        stocktake_repo.delete(&stocktake_b.id).unwrap();
        let result = repo.changelogs(0, 10).unwrap();
        assert_eq!(2, result.len());
        assert_eq!(
            result,
            vec![
                ChangelogRow {
                    id: 2,
                    table_name: ChangelogTableName::Stocktake,
                    row_id: stocktake_a.id.clone(),
                    row_action: ChangelogAction::Upsert,
                },
                ChangelogRow {
                    id: 4,
                    table_name: ChangelogTableName::Stocktake,
                    row_id: stocktake_b.id.clone(),
                    row_action: ChangelogAction::Delete,
                }
            ]
        );
    }

    #[actix_rt::test]
    async fn test_changelog_iteration() {
        let (_, connection, _, _) =
            test_db::setup_all("test_changelog_2", MockDataInserts::none().names().stores()).await;

        // use stock take entries to populate the changelog (via the trigger)
        let stocktake_repo = StocktakeRowRepository::new(&connection);
        let repo = ChangelogRepository::new(&connection);

        let stocktake_a = mock_stocktake_a();
        let stocktake_b = mock_stocktake_no_line_a();
        let stocktake_c = mock_stocktake_no_line_b();
        let stocktake_d = mock_stocktake_b();

        stocktake_repo.upsert_one(&stocktake_a).unwrap();
        stocktake_repo.upsert_one(&stocktake_b).unwrap();
        stocktake_repo.upsert_one(&stocktake_c).unwrap();
        stocktake_repo.upsert_one(&stocktake_d).unwrap();
        stocktake_repo.delete(&stocktake_b.id).unwrap();
        stocktake_repo.upsert_one(&stocktake_c).unwrap();
        stocktake_repo.upsert_one(&stocktake_a).unwrap();
        stocktake_repo.upsert_one(&stocktake_c).unwrap();
        stocktake_repo.delete(&stocktake_c.id).unwrap();

        // test iterating through the change log
        let changelogs = repo.changelogs(0, 3).unwrap();
        let latest_id: u64 = changelogs.last().unwrap().id.try_into().unwrap();
        assert_eq!(
            changelogs
                .into_iter()
                .map(|it| it.row_id)
                .collect::<Vec<String>>(),
            vec![stocktake_d.id, stocktake_b.id, stocktake_a.id]
        );

        let changelogs = repo.changelogs(latest_id + 1, 3).unwrap();
        let latest_id: u64 = changelogs.last().unwrap().id.try_into().unwrap();

        assert_eq!(
            changelogs
                .into_iter()
                .map(|it| it.row_id)
                .collect::<Vec<String>>(),
            vec![stocktake_c.id]
        );

        let changelogs = repo.changelogs(latest_id + 1, 3).unwrap();
        assert_eq!(changelogs.len(), 0);
    }

    #[actix_rt::test]
    async fn test_master_list_line_repository_filter() {
        let (_, connection, _, _) = test_db::setup_all(
            "test_master_list_line_repository_filter",
            MockDataInserts::all(),
        )
        .await;

        let repo = MasterListLineRepository::new(&connection);

        // Test filter by master_list_id
        let lines = repo
            .query_by_filter(
                MasterListLineFilter::new().master_list_id(EqualFilter::equal_any(vec![
                    "master_list_master_list_line_filter_test".to_string(),
                ])),
            )
            .unwrap();

        for (count, line) in mock_master_list_master_list_line_filter_test()
            .lines
            .iter()
            .enumerate()
        {
            assert_eq!(lines[count].id, line.id)
        }
    }

    #[derive(QueryableByName, Queryable, PartialEq, Debug)]
    struct Id {
        #[sql_type = "Text"]
        id: String,
    }
    #[actix_rt::test]
    async fn test_requisition_repository() {
        let (_, connection, _, _) =
            test_db::setup_all("test_requisition_repository", MockDataInserts::all()).await;

        let row_repo = RequisitionRowRepository::new(&connection);
        let repo = RequisitionRepository::new(&connection);

        // Test insert
        let mut update_test_row = mock_request_draft_requisition();
        update_test_row.comment = Some("unique_comment".to_owned());
        row_repo.upsert_one(&update_test_row).unwrap();

        // Test delete
        row_repo
            .delete(&mock_request_draft_requisition2().id)
            .unwrap();

        // Test query by id
        let result = repo
            .query_by_filter(
                RequisitionFilter::new()
                    .id(EqualFilter::equal_to(&mock_request_draft_requisition2().id)),
            )
            .unwrap();

        let raw_result = sql_query(&format!(
            r#"select id from requisition where id = '{}'"#,
            mock_request_draft_requisition2().id
        ))
        .load::<Id>(&connection.connection)
        .unwrap();

        assert_eq!(
            raw_result,
            result
                .into_iter()
                .map(|requisition| Id {
                    id: requisition.requisition_row.id
                })
                .collect::<Vec<Id>>()
        );

        // Test query by name
        let result = repo
            .query_by_filter(RequisitionFilter::new().name(SimpleStringFilter::equal_to("name_a")))
            .unwrap();

        let raw_result = sql_query(
            r#"select requisition.id 
                    from requisition 
                    join name on requisition.name_id = name.id 
                    where name.name = 'name_a'
                    order by requisition.id asc"#,
        )
        .load::<Id>(&connection.connection)
        .unwrap();

        assert!(raw_result.len() > 0); // Sanity check
        assert_eq!(
            raw_result,
            result
                .into_iter()
                .map(|requisition| Id {
                    id: requisition.requisition_row.id
                })
                .collect::<Vec<Id>>()
        );

        // Test query by type and comment
        let result = repo
            .query_by_filter(
                RequisitionFilter::new()
                    .status(RequisitionRowStatus::Draft.equal_to())
                    .comment(SimpleStringFilter::like("iquE_coMme")),
            )
            .unwrap();

        let raw_result = sql_query(
            r#"select id from requisition where status = 'DRAFT' and comment = 'unique_comment'"#,
        )
        .load::<Id>(&connection.connection)
        .unwrap();

        assert!(raw_result.len() > 0); // Sanity check
        assert_eq!(
            raw_result,
            result
                .into_iter()
                .map(|requisition| Id {
                    id: requisition.requisition_row.id
                })
                .collect::<Vec<Id>>()
        );
    }

    #[actix_rt::test]
    async fn test_requisition_line_repository() {
        let (_, connection, _, _) =
            test_db::setup_all("test_requisition_line_repository", MockDataInserts::all()).await;

        let row_repo = RequisitionLineRowRepository::new(&connection);
        let repo = RequisitionLineRepository::new(&connection);

        // Test insert
        let mut update_test_row = mock_draft_request_requisition_line();
        update_test_row.requested_quantity = 99;
        row_repo.upsert_one(&update_test_row).unwrap();

        // Test delete
        row_repo
            .delete(&mock_draft_request_requisition_line2().id)
            .unwrap();

        // Test query by id
        let result = repo
            .query_by_filter(RequisitionLineFilter::new().id(EqualFilter::equal_to(
                &mock_draft_request_requisition_line2().id,
            )))
            .unwrap();

        let raw_result = sql_query(&format!(
            r#"SELECT id from requisition_line where id = '{}'"#,
            mock_draft_request_requisition_line2().id
        ))
        .load::<Id>(&connection.connection)
        .unwrap();

        assert!(raw_result.len() == 0); // Record was deleted
        assert_eq!(
            raw_result,
            result
                .into_iter()
                .map(|requisition_line| Id {
                    id: requisition_line.requisition_line_row.id
                })
                .collect::<Vec<Id>>()
        );

        // Test query by requisition_id and requested_quantity
        let result = repo
            .query_by_filter(
                RequisitionLineFilter::new()
                    .requisition_id(EqualFilter::equal_to(
                        &mock_draft_request_requisition_line().requisition_id,
                    ))
                    .requested_quantity(EqualFilter {
                        equal_to: Some(99),
                        not_equal_to: None,
                        equal_any: None,
                        not_equal_all: None,
                    }),
            )
            .unwrap();

        let raw_result = sql_query(&format!(
            r#"SELECT id from requisition_line where requisition_id = '{}' and requested_quantity = 99"#,
            mock_draft_request_requisition_line().requisition_id
        ))
        .load::<Id>(&connection.connection)
        .unwrap();

        assert!(raw_result.len() > 0); // Sanity check
        assert_eq!(
            raw_result,
            result
                .into_iter()
                .map(|requisition_line| Id {
                    id: requisition_line.requisition_line_row.id
                })
                .collect::<Vec<Id>>()
        );
    }

    #[actix_rt::test]
    async fn test_key_value_store() {
        let (_, connection, _, _) =
            test_db::setup_all("key_value_store", MockDataInserts::none()).await;

        let repo = KeyValueStoreRepository::new(&connection);

        // access a non-existing row
        let result = repo
            .get_string(KeyValueType::CentralSyncPullCursor)
            .unwrap();
        assert_eq!(result, None);

        // write a string value
        repo.set_string(
            KeyValueType::CentralSyncPullCursor,
            Some("test".to_string()),
        )
        .unwrap();
        let result = repo
            .get_string(KeyValueType::CentralSyncPullCursor)
            .unwrap();
        assert_eq!(result, Some("test".to_string()));

        // unset a value
        repo.set_string(KeyValueType::CentralSyncPullCursor, None)
            .unwrap();
        let result = repo
            .get_string(KeyValueType::CentralSyncPullCursor)
            .unwrap();
        assert_eq!(result, None);

        // write a i32 value
        repo.set_i32(KeyValueType::CentralSyncPullCursor, Some(50))
            .unwrap();
        let result = repo.get_i32(KeyValueType::CentralSyncPullCursor).unwrap();
        assert_eq!(result, Some(50));

        // write a i64 value
        repo.set_i64(KeyValueType::CentralSyncPullCursor, Some(500))
            .unwrap();
        let result = repo.get_i64(KeyValueType::CentralSyncPullCursor).unwrap();
        assert_eq!(result, Some(500));

        // write a f64 value
        repo.set_f64(KeyValueType::CentralSyncPullCursor, Some(600.0))
            .unwrap();
        let result = repo.get_f64(KeyValueType::CentralSyncPullCursor).unwrap();
        assert_eq!(result, Some(600.0));

        // write a bool value
        repo.set_bool(KeyValueType::CentralSyncPullCursor, Some(true))
            .unwrap();
        let result = repo.get_bool(KeyValueType::CentralSyncPullCursor).unwrap();
        assert_eq!(result, Some(true));
    }
}
