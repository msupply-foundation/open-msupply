#[cfg(test)]
mod query {
    use chrono::{NaiveDate, NaiveDateTime};
    use repository::mock::{mock_item_a, mock_name_customer_a, mock_name_store_b, mock_store_a};
    use repository::mock::{mock_user_account_a, MockDataInserts};
    use repository::{
        InvoiceLineRow, InvoiceLineType, InvoiceRow, InvoiceStatus, InvoiceType, StockLineRow,
        StockLineRowRepository, Upsert,
    };
    use util::date_now;

    use crate::service_provider::ServiceContext;
    use crate::test_helpers::{setup_all_and_service_provider, ServiceTestContext};

    static mut INVOICE_NUMBER: i64 = 0;

    // These are all from default mock data
    static ITEM_ID: &str = "item_a";
    static STORE_ID: &str = "store_a";

    static STOCK_LINE_A: &str = "stock_line_a";
    static STOCK_LINE_B: &str = "stock_line_b";
    static STOCK_LINE_C: &str = "stock_line_c";

    fn get_midnight(year: i32, month: u32, day: u32) -> NaiveDateTime {
        NaiveDate::from_ymd_opt(year, month, day)
            .unwrap()
            .and_hms_opt(0, 0, 0)
            .unwrap()
    }

    fn get_midday(year: i32, month: u32, day: u32) -> NaiveDateTime {
        NaiveDate::from_ymd_opt(year, month, day)
            .unwrap()
            .and_hms_opt(12, 0, 0)
            .unwrap()
    }

    fn next_invoice_number() -> i64 {
        unsafe {
            INVOICE_NUMBER += 1;
            INVOICE_NUMBER
        }
    }

    fn update_stock(
        ctx: &ServiceContext,
        datetime: NaiveDateTime,
        stock_line_id: String,
        pack_size: f64,
        number_of_packs: f64,
        batch: String,
    ) -> () {
        let invoice_type = if number_of_packs > 0.0 {
            InvoiceType::InboundShipment
        } else {
            InvoiceType::OutboundShipment
        };
        let invoice_line_type = if number_of_packs > 0.0 {
            InvoiceLineType::StockIn
        } else {
            InvoiceLineType::StockOut
        };
        let name = if number_of_packs > 0.0 {
            mock_name_store_b().id // Supplier
        } else {
            mock_name_customer_a().id // Customer
        };

        let old_stock_line = StockLineRowRepository::new(&ctx.connection)
            .find_one_by_id(&stock_line_id)
            .unwrap()
            .unwrap_or_default();
        let new_number_of_packs = old_stock_line.total_number_of_packs + number_of_packs;

        let invoice_number = next_invoice_number();
        let invoice = InvoiceRow {
            id: format!("invoice_{}", invoice_number),
            invoice_number,
            name_link_id: name.to_string(),
            r#type: invoice_type,
            store_id: STORE_ID.to_string(),
            created_datetime: datetime.clone(),
            picked_datetime: Some(datetime.clone()),
            delivered_datetime: Some(datetime.clone()),
            verified_datetime: Some(datetime.clone()),
            status: InvoiceStatus::Verified,
            ..Default::default()
        };

        invoice.upsert(&ctx.connection).unwrap();

        let stock_line = StockLineRow {
            id: stock_line_id.clone(),
            item_link_id: ITEM_ID.to_string(),
            pack_size,
            available_number_of_packs: new_number_of_packs,
            total_number_of_packs: new_number_of_packs,
            store_id: STORE_ID.to_string(),
            batch: Some(batch.clone()),
            ..old_stock_line
        };

        stock_line.upsert(&ctx.connection).unwrap();

        let invoice_line = InvoiceLineRow {
            id: format!("invoice_line_{}", invoice_number),
            invoice_id: invoice.id.clone(),
            item_link_id: ITEM_ID.to_string(),
            stock_line_id: Some(stock_line_id),
            pack_size,
            number_of_packs: number_of_packs.abs(),
            batch: Some(batch.clone()),
            r#type: invoice_line_type,
            ..Default::default()
        };

        invoice_line.upsert(&ctx.connection).unwrap();
    }

