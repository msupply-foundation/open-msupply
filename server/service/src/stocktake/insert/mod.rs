mod validate;
use validate::validate;

mod generate;
use generate::generate;

use chrono::NaiveDate;
use repository::{
    ActivityLogType, RepositoryError, Stocktake, StocktakeLineRowRepository, StocktakeRowRepository,
};

use crate::{activity_log::activity_log_entry, service_provider::ServiceContext, NullableUpdate};

use super::query::get_stocktake;

#[derive(Default, Debug, PartialEq, Clone)]
pub struct InsertStocktake {
    pub id: String,
    pub comment: Option<String>,
    pub description: Option<String>,
    pub stocktake_date: Option<NaiveDate>,
    pub is_locked: Option<bool>,
    pub master_list_id: Option<String>,
    pub location: Option<NullableUpdate<String>>,
    pub items_have_stock: Option<bool>,
    pub expires_before: Option<NaiveDate>,
}

#[derive(Debug, PartialEq)]
pub enum InsertStocktakeError {
    DatabaseError(RepositoryError),
    InternalError(String),
    StocktakeAlreadyExists,
    InvalidStore,
    InvalidMasterList,
    InvalidLocation,
    InvalidArguments,
}

pub fn insert_stocktake(
    ctx: &ServiceContext,
    input: InsertStocktake,
) -> Result<Stocktake, InsertStocktakeError> {
    let result = ctx
        .connection
        .transaction_sync(|connection| {
            validate(connection, &ctx.store_id, &input)?;
            let (new_stocktake, lines) = generate(connection, &ctx.store_id, &ctx.user_id, input)?;
            StocktakeRowRepository::new(connection).upsert_one(&new_stocktake)?;

            let repo = StocktakeLineRowRepository::new(connection);
            for line in lines {
                repo.upsert_one(&line)?;
            }

            activity_log_entry(
                ctx,
                ActivityLogType::StocktakeCreated,
                Some(new_stocktake.id.to_owned()),
                None,
                None,
            )?;
            let stocktake = get_stocktake(ctx, new_stocktake.id)?;
            stocktake.ok_or(InsertStocktakeError::InternalError(
                "Failed to read the just inserted stocktake!".to_string(),
            ))
        })
        .map_err(|error| error.to_inner_error())?;

    Ok(result)
}

impl From<RepositoryError> for InsertStocktakeError {
    fn from(error: RepositoryError) -> Self {
        InsertStocktakeError::DatabaseError(error)
    }
}

#[cfg(test)]
mod test {
    use chrono::{NaiveDate, Utc};
    use repository::{
        mock::{
            item_query_test1, mock_item_a, mock_item_b, mock_location_1,
            mock_master_list_item_query_test1, mock_stocktake_a, mock_store_a, mock_store_b,
            mock_user_account_a, MockData, MockDataInserts,
        },
        test_db::{setup_all, setup_all_with_data},
        EqualFilter, MasterListLineRow, MasterListLineRowRepository, StockLineRow,
        StockLineRowRepository, StocktakeLineFilter, StocktakeLineRepository, StocktakeRow,
        StocktakeRowRepository, StocktakeStatus,
    };
    use util::{inline_edit, inline_init};

    use crate::{
        service_provider::ServiceProvider,
        stocktake::insert::{InsertStocktake, InsertStocktakeError},
        NullableUpdate,
    };

    #[actix_rt::test]
    async fn insert_stocktake() {
        let (_, connection, connection_manager, _) =
            setup_all("insert_stocktake", MockDataInserts::all()).await;

        let service_provider = ServiceProvider::new(connection_manager, "app_data");
        let mut context = service_provider
            .context(mock_store_a().id, mock_user_account_a().id)
            .unwrap();

        let service = service_provider.stocktake_service;

        // error: stocktake already exists
        let existing_stocktake = mock_stocktake_a();
        let error = service
            .insert_stocktake(
                &context,
                inline_init(|i: &mut InsertStocktake| {
                    i.id = existing_stocktake.id;
                }),
            )
            .unwrap_err();
        assert_eq!(error, InsertStocktakeError::StocktakeAlreadyExists);

        // error: store does not exist
        context.store_id = "invalid".to_string();
        let error = service
            .insert_stocktake(
                &context,
                inline_init(|i: &mut InsertStocktake| i.id = "new_stocktake".to_string()),
            )
            .unwrap_err();
        assert_eq!(error, InsertStocktakeError::InvalidStore);

        // success
        let before_insert = Utc::now().naive_utc();

        context.store_id = mock_store_a().id;
        service
            .insert_stocktake(
                &context,
                InsertStocktake {
                    id: "new_stocktake".to_string(),
                    comment: Some("comment".to_string()),
                    description: Some("description".to_string()),
                    stocktake_date: Some(NaiveDate::from_ymd_opt(2020, 1, 2).unwrap()),
                    is_locked: Some(true),
                    location: None,
                    master_list_id: None,
                    items_have_stock: None,
                    expires_before: None,
                },
            )
            .unwrap();

        let after_insert = Utc::now().naive_utc();

        let new_row = StocktakeRowRepository::new(&connection)
            .find_one_by_id("new_stocktake")
            .unwrap()
            .unwrap();

        assert_eq!(
            new_row,
            inline_edit(&new_row, |mut i: StocktakeRow| {
                i.user_id = mock_user_account_a().id;
                i.id = "new_stocktake".to_string();
                i.comment = Some("comment".to_string());
                i.description = Some("description".to_string());
                i.stocktake_date = Some(NaiveDate::from_ymd_opt(2020, 1, 2).unwrap());
                i.is_locked = true;
                i.status = StocktakeStatus::New;
                i.store_id = mock_store_a().id;
                i
            }),
        );

        assert!(
            new_row.created_datetime > before_insert && new_row.created_datetime < after_insert
        );
    }

