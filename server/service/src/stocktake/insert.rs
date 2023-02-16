use chrono::{NaiveDate, Utc};
use repository::{
    ActivityLogType, EqualFilter, MasterListFilter, MasterListLineFilter, MasterListLineRepository,
    MasterListRepository, NumberRowType, Pagination, RepositoryError, Sort, StockLineFilter,
    StockLineRepository, StockLineRow, StockLineSortField, Stocktake, StocktakeFilter,
    StocktakeLineRow, StocktakeLineRowRepository, StocktakeRepository, StocktakeRow,
    StocktakeRowRepository, StocktakeStatus, StorageConnection,
};
use util::uuid::uuid;

use crate::{
    activity_log::activity_log_entry, number::next_number, service_provider::ServiceContext,
    validate::check_store_exists,
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
    pub location_id: Option<String>,
}

#[derive(Debug, PartialEq)]
pub enum InsertStocktakeError {
    DatabaseError(RepositoryError),
    InternalError(String),
    StocktakeAlreadyExists,
    InvalidStore,
    InvalidMasterList,
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
    if let Some(master_list_id) = &stocktake.master_list_id {
        if !check_master_list_exists(connection, store_id, master_list_id)? {
            return Err(InsertStocktakeError::InvalidMasterList);
        }
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
        location_id: _,
        master_list_id,
    }: InsertStocktake,
) -> Result<(StocktakeRow, Vec<StocktakeLineRow>), RepositoryError> {
    let stocktake_number = next_number(connection, &NumberRowType::Stocktake, store_id)?;

    let lines = match master_list_id {
        Some(master_list_id) => {
            generate_lines_from_master_list(connection, store_id, &id, &master_list_id)?
        }
        None => Vec::new(),
    };

    Ok((
        StocktakeRow {
            id,
            stocktake_number,
            comment,
            description,
            stocktake_date,
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
    let item_ids = MasterListLineRepository::new(&connection)
        .query_by_filter(
            MasterListLineFilter::new().master_list_id(EqualFilter::equal_to(&master_list_id)),
        )?
        .into_iter()
        .map(|r| r.item_id)
        .collect();

    let stock_lines = StockLineRepository::new(connection).query(
        Pagination::all(),
        Some(StockLineFilter::new().item_id(EqualFilter::equal_any(item_ids))),
        Some(Sort {
            key: StockLineSortField::ItemCode,
            desc: None,
        }),
        Some(store_id.to_string()),
    )?;

    let result = stock_lines
        .into_iter()
        .map(|line| {
            let StockLineRow {
                id: stock_line_id,
                item_id,
                location_id,
                batch,
                pack_size,
                cost_price_per_pack,
                sell_price_per_pack,
                total_number_of_packs,
                expiry_date,
                note,
                supplier_id: _,
                store_id: _,
                on_hold: _,
                available_number_of_packs: _,
            } = line.stock_line_row;

            StocktakeLineRow {
                id: uuid(),
                stocktake_id: stocktake_id.to_string(),
                snapshot_number_of_packs: total_number_of_packs,
                item_id,
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

            // insert_rows(input, connection, ctx, &new_stocktake.id)?;
            let repo = StocktakeLineRowRepository::new(&connection);
            for line in lines {
                repo.upsert_one(&line)?;
            }

            activity_log_entry(
                &ctx,
                ActivityLogType::StocktakeCreated,
                Some(new_stocktake.id.to_owned()),
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
            mock_master_list_item_query_test1, mock_stocktake_a, mock_store_a, mock_user_account_a,
            MockDataInserts,
        },
        test_db::setup_all,
        EqualFilter, MasterListLineRow, MasterListLineRowRepository, StocktakeLineFilter,
        StocktakeLineRepository, StocktakeRow, StocktakeRowRepository, StocktakeStatus,
    };
    use util::{inline_edit, inline_init};

    use crate::{
        service_provider::ServiceProvider,
        stocktake::insert::{InsertStocktake, InsertStocktakeError},
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
                    stocktake_date: Some(NaiveDate::from_ymd(2020, 01, 02)),
                    is_locked: Some(true),
                    location_id: None,
                    master_list_id: None,
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
                i.stocktake_date = Some(NaiveDate::from_ymd(2020, 01, 02));
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
        let mut context = service_provider
            .context(mock_store_a().id, mock_user_account_a().id)
            .unwrap();
        let service = service_provider.stocktake_service;
        let master_list_id = mock_master_list_item_query_test1().master_list.id;

        context.store_id = mock_store_a().id;
        service
            .insert_stocktake(
                &context,
                InsertStocktake {
                    id: "stocktake_1".to_string(),
                    comment: Some("comment".to_string()),
                    description: Some("description".to_string()),
                    stocktake_date: Some(NaiveDate::from_ymd(2020, 01, 02)),
                    is_locked: Some(true),
                    location_id: None,
                    master_list_id: Some(master_list_id.clone()),
                },
            )
            .unwrap();

        // check that rows were created for the stocktake
        let stocktake_rows = StocktakeLineRepository::new(&connection)
            .query_by_filter(
                StocktakeLineFilter::new().stocktake_id(EqualFilter::equal_to("stocktake_1")),
            )
            .unwrap();

        // do we have a stocktake row?
        assert_eq!(stocktake_rows.len(), 1);

        // what about the link to the stock_line?
        let stock_line_row = stocktake_rows
            .iter()
            .find(|r| r.line.stock_line_id == Some("item_query_test1".to_string()));
        assert_eq!(stock_line_row.is_some(), true);
        assert_eq!(
            stock_line_row.unwrap().line.stock_line_id,
            Some("item_query_test1".to_string())
        );

        // add another item to the master list and check that it is added to the stocktake
        let _ = MasterListLineRowRepository::new(&connection).upsert_one(&MasterListLineRow {
            id: "master_list_line_b".to_string(),
            master_list_id: master_list_id.clone(),
            item_id: "item_d".to_string(),
        });

        service
            .insert_stocktake(
                &context,
                InsertStocktake {
                    id: "stocktake_2".to_string(),
                    comment: Some("comment".to_string()),
                    description: Some("description".to_string()),
                    stocktake_date: Some(NaiveDate::from_ymd(2020, 01, 02)),
                    is_locked: Some(true),
                    location_id: None,
                    master_list_id: Some(master_list_id.clone()),
                },
            )
            .unwrap();

        let stocktake_rows = StocktakeLineRepository::new(&connection)
            .query_by_filter(
                StocktakeLineFilter::new().stocktake_id(EqualFilter::equal_to("stocktake_2")),
            )
            .unwrap();

        assert_eq!(stocktake_rows.len(), 2);
        // and that it does not have a stock_line linked
        assert_eq!(
            stocktake_rows
                .iter()
                .find(|r| r.line.item_id == "item_d")
                .unwrap()
                .line
                .stock_line_id,
            None
        );
    }
}
