use repository::{
    Barcode, BarcodeFilter, BarcodeRepository, BarcodeRow, BarcodeSort, EqualFilter,
    PaginationOption, RepositoryError, StorageConnection, StorageConnectionManager,
};
use util::uuid::uuid;

use crate::{item::check_item_exists, service_provider::ServiceContext};

use super::{get_default_pagination, i64_to_u32, ListError, ListResult};

pub const MAX_LIMIT: u32 = 5000;
pub const MIN_LIMIT: u32 = 1;

pub struct InsertResult {
    pub id: String,
    pub value: String,
    pub item_id: String,
    pub pack_size: Option<i32>,
}

pub struct BarcodeInput {
    pub value: String,
    pub item_id: String,
    pub pack_size: Option<i32>,
}

#[derive(Debug, PartialEq)]
pub enum InsertBarcodeError {
    DatabaseError(RepositoryError),
    InternalError(String),
    BarcodeAlreadyExists,
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

    fn get_barcode_by_value(
        &self,
        ctx: &ServiceContext,
        value: &str,
    ) -> Result<Option<Barcode>, RepositoryError> {
        let repository = BarcodeRepository::new(&ctx.connection);

        Ok(repository
            .query_by_filter(BarcodeFilter::new().value(EqualFilter::equal_to(value)))?
            .pop())
    }

    fn insert_barcode(
        &self,
        ctx: &ServiceContext,
        barcode: &BarcodeInput,
    ) -> Result<Barcode, InsertBarcodeError> {
        let result = ctx
            .connection
            .transaction_sync(|con| {
                validate(con, &ctx.store_id, &barcode)?;
                let barcode_repository = BarcodeRepository::new(con);
                let new_barcode = BarcodeRow {
                    id: uuid(),
                    value: barcode.value.clone(),
                    item_id: barcode.item_id.clone(),
                    pack_size: barcode.pack_size,
                    manufacturer_id: None,
                    parent_id: None,
                };
                barcode_repository.upsert_one(&new_barcode)?;
                let barcode = self.get_barcode(ctx, new_barcode.id)?;
                barcode.ok_or(InsertBarcodeError::InternalError(
                    "Failed to read the just inserted barcode".to_string(),
                ))
            })
            .map_err(|err| err.to_inner_error())?;
        Ok(result)
    }
}
pub struct BarcodeService {}
impl BarcodeServiceTrait for BarcodeService {}

fn check_barcode_does_not_exist(
    connection: &StorageConnection,
    barcode: &BarcodeInput,
) -> Result<bool, RepositoryError> {
    let mut filter = BarcodeFilter::new().value(EqualFilter::equal_to(&barcode.value));

    if let Some(pack_size) = barcode.pack_size {
        filter = filter.pack_size(EqualFilter::equal_to_i32(pack_size))
    }

    let count = BarcodeRepository::new(connection).count(Some(filter))?;

    Ok(count == 0)
}

fn validate(
    connection: &StorageConnection,
    store_id: &str,
    barcode: &BarcodeInput,
) -> Result<(), InsertBarcodeError> {
    if !check_barcode_does_not_exist(connection, barcode)? {
        return Err(InsertBarcodeError::BarcodeAlreadyExists);
    }

    if !check_item_exists(connection, store_id.to_string(), &barcode.item_id)? {
        return Err(InsertBarcodeError::InvalidItem);
    }

    Ok(())
}
