use chrono::{NaiveDate, Utc};
use repository::{
    ActivityLogType, DateFilter, EqualFilter, ItemRowType, MasterListFilter, MasterListLineFilter,
    MasterListLineRepository, MasterListRepository, NumberRowType, RepositoryError,
    StockLineFilter, StockLineRepository, StockLineRow, Stocktake, StocktakeFilter,
    StocktakeLineRow, StocktakeLineRowRepository, StocktakeRepository, StocktakeRow,
    StocktakeRowRepository, StocktakeStatus, StorageConnection,
};
use util::uuid::uuid;

use crate::{
    activity_log::activity_log_entry, check_location_exists, number::next_number,
    service_provider::ServiceContext, validate::check_store_exists, NullableUpdate,
};

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

fn check_stocktake_does_not_exist(
    connection: &StorageConnection,
    id: &str,
) -> Result<bool, RepositoryError> {
    let count = StocktakeRepository::new(connection)
        .count(Some(StocktakeFilter::new().id(EqualFilter::equal_to(id))))?;
    Ok(count == 0)
}

fn check_master_list_exists(
    connection: &StorageConnection,
    store_id: &str,
    master_list_id: &str,
) -> Result<bool, RepositoryError> {
    let count = MasterListRepository::new(connection).count(Some(
        MasterListFilter::new()
            .id(EqualFilter::equal_to(master_list_id))
            .exists_for_store_id(EqualFilter::equal_to(store_id)),
    ))?;
    Ok(count > 0)
}

fn validate(
    connection: &StorageConnection,
    store_id: &str,
    stocktake: &InsertStocktake,
) -> Result<(), InsertStocktakeError> {
    if !check_stocktake_does_not_exist(connection, &stocktake.id)? {
        return Err(InsertStocktakeError::StocktakeAlreadyExists);
    }
    if !check_store_exists(connection, store_id)? {
        return Err(InsertStocktakeError::InvalidStore);
    }
    if stocktake.master_list_id.is_some() && stocktake.location.is_some() {
        return Err(InsertStocktakeError::InvalidArguments);
    }
    if let Some(master_list_id) = &stocktake.master_list_id {
        if !check_master_list_exists(connection, store_id, master_list_id)? {
            return Err(InsertStocktakeError::InvalidMasterList);
        }
    }

    if !check_location_exists(connection, store_id, &stocktake.location)? {
        return Err(InsertStocktakeError::InvalidLocation);
    }

    Ok(())
}

fn generate(
    connection: &StorageConnection,
    store_id: &str,
    user_id: &str,
    InsertStocktake {
        id,
        comment,
        description,
        stocktake_date,
        is_locked,
        location,
        master_list_id,
        items_have_stock,
        expires_before,
    }: InsertStocktake,
) -> Result<(StocktakeRow, Vec<StocktakeLineRow>), RepositoryError> {
    let stocktake_number = next_number(connection, &NumberRowType::Stocktake, store_id)?;

    let master_list_lines = match master_list_id {
        Some(master_list_id) => {
            generate_lines_from_master_list(connection, store_id, &id, &master_list_id)?
        }
        None => Vec::new(),
    };
    let location_lines = match location {
        Some(NullableUpdate {
            value: Some(location_id),
            ..
        }) => generate_lines_from_location(connection, store_id, &id, &location_id)?,
        _ => Vec::new(),
    };
    let items_have_stock_lines = match items_have_stock {
        Some(_) => generate_lines_with_stock(connection, store_id, &id)?,
        None => Vec::new(),
    };
    // let expiring_items_lines = match expiring_within_days {
    //     Some(_) => {
    //         generate_lines_expiring_soon(connection, store_id, &id, &expiring_within_days.unwrap())?
    //     }
    //     None => Vec::new(),
    // };
    let lines = [
        master_list_lines,
        location_lines,
        items_have_stock_lines,
        // expiring_items_lines,
    ]
    .concat();

    Ok((
        StocktakeRow {
            id,
            stocktake_number,
            comment,
            description,
            // TODO: Changing this to be same as created datetime for now since function is disabled in frontend
            // but will need to remove this later when functionality is
            stocktake_date: if stocktake_date.is_some() {
                stocktake_date
            } else {
                Some(Utc::now().naive_utc().date())
            },
            status: StocktakeStatus::New,
            created_datetime: Utc::now().naive_utc(),
            user_id: user_id.to_string(),
            store_id: store_id.to_string(),
            is_locked: is_locked.unwrap_or(false),
            // Default
            finalised_datetime: None,
            inventory_addition_id: None,
            inventory_reduction_id: None,
        },
        lines,
    ))
}

