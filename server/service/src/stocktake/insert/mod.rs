mod validate;
use validate::validate;

mod generate;
use generate::generate;

use chrono::NaiveDate;
use repository::{
    ActivityLogType, RepositoryError, Stocktake, StocktakeLineRowRepository, StocktakeRowRepository,
};

use crate::{activity_log::activity_log_entry, service_provider::ServiceContext};

use super::query::get_stocktake;

#[derive(Default, Debug, PartialEq, Clone)]
pub struct InsertStocktake {
    pub id: String,
    pub create_blank_stocktake: Option<bool>,
    pub is_initial_stocktake: Option<bool>,
    pub is_all_items_stocktake: Option<bool>,
    pub location_id: Option<String>,
    pub vvm_status_id: Option<String>,
    pub master_list_id: Option<String>,
    pub include_all_master_list_items: Option<bool>,
    pub expires_before: Option<NaiveDate>,
    pub comment: Option<String>,
    pub description: Option<String>,
}

#[derive(Debug, PartialEq)]
pub enum InsertStocktakeError {
    DatabaseError(RepositoryError),
    InternalError(String),
    StocktakeAlreadyExists,
    InitialStocktakeAlreadyExists,
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
                Some(new_stocktake.id.to_string()),
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
    use crate::{
        service_provider::ServiceProvider,
        stocktake::insert::{InsertStocktake, InsertStocktakeError},
    };
    use chrono::{NaiveDate, Utc};
    use repository::{
        mock::{
            item_query_test1, mock_item_a, mock_item_b, mock_location_1,
            mock_master_list_item_query_test1, mock_master_list_master_list_line_filter_test,
            mock_master_list_program_b, mock_program_master_list_test, mock_stocktake_a,
            mock_store_a, mock_store_b, mock_user_account_a, mock_vvm_status_a,
            program_master_list_store, MockData, MockDataInserts,
        },
        test_db::{setup_all, setup_all_with_data},
        EqualFilter, ItemFilter, ItemRepository, MasterListLineRow, MasterListLineRowRepository,
        MasterListNameJoinRow, StockLineFilter, StockLineRepository, StockLineRow,
        StockLineRowRepository, StocktakeLineFilter, StocktakeLineRepository, StocktakeRow,
        StocktakeRowRepository, StocktakeStatus,
    };

    #[actix_rt::test]
    async fn insert_stocktake() {
        let (_, connection, connection_manager, _) =
            setup_all("insert_stocktake", MockDataInserts::all()).await;

        let service_provider = ServiceProvider::new(connection_manager);
        let mut context = service_provider
            .context(mock_store_a().id, mock_user_account_a().id)
            .unwrap();

        let service = service_provider.stocktake_service;

        // check that an initial stocktake can't be created if any stocktake exists for the store
        // stocktake_a already exists for store_a from mock data
        context.store_id = mock_store_a().id;
        let error = service
            .insert_stocktake(
                &context,
                InsertStocktake {
                    id: "new_initial_stocktake".to_string(),
                    is_initial_stocktake: Some(true),
                    ..Default::default()
                },
            )
            .unwrap_err();
        assert_eq!(error, InsertStocktakeError::InitialStocktakeAlreadyExists);

        // error: stocktake already exists
        let existing_stocktake = mock_stocktake_a();
        let error = service
            .insert_stocktake(
                &context,
                InsertStocktake {
                    id: existing_stocktake.id,
                    ..Default::default()
                },
            )
            .unwrap_err();
        assert_eq!(error, InsertStocktakeError::StocktakeAlreadyExists);

        // error: store does not exist
        context.store_id = "invalid".to_string();
        let error = service
            .insert_stocktake(
                &context,
                InsertStocktake {
                    id: "new_stocktake".to_string(),
                    ..Default::default()
                },
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
                    is_initial_stocktake: Some(false),
                    ..Default::default()
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
            StocktakeRow {
                user_id: mock_user_account_a().id,
                id: "new_stocktake".to_string(),
                comment: Some("comment".to_string()),
                description: Some("description".to_string()),
                status: StocktakeStatus::New,
                store_id: mock_store_a().id,
                ..new_row.clone()
            },
        );

        assert!(
            new_row.created_datetime > before_insert && new_row.created_datetime < after_insert
        );
    }

