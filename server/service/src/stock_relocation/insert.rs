use chrono::Utc;
use repository::{
    InvoiceLineRowRepository, InvoiceLineType, LocationRowRepository, RepositoryError, StockLine,
    StockLineRow, StockRelocationRow, StockRelocationRowRepository, StockRelocationStatus,
    StorageConnection, TransactionError,
};

use util::EPSILON;

use crate::{
    common::{check_stock_line_exists, CommonStockLineError},
    repack::{insert_repack, InsertRepack, InsertRepackError},
    service_provider::ServiceContext,
    stock_line::update::{update_stock_line, UpdateStockLine, UpdateStockLineError},
    NullableUpdate,
};

#[derive(Debug, Clone, PartialEq, Default)]
pub struct InsertStockRelocation {
    pub from_location_id: Option<String>,
    pub lines: Vec<InsertStockRelocationLine>,
}

#[derive(Debug, Clone, PartialEq, Default)]
pub struct InsertStockRelocationLine {
    pub id: String,
    pub from_stock_line_id: String,
    pub from_number_of_packs: f64,
    pub to_location_id: Option<String>,
    pub to_pack_size: f64,
}

#[derive(Debug, PartialEq)]
pub enum InsertStockRelocationError {
    StockLineDoesNotExist,
    NotThisStoreStockLine,
    StockLineOnHold(String),
    LocationOnHold(String),
    ToLocationDoesNotExist,
    NotThisStoreLocation,
    NotEnoughStock(String),
    InvalidNumberOfPacks,
    InvalidPackSize,
    CannotHaveFractionalPack,
    NewlyCreatedStockLineDoesNotExist,
    DatabaseError(RepositoryError),
    InternalError(String),
}

struct Validated {
    stock_line: StockLineRow,
}

pub fn insert_stock_relocation(
    ctx: &ServiceContext,
    store_id: &str,
    input: InsertStockRelocation,
) -> Result<Vec<StockRelocationRow>, InsertStockRelocationError> {
    let results = ctx
        .connection
        .transaction_sync(|connection| {
            let now = Utc::now().naive_utc();
            let mut rows = Vec::with_capacity(input.lines.len());

            for line in input.lines {
                let Validated { stock_line } = validate(connection, store_id, &line)?;
                let from_location_id = stock_line.location_id.clone();

                let to_stock_line_id = if is_relocation_only(&stock_line, &line) {
                    update_stock_line(
                        ctx,
                        UpdateStockLine {
                            id: line.from_stock_line_id.clone(),
                            location: Some(NullableUpdate {
                                value: line.to_location_id.clone(),
                            }),
                            ..Default::default()
                        },
                    )?;
                    line.from_stock_line_id.clone()
                } else {
                    let invoice = insert_repack(
                        ctx,
                        InsertRepack {
                            stock_line_id: line.from_stock_line_id.clone(),
                            number_of_packs: line.from_number_of_packs,
                            new_pack_size: line.to_pack_size,
                            new_location_id: line.to_location_id.clone(),
                        },
                    )?;
                    new_stock_line_id(connection, &invoice.invoice_row.id)?
                };

                let row = StockRelocationRow {
                    id: line.id.clone(),
                    created_datetime: now,
                    finalised_datetime: Some(now),
                    from_stock_line_id: line.from_stock_line_id,
                    from_location_id,
                    from_number_of_packs: line.from_number_of_packs,
                    to_stock_line_id: Some(to_stock_line_id),
                    to_location_id: line.to_location_id,
                    status: StockRelocationStatus::Finalised,
                    store_id: store_id.to_string(),
                    user_id: ctx.user_id.clone(),
                };
                StockRelocationRowRepository::new(connection).upsert_one(&row)?;
                rows.push(row);
            }

            Ok(rows)
        })
        .map_err(|error: TransactionError<InsertStockRelocationError>| error.to_inner_error())?;

    Ok(results)
}

fn is_relocation_only(stock_line: &StockLineRow, line: &InsertStockRelocationLine) -> bool {
    (line.to_pack_size - stock_line.pack_size).abs() < EPSILON
        && (line.from_number_of_packs - stock_line.available_number_of_packs).abs() < EPSILON
        && (stock_line.available_number_of_packs - stock_line.total_number_of_packs).abs() < EPSILON
}

