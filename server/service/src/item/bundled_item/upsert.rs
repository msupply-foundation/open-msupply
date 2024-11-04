use repository::{
    item_variant::bundled_item_row::{BundledItemRow, BundledItemRowRepository},
    RepositoryError, StorageConnection,
};

use crate::{check_item_variant_exists, service_provider::ServiceContext};

#[derive(PartialEq, Debug)]
pub enum UpsertBundledItemError {
    CreatedRecordNotFound,
    PrincipalItemDoesNotExist,
    BundledItemDoesNotExist,
    DatabaseError(RepositoryError),
}

#[derive(Default, Clone)]
pub struct UpsertBundledItem {
    pub id: String,
    pub principal_item_variant_id: String,
    pub bundled_item_variant_id: String,
    pub ratio: f64,
}

pub fn upsert_bundled_item(
    ctx: &ServiceContext,
    input: UpsertBundledItem,
) -> Result<BundledItemRow, UpsertBundledItemError> {
    let bundled_item = ctx
        .connection
        .transaction_sync(|connection| {
            validate(connection, &input)?;
            let new_bundled_item = generate(input.clone());
            let repo = BundledItemRowRepository::new(connection);

            repo.upsert_one(&new_bundled_item)?;

            repo.find_one_by_id(&new_bundled_item.id)?
                .ok_or(UpsertBundledItemError::CreatedRecordNotFound)
        })
        .map_err(|error| error.to_inner_error())?;
    Ok(bundled_item)
}

impl From<RepositoryError> for UpsertBundledItemError {
    fn from(error: RepositoryError) -> Self {
        UpsertBundledItemError::DatabaseError(error)
    }
}

pub fn generate(
    UpsertBundledItem {
        id,
        principal_item_variant_id,
        bundled_item_variant_id,
        ratio,
    }: UpsertBundledItem,
) -> BundledItemRow {
    BundledItemRow {
        id,
        principal_item_variant_id,
        bundled_item_variant_id,
        ratio,
        deleted_datetime: None,
    }
}

fn validate(
    connection: &StorageConnection,
    input: &UpsertBundledItem,
) -> Result<(), UpsertBundledItemError> {
    if !check_item_variant_exists(connection, &input.principal_item_variant_id)? {
        return Err(UpsertBundledItemError::PrincipalItemDoesNotExist);
    }

    if !check_item_variant_exists(connection, &input.bundled_item_variant_id)? {
        return Err(UpsertBundledItemError::BundledItemDoesNotExist);
    }

    Ok(())
}