    #[actix_rt::test]
    async fn insert_stocktake_with_master_list() {
        let (_, connection, connection_manager, _) =
            setup_all("insert_stocktake_with_master_list", MockDataInserts::all()).await;

        let service_provider = ServiceProvider::new(connection_manager, "app_data");
        let context = service_provider
            .context(mock_store_a().id, mock_user_account_a().id)
            .unwrap();
        let service = service_provider.stocktake_service;
        let master_list_id = mock_master_list_item_query_test1().master_list.id;

        // Check that a valid masterlist is supplied
        let invalid_result = service.insert_stocktake(
            &context,
            InsertStocktake {
                id: "stocktake_2".to_string(),
                comment: Some("comment".to_string()),
                description: Some("description".to_string()),
                stocktake_date: Some(NaiveDate::from_ymd_opt(2020, 1, 2).unwrap()),
                is_locked: Some(true),
                location: None,
                master_list_id: Some("invalid".to_string()),
                items_have_stock: None,
                expires_before: None,
            },
        );
        assert!(invalid_result.is_err());

        // add a stock line for another store and check that it is not added to the stocktake
        let _ = StockLineRowRepository::new(&connection).upsert_one({
            &inline_init(|r: &mut StockLineRow| {
                r.id = "stock_line_row_1".to_string();
                r.store_id = mock_store_b().id;
                r.item_link_id = item_query_test1().id;
            })
        });

        service
            .insert_stocktake(
                &context,
                InsertStocktake {
                    id: "stocktake_1".to_string(),
                    comment: Some("comment".to_string()),
                    description: Some("description".to_string()),
                    stocktake_date: Some(NaiveDate::from_ymd_opt(2020, 1, 2).unwrap()),
                    is_locked: Some(true),
                    location: None,
                    master_list_id: Some(master_list_id.clone()),
                    items_have_stock: None,
                    expires_before: None,
                },
            )
            .unwrap();

        // check that rows were created for the stocktake
        let stocktake_rows = StocktakeLineRepository::new(&connection)
            .query_by_filter(
                StocktakeLineFilter::new().stocktake_id(EqualFilter::equal_to("stocktake_1")),
                None,
            )
            .unwrap();

        // do we have a stocktake row?
        assert_eq!(stocktake_rows.len(), 1);

        // what about the link to the stock_line?
        let stock_line_row = stocktake_rows
            .iter()
            .find(|r| r.line.stock_line_id == Some("item_query_test1".to_string()));
        assert!(stock_line_row.is_some());
        assert_eq!(
            stock_line_row.unwrap().line.stock_line_id,
            Some("item_query_test1".to_string())
        );

        let stock_line_row = stocktake_rows
            .iter()
            .find(|r| r.line.stock_line_id == Some("stock_line_row_1".to_string()));
        assert!(stock_line_row.is_none());

        // add another item to the master list and check that it is added to the stocktake
        let _ = MasterListLineRowRepository::new(&connection).upsert_one(&MasterListLineRow {
            id: "master_list_line_b".to_string(),
            master_list_id: master_list_id.clone(),
            item_link_id: "item_d".to_string(),
            ..Default::default()
        });

        service
            .insert_stocktake(
                &context,
                InsertStocktake {
                    id: "stocktake_2".to_string(),
                    comment: Some("comment".to_string()),
                    description: Some("description".to_string()),
                    stocktake_date: Some(NaiveDate::from_ymd_opt(2020, 1, 2).unwrap()),
                    is_locked: Some(true),
                    location: None,
                    master_list_id: Some(master_list_id.clone()),
                    items_have_stock: None,
                    expires_before: None,
                },
            )
            .unwrap();

        let stocktake_rows = StocktakeLineRepository::new(&connection)
            .query_by_filter(
                StocktakeLineFilter::new().stocktake_id(EqualFilter::equal_to("stocktake_2")),
                None,
            )
            .unwrap();

        assert_eq!(stocktake_rows.len(), 2);
        // and that it does not have a stock_line linked
        assert_eq!(
            stocktake_rows
                .iter()
                .find(|r| r.line.item_link_id == "item_d")
                .unwrap()
                .line
                .stock_line_id,
            None
        );
    }

