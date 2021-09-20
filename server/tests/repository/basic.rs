#[cfg(test)]
mod repository_basic_test {

    use remote_server::database::{
        repository::{
            repository::get_repositories, CentralSyncBufferRepository, CustomerInvoiceRepository,
            ItemRepository, NameRepository, RequisitionLineRepository, RequisitionRepository,
            StockLineRepository, StoreRepository, TransactLineRepository, TransactRepository,
            UserAccountRepository,
        },
        schema::{
            CentralSyncBufferRow, ItemRow, NameRow, RequisitionLineRow, RequisitionRow,
            RequisitionRowType, StockLineRow, StoreRow, TransactLineRow, TransactLineRowType,
            TransactRow, TransactRowType, UserAccountRow,
        },
    };

    use remote_server::util::test_db;

    async fn requisition_test(repo: &RequisitionRepository) {
        let item1 = RequisitionRow {
            id: "requisition1".to_string(),
            name_id: "name1".to_string(),
            store_id: "store1".to_string(),
            type_of: RequisitionRowType::Imprest,
        };
        repo.insert_one(&item1).await.unwrap();
        let loaded_item = repo.find_one_by_id(item1.id.as_str()).await.unwrap();
        assert_eq!(item1, loaded_item);

        // requisition2 is need for later tests
        let item2 = RequisitionRow {
            id: "requisition2".to_string(),
            name_id: "name1".to_string(),
            store_id: "store1".to_string(),
            type_of: RequisitionRowType::Imprest,
        };
        repo.insert_one(&item2).await.unwrap();
        let loaded_item = repo.find_one_by_id(item2.id.as_str()).await.unwrap();
        assert_eq!(item2, loaded_item);
    }

    async fn requisition_line_test(repo: &RequisitionLineRepository) {
        let item1 = RequisitionLineRow {
            id: "requisitionline1".to_string(),
            requisition_id: "requisition1".to_string(),
            item_id: "item1".to_string(),
            actual_quantity: 0.4,
            suggested_quantity: 5.0,
        };
        repo.insert_one(&item1).await.unwrap();
        let loaded_item = repo.find_one_by_id(item1.id.as_str()).await.unwrap();
        assert_eq!(item1, loaded_item);

        // find_many_by_requisition_id test:
        let item2 = RequisitionLineRow {
            id: "requisitionline2".to_string(),
            requisition_id: "requisition1".to_string(),
            item_id: "item1".to_string(),
            actual_quantity: 100.4,
            suggested_quantity: 54.0,
        };
        repo.insert_one(&item2).await.unwrap();

        // add some noise, i.e. item3 should not be in the results

        let item3 = RequisitionLineRow {
            id: "requisitionline3".to_string(),
            requisition_id: "requisition2".to_string(),
            item_id: "item2".to_string(),
            actual_quantity: 100.4,
            suggested_quantity: 54.0,
        };
        repo.insert_one(&item3).await.unwrap();
        let all_items = repo
            .find_many_by_requisition_id(&item1.requisition_id)
            .await
            .unwrap();
        assert_eq!(2, all_items.len());
    }

    async fn item_test(repo: &ItemRepository) {
        let item1 = ItemRow {
            id: "item1".to_string(),
            name: "item-1".to_string(),
            code: "code1".to_string(),
        };
        repo.insert_one(&item1).await.unwrap();
        let loaded_item = repo.find_one_by_id(item1.id.as_str()).await.unwrap();
        assert_eq!(item1, loaded_item);

        let item2 = ItemRow {
            id: "item2".to_string(),
            name: "item-2".to_string(),
            code: "code2".to_string(),
        };
        repo.insert_one(&item2).await.unwrap();
        let all_items = repo.find_all().await.unwrap();
        assert_eq!(2, all_items.len());
        assert_eq!(
            item2,
            *all_items.iter().find(|it| it.id == item2.id).unwrap()
        );
    }

    async fn stock_line_test(repo: &StockLineRepository) {
        let item1 = StockLineRow {
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
        };
        repo.insert_one(&item1).await.unwrap();
        let loaded_item = repo.find_one_by_id(item1.id.as_str()).await.unwrap();
        assert_eq!(item1, loaded_item);
    }

    async fn transact_test(
        repo: &TransactRepository,
        customer_invoice: &CustomerInvoiceRepository,
    ) {
        let item1 = TransactRow {
            id: "transact1".to_string(),
            name_id: "name1".to_string(),
            store_id: "store1".to_string(),
            invoice_number: 12,
            type_of: TransactRowType::Payment,
        };
        repo.insert_one(&item1).await.unwrap();
        let loaded_item = repo.find_one_by_id(item1.id.as_str()).await.unwrap();
        assert_eq!(item1, loaded_item);

        // customer invoice
        let item1 = TransactRow {
            id: "transact2".to_string(),
            name_id: "name1".to_string(),
            store_id: "store1".to_string(),
            invoice_number: 12,
            type_of: TransactRowType::CustomerInvoice,
        };
        repo.insert_one(&item1).await.unwrap();
        let loaded_item = customer_invoice
            .find_many_by_name_id(&item1.name_id)
            .await
            .unwrap();
        assert_eq!(1, loaded_item.len());

        let loaded_item = customer_invoice
            .find_many_by_store_id(&item1.store_id)
            .await
            .unwrap();
        assert_eq!(1, loaded_item.len());
    }