fn validate(
    connection: &StorageConnection,
    store_id: &str,
    line: &InsertStockRelocationLine,
) -> Result<Validated, InsertStockRelocationError> {
    use InsertStockRelocationError::*;

    let StockLine {
        stock_line_row,
        location_row,
        ..
    } = check_stock_line_exists(connection, store_id, &line.from_stock_line_id).map_err(|err| {
        match err {
            CommonStockLineError::DatabaseError(RepositoryError::NotFound) => StockLineDoesNotExist,
            CommonStockLineError::StockLineDoesNotBelongToStore => NotThisStoreStockLine,
            CommonStockLineError::DatabaseError(error) => DatabaseError(error),
        }
    })?;

    if stock_line_row.on_hold {
        return Err(StockLineOnHold(stock_line_row.id.clone()));
    }
    if let Some(location_row) = &location_row {
        if location_row.on_hold {
            return Err(LocationOnHold(location_row.id.clone()));
        }
    }

    if line.from_number_of_packs <= 0.0 {
        return Err(InvalidNumberOfPacks);
    }
    if line.from_number_of_packs > stock_line_row.available_number_of_packs + EPSILON {
        return Err(NotEnoughStock(stock_line_row.id.clone()));
    }
    if line.to_pack_size <= 0.0 {
        return Err(InvalidPackSize);
    }

    if let Some(to_location_id) = &line.to_location_id {
        let to_location = LocationRowRepository::new(connection)
            .find_one_by_id(to_location_id)?
            .ok_or(ToLocationDoesNotExist)?;
        if to_location.store_id != store_id {
            return Err(NotThisStoreLocation);
        }
        if to_location.on_hold {
            return Err(LocationOnHold(to_location.id.clone()));
        }
    }

    Ok(Validated {
        stock_line: stock_line_row,
    })
}

