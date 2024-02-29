use chrono::NaiveDate;
use repository::{DateFilter, EqualFilter, RepositoryError, StockLineFilter, StockLineRepository};

use crate::service_provider::ServiceContext;

pub trait StockExpiryCountServiceTrait: Send + Sync {
    /// # Arguments
    ///
    /// * date_time date at which the expired stock is counted
    fn count_expired_stock(
        &self,
        ctx: &ServiceContext,
        store_id: &str,
        date_time: NaiveDate,
    ) -> Result<i64, RepositoryError> {
        StockExpiryServiceCount {}.count_expired_stock(ctx, store_id, date_time)
    }
}

pub struct StockExpiryServiceCount {}

impl StockExpiryCountServiceTrait for StockExpiryServiceCount {
    fn count_expired_stock(
        &self,
        ctx: &ServiceContext,
        store_id: &str,
        date_time: NaiveDate,
    ) -> Result<i64, RepositoryError> {
        let repo = StockLineRepository::new(&ctx.connection);
        repo.count(
            Some(
                StockLineFilter::new()
                    .expiry_date(DateFilter {
                        equal_to: None,
                        before_or_equal_to: Some(date_time),
                        after_or_equal_to: None,
                    })
                    .store_id(EqualFilter::equal_to(&store_id))
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
    use util::{inline_edit, inline_init};

    use crate::service_provider::ServiceProvider;

    fn expired_stock_a() -> StockLineRow {
        inline_init(|r: &mut StockLineRow| {
            r.id = "expired_stock_a".to_string();
            r.item_link_id = mock_item_a().id;
            r.store_id = mock_store_a().id;
            r.available_number_of_packs = 100.0;
            r.total_number_of_packs = 100.0;
            r.expiry_date = Utc::now()
                .naive_utc()
                .date()
                .checked_sub_days(Days::new(20));
        })
    }

    fn expired_stock_b() -> StockLineRow {
        inline_init(|r: &mut StockLineRow| {
            r.id = "expired_stock_b".to_string();
            r.item_link_id = mock_item_a().id;
            r.store_id = mock_store_a().id;
            r.available_number_of_packs = 500.0;
            r.total_number_of_packs = 500.0;
            r.expiry_date = Utc::now()
                .naive_utc()
                .date()
                .checked_sub_days(Days::new(10));
        })
    }

    #[actix_rt::test]
    async fn test_stock_expiry_count() {
        let (_, connection, connection_manager, _) = setup_all_with_data(
            "test_stock_expiry_count",
            MockDataInserts::none().items().stores().names().units(),
            inline_init(|r: &mut MockData| {
                r.stock_lines = vec![expired_stock_a(), expired_stock_b()]
            }),
        )
        .await;

        let service_provider = ServiceProvider::new(connection_manager, "app_data");
        let context = service_provider
            .context(mock_store_a().id, "".to_string())
            .unwrap();
        let count_service = service_provider.stock_expiry_count_service;

        let date_now = Utc::now().naive_utc().date();

        let expired_stock_count = count_service
            .count_expired_stock(&context, &mock_store_a().id, date_now)
            .unwrap();
        assert_eq!(expired_stock_count, 2);

        // Update one of the stock lines to have 0 packs
        let expired_stock_a: StockLineRow = inline_edit(&expired_stock_a(), |mut r| {
            r.available_number_of_packs = 0.0;
            r.total_number_of_packs = 20.0;
            r
        });

        StockLineRowRepository::new(&connection)
            .upsert_one(&expired_stock_a)
            .unwrap();

        let expired_stock_count = count_service
            .count_expired_stock(&context, &mock_store_a().id, date_now)
            .unwrap();
        assert_eq!(expired_stock_count, 1);
    }
}