fn generate_lines_from_master_list(
    connection: &StorageConnection,
    store_id: &str,
    stocktake_id: &str,
    master_list_id: &str,
) -> Result<Vec<StocktakeLineRow>, RepositoryError> {
    let item_ids: Vec<String> = MasterListLineRepository::new(&connection)
        .query_by_filter(
            MasterListLineFilter::new()
                .master_list_id(EqualFilter::equal_to(&master_list_id))
                .item_type(ItemRowType::Stock.equal_to()),
        )?
        .into_iter()
        .map(|r| r.item_id)
        .collect();

    let mut result = Vec::<StocktakeLineRow>::new();

    item_ids.iter().for_each(|item_id| {
        let stock_lines = StockLineRepository::new(&connection)
            .query_by_filter(
                StockLineFilter::new()
                    .item_id(EqualFilter::equal_to(item_id))
                    .store_id(EqualFilter::equal_to(store_id))
                    .has_packs_in_store(true),
                Some(store_id.to_string()),
            )
            .unwrap();

        if stock_lines.len() == 0 {
            result.push(StocktakeLineRow {
                id: uuid(),
                stocktake_id: stocktake_id.to_string(),
                snapshot_number_of_packs: 0.0,
                item_link_id: item_id.to_string(),
                location_id: None,
                batch: None,
                expiry_date: None,
                note: None,
                stock_line_id: None,
                pack_size: None,
                cost_price_per_pack: None,
                sell_price_per_pack: None,
                comment: None,
                counted_number_of_packs: None,
                inventory_adjustment_reason_id: None,
            });
        } else {
            stock_lines.into_iter().for_each(|line| {
                let StockLineRow {
                    id: stock_line_id,
                    item_link_id: _,
                    location_id,
                    batch,
                    pack_size,
                    cost_price_per_pack,
                    sell_price_per_pack,
                    total_number_of_packs,
                    expiry_date,
                    note,
                    supplier_link_id: _,
                    store_id: _,
                    on_hold: _,
                    available_number_of_packs: _,
                    barcode_id: _,
                } = line.stock_line_row;

                result.push(StocktakeLineRow {
                    id: uuid(),
                    stocktake_id: stocktake_id.to_string(),
                    snapshot_number_of_packs: total_number_of_packs,
                    item_link_id: line.item_row.id,
                    location_id,
                    batch,
                    expiry_date,
                    note,
                    stock_line_id: Some(stock_line_id),
                    pack_size: Some(pack_size),
                    cost_price_per_pack: Some(cost_price_per_pack),
                    sell_price_per_pack: Some(sell_price_per_pack),
                    comment: None,
                    counted_number_of_packs: None,
                    inventory_adjustment_reason_id: None,
                });
            });
        }
    });

    Ok(result)
}

fn generate_lines_from_location(
    connection: &StorageConnection,
    store_id: &str,
    stocktake_id: &str,
    location_id: &str,
) -> Result<Vec<StocktakeLineRow>, RepositoryError> {
    let stock_lines = StockLineRepository::new(&connection).query_by_filter(
        StockLineFilter::new()
            .location_id(EqualFilter::equal_to(&location_id))
            .store_id(EqualFilter::equal_to(store_id))
            .has_packs_in_store(true),
        Some(store_id.to_string()),
    )?;

    let result = stock_lines
        .into_iter()
        .map(|line| {
            let StockLineRow {
                id: stock_line_id,
                item_link_id: _,
                location_id,
                batch,
                pack_size,
                cost_price_per_pack,
                sell_price_per_pack,
                total_number_of_packs,
                expiry_date,
                note,
                supplier_link_id: _,
                store_id: _,
                on_hold: _,
                available_number_of_packs: _,
                barcode_id: _,
            } = line.stock_line_row;

            StocktakeLineRow {
                id: uuid(),
                stocktake_id: stocktake_id.to_string(),
                snapshot_number_of_packs: total_number_of_packs,
                item_link_id: line.item_row.id,
                location_id,
                batch,
                expiry_date,
                note,
                stock_line_id: Some(stock_line_id),
                pack_size: Some(pack_size),
                cost_price_per_pack: Some(cost_price_per_pack),
                sell_price_per_pack: Some(sell_price_per_pack),
                comment: None,
                counted_number_of_packs: None,
                inventory_adjustment_reason_id: None,
            }
        })
        .collect();
    Ok(result)
}