    struct TestStockAdjustment {
        datetime: NaiveDateTime,
        stock_line_a: Option<f64>,
        stock_line_b: Option<f64>,
        stock_line_c: Option<f64>,
    }

    fn adjust_test_stock(ctx: &ServiceContext, adjustments: Vec<TestStockAdjustment>) {
        for adjustment in adjustments {
            if let Some(stock_line_a) = adjustment.stock_line_a {
                update_stock(
                    ctx,
                    adjustment.datetime,
                    STOCK_LINE_A.to_string(),
                    1.0,
                    stock_line_a,
                    "batchA".to_string(),
                );
            }

            if let Some(stock_line_b) = adjustment.stock_line_b {
                update_stock(
                    ctx,
                    adjustment.datetime,
                    STOCK_LINE_B.to_string(),
                    10.0,
                    stock_line_b,
                    "batchB".to_string(),
                );
            }

            if let Some(stock_line_c) = adjustment.stock_line_c {
                update_stock(
                    ctx,
                    adjustment.datetime,
                    STOCK_LINE_C.to_string(),
                    100.0,
                    stock_line_c,
                    "batchC".to_string(),
                );
            }
        }
    }

    #[actix_rt::test]
    async fn historical_stock_lines() {
        let ServiceTestContext {
            service_provider, ..
        } = setup_all_and_service_provider(
            "historical_stock_lines",
            MockDataInserts::none()
                .names()
                .stores()
                .items()
                .locations()
                .numbers(),
        )
        .await;

        let store_id = mock_store_a().id;
        let item_id = mock_item_a().id;

        // Service context needs correct store for stock line adjustments logic
        let ctx = service_provider
            .context(store_id.clone(), mock_user_account_a().id)
            .unwrap();

        // Check there's no stock to start with, if there is some mocks might have slipped through?
        // let result = service_provider
        //     .stock_line_service
        //     .get_historical_stock_lines(&ctx, store_id.clone(), item_id.clone(), date_now().into())
        //     .unwrap();

        // assert!(result.rows.is_empty());

        // Here's our test scenario
        // 3 stock lines, A, B, &C
        // C is introduced later
        // Stock line A has been fully consumed (as per latest data) so it can't be allocated in the past
        // Stock line B has some stock available at historical dates
        // Stock line C is introduced later so it can't be allocated until it's introduced

        /*
        ## Stock Movements

        | Date       | StockLine A | StockLine B | StockLine C |
        |------------|-------------|-------------|-------------|
        | 2020-01-01 | 100         | 1000        | None        |
        | 2020-01-02 | -50         | -500        | None        |
        | 2020-01-03 | -50         | None        | None        |
        | 2020-01-04 | 100         | 100         | None        |
        | 2020-01-05 | -100        | None        | None        |
        | 2021-01-06 | None        | None        | 1000        |

        ## Running Totals

        | Date       | StockLine A | StockLine B | StockLine C |
        |------------|-------------|-------------|-------------|
        | 2020-01-01 | 100         | 1000        |             |
        | 2020-01-02 | 50          | 500         | 0           |
        | 2020-01-03 | 0           | 500         | 0           |
        | 2020-01-04 | 100         | 600         | 0           |
        | 2020-01-05 | 0           | 600         | 0           |
        | 2021-01-06 | 0           | 600         | 1000        |

        ## Expected Available Stock for backdated date

        | Date       | StockLine A | StockLine B | StockLine C | Comment
        |------------|-------------|-------------|-------------|
        | 2020-01-01 | 0           | 600         | 0           |  # StockLine A has been all consumed the future, StockLine B has 1000 available stock at that date, but we only have 600 now, StockLine |C doesn't exist yet
        | 2020-01-02 | 0           | 500         | 0           |  # StockLine A has been all consumed the future, StockLine B has 500 available at that date less than the 600 we have in future
        | 2020-01-03 | 0           | 500         | 0           |  # StockLine A has been all consumed the future so extra consumption doesn't change anything, No change for StockLine B
        | 2020-01-04 | 0           | 600         | 0           |  # StockLine A has been all consumed the future, StockLine B has 600 available at that date, it could be allocated from now
        | 2020-01-05 | 0           | 600         | 0           |  # StockLine A has been all consumed the future so extra consumption doesn't change anything, StockLine B has 600 available at that date, it could be allocated from now
        | 2021-01-06 | 0           | 600         | 1000        |  # StockLine A has been all consumed the future, StockLine B has 600 available at that date, it could be allocated from now, StockLine C is introduced
        */

        let stock_movements = vec![
            TestStockAdjustment {
                datetime: get_midnight(2020, 1, 1),
                stock_line_a: Some(100.0),
                stock_line_b: Some(1000.0),
                stock_line_c: None,
            },
            TestStockAdjustment {
                datetime: get_midnight(2020, 1, 2),
                stock_line_a: Some(-50.0),
                stock_line_b: Some(-500.0),
                stock_line_c: None,
            },
            TestStockAdjustment {
                datetime: get_midnight(2020, 1, 3),
                stock_line_a: Some(-50.0),
                stock_line_b: None,
                stock_line_c: None,
            },
            TestStockAdjustment {
                datetime: get_midnight(2020, 1, 4),
                stock_line_a: Some(100.0),
                stock_line_b: Some(100.0),
                stock_line_c: None,
            },
            TestStockAdjustment {
                datetime: get_midnight(2020, 1, 5),
                stock_line_a: Some(-100.0),
                stock_line_b: None,
                stock_line_c: None,
            },
            TestStockAdjustment {
                datetime: get_midnight(2020, 1, 6),
                stock_line_a: None,
                stock_line_b: None,
                stock_line_c: Some(1000.0),
            },
        ];

        adjust_test_stock(&ctx, stock_movements);

        // // Check we can see 2 stock lines now (stock line A is fully consumed)
        // let result = service_provider
        //     .stock_line_service
        //     .get_historical_stock_lines(&ctx, store_id.clone(), item_id.clone(), date_now().into())
        //     .unwrap();

        // assert_eq!(result.rows.len(), 2);

        // +++ 2020-01-01
        let result = service_provider
            .stock_line_service
            .get_historical_stock_lines(
                &ctx,
                store_id.clone(),
                item_id.clone(),
                get_midday(2020, 1, 1), // midday to check after the time the stock was introduced
            )
            .unwrap();
        assert_eq!(result.rows.len(), 1);
        // Expected available stock for 2020-01-01
        // | 2020-01-01 | 0           | 600         | 0           |
        // # StockLine A has been all consumed the future,
        // # StockLine B had 1000 available stock at that date, but we only have 600 now, so only 600 available now
        // # StockLine |C doesn't exist yet
        let stock_line_b = result
            .rows
            .iter()
            .find(|r| r.stock_line_row.id == STOCK_LINE_B);

        assert_eq!(
            stock_line_b
                .unwrap()
                .stock_line_row
                .available_number_of_packs,
            600.0
        );

        // +++ 2020-01-02
        let result = service_provider
            .stock_line_service
            .get_historical_stock_lines(
                &ctx,
                store_id.clone(),
                item_id.clone(),
                get_midday(2020, 1, 2), // midday to check after the time the stock was introduced
            )
            .unwrap();
        assert_eq!(result.rows.len(), 1);
        // Expected available stock for 2020-01-02
        // | 2020-01-02 | 0           | 500         | 0           |
        // # StockLine A has been all consumed the future,
        // # StockLine B had 500 available stock at that date
        // # StockLine |C doesn't exist yet
        let stock_line_b = result
            .rows
            .iter()
            .find(|r| r.stock_line_row.id == STOCK_LINE_B);

        assert_eq!(
            stock_line_b
                .unwrap()
                .stock_line_row
                .available_number_of_packs,
            500.0
        );

        // +++ 2020-01-03
        let result = service_provider
            .stock_line_service
            .get_historical_stock_lines(
                &ctx,
                store_id.clone(),
                item_id.clone(),
                get_midday(2020, 1, 3), // midday to check after the time the stock was introduced
            )
            .unwrap();
        assert_eq!(result.rows.len(), 1);
        // Expected available stock for 2020-01-03
        // | 2020-01-03 | 0           | 500         | 0           |
        // # StockLine A has been all consumed the future,
        // # StockLine B had 500 available stock at that date
        // # StockLine |C doesn't exist yet
        let stock_line_b = result
            .rows
            .iter()
            .find(|r| r.stock_line_row.id == STOCK_LINE_B);

        assert_eq!(
            stock_line_b
                .unwrap()
                .stock_line_row
                .available_number_of_packs,
            500.0
        );

        // +++ 2020-01-04
        let result = service_provider
            .stock_line_service
            .get_historical_stock_lines(
                &ctx,
                store_id.clone(),
                item_id.clone(),
                get_midday(2020, 1, 4), // midday to check after the time the stock was introduced
            )
            .unwrap();
        assert_eq!(result.rows.len(), 1);
        // Expected available stock for 2020-01-04
        // | 2020-01-04 | 0           | 600         | 0           |
        // # StockLine A has been all consumed the future,
        // # StockLine B had 600 available stock at that date (100 added at midnight)
        // # StockLine |C doesn't exist yet

        let stock_line_b = result
            .rows
            .iter()
            .find(|r| r.stock_line_row.id == STOCK_LINE_B);

        assert_eq!(
            stock_line_b
                .unwrap()
                .stock_line_row
                .available_number_of_packs,
            600.0
        );

        // +++ 2020-01-05
        let result = service_provider
            .stock_line_service
            .get_historical_stock_lines(
                &ctx,
                store_id.clone(),
                item_id.clone(),
                get_midday(2020, 1, 5), // midday to check after the time the stock was introduced
            )
            .unwrap();

        assert_eq!(result.rows.len(), 1);
        // Expected available stock for 2020-01-05
        // | 2020-01-05 | 0           | 600         | 0           |
        // # StockLine A has been all consumed the future,
        // # StockLine B had 600 available stock at that date
        // # StockLine |C doesn't exist yet

        let stock_line_b = result
            .rows
            .iter()
            .find(|r| r.stock_line_row.id == STOCK_LINE_B);

        assert_eq!(
            stock_line_b
                .unwrap()
                .stock_line_row
                .available_number_of_packs,
            600.0
        );

        // +++ 2021-01-06
        let result = service_provider
            .stock_line_service
            .get_historical_stock_lines(
                &ctx,
                store_id.clone(),
                item_id.clone(),
                get_midday(2021, 1, 6), // midday to check after the time the stock was introduced
            )
            .unwrap();

        assert_eq!(result.rows.len(), 2);
        // Expected available stock for 2021-01-06
        // | 2021-01-06 | 0           | 600         | 1000        |
        // # StockLine A has been all consumed the future,
        // # StockLine B had 600 available stock at that date
        // # StockLine C has 1000 available stock at that date (introduced at midnight)

        let stock_line_b = result
            .rows
            .iter()
            .find(|r| r.stock_line_row.id == STOCK_LINE_B);

        assert_eq!(
            stock_line_b
                .unwrap()
                .stock_line_row
                .available_number_of_packs,
            600.0
        );

        let stock_line_c = result
            .rows
            .iter()
            .find(|r| r.stock_line_row.id == STOCK_LINE_C);

        assert_eq!(
            stock_line_c
                .unwrap()
                .stock_line_row
                .available_number_of_packs,
            1000.0
        );
    }
}
