use chrono::{NaiveDate, Utc};
use repository::{
    ActivityLogType, EqualFilter, MasterListLineFilter, MasterListLineRepository, NumberRowType,
    RepositoryError, Stocktake, StocktakeFilter, StocktakeLineRow, StocktakeLineRowRepository,
    StocktakeRepository, StocktakeRow, StocktakeRowRepository, StocktakeStatus, StorageConnection,
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

            let mut item_ids = Vec::<String>::new();
            if let Some(master_list_id) = input.master_list_id {
                let master_list_items = MasterListLineRepository::new(&connection)
                    .query_by_filter(MasterListLineFilter {
                        master_list_id: Some(EqualFilter::equal_to(&master_list_id)),
                        id: None,
                        item_id: None,
                    })?;
                master_list_items.iter().for_each(|line| {
                    item_ids.push(line.item_id.clone());
                });
            }

            // if let Some(location_id) = input.location_id {
            //     let location_items = StockLineRepository::new(&connection).query_by_filter(StockLineFilter { location_id: EqualFilter::equal_to(&location_id) })?;
            //     location_items.iter().for_each(|line| {
            //         item_ids.push(line.item_id);
            //     });
            // }

            let stocktake_line_row_repo = StocktakeLineRowRepository::new(&connection);
            // let stock_line_repo = StockLineRepository::new(&connection);

            item_ids.iter().for_each(|item_id| {
                // let stock_line = stock_line_repo.find_one_by_filter(StockLineFilter { item_id: EqualFilter::equal_to(item_id), location_id: EqualFilter::equal_to(&input.location_id) })?;

                // ignore errors
                let _result = stocktake_line_row_repo.upsert_one(&StocktakeLineRow {
                    id: uuid(),
                    stocktake_id: new_stocktake.id.clone(),
                    stock_line_id: None,
                    location_id: None,
                    comment: None,
                    snapshot_number_of_packs: 0.0,
                    counted_number_of_packs: None,

                    item_id: item_id.to_string(),
                    batch: None,
                    expiry_date: None,
                    pack_size: None,
                    cost_price_per_pack: None,
                    sell_price_per_pack: None,
                    note: None,
                    inventory_adjustment_reason_id: None,
                });
            });

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
        StocktakeLineFilter, StocktakeLineRepository, StocktakeRow, StocktakeRowRepository,
        StocktakeStatus,
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
        let service = service_provider.stocktake_service;
        let mut context = service_provider
            .context(mock_store_a().id, mock_user_account_a().id)
            .unwrap();

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
                    master_list_id: Some(mock_master_list_item_query_test1().master_list.id),
                },
            )
            .unwrap();

        let stocktake_rows = StocktakeLineRepository::new(&connection)
            .query_by_filter(StocktakeLineFilter::new().stocktake_id("new_stocktake".to_string()))
            .unwrap();

        assert_eq!(stocktake_rows.len(), 1);

        // assert_eq!(
        //     new_row,
        //     inline_edit(&new_row, |mut i: StocktakeRow| {
        //         i.user_id = mock_user_account_a().id;
        //         i.id = "new_stocktake".to_string();
        //         i.comment = Some("comment".to_string());
        //         i.description = Some("description".to_string());
        //         i.stocktake_date = Some(NaiveDate::from_ymd(2020, 01, 02));
        //         i.is_locked = true;
        //         i.status = StocktakeStatus::New;
        //         i.store_id = mock_store_a().id;
        //         i
        //     }),
        // );
    }
}