    #[actix_rt::test]
    async fn insert_stocktake_with_location() {
        let (_, connection, connection_manager, _) =
            setup_all("insert_stocktake_with_location", MockDataInserts::all()).await;

        let service_provider = ServiceProvider::new(connection_manager, "app_data");
        let context = service_provider
            .context(mock_store_a().id, mock_user_account_a().id)
            .unwrap();
        let service = service_provider.stocktake_service;
        let location_id = mock_location_1().id;

        service
            .insert_stocktake(
                &context,
                InsertStocktake {
                    id: "stocktake_1".to_string(),
                    comment: Some("comment".to_string()),
                    description: Some("description".to_string()),
                    stocktake_date: Some(NaiveDate::from_ymd_opt(2020, 1, 2).unwrap()),
                    is_locked: Some(true),
                    location: Some(NullableUpdate {
                        value: Some(location_id.clone()),
                    }),
                    master_list_id: None,
                    items_have_stock: None,
                    expires_before: None,
                },
            )
            .unwrap();

        // check that no rows were created for the stocktake
        let stocktake_rows = StocktakeLineRepository::new(&connection)
            .query_by_filter(
                StocktakeLineFilter::new().stocktake_id(EqualFilter::equal_to("stocktake_1")),
                None,
            )
            .unwrap();

        // do we have a stocktake row?
        assert_eq!(stocktake_rows.len(), 0);

        // add a stock_line for that location and try again
        let _ = StockLineRowRepository::new(&connection).upsert_one({
            &inline_init(|r: &mut StockLineRow| {
                r.id = "stock_line_row_1".to_string();
                r.store_id = mock_store_a().id;
                r.item_link_id = mock_item_a().id;
                r.location_id = Some(location_id.clone());
                r.total_number_of_packs = 100.0;
            })
        });

        service
            .insert_stocktake(
                &context,
                InsertStocktake {
                    id: "stocktake_2".to_string(),
                    comment: Some("comment".to_string()),
                    description: Some("description".to_string()),
                    stocktake_date: Some(NaiveDate::from_ymd_opt(2020, 1, 2).unwrap()),
                    is_locked: Some(true),
                    location: Some(NullableUpdate {
                        value: Some(location_id.clone()),
                    }),
                    master_list_id: None,
                    items_have_stock: None,
                    expires_before: None,
                },
            )
            .unwrap();

        let stocktake_rows = StocktakeLineRepository::new(&connection)
            .query_by_filter(
                StocktakeLineFilter::new().stocktake_id(EqualFilter::equal_to("stocktake_2")),
                None,
            )
            .unwrap();

        assert_eq!(stocktake_rows.len(), 1);
        // and that it does have a stock_line linked
        let stock_line_row = stocktake_rows
            .iter()
            .find(|r| r.line.stock_line_id == Some("stock_line_row_1".to_string()));
        assert!(stock_line_row.is_some());
        assert_eq!(
            stock_line_row.unwrap().line.stock_line_id,
            Some("stock_line_row_1".to_string())
        );
    }

