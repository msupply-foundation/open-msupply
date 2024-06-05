use repository::{
    barcode::{Barcode, BarcodeFilter, BarcodeRepository, BarcodeSort},
    BarcodeRow, BarcodeRowRepository, EqualFilter, PaginationOption, RepositoryError,
    StorageConnection, StorageConnectionManager,
};
use util::uuid::uuid;

use crate::{item::check_item_exists, service_provider::ServiceContext};

use super::{get_default_pagination, i64_to_u32, ListError, ListResult};

pub const MAX_LIMIT: u32 = 5000;
pub const MIN_LIMIT: u32 = 1;

pub struct InsertResult {
    pub id: String,
    pub gtin: String,
    pub item_id: String,
    pub pack_size: Option<f64>,
}

pub struct BarcodeInput {
    pub gtin: String,
    pub item_id: String,
    pub pack_size: Option<f64>,
}

#[derive(Debug, PartialEq)]
pub enum InsertBarcodeError {
    DatabaseError(RepositoryError),
    InternalError(String),
    InvalidItem,
}
impl From<RepositoryError> for InsertBarcodeError {
    fn from(error: RepositoryError) -> Self {
        InsertBarcodeError::DatabaseError(error)
    }
}

pub trait BarcodeServiceTrait: Sync + Send {
    fn get_barcode(
        &self,
        ctx: &ServiceContext,
        id: String,
    ) -> Result<Option<Barcode>, RepositoryError> {
        let repository = BarcodeRepository::new(&ctx.connection);

        Ok(repository
            .query_by_filter(BarcodeFilter::new().id(EqualFilter::equal_to(&id)))?
            .pop())
    }

    fn get_barcodes(
        &self,
        connection_manager: &StorageConnectionManager,
        pagination: Option<PaginationOption>,
        filter: Option<BarcodeFilter>,
        sort: Option<BarcodeSort>,
    ) -> Result<ListResult<Barcode>, ListError> {
        let pagination = get_default_pagination(pagination, MAX_LIMIT, MIN_LIMIT)?;
        let connection = connection_manager.connection()?;
        let repository = BarcodeRepository::new(&connection);

        Ok(ListResult {
            rows: repository.query(pagination, filter.clone(), sort)?,
            count: i64_to_u32(repository.count(filter)?),
        })
    }

    fn get_barcode_by_gtin(
        &self,
        ctx: &ServiceContext,
        gtin: &str,
    ) -> Result<Option<Barcode>, RepositoryError> {
        let repository = BarcodeRepository::new(&ctx.connection);

        Ok(repository
            .query_by_filter(BarcodeFilter::new().gtin(EqualFilter::equal_to(gtin)))?
            .pop())
    }

    fn upsert_barcode(
        &self,
        ctx: &ServiceContext,
        input: BarcodeInput,
    ) -> Result<Barcode, InsertBarcodeError> {
        let result = ctx
            .connection
            .transaction_sync(|con| {
                validate(con, &ctx.store_id, &input)?;

                let new_barcode = generate(con, input)?;

                BarcodeRowRepository::new(con).upsert_one(&new_barcode)?;
                let barcode = self.get_barcode(ctx, new_barcode.id)?;
                barcode.ok_or(InsertBarcodeError::InternalError(
                    "Failed to read the just upserted barcode".to_string(),
                ))
            })
            .map_err(|err| err.to_inner_error())?;
        Ok(result)
    }
}

// Barcode is upserted by gtin
pub(crate) fn generate(
    connection: &StorageConnection,
    input: BarcodeInput,
) -> Result<BarcodeRow, RepositoryError> {
    let existing_barcode = BarcodeRepository::new(connection)
        .query_by_filter(BarcodeFilter::new().gtin(EqualFilter::equal_to(&input.gtin)))?
        .pop()
        .map(|r| r.barcode_row);

    let new_barcode = existing_barcode.unwrap_or(BarcodeRow {
        id: uuid(),
        gtin: input.gtin,
        ..Default::default()
    });

    Ok(BarcodeRow {
        item_id: input.item_id,
        pack_size: input.pack_size.or(new_barcode.pack_size),
        ..new_barcode
    })
}

pub struct BarcodeService {}
impl BarcodeServiceTrait for BarcodeService {}

fn validate(
    connection: &StorageConnection,
    store_id: &str,
    barcode: &BarcodeInput,
) -> Result<(), InsertBarcodeError> {
    if !check_item_exists(connection, store_id.to_string(), &barcode.item_id)? {
        return Err(InsertBarcodeError::InvalidItem);
    }

    Ok(())
}
