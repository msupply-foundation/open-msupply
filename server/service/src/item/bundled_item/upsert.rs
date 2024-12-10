use repository::{
    item_variant::{
        bundled_item::{BundledItemFilter, BundledItemRepository},
        bundled_item_row::{BundledItemRow, BundledItemRowRepository},
    },
    EqualFilter, RepositoryError, StorageConnection,
};

use crate::{check_item_variant_exists, service_provider::ServiceContext};

#[derive(PartialEq, Debug)]
pub enum UpsertBundledItemError {
    CreatedRecordNotFound,
    PrincipalItemDoesNotExist,
    BundledItemDoesNotExist,
    DuplicateBundledItem,
    CanNotNestBundledItems,
    CanNotBundleItemWithItself,
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
    let principal_item_variant =
        match check_item_variant_exists(connection, &input.principal_item_variant_id)? {
            Some(principal_item_variant) => principal_item_variant,
            None => return Err(UpsertBundledItemError::PrincipalItemDoesNotExist),
        };

    let bundled_item_variant =
        match check_item_variant_exists(connection, &input.bundled_item_variant_id)? {
            Some(bundled_item_variant) => bundled_item_variant,
            None => return Err(UpsertBundledItemError::BundledItemDoesNotExist),
        };

    if input.principal_item_variant_id == input.bundled_item_variant_id {
        return Err(UpsertBundledItemError::CanNotBundleItemWithItself);
    }

    // Check that item_ids are not the same
    // Technically this has a problem if the item is merged but should be very rare...
    if principal_item_variant.item_link_id == bundled_item_variant.item_link_id {
        return Err(UpsertBundledItemError::CanNotBundleItemWithItself);
    }

    // Check for existing bundled item pair that matches this one
    let count = BundledItemRepository::new(connection).count(Some(
        BundledItemFilter::new()
            .principal_item_variant_id(EqualFilter::equal_to(&input.principal_item_variant_id))
            .bundled_item_variant_id(EqualFilter::equal_to(&input.bundled_item_variant_id))
            .id(EqualFilter::not_equal_to(&input.id)),
    ))?;

    if count > 0 {
        return Err(UpsertBundledItemError::DuplicateBundledItem);
    }

    // Check for nested bundled items
    let count = BundledItemRepository::new(connection)
        .count(Some(BundledItemFilter::new().principal_item_variant_id(
            EqualFilter::equal_to(&input.bundled_item_variant_id),
        )))?;

    if count > 0 {
        return Err(UpsertBundledItemError::CanNotNestBundledItems);
    }

    let count = BundledItemRepository::new(connection)
        .count(Some(BundledItemFilter::new().bundled_item_variant_id(
            EqualFilter::equal_to(&input.principal_item_variant_id),
        )))?;

    if count > 0 {
        return Err(UpsertBundledItemError::CanNotNestBundledItems);
    }

    Ok(())
}
