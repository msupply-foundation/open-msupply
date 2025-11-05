use chrono::NaiveDate;
use repository::{DateFilter, EqualFilter, RepositoryError, StockLineFilter, StockLineRepository};

use crate::service_provider::ServiceContext;

pub trait StockExpiryCountServiceTrait: Send + Sync {
    fn count_expired_stock(
        &self,
        ctx: &ServiceContext,
        store_id: &str,
        from_date: Option<NaiveDate>,
        to_date: Option<NaiveDate>,
    ) -> Result<i64, RepositoryError> {
        StockExpiryServiceCount {}.count_expired_stock(ctx, store_id, from_date, to_date)
    }
}

pub struct StockExpiryServiceCount {}

impl StockExpiryCountServiceTrait for StockExpiryServiceCount {
    fn count_expired_stock(
        &self,
        ctx: &ServiceContext,
        store_id: &str,
        from_date: Option<NaiveDate>,
        to_date: Option<NaiveDate>,
    ) -> Result<i64, RepositoryError> {
        let repo = StockLineRepository::new(&ctx.connection);
        repo.count(
            Some(
                StockLineFilter::new()
                    .expiry_date(DateFilter {
                        equal_to: None,
                        before_or_equal_to: to_date,
                        after_or_equal_to: from_date,
                    })
                    .store_id(EqualFilter::equal_to(store_id.to_string()))
                    .is_available(true),
            ),
            None,
        )
    }
}

#[cfg(test)]
mod stock_count_test {
    use chrono::{Days, Utc};
    use repository::{
        mock::{mock_item_a, mock_store_a, MockData, MockDataInserts},
        test_db::setup_all_with_data,
        StockLineRow, StockLineRowRepository,
    };

    use crate::service_provider::ServiceProvider;

    fn expired_stock_a() -> StockLineRow {
        StockLineRow {
            id: "expired_stock_a".to_string(),
            item_link_id: mock_item_a().id,
            store_id: mock_store_a().id,
            available_number_of_packs: 100.0,
            total_number_of_packs: 100.0,
            expiry_date: Utc::now()
                .naive_utc()
                .date()
                .checked_sub_days(Days::new(20)),
            ..Default::default()
        }
    }

    fn expired_stock_b() -> StockLineRow {
        StockLineRow {
            id: "expired_stock_b".to_string(),
            item_link_id: mock_item_a().id,
            store_id: mock_store_a().id,
            available_number_of_packs: 500.0,
            total_number_of_packs: 500.0,
            expiry_date: Utc::now()
                .naive_utc()
                .date()
                .checked_sub_days(Days::new(10)),
            ..Default::default()
        }
    }

    #[actix_rt::test]
    async fn test_stock_expiry_count() {
        let (_, connection, connection_manager, _) = setup_all_with_data(
            "test_stock_expiry_count",
            MockDataInserts::none().items().stores().names().units(),
            MockData {
                stock_lines: vec![expired_stock_a(), expired_stock_b()],
                ..Default::default()
            },
        )
        .await;

        let service_provider = ServiceProvider::new(connection_manager);
        let context = service_provider
            .context(mock_store_a().id, "".to_string())
            .unwrap();
        let count_service = service_provider.stock_expiry_count_service;

        let date_now = Utc::now().naive_utc().date();

        let expired_stock_count = count_service
            .count_expired_stock(&context, &mock_store_a().id, None, Some(date_now))
            .unwrap();
        assert_eq!(expired_stock_count, 2);

        // Update one of the stock lines to have 0 packs
        let expired_stock_a: StockLineRow = {
            let mut updated = expired_stock_a();
            updated.available_number_of_packs = 0.0;
            updated.total_number_of_packs = 20.0;
            updated
        };

        StockLineRowRepository::new(&connection)
            .upsert_one(&expired_stock_a)
            .unwrap();

        let expired_stock_count = count_service
            .count_expired_stock(&context, &mock_store_a().id, None, Some(date_now))
            .unwrap();
        assert_eq!(expired_stock_count, 1);
    }
}
