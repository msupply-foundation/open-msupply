#[cfg(test)]
mod repository_test {
    mod data {
        use chrono::{NaiveDate, NaiveDateTime};
        use util::inline_init;

        use crate::db_diesel::*;

        pub fn name_1() -> NameRow {
            inline_init(|r: &mut NameRow| {
                r.id = "name1".to_string();
                r.name = "name_1".to_string();
                r.code = "code1".to_string();
            })
        }

        pub fn store_1() -> StoreRow {
            inline_init(|s: &mut StoreRow| {
                s.id = "store1".to_string();
                s.name_id = "name1".to_string();
                s.code = "code1".to_string();
            })
        }

        pub fn item_1() -> ItemRow {
            inline_init(|r: &mut ItemRow| {
                r.id = "item1".to_string();
                r.name = "name1".to_string();
                r.code = "code1".to_string();
                r.r#type = ItemRowType::Stock;
            })
        }

        pub fn item_2() -> ItemRow {
            inline_init(|r: &mut ItemRow| {
                r.id = "item2".to_string();
                r.name = "item-2".to_string();
                r.code = "code2".to_string();
                r.r#type = ItemRowType::Stock;
            })
        }

        pub fn item_service_1() -> ItemRow {
            inline_init(|r: &mut ItemRow| {
                r.id = "item_service_1".to_string();
                r.name = "item_service_name_1".to_string();
                r.code = "item_service_code_1".to_string();
                r.r#type = ItemRowType::Service;
            })
        }

        pub fn stock_line_1() -> StockLineRow {
            StockLineRow {
                id: "StockLine1".to_string(),
                item_link_id: "item1".to_string(),
                store_id: "store1".to_string(),
                batch: Some("batch1".to_string()),
                available_number_of_packs: 6.0,
                pack_size: 1,
                cost_price_per_pack: 0.0,
                sell_price_per_pack: 0.0,
                total_number_of_packs: 1.0,
                expiry_date: Some(NaiveDate::from_ymd_opt(2021, 12, 13).unwrap()),
                on_hold: false,
                note: None,
                location_id: None,
                supplier_link_id: Some(String::from("name1")),
                barcode_id: None,
            }
        }

        pub fn master_list_1() -> MasterListRow {
            MasterListRow {
                id: "masterlist1".to_string(),
                name: "Master List 1".to_string(),
                code: "ML Code 1".to_string(),
                description: "ML Description 1".to_string(),
                is_active: true,
            }
        }

        pub fn master_list_upsert_1() -> MasterListRow {
            MasterListRow {
                id: "masterlist1".to_string(),
                name: "Master List 1".to_string(),
                code: "ML Code 1".to_string(),
                description: "ML Description 1".to_string(),
                is_active: true,
            }
        }

        pub fn master_list_line_1() -> MasterListLineRow {
            MasterListLineRow {
                id: "masterlistline1".to_string(),
                item_link_id: item_1().id.to_string(),
                master_list_id: master_list_1().id.to_string(),
            }
        }

        pub fn master_list_line_upsert_1() -> MasterListLineRow {
            MasterListLineRow {
                id: "masterlistline1".to_string(),
                item_link_id: item_2().id.to_string(),
                master_list_id: master_list_1().id.to_string(),
            }
        }

        pub fn master_list_name_join_1() -> MasterListNameJoinRow {
            MasterListNameJoinRow {
                id: "masterlistnamejoin1".to_string(),
                master_list_id: master_list_1().id.to_string(),
                name_link_id: name_1().id.to_string(),
            }
        }

        pub fn invoice_1() -> InvoiceRow {
            inline_init(|r: &mut InvoiceRow| {
                r.id = "invoice1".to_string();
                r.name_link_id = name_1().id.to_string();
                r.store_id = store_1().id.to_string();
                r.invoice_number = 12;
                r.r#type = InvoiceRowType::InboundShipment;
                r.status = InvoiceRowStatus::New;
                r.comment = Some("".to_string());
                r.their_reference = Some("".to_string());
                // Note: keep nsecs small enough for Postgres which has limited precision;
                r.created_datetime = NaiveDateTime::from_timestamp_opt(1000, 0).unwrap();
            })
        }