pub fn generate_lines_with_stock(
    connection: &StorageConnection,
    store_id: &str,
    stocktake_id: &str,
) -> Result<Vec<StocktakeLineRow>, RepositoryError> {
    let stock_lines = StockLineRepository::new(&connection).query_by_filter(
        StockLineFilter::new()
            .store_id(EqualFilter::equal_to(store_id))
            .has_packs_in_store(true),
        Some(store_id.to_string()),
    )?;

    let result = stock_lines
        .into_iter()
        .map(|line| {
            let StockLineRow {
                id: stock_line_id,
                item_link_id: _,
                location_id,
                batch,
                pack_size,
                cost_price_per_pack,
                sell_price_per_pack,
                total_number_of_packs,
                expiry_date,
                note,
                supplier_link_id: _,
                store_id: _,
                on_hold: _,
                available_number_of_packs: _,
                barcode_id: _,
            } = line.stock_line_row;

            StocktakeLineRow {
                id: uuid(),
                stocktake_id: stocktake_id.to_string(),
                snapshot_number_of_packs: total_number_of_packs,
                item_link_id: line.item_row.id,
                location_id,
                batch,
                expiry_date,
                note,
                stock_line_id: Some(stock_line_id),
                pack_size: Some(pack_size),
                cost_price_per_pack: Some(cost_price_per_pack),
                sell_price_per_pack: Some(sell_price_per_pack),
                comment: None,
                counted_number_of_packs: None,
                inventory_adjustment_reason_id: None,
            }
        })
        .collect();
    Ok(result)
}

fn generate_lines_expiring_soon(
    connection: &StorageConnection,
    store_id: &str,
    stocktake_id: &str,
    days: &i32,
) -> Result<Vec<StocktakeLineRow>, RepositoryError> {
    let stock_lines = StockLineRepository::new(&connection).query_by_filter(
        StockLineFilter::new()
            .store_id(EqualFilter::equal_to(store_id))
            .has_packs_in_store(true),
        Some(store_id.to_string()),
    )?;

    let result = stock_lines
        .into_iter()
        .map(|line| {
            let StockLineRow {
                id: stock_line_id,
                item_link_id: _,
                location_id,
                batch,
                pack_size,
                cost_price_per_pack,
                sell_price_per_pack,
                total_number_of_packs,
                expiry_date,
                note,
                supplier_link_id: _,
                store_id: _,
                on_hold: _,
                available_number_of_packs: _,
                barcode_id: _,
            } = line.stock_line_row;

            StocktakeLineRow {
                id: uuid(),
                stocktake_id: stocktake_id.to_string(),
                snapshot_number_of_packs: total_number_of_packs,
                item_link_id: line.item_row.id,
                location_id,
                batch,
                expiry_date,
                note,
                stock_line_id: Some(stock_line_id),
                pack_size: Some(pack_size),
                cost_price_per_pack: Some(cost_price_per_pack),
                sell_price_per_pack: Some(sell_price_per_pack),
                comment: None,
                counted_number_of_packs: None,
                inventory_adjustment_reason_id: None,
            }
        })
        .collect();
    Ok(result)
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
            StocktakeRowRepository::new(&connection).upsert_one(&new_stocktake)?;

            let repo = StocktakeLineRowRepository::new(&connection);
            for line in lines {
                repo.upsert_one(&line)?;
            }

            activity_log_entry(
                &ctx,
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
}