    #[actix_rt::test]
    async fn insert_stocktake_with_stock() {
        fn item_a_stock() -> StockLineRow {
            inline_init(|s: &mut StockLineRow| {
                s.id = "stock_line_row_1".to_string();
                s.store_id = mock_store_a().id;
                s.item_link_id = mock_item_a().id;
                s.total_number_of_packs = 100.0;
            })
        }

        fn item_b_stock() -> StockLineRow {
            inline_init(|s: &mut StockLineRow| {
                s.id = "stock_line_row_3".to_string();
                s.store_id = mock_store_a().id;
                s.item_link_id = mock_item_b().id;
                s.total_number_of_packs = 10.0;
            })
        }

        fn item_a_no_stock() -> StockLineRow {
            inline_init(|s: &mut StockLineRow| {
                s.id = "stock_line_row_2".to_string();
                s.store_id = mock_store_a().id;
                s.item_link_id = mock_item_b().id;
                s.total_number_of_packs = 0.0;
            })
        }

        let (_, connection, connection_manager, _) = setup_all_with_data(
            "insert_stocktake_with_stock",
            MockDataInserts::none()
                .names()
                .stores()
                .name_store_joins()
                .user_accounts()
                .contexts()
                .user_permissions()
                .user_store_joins()
                .items()
                .units(),
            inline_init(|m: &mut MockData| {
                m.stock_lines = vec![item_a_stock(), item_b_stock(), item_a_no_stock()]
            }),
        )
        .await;

        let service_provider = ServiceProvider::new(connection_manager, "app_data");
        let context = service_provider
            .context(mock_store_a().id, mock_user_account_a().id)
            .unwrap();
        let service = service_provider.stocktake_service;

        service
            .insert_stocktake(
                &context,
                InsertStocktake {
                    id: "stocktake_1".to_string(),
                    comment: Some("comment".to_string()),
                    description: Some("description".to_string()),
                    stocktake_date: Some(NaiveDate::from_ymd_opt(2020, 1, 2).unwrap()),
                    is_locked: Some(true),
                    location: Some(NullableUpdate { value: None }),
                    master_list_id: None,
                    items_have_stock: None,
                    expires_before: None,
                },
            )
            .unwrap();

        let stocktake_rows = StocktakeLineRepository::new(&connection)
            .query_by_filter(
                StocktakeLineFilter::new().stocktake_id(EqualFilter::equal_to("stocktake_1")),
                None,
            )
            .unwrap();

        assert_eq!(stocktake_rows.len(), 0);

        service
            .insert_stocktake(
                &context,
                InsertStocktake {
                    id: "stocktake_2".to_string(),
                    comment: Some("comment".to_string()),
                    description: Some("description".to_string()),
                    stocktake_date: Some(NaiveDate::from_ymd_opt(2020, 1, 2).unwrap()),
                    is_locked: Some(true),
                    location: Some(NullableUpdate { value: None }),
                    master_list_id: None,
                    items_have_stock: Some(true),
                    expires_before: None,
                },
            )
            .unwrap();

        let stocktake_rows = StocktakeLineRepository::new(&connection)
            .query_by_filter(
                StocktakeLineFilter::new().stocktake_id(EqualFilter::equal_to("stocktake_2")),
                None,
            )
            .unwrap();

        assert_eq!(stocktake_rows.len(), 2);
    }

    #[actix_rt::test]
    async fn insert_stocktake_with_expiry() {
        let (_, connection, connection_manager, _) =
            setup_all("insert_stocktake_with_expiry", MockDataInserts::all()).await;

        let service_provider = ServiceProvider::new(connection_manager, "app_data");
        let context = service_provider
            .context(mock_store_a().id, mock_user_account_a().id)
            .unwrap();
        let service = service_provider.stocktake_service;

        service
            .insert_stocktake(
                &context,
                InsertStocktake {
                    id: "stocktake_1".to_string(),
                    comment: Some("comment".to_string()),
                    description: Some("description".to_string()),
                    stocktake_date: Some(NaiveDate::from_ymd_opt(2020, 1, 2).unwrap()),
                    is_locked: Some(true),
                    location: None,
                    master_list_id: None,
                    items_have_stock: None,
                    expires_before: Some(NaiveDate::from_ymd_opt(2020, 1, 1).unwrap()),
                },
            )
            .unwrap();

        // check that no rows were created for the stocktake
        let stocktake_rows = StocktakeLineRepository::new(&connection)
            .query_by_filter(
                StocktakeLineFilter::new().stocktake_id(EqualFilter::equal_to("stocktake_1")),
                None,
            )
            .unwrap();

        // do we have a stocktake row?
        assert_eq!(stocktake_rows.len(), 0);

        // try again with later date
        service
            .insert_stocktake(
                &context,
                InsertStocktake {
                    id: "stocktake_2".to_string(),
                    comment: Some("comment".to_string()),
                    description: Some("description".to_string()),
                    stocktake_date: Some(NaiveDate::from_ymd_opt(2020, 1, 2).unwrap()),
                    is_locked: Some(true),
                    location: None,
                    master_list_id: None,
                    items_have_stock: None,
                    expires_before: Some(NaiveDate::from_ymd_opt(2020, 4, 22).unwrap()),
                },
            )
            .unwrap();

        let stocktake_rows = StocktakeLineRepository::new(&connection)
            .query_by_filter(
                StocktakeLineFilter::new().stocktake_id(EqualFilter::equal_to("stocktake_2")),
                None,
            )
            .unwrap();

        // Should have 3 stocklines earlier than input date
        assert_eq!(stocktake_rows.len(), 3);
        // and that it does have a stock_line linked
        // let stock_line_row = stocktake_rows
        //     .iter()
        //     .find(|r| r.line.stock_line_id == Some("stock_line_row_1".to_string()));
        // assert!(stock_line_row.is_some());
        // assert_eq!(
        //     stock_line_row.unwrap().line.stock_line_id,
        //     Some("stock_line_row_1".to_string())
        // );
    }
}