        pub fn invoice_2() -> InvoiceRow {
            inline_init(|r: &mut InvoiceRow| {
                r.id = "invoice2".to_string();
                r.name_link_id = name_1().id.to_string();
                r.store_id = store_1().id.to_string();
                r.invoice_number = 12;
                r.r#type = InvoiceRowType::OutboundShipment;
                r.status = InvoiceRowStatus::New;
                r.comment = Some("".to_string());
                r.their_reference = Some("".to_string());
                r.created_datetime = NaiveDateTime::from_timestamp_opt(2000, 0).unwrap();
            })
        }

        pub fn invoice_line_1() -> InvoiceLineRow {
            InvoiceLineRow {
                id: "test1".to_string(),
                item_link_id: item_1().id.to_string(),
                item_name: item_1().name.to_string(),
                item_code: item_1().code.to_string(),
                invoice_id: invoice_1().id.to_string(),
                stock_line_id: None,
                batch: Some("".to_string()),
                expiry_date: Some(NaiveDate::from_ymd_opt(2020, 9, 1).unwrap()),
                pack_size: 1,
                cost_price_per_pack: 0.0,
                sell_price_per_pack: 0.0,
                total_before_tax: 1.0,
                total_after_tax: 1.0,
                tax: None,
                r#type: InvoiceLineRowType::StockIn,
                number_of_packs: 1.0,
                note: None,
                location_id: None,
                inventory_adjustment_reason_id: None,
                return_reason_id: None,
                foreign_currency_price_before_tax: None,
            }
        }
        pub fn invoice_line_2() -> InvoiceLineRow {
            InvoiceLineRow {
                id: "test2-with-optional".to_string(),
                item_link_id: item_1().id.to_string(),
                item_name: item_1().name.to_string(),
                item_code: item_1().code.to_string(),
                invoice_id: invoice_1().id.to_string(),
                stock_line_id: None,
                batch: Some("".to_string()),
                expiry_date: Some(NaiveDate::from_ymd_opt(2020, 9, 3).unwrap()),
                pack_size: 1,
                cost_price_per_pack: 0.0,
                sell_price_per_pack: 0.0,
                total_before_tax: 2.0,
                total_after_tax: 2.0,
                tax: None,
                r#type: InvoiceLineRowType::StockOut,
                number_of_packs: 1.0,
                note: None,
                location_id: None,
                inventory_adjustment_reason_id: None,
                return_reason_id: None,
                foreign_currency_price_before_tax: None,
            }
        }

        pub fn invoice_line_3() -> InvoiceLineRow {
            InvoiceLineRow {
                id: "test3".to_string(),
                item_link_id: item_2().id.to_string(),
                item_name: item_2().name.to_string(),
                item_code: item_2().code.to_string(),
                invoice_id: invoice_2().id.to_string(),
                stock_line_id: None,
                batch: Some("".to_string()),
                expiry_date: Some(NaiveDate::from_ymd_opt(2020, 9, 5).unwrap()),
                pack_size: 1,
                cost_price_per_pack: 0.0,
                sell_price_per_pack: 0.0,
                total_before_tax: 3.0,
                total_after_tax: 3.0,
                tax: None,
                r#type: InvoiceLineRowType::StockOut,
                number_of_packs: 1.0,
                note: None,
                location_id: None,
                inventory_adjustment_reason_id: None,
                return_reason_id: None,
                foreign_currency_price_before_tax: None,
            }
        }