    async fn transact_line_test(repo: &TransactLineRepository) {
        let item1 = TransactLineRow {
            id: "test1".to_string(),
            item_id: "item1".to_string(),
            transact_id: "transact1".to_string(),
            stock_line_id: Some("StockLine1".to_string()),
            type_of: TransactLineRowType::CashOut,
        };
        repo.insert_one(&item1).await.unwrap();
        let loaded_item = repo.find_one_by_id(item1.id.as_str()).await.unwrap();
        assert_eq!(item1, loaded_item);

        // row with optional field
        let item2_optional = TransactLineRow {
            id: "test2-with-optional".to_string(),
            item_id: "item1".to_string(),
            transact_id: "transact1".to_string(),
            stock_line_id: None,
            type_of: TransactLineRowType::CashOut,
        };
        repo.insert_one(&item2_optional).await.unwrap();
        let loaded_item = repo
            .find_one_by_id(item2_optional.id.as_str())
            .await
            .unwrap();
        assert_eq!(item2_optional, loaded_item);

        // find_many_by_transact_id:
        // add item that shouldn't end up in the results:
        let item3 = TransactLineRow {
            id: "test3".to_string(),
            item_id: "item2".to_string(),
            transact_id: "transact2".to_string(),
            stock_line_id: None,
            type_of: TransactLineRowType::Placeholder,
        };
        repo.insert_one(&item3).await.unwrap();
        let all_items = repo
            .find_many_by_transact_id(&item1.transact_id)
            .await
            .unwrap();
        assert_eq!(2, all_items.len());
    }

    async fn name_test(repo: &NameRepository) {
        let item1 = NameRow {
            id: "name1".to_string(),
            name: "name_1".to_string(),
            code: "code1".to_string(),
            is_customer: false,
            is_supplier: true,
        };
        repo.insert_one(&item1).await.unwrap();

        let loaded_item = repo.find_one_by_id(item1.id.as_str()).await.unwrap();
        assert_eq!(item1, loaded_item);
    }

    async fn store_test(repo: &StoreRepository) {
        let item1 = StoreRow {
            id: "store1".to_string(),
            name_id: "name1".to_string(),
            code: "code1".to_string(),
        };
        repo.insert_one(&item1).await.unwrap();
        let loaded_item = repo.find_one_by_id(item1.id.as_str()).await.unwrap();
        assert_eq!(item1, loaded_item);
    }

    async fn user_account_test(repo: &UserAccountRepository) {
        let item1 = UserAccountRow {
            id: "user1".to_string(),
            username: "user 1".to_string(),
            password: "p1".to_string(),
            email: Some("email".to_string()),
        };
        repo.insert_one(&item1).await.unwrap();
        let loaded_item = repo.find_one_by_id(item1.id.as_str()).await.unwrap();
        assert_eq!(item1, loaded_item);

        // optional email
        let item2 = UserAccountRow {
            id: "user2".to_string(),
            username: "user 2".to_string(),
            password: "p2".to_string(),
            email: None,
        };
        repo.insert_one(&item2).await.unwrap();
        let loaded_item = repo.find_one_by_id(item2.id.as_str()).await.unwrap();
        assert_eq!(item2, loaded_item);
    }

    async fn central_sync_buffer_test(repo: &CentralSyncBufferRepository) {
        let central_sync_buffer_row_a = CentralSyncBufferRow {
            id: 1,
            table_name: "store".to_string(),
            record_id: "store_a".to_string(),
            data: r#"{ "ID": "store_a" }"#.to_string(),
        };

        let central_sync_buffer_row_b = CentralSyncBufferRow {
            id: 2,
            table_name: "store".to_string(),
            record_id: "store_b".to_string(),
            data: r#"{ "ID": "store_b" }"#.to_string(),
        };

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

    #[actix_rt::test]
    async fn simple_repository_tests() {
        let settings = test_db::get_test_settings("omsupply-database-simple-repository-test");
        // Initialise a new test database.
        test_db::setup(&settings.database).await;
        let repos = get_repositories(&settings).await;

        // The following sub tests have to be in order because some tests are using foreign keys
        // from previous tests:
        name_test(repos.get::<NameRepository>().unwrap()).await;
        store_test(repos.get::<StoreRepository>().unwrap()).await;
        item_test(repos.get::<ItemRepository>().unwrap()).await;
        stock_line_test(repos.get::<StockLineRepository>().unwrap()).await;
        requisition_test(repos.get::<RequisitionRepository>().unwrap()).await;
        requisition_line_test(repos.get::<RequisitionLineRepository>().unwrap()).await;
        transact_test(
            repos.get::<TransactRepository>().unwrap(),
            repos.get::<CustomerInvoiceRepository>().unwrap(),
        )
        .await;
        transact_line_test(repos.get::<TransactLineRepository>().unwrap()).await;
        user_account_test(repos.get::<UserAccountRepository>().unwrap()).await;
        central_sync_buffer_test(repos.get::<CentralSyncBufferRepository>().unwrap()).await;
    }
}
