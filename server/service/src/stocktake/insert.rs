use chrono::{NaiveDate, Utc};
use repository::{
    ActivityLogType, EqualFilter, MasterListLineFilter, MasterListLineRepository, NumberRowType,
    RepositoryError, StockLine, StockLineFilter, StockLineRepository, Stocktake, StocktakeFilter,
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
}

fn check_stocktake_does_not_exist(
    connection: &StorageConnection,
    id: &str,
) -> Result<bool, RepositoryError> {
    let count = StocktakeRepository::new(connection)
        .count(Some(StocktakeFilter::new().id(EqualFilter::equal_to(id))))?;
    Ok(count == 0)
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
        master_list_id: _,
    }: InsertStocktake,
) -> Result<StocktakeRow, RepositoryError> {
    let stocktake_number = next_number(connection, &NumberRowType::Stocktake, store_id)?;

    Ok(StocktakeRow {
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
    })
}

pub fn insert_stocktake(
    ctx: &ServiceContext,
    input: InsertStocktake,
) -> Result<Stocktake, InsertStocktakeError> {
    let result = ctx
        .connection
        .transaction_sync(|connection| {
            validate(connection, &ctx.store_id, &input)?;
            let new_stocktake = generate(connection, &ctx.store_id, &ctx.user_id, input.clone())?;
            StocktakeRowRepository::new(&connection).upsert_one(&new_stocktake)?;

            insert_rows(input, connection, ctx, &new_stocktake.id)?;

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

fn insert_rows(
    input: InsertStocktake,
    connection: &StorageConnection,
    ctx: &ServiceContext,
    stocktake_id: &str,
) -> Result<(), InsertStocktakeError> {
    let mut item_ids = Vec::<String>::new();
    // check for master list
    if let Some(master_list_id) = input.master_list_id {
        let master_list_items =
            MasterListLineRepository::new(&connection).query_by_filter(MasterListLineFilter {
                master_list_id: Some(EqualFilter::equal_to(&master_list_id)),
                id: None,
                item_id: None,
            })?;
        master_list_items.iter().for_each(|line| {
            item_ids.push(line.item_id.clone());
        });
    }
    // insert a stocktake row for each item & stock_line
    item_ids.iter().for_each(|item_id| {
        let stock_lines = StockLineRepository::new(&connection)
            .query_by_filter(
                StockLineFilter::new().item_id(EqualFilter::equal_to(item_id)),
                Some(ctx.store_id.clone()),
            )
            .unwrap();

        if stock_lines.len() == 0 {
            insert_stocktake_line(&connection, stocktake_id, &item_id, None);
        } else {
            stock_lines.iter().for_each(|stock_line| {
                insert_stocktake_line(&connection, stocktake_id, &item_id, Some(stock_line));
            });
        }
    });
    Ok(())
}

fn insert_stocktake_line(
    connection: &StorageConnection,
    stocktake_id: &str,
    item_id: &String,
    stock_line: Option<&StockLine>,
) {
    let mut stock_line_id = "None".to_string();
    let mut stocktake_line_row = StocktakeLineRow {
        id: uuid(),
        stocktake_id: stocktake_id.to_string(),
        location_id: None,
        comment: None,
        snapshot_number_of_packs: 0.0,
        counted_number_of_packs: None,
        item_id: item_id.to_string(),
        note: None,
        inventory_adjustment_reason_id: None,
        stock_line_id: None,
        batch: None,
        expiry_date: None,
        pack_size: None,
        cost_price_per_pack: None,
        sell_price_per_pack: None,
    };
    if let Some(stock_line) = stock_line {
        let stock_line_row = stock_line.stock_line_row.clone();
        stock_line_id = stock_line_row.id;
        stocktake_line_row.stock_line_id = Some(stock_line_id.clone());
        stocktake_line_row.batch = stock_line_row.batch;
        stocktake_line_row.expiry_date = stock_line_row.expiry_date;
        stocktake_line_row.pack_size = Some(stock_line_row.pack_size);
        stocktake_line_row.cost_price_per_pack = Some(stock_line_row.cost_price_per_pack);
        stocktake_line_row.sell_price_per_pack = Some(stock_line_row.sell_price_per_pack);
    }

    if let Err(e) = StocktakeLineRowRepository::new(connection).upsert_one(&stocktake_line_row) {
        log::error!(
            "Unable to insert stocktake_line! item_id {} and stock_line_id {}: {}",
            item_id,
            stock_line_id,
            e
        );
    };
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