        pub fn invoice_line_service() -> InvoiceLineRow {
            InvoiceLineRow {
                id: "test_service_item".to_string(),
                item_link_id: item_service_1().id.to_string(),
                item_name: item_service_1().name.to_string(),
                item_code: item_service_1().code.to_string(),
                invoice_id: invoice_1().id.to_string(),
                stock_line_id: None,
                batch: Some("".to_string()),
                expiry_date: Some(NaiveDate::from_ymd_opt(2021, 12, 6).unwrap()),
                pack_size: 1,
                cost_price_per_pack: 0.0,
                sell_price_per_pack: 0.0,
                total_before_tax: 10.0,
                total_after_tax: 15.0,
                tax: None,
                r#type: InvoiceLineRowType::Service,
                number_of_packs: 1.0,
                note: None,
                location_id: None,
                inventory_adjustment_reason_id: None,
                return_reason_id: None,
                foreign_currency_price_before_tax: None,
            }
        }

        pub fn user_account_1() -> UserAccountRow {
            UserAccountRow {
                id: "user1".to_string(),
                username: "user 1".to_string(),
                hashed_password: "p1".to_string(),
                email: Some("email".to_string()),
                ..UserAccountRow::default()
            }
        }

        pub fn user_account_2() -> UserAccountRow {
            UserAccountRow {
                id: "user2".to_string(),
                username: "user 2".to_string(),
                hashed_password: "p2".to_string(),
                ..UserAccountRow::default()
            }
        }

        pub fn activity_log_1() -> ActivityLogRow {
            ActivityLogRow {
                id: "activity_log1".to_string(),
                r#type: ActivityLogType::UserLoggedIn,
                user_id: Some(user_account_1().id.to_string()),
                store_id: None,
                record_id: None,
                datetime: NaiveDateTime::from_timestamp_opt(2000, 0).unwrap(),
                changed_to: None,
                changed_from: None,
            }
        }
    }

    use crate::{
        mock::{
            currency_a, mock_draft_request_requisition_line, mock_draft_request_requisition_line2,
            mock_inbound_shipment_number_store_a, mock_item_link_from_item,
            mock_master_list_master_list_line_filter_test, mock_outbound_shipment_number_store_a,
            mock_request_draft_requisition, mock_request_draft_requisition2,
            mock_test_master_list_name1, mock_test_master_list_name2,
            mock_test_master_list_name_filter1, mock_test_master_list_name_filter2,
            mock_test_master_list_name_filter3, mock_test_master_list_store1, MockDataInserts,
        },
        requisition_row::RequisitionRowStatus,
        test_db, ActivityLogRowRepository, CurrencyRowRepository, InvoiceFilter,
        InvoiceLineRepository, InvoiceLineRowRepository, InvoiceRepository, InvoiceRowRepository,
        InvoiceRowType, ItemLinkRowRepository, ItemRow, ItemRowRepository, KeyValueStoreRepository,
        KeyValueType, MasterListFilter, MasterListLineFilter, MasterListLineRepository,
        MasterListLineRowRepository, MasterListNameJoinRepository, MasterListRepository,
        MasterListRowRepository, NameRowRepository, NumberRowRepository, NumberRowType,
        RequisitionFilter, RequisitionLineFilter, RequisitionLineRepository,
        RequisitionLineRowRepository, RequisitionRepository, RequisitionRowRepository,
        StockLineFilter, StockLineRepository, StockLineRowRepository, StorageConnection,
        StoreRowRepository, UserAccountRowRepository,
    };
    use crate::{DateFilter, EqualFilter, StringFilter};
    use chrono::Duration;
    use diesel::{sql_query, sql_types::Text, RunQueryDsl};
    use util::inline_edit;

    #[actix_rt::test]
    async fn test_name_repository() {
        let settings = test_db::get_test_db_settings("omsupply-database-name-repository");
        let connection_manager = test_db::setup(&settings).await;
        let connection = connection_manager.connection().unwrap();

        let repo = NameRowRepository::new(&connection);
        let name_1 = data::name_1();
        NameRowRepository::new(&connection)
            .insert_one(&name_1)
            .await
            .unwrap();
        let loaded_item = repo.find_one_by_id(name_1.id.as_str()).unwrap().unwrap();
        assert_eq!(name_1, loaded_item);
    }