fn new_stock_line_id(
    connection: &StorageConnection,
    invoice_id: &str,
) -> Result<String, InsertStockRelocationError> {
    InvoiceLineRowRepository::new(connection)
        .find_many_by_invoice_id(invoice_id)?
        .into_iter()
        .find(|line| line.r#type == InvoiceLineType::StockIn)
        .and_then(|line| line.stock_line_id)
        .ok_or(InsertStockRelocationError::NewlyCreatedStockLineDoesNotExist)
}

impl From<RepositoryError> for InsertStockRelocationError {
    fn from(error: RepositoryError) -> Self {
        InsertStockRelocationError::DatabaseError(error)
    }
}

impl From<InsertRepackError> for InsertStockRelocationError {
    fn from(error: InsertRepackError) -> Self {
        use InsertStockRelocationError as E;
        match error {
            InsertRepackError::StockLineDoesNotExist => E::StockLineDoesNotExist,
            InsertRepackError::NotThisStoreStockLine => E::NotThisStoreStockLine,
            InsertRepackError::CannotHaveFractionalPack => E::CannotHaveFractionalPack,
            InsertRepackError::StockLineReducedBelowZero(stock_line) => {
                E::NotEnoughStock(stock_line.stock_line_row.id)
            }
            InsertRepackError::DatabaseError(e) => E::DatabaseError(e),
            InsertRepackError::NewlyCreatedInvoiceDoesNotExist => {
                E::NewlyCreatedStockLineDoesNotExist
            }
            InsertRepackError::InternalError(s) => E::InternalError(s),
        }
    }
}

impl From<UpdateStockLineError> for InsertStockRelocationError {
    fn from(error: UpdateStockLineError) -> Self {
        use InsertStockRelocationError as E;
        match error {
            UpdateStockLineError::StockDoesNotExist => E::StockLineDoesNotExist,
            UpdateStockLineError::StockDoesNotBelongToStore => E::NotThisStoreStockLine,
            UpdateStockLineError::LocationDoesNotExist => E::ToLocationDoesNotExist,
            UpdateStockLineError::DatabaseError(e) => E::DatabaseError(e),
            other => E::InternalError(format!("{:?}", other)),
        }
    }
}

#[cfg(test)]
mod test {
    use repository::{
        mock::{mock_location_1, mock_location_on_hold, MockDataInserts},
        test_db::setup_all,
        StockLineRow, StockLineRowRepository, StockRelocationStatus, Upsert,
    };
    use util::uuid::uuid;

    use crate::service_provider::ServiceProvider;

    use super::*;

    fn whole_line(id: &str, on_hold: bool) -> StockLineRow {
        StockLineRow {
            id: id.to_string(),
            item_id: "item_a".to_string(),
            store_id: "store_a".to_string(),
            pack_size: 1.0,
            available_number_of_packs: 10.0,
            total_number_of_packs: 10.0,
            on_hold,
            ..Default::default()
        }
    }

    async fn setup(test: &str) -> (ServiceProvider, ServiceContext) {
        let (_, _, connection_manager, _) = setup_all(test, MockDataInserts::all()).await;
        let service_provider = ServiceProvider::new(connection_manager);
        let context = service_provider
            .context("store_a".to_string(), "user_account_a".to_string())
            .unwrap();
        (service_provider, context)
    }

    fn line(stock_line_id: &str) -> InsertStockRelocationLine {
        InsertStockRelocationLine {
            id: uuid(),
            from_stock_line_id: stock_line_id.to_string(),
            from_number_of_packs: 10.0,
            to_location_id: Some(mock_location_1().id),
            to_pack_size: 1.0,
        }
    }

    #[actix_rt::test]
    async fn stock_relocation_validation_errors() {
        let (service_provider, ctx) = setup("stock_relocation_validation_errors").await;
        whole_line("ok_sl", false).upsert(&ctx.connection).unwrap();
        whole_line("held_sl", true).upsert(&ctx.connection).unwrap();
        let service = &service_provider.stock_relocation_service;

        let insert = |line: InsertStockRelocationLine| {
            service.insert_stock_relocation(
                &ctx,
                "store_a",
                InsertStockRelocation {
                    from_location_id: None,
                    lines: vec![line],
                },
            )
        };

        assert_eq!(
            insert(line("held_sl")),
            Err(InsertStockRelocationError::StockLineOnHold(
                "held_sl".to_string()
            ))
        );
        assert_eq!(
            insert(InsertStockRelocationLine {
                from_number_of_packs: 999.0,
                ..line("ok_sl")
            }),
            Err(InsertStockRelocationError::NotEnoughStock(
                "ok_sl".to_string()
            ))
        );
        assert_eq!(
            insert(InsertStockRelocationLine {
                to_location_id: Some(mock_location_on_hold().id),
                ..line("ok_sl")
            }),
            Err(InsertStockRelocationError::LocationOnHold(
                mock_location_on_hold().id
            ))
        );
    }

    #[actix_rt::test]
    async fn stock_relocation_success() {
        let (service_provider, ctx) = setup("stock_relocation_success").await;
        whole_line("relocate_sl", false)
            .upsert(&ctx.connection)
            .unwrap();
        whole_line("repack_sl", false)
            .upsert(&ctx.connection)
            .unwrap();

        let service = &service_provider.stock_relocation_service;
        let rows = service
            .insert_stock_relocation(
                &ctx,
                "store_a",
                InsertStockRelocation {
                    from_location_id: None,
                    lines: vec![
                        line("relocate_sl"),
                        InsertStockRelocationLine {
                            to_pack_size: 2.0,
                            ..line("repack_sl")
                        },
                    ],
                },
            )
            .unwrap();

        assert_eq!(rows.len(), 2);
        assert!(rows
            .iter()
            .all(|r| r.status == StockRelocationStatus::Finalised));
        let stock_line_repo = StockLineRowRepository::new(&ctx.connection);

        // Relocate
        let relocate = rows
            .iter()
            .find(|r| r.from_stock_line_id == "relocate_sl")
            .unwrap();
        assert_eq!(relocate.to_stock_line_id.as_deref(), Some("relocate_sl"));
        let relocated_line = stock_line_repo
            .find_one_by_id("relocate_sl")
            .unwrap()
            .unwrap();
        assert_eq!(relocated_line.location_id, Some(mock_location_1().id));
        assert_eq!(relocated_line.available_number_of_packs, 10.0);

        // Repack
        let repack = rows
            .iter()
            .find(|r| r.from_stock_line_id == "repack_sl")
            .unwrap();
        let new_id = repack.to_stock_line_id.clone().unwrap();
        assert_ne!(new_id, "repack_sl");
        let source = stock_line_repo
            .find_one_by_id("repack_sl")
            .unwrap()
            .unwrap();
        assert_eq!(source.available_number_of_packs, 0.0);

        // 10 packs of size 1 → 5 packs of size 2, at the destination location
        let new_line = stock_line_repo.find_one_by_id(&new_id).unwrap().unwrap();
        assert_eq!(new_line.pack_size, 2.0);
        assert_eq!(new_line.available_number_of_packs, 5.0);
        assert_eq!(new_line.location_id, Some(mock_location_1().id));
    }
}