    #[actix_rt::test]
    async fn insert_stocktake_with_master_list() {
        let (_, connection, connection_manager, _) =
            setup_all("insert_stocktake_with_master_list", MockDataInserts::all()).await;

        let service_provider = ServiceProvider::new(connection_manager);
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
                master_list_id: Some("invalid".to_string()),
                ..Default::default()
            },
        );
        assert!(invalid_result.is_err());

        // add a stock line for another store and check that it is not added to the stocktake
        let _ = StockLineRowRepository::new(&connection).upsert_one({
            &StockLineRow {
                id: "stock_line_row_1".to_string(),
                store_id: mock_store_b().id,
                item_link_id: item_query_test1().id,
                ..Default::default()
            }
        });

        service
            .insert_stocktake(
                &context,
                InsertStocktake {
                    id: "stocktake_1".to_string(),
                    comment: Some("comment".to_string()),
                    description: Some("description".to_string()),
                    master_list_id: Some(master_list_id.clone()),
                    ..Default::default()
                },
            )
            .unwrap();

        // check that rows were created for the stocktake
        let stocktake_rows = StocktakeLineRepository::new(&connection)
            .query_by_filter(
                StocktakeLineFilter::new().stocktake_id(EqualFilter::equal_to("stocktake_1".to_string())),
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
                    master_list_id: Some(master_list_id.clone()),
                    ..Default::default()
                },
            )
            .unwrap();

        let stocktake_rows = StocktakeLineRepository::new(&connection)
            .query_by_filter(
                StocktakeLineFilter::new().stocktake_id(EqualFilter::equal_to("stocktake_2".to_string())),
                None,
            )
            .unwrap();

        assert_eq!(stocktake_rows.len(), 1);
    }

    #[actix_rt::test]
    async fn insert_stocktake_with_location() {
        let (_, connection, connection_manager, _) =
            setup_all("insert_stocktake_with_location", MockDataInserts::all()).await;

        let service_provider = ServiceProvider::new(connection_manager);
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
                    location_id: Some(location_id.clone()),
                    ..Default::default()
                },
            )
            .unwrap();

        // check that no rows were created for the stocktake
        let stocktake_rows = StocktakeLineRepository::new(&connection)
            .query_by_filter(
                StocktakeLineFilter::new().stocktake_id(EqualFilter::equal_to("stocktake_1".to_string())),
                None,
            )
            .unwrap();

        // do we have a stocktake row?
        assert_eq!(stocktake_rows.len(), 0);

        // add a stock_line for that location and try again
        let _ = StockLineRowRepository::new(&connection).upsert_one({
            &StockLineRow {
                id: "stock_line_row_1".to_string(),
                store_id: mock_store_a().id,
                item_link_id: mock_item_a().id,
                location_id: Some(location_id.clone()),
                total_number_of_packs: 100.0,
                ..Default::default()
            }
        });

        service
            .insert_stocktake(
                &context,
                InsertStocktake {
                    id: "stocktake_2".to_string(),
                    comment: Some("comment".to_string()),
                    description: Some("description".to_string()),
                    location_id: Some(location_id.clone()),
                    ..Default::default()
                },
            )
            .unwrap();

        let stocktake_rows = StocktakeLineRepository::new(&connection)
            .query_by_filter(
                StocktakeLineFilter::new().stocktake_id(EqualFilter::equal_to("stocktake_2".to_string())),
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
    async fn insert_stocktake_with_vvm_status() {
        let (_, connection, connection_manager, _) =
            setup_all("insert_stocktake_with_vvm_status", MockDataInserts::all()).await;

        let service_provider = ServiceProvider::new(connection_manager);
        let context = service_provider
            .context(mock_store_a().id, mock_user_account_a().id)
            .unwrap();
        let service = service_provider.stocktake_service;
        let vvm_status_id = mock_vvm_status_a().id;

        service
            .insert_stocktake(
                &context,
                InsertStocktake {
                    id: "stocktake_with_vvm_filter".to_string(),
                    comment: Some("comment".to_string()),
                    description: Some("description".to_string()),
                    vvm_status_id: Some(vvm_status_id.clone()),
                    ..Default::default()
                },
            )
            .unwrap();

        // check that no rows were created for the stocktake
        let stocktake_rows = StocktakeLineRepository::new(&connection)
            .query_by_filter(
                StocktakeLineFilter::new()
                    .stocktake_id(EqualFilter::equal_to("stocktake_with_vvm_filter".to_string())),
                None,
            )
            .unwrap();
        assert_eq!(stocktake_rows.len(), 0);

        // add a stock_line with that VVM Status and try again
        let _ = StockLineRowRepository::new(&connection).upsert_one({
            &StockLineRow {
                id: "vvm_stock_line_row".to_string(),
                store_id: mock_store_a().id,
                item_link_id: mock_item_a().id,
                total_number_of_packs: 100.0,
                vvm_status_id: Some(vvm_status_id.clone()),
                ..Default::default()
            }
        });

        service
            .insert_stocktake(
                &context,
                InsertStocktake {
                    id: "stocktake_with_vvm_filter_2".to_string(),
                    comment: Some("comment".to_string()),
                    description: Some("description".to_string()),
                    vvm_status_id: Some(vvm_status_id.clone()),
                    ..Default::default()
                },
            )
            .unwrap();

        let stocktake_rows = StocktakeLineRepository::new(&connection)
            .query_by_filter(
                StocktakeLineFilter::new()
                    .stocktake_id(EqualFilter::equal_to("stocktake_with_vvm_filter_2".to_string())),
                None,
            )
            .unwrap();

        assert_eq!(stocktake_rows.len(), 1);
        // and that it does have a stock_line linked
        assert_eq!(
            stocktake_rows[0].line.stock_line_id,
            Some("vvm_stock_line_row".to_string())
        );
    }

    #[actix_rt::test]
    async fn insert_stocktake_with_stock() {
        fn item_a_stock() -> StockLineRow {
            StockLineRow {
                id: "stock_line_row_1".to_string(),
                store_id: mock_store_a().id,
                item_link_id: mock_item_a().id,
                total_number_of_packs: 100.0,
                ..Default::default()
            }
        }

        fn item_b_stock() -> StockLineRow {
            StockLineRow {
                id: "stock_line_row_3".to_string(),
                store_id: mock_store_a().id,
                item_link_id: mock_item_b().id,
                total_number_of_packs: 10.0,
                ..Default::default()
            }
        }

        fn item_a_no_stock() -> StockLineRow {
            StockLineRow {
                id: "stock_line_row_2".to_string(),
                store_id: mock_store_a().id,
                item_link_id: mock_item_b().id,
                total_number_of_packs: 0.0,
                ..Default::default()
            }
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
            MockData {
                stock_lines: vec![item_a_stock(), item_b_stock(), item_a_no_stock()],
                ..Default::default()
            },
        )
        .await;

        let service_provider = ServiceProvider::new(connection_manager);
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
                    ..Default::default()
                },
            )
            .unwrap();

        let stocktake_rows = StocktakeLineRepository::new(&connection)
            .query_by_filter(
                StocktakeLineFilter::new().stocktake_id(EqualFilter::equal_to("stocktake_1".to_string())),
                None,
            )
            .unwrap();

        assert_eq!(
            stocktake_rows.len(),
            2,
            "stocktakes include all in stock stock lines by default (even if not visible)"
        );

        // Test that no items are added to a stocktake when `create_blank_stocktake` is given
        service
            .insert_stocktake(
                &context,
                InsertStocktake {
                    id: "blank_stocktake".to_string(),
                    comment: Some("comment".to_string()),
                    description: Some("description".to_string()),
                    create_blank_stocktake: Some(true),
                    ..Default::default()
                },
            )
            .unwrap();

        let stocktake_rows = StocktakeLineRepository::new(&connection)
            .query_by_filter(
                StocktakeLineFilter::new().stocktake_id(EqualFilter::equal_to("blank_stocktake".to_string())),
                None,
            )
            .unwrap();

        assert_eq!(stocktake_rows.len(), 0);
    }

    #[actix_rt::test]
    async fn insert_stocktake_with_expiry() {
        let (_, connection, connection_manager, _) =
            setup_all("insert_stocktake_with_expiry", MockDataInserts::all()).await;

        let service_provider = ServiceProvider::new(connection_manager);
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
                    expires_before: Some(NaiveDate::from_ymd_opt(2020, 1, 1).unwrap()),
                    ..Default::default()
                },
            )
            .unwrap();

        // check that no rows were created for the stocktake
        let stocktake_rows = StocktakeLineRepository::new(&connection)
            .query_by_filter(
                StocktakeLineFilter::new().stocktake_id(EqualFilter::equal_to("stocktake_1".to_string())),
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
                    expires_before: Some(NaiveDate::from_ymd_opt(2020, 4, 22).unwrap()),
                    ..Default::default()
                },
            )
            .unwrap();

        let stocktake_rows = StocktakeLineRepository::new(&connection)
            .query_by_filter(
                StocktakeLineFilter::new().stocktake_id(EqualFilter::equal_to("stocktake_2".to_string())),
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

    #[actix_rt::test]
    async fn insert_initial_stocktake() {
        // Mock data creates stocktakes for store_a and store_b -> test creation of initial
        // stocktake on Program_master_list_store, which has one master list joined with one item

        // Join same item as first masterlist -> check that one item will not be added to the stocktake twice
        let master_list_name_join = MasterListNameJoinRow {
            id: "A_program_b_Join".to_string(),
            name_link_id: mock_program_master_list_test().id.clone(),
            master_list_id: mock_master_list_program_b().master_list.id.clone(),
        };
        // Join master list with two new items -> check the stocktake contains items from multiple master lists
        let filter_master_list_name_join = MasterListNameJoinRow {
            id: "Filter_program_b_Join".to_string(),
            name_link_id: mock_program_master_list_test().id.clone(),
            master_list_id: mock_master_list_master_list_line_filter_test()
                .master_list
                .id
                .clone(),
        };

        let (_, connection, connection_manager, _) = setup_all_with_data(
            "insert_initial_stocktake",
            MockDataInserts::all(),
            MockData {
                master_list_name_joins: vec![master_list_name_join, filter_master_list_name_join],
                ..Default::default()
            },
        )
        .await;

        let store = program_master_list_store();
        let service_provider = ServiceProvider::new(connection_manager);
        let context = service_provider
            .context(store.id, mock_user_account_a().id)
            .unwrap();
        let service = service_provider.stocktake_service;

        // create the initial stocktake
        let initial_stocktake = service
            .insert_stocktake(
                &context,
                InsertStocktake {
                    id: "initial_stocktake".to_string(),
                    comment: Some("comment".to_string()),
                    description: Some("description".to_string()),
                    is_initial_stocktake: Some(true),
                    ..Default::default()
                },
            )
            .unwrap();

        // check that rows were created for the stocktake
        let stocktake_rows = StocktakeLineRepository::new(&connection)
            .query_by_filter(
                StocktakeLineFilter::new()
                    .stocktake_id(EqualFilter::equal_to(initial_stocktake.id.to_string())),
                None,
            )
            .unwrap();

        // do we have a stocktake row for each item on the master lists?
        assert_eq!(stocktake_rows.len(), 3);

        // check there is no associated stockline
        let stock_line_row = stocktake_rows
            .iter()
            .find(|r| r.line.stock_line_id == Some("stock_line_row_1".to_string()));
        assert!(stock_line_row.is_none());
    }

    #[actix_rt::test]
    async fn insert_full_stocktake() {
        let (_, connection, connection_manager, _) = setup_all(
            "insert_full_stocktake",
            MockDataInserts {
                ..MockDataInserts::all()
            },
        )
        .await;

        let store = mock_store_b();
        let service_provider = ServiceProvider::new(connection_manager);
        let context = service_provider
            .context(store.id.clone(), mock_user_account_a().id)
            .unwrap();
        let service = service_provider.stocktake_service;

        // create stocktake with no additional inputs - should include all items in stock
        let in_stock_stocktake = service
            .insert_stocktake(
                &context,
                InsertStocktake {
                    id: "in_stock_stocktake".to_string(),
                    ..Default::default()
                },
            )
            .unwrap();

        let num_stock_lines = StockLineRepository::new(&connection)
            .count(
                Some(
                    StockLineFilter::new()
                        .store_id(EqualFilter::equal_to(store.id.to_string()))
                        .has_packs_in_store(true),
                ),
                None,
            )
            .unwrap();

        let num_stocktake_rows = StocktakeLineRepository::new(&connection)
            .count(
                Some(
                    StocktakeLineFilter::new()
                        .stocktake_id(EqualFilter::equal_to(in_stock_stocktake.id.to_string())),
                ),
                None,
            )
            .unwrap();

        // Should be a stocktake line for each stock line in the store
        assert_eq!(num_stocktake_rows, num_stock_lines);

        // INCLUDE OUT OF STOCK ITEMS
        let all_items_stocktake = service
            .insert_stocktake(
                &context,
                InsertStocktake {
                    id: "all_items_stocktake".to_string(),
                    is_all_items_stocktake: Some(true),
                    ..Default::default()
                },
            )
            .unwrap();

        let num_out_of_stock_items = ItemRepository::new(&connection)
            .count(
                store.id,
                Some(ItemFilter::new().has_stock_on_hand(false).is_visible(true)),
            )
            .unwrap();

        let num_stocktake_rows = StocktakeLineRepository::new(&connection)
            .count(
                Some(
                    StocktakeLineFilter::new()
                        .stocktake_id(EqualFilter::equal_to(all_items_stocktake.id.to_string())),
                ),
                None,
            )
            .unwrap();

        // Should be a stocktake line for each stock line in the store, & each out of stock item
        assert_eq!(num_stocktake_rows, num_stock_lines + num_out_of_stock_items);
    }
}