    #[actix_rt::test]
    async fn test_store_repository() {
        let settings = test_db::get_test_db_settings("omsupply-database-store-repository");
        let connection_manager = test_db::setup(&settings).await;
        let connection = connection_manager.connection().unwrap();

        // setup
        NameRowRepository::new(&connection)
            .insert_one(&data::name_1())
            .await
            .unwrap();

        let repo = StoreRowRepository::new(&connection);
        let store_1 = data::store_1();
        repo.insert_one(&store_1).await.unwrap();
        let loaded_item = repo.find_one_by_id(store_1.id.as_str()).unwrap().unwrap();
        assert_eq!(store_1, loaded_item);
    }

    async fn insert_item_and_link(item: &ItemRow, connection: &StorageConnection) {
        let item_repo = ItemRowRepository::new(connection);
        item_repo.insert_one(item).await.unwrap();

        let item_link_repo = ItemLinkRowRepository::new(connection);
        item_link_repo
            .insert_one_or_ignore(&mock_item_link_from_item(item))
            .unwrap();
    }

    #[actix_rt::test]
    async fn test_stock_line() {
        let settings = test_db::get_test_db_settings("omsupply-database-item-line-repository");
        let connection_manager = test_db::setup(&settings).await;
        let connection = connection_manager.connection().unwrap();

        // setup
        insert_item_and_link(&data::item_1(), &connection).await;

        let name_repo = NameRowRepository::new(&connection);
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
        let connection_manager = test_db::setup(&settings).await;
        let connection = connection_manager.connection().unwrap();

        // setup
        insert_item_and_link(&data::item_1(), &connection).await;

        let name_repo = NameRowRepository::new(&connection);
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
            .query_by_filter(
                StockLineFilter::new().expiry_date(DateFilter {
                    equal_to: None,
                    before_or_equal_to: Some(expiry_date - Duration::days(1)),
                    after_or_equal_to: None,
                }),
                Some(data::store_1().id),
            )
            .unwrap();
        assert_eq!(result.len(), 0);
        let result = stock_line_repo
            .query_by_filter(
                StockLineFilter::new().expiry_date(DateFilter {
                    equal_to: None,
                    before_or_equal_to: Some(expiry_date),
                    after_or_equal_to: None,
                }),
                Some(data::store_1().id),
            )
            .unwrap();
        assert_eq!(result.len(), 1);
        let result = stock_line_repo
            .query_by_filter(
                StockLineFilter::new().expiry_date(DateFilter {
                    equal_to: None,
                    before_or_equal_to: Some(expiry_date + Duration::days(1)),
                    after_or_equal_to: None,
                }),
                Some(data::store_1().id),
            )
            .unwrap();
        assert_eq!(result.len(), 1);
    }

    #[actix_rt::test]
    async fn test_master_list_row_repository() {
        let settings = test_db::get_test_db_settings("test_master_list_row_repository");
        let connection_manager = test_db::setup(&settings).await;
        let connection = connection_manager.connection().unwrap();

        let repo = MasterListRowRepository::new(&connection);

        let master_list_1 = data::master_list_1();
        repo.upsert_one(&master_list_1).unwrap();
        let loaded_item = repo
            .find_one_by_id(master_list_1.id.as_str())
            .unwrap()
            .unwrap();
        assert_eq!(master_list_1, loaded_item);

        let master_list_upsert_1 = data::master_list_upsert_1();
        repo.upsert_one(&master_list_upsert_1).unwrap();
        let loaded_item = repo
            .find_one_by_id(master_list_upsert_1.id.as_str())
            .unwrap()
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
                    .exists_for_name(StringFilter::like("test_master_list_name")),
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
        let connection_manager = test_db::setup(&settings).await;
        let connection = connection_manager.connection().unwrap();

        // setup
        insert_item_and_link(&data::item_1(), &connection).await;
        insert_item_and_link(&data::item_2(), &connection).await;

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
        let connection_manager = test_db::setup(&settings).await;
        let connection = connection_manager.connection().unwrap();

        // setup
        let name_repo = NameRowRepository::new(&connection);
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
        let connection_manager = test_db::setup(&settings).await;
        let connection = connection_manager.connection().unwrap();

        // setup
        NameRowRepository::new(&connection)
            .insert_one(&data::name_1())
            .await
            .unwrap();
        let store_repo = StoreRowRepository::new(&connection);
        store_repo.insert_one(&data::store_1()).await.unwrap();
        CurrencyRowRepository::new(&connection)
            .upsert_one(&currency_a())
            .unwrap();

        let repo = InvoiceRowRepository::new(&connection);
        let invoice_repo = InvoiceRepository::new(&connection);

        let item1 = data::invoice_1();
        repo.upsert_one(&item1).unwrap();
        let loaded_item = repo.find_one_by_id(item1.id.as_str()).unwrap();
        assert_eq!(item1, loaded_item);

        // outbound shipment
        let item1 = data::invoice_2();
        repo.upsert_one(&item1).unwrap();
        let loaded_item = invoice_repo
            .query_by_filter(
                InvoiceFilter::new()
                    .r#type(InvoiceRowType::OutboundShipment.equal_to())
                    .name_id(EqualFilter::equal_to(&item1.name_link_id)),
            )
            .unwrap();
        assert_eq!(1, loaded_item.len());

        let loaded_item = invoice_repo
            .query_by_filter(
                InvoiceFilter::new()
                    .r#type(InvoiceRowType::OutboundShipment.equal_to())
                    .store_id(EqualFilter::equal_to(&item1.store_id)),
            )
            .unwrap();
        assert_eq!(1, loaded_item.len());
    }

    #[actix_rt::test]
    async fn test_invoice_line_repository() {
        let settings = test_db::get_test_db_settings("omsupply-database-invoice-line-repository");
        let connection_manager = test_db::setup(&settings).await;
        let connection = connection_manager.connection().unwrap();

        // setup
        insert_item_and_link(&data::item_1(), &connection).await;
        insert_item_and_link(&data::item_2(), &connection).await;

        NameRowRepository::new(&connection)
            .insert_one(&data::name_1())
            .await
            .unwrap();
        let store_repo = StoreRowRepository::new(&connection);
        store_repo.insert_one(&data::store_1()).await.unwrap();
        let stock_line_repo = StockLineRowRepository::new(&connection);
        stock_line_repo.upsert_one(&data::stock_line_1()).unwrap();
        CurrencyRowRepository::new(&connection)
            .upsert_one(&currency_a())
            .unwrap();

        let invoice_repo = InvoiceRowRepository::new(&connection);
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
        let connection_manager = test_db::setup(&settings).await;
        let connection = connection_manager.connection().unwrap();

        // setup
        insert_item_and_link(&data::item_1(), &connection).await;
        insert_item_and_link(&data::item_2(), &connection).await;
        insert_item_and_link(&data::item_service_1(), &connection).await;

        NameRowRepository::new(&connection)
            .insert_one(&data::name_1())
            .await
            .unwrap();
        let store_repo = StoreRowRepository::new(&connection);
        store_repo.insert_one(&data::store_1()).await.unwrap();
        let stock_line_repo = StockLineRowRepository::new(&connection);
        stock_line_repo.upsert_one(&data::stock_line_1()).unwrap();
        CurrencyRowRepository::new(&connection)
            .upsert_one(&currency_a())
            .unwrap();
        let invoice_repo = InvoiceRowRepository::new(&connection);
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
        let result = repo.stats(&[invoice_1_id.clone()]).unwrap();
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
        let connection_manager = test_db::setup(&settings).await;
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

        let raw_result = sql_query(format!(
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
            .query_by_filter(RequisitionFilter::new().name(StringFilter::equal_to("name_a")))
            .unwrap();

        let raw_result = sql_query(
            r#"select requisition.id
                    from requisition
                    join name_link on requisition.name_link_id = name_link.id
                    join name on name_link.name_id = name.id
                    where name.name = 'name_a'
                    order by requisition.id asc"#,
        )
        .load::<Id>(&connection.connection)
        .unwrap();

        assert!(!raw_result.is_empty()); // Sanity check
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
                    .comment(StringFilter::like("iquE_coMme")),
            )
            .unwrap();

        let raw_result = sql_query(
            r#"select id from requisition where status = 'DRAFT' and comment = 'unique_comment'"#,
        )
        .load::<Id>(&connection.connection)
        .unwrap();

        assert!(!raw_result.is_empty()); // Sanity check
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

        let raw_result = sql_query(format!(
            r#"SELECT id from requisition_line where id = '{}'"#,
            mock_draft_request_requisition_line2().id
        ))
        .load::<Id>(&connection.connection)
        .unwrap();

        assert!(raw_result.is_empty()); // Record was deleted
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
                    .requested_quantity(EqualFilter::equal_to_i32(99)),
            )
            .unwrap();

        let raw_result = sql_query(format!(
            r#"SELECT id from requisition_line where requisition_id = '{}' and requested_quantity = 99"#,
            mock_draft_request_requisition_line().requisition_id
        ))
        .load::<Id>(&connection.connection)
        .unwrap();

        assert!(!raw_result.is_empty()); // Sanity check
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

    #[cfg(not(feature = "memory"))]
    #[tokio::test(flavor = "multi_thread", worker_threads = 2)]
    async fn test_tx_deadlock() {
        use crate::{ItemRow, RepositoryError, TransactionError};
        use std::time::SystemTime;
        use util::inline_init;

        let (_, _, connection_manager, _) =
            test_db::setup_all("tx_deadlock", MockDataInserts::none()).await;

        // Note: this test is disabled when running tests using in 'memory' sqlite.
        // When running in memory sqlite uses a shared cache and returns an SQLITE_LOCKED response when two threads try to write using the shared cache concurrently
        // https://sqlite.org/rescode.html#locked
        // We are relying on busy_timeout handler to manage the SQLITE_BUSY response code in this test and there's no equivelant available for shared cache connections (SQLITE_LOCKED).
        // If we were to use shared cache in production, we'd probably need to use a mutex (or similar) to protect the database connection.

        /*
            Issue Description...

            From https://sqlite.org/forum/info/e4f30c1ed10b1cb5
            Connection A starts as a reader and does some processing.
            Connection B starts as a reader and wants to upgrade to a writer; it needs to wait for connectionA to finish.
            Connection A now wants to upgrade too. This is a deadlock...
        */
        /*
            NOTE: If you want to verify this test is working properly, you can set SQLITE_LOCKWAIT_MS to 0 in test_db.rs (It will only fail on sqlite, postgres should succeed)
        */
        /*
            Test Scenario

            Process A starts a transaction, does a read, then sleeps for a 1000 milliseconds before continuing to write from within the same transaction.
            Conncurrently Process B tries to do a similar thing.
        */
        /*
            Expected behaviour for this test in SQLite...

            Both Connection A and B start a transaction in 'IMMEDIATE' mode,
            Connection B will wait for Connection A to finish it's transaction before it can begin it's own transaction.
            (E.g All transactions are serialised, while read only queries can happen concurrently)

            Output:
                A: transaction acquired
                A: read
                A: sleeping
                B: Ready to start transaction
                <~100ms wait>
                A: write
                A: written
                B: transaction acquired
                B: read
                B: write 1
                B: write 2
        */
        /*
            Expected behaviour for this test in Postgresql...

            Output:
                A: transaction acquired
                A: read
                A: sleeping
                B: Ready to start transaction
                B: transaction acquired
                B: read
                B: write 1
                B: write 2
                <~100ms wait>
                A: write
                A: written
        */
        let manager_a = connection_manager.clone();
        let process_a = tokio::spawn(async move {
            let connection = manager_a.connection().unwrap();
            let result: Result<(), TransactionError<RepositoryError>> = connection
                .transaction_sync(|con| {
                    println!("A: transaction started");
                    let repo = ItemRowRepository::new(con);
                    let _ = repo.find_active_by_id("tx_deadlock_id")?;
                    println!("A: read");
                    println!("A: Sleeping for 100ms");
                    let start_dt = SystemTime::now();
                    std::thread::sleep(core::time::Duration::from_millis(100));
                    //Recording sleep duration here, as if the thread is blocked by something other than sleep you should see the duration significantly greater than 100ms
                    let sleep_duration = SystemTime::now()
                        .duration_since(start_dt)
                        .expect("Time went backwards");
                    println!("A: Slept for {:?}", sleep_duration);
                    println!("A: writing");
                    repo.upsert_one(&inline_init(|i: &mut ItemRow| {
                        i.id = "tx_deadlock_id2".to_string();
                        i.name = "name_a".to_string();
                    }))?;
                    println!("A: written");
                    Ok(())
                });
            result
        });
        let manager_b = connection_manager.clone();
        let process_b = tokio::spawn(async move {
            //Wait for process a to get a transaction started
            let connection = manager_b.connection().unwrap();
            println!("B: Ready to start transaction");
            // println!("Starting transaction in blocking thread...");
            let result: Result<(), TransactionError<RepositoryError>> = connection
                .transaction_sync(|con| {
                    println!("B: transaction started");
                    let repo = ItemRowRepository::new(con);
                    let _ = repo.find_active_by_id("tx_deadlock_id")?;
                    println!("B: read");
                    repo.upsert_one(&inline_init(|i: &mut ItemRow| {
                        i.id = "tx_deadlock_id".to_string();
                        i.name = "name_b".to_string();
                    }))?;
                    println!("B: write 1");

                    repo.upsert_one(&inline_init(|i: &mut ItemRow| {
                        i.id = "tx_deadlock_id".to_string();
                        i.name = "name_b_2".to_string();
                    }))?;
                    println!("B: write 2");
                    Ok(())
                });
            println!("B: Returning {:?}", result);
            result
        });

        let a = process_a.await.unwrap();
        let b = process_b.await.unwrap();

        a.unwrap();
        b.unwrap();

        //Verify the database was updated correctly
        let connection = connection_manager.connection().unwrap();
        let repo = ItemRowRepository::new(&connection);

        //tx_deadlock_id should now have name:name_b_2
        let tx_deadlock_item = repo
            .find_active_by_id("tx_deadlock_id")
            .unwrap()
            .expect("tx_deadlock_id record didn't get created!");
        assert!("name_b_2" == tx_deadlock_item.name);

        //tx_deadlock_id2 should now have name:name_a
        let tx_deadlock_item2 = repo
            .find_active_by_id("tx_deadlock_id2")
            .unwrap()
            .expect("tx_deadlock_id2 record didn't get created!");
        assert!("name_a" == tx_deadlock_item2.name);
    }

    #[actix_rt::test]
    async fn test_activity_log_row_repository() {
        let settings = test_db::get_test_db_settings("omsupply-database-store-repository");
        let connection_manager = test_db::setup(&settings).await;
        let connection = connection_manager.connection().unwrap();

        let repo = ActivityLogRowRepository::new(&connection);

        let activity_log1 = data::activity_log_1();
        repo.insert_one(&activity_log1).unwrap();
        let loaded_item = repo
            .find_one_by_id(activity_log1.id.as_str())
            .unwrap()
            .unwrap();
        assert_eq!(activity_log1, loaded_item);
    }
}
