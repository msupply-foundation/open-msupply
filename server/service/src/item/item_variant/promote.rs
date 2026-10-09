use repository::{
    item_variant::{
        item_variant::{ItemVariant, ItemVariantFilter, ItemVariantRepository},
        item_variant_row::{ItemVariantRow, ItemVariantRowRepository},
    },
    ActivityLogType, EqualFilter, RepositoryError,
};

use crate::{activity_log::activity_log_entry_with_diff, service_provider::ServiceContext};

#[derive(PartialEq, Debug)]
pub enum PromoteItemVariantError {
    ItemVariantDoesNotExist,
    DatabaseError(RepositoryError),
}

impl From<RepositoryError> for PromoteItemVariantError {
    fn from(error: RepositoryError) -> Self {
        PromoteItemVariantError::DatabaseError(error)
    }
}

/// Makes an auto-created variant (one central created to hold a barcode) a real
/// one, so it shows in variant lists and pickers. Its id stays the same, so stock
/// and lines already linked to it stay linked. Promoting a real variant does
/// nothing.
pub fn promote_item_variant(
    ctx: &ServiceContext,
    id: &str,
) -> Result<ItemVariant, PromoteItemVariantError> {
    ctx.connection
        .transaction_sync(|connection| {
            let repo = ItemVariantRowRepository::new(connection);
            let existing = repo
                .find_one_by_id(id)?
                .filter(|variant| variant.deleted_datetime.is_none())
                .ok_or(PromoteItemVariantError::ItemVariantDoesNotExist)?;

            if existing.is_auto_created {
                let promoted = ItemVariantRow {
                    is_auto_created: false,
                    ..existing.clone()
                };
                repo.upsert_one(&promoted)?;
                activity_log_entry_with_diff(
                    ctx,
                    ActivityLogType::ItemVariantUpdated,
                    Some(promoted.item_id.clone()),
                    Some(&existing),
                    &promoted,
                )?;
            }

            ItemVariantRepository::new(connection)
                .query_one(ItemVariantFilter::new().id(EqualFilter::equal_to(id.to_string())))?
                .ok_or(PromoteItemVariantError::DatabaseError(
                    RepositoryError::NotFound,
                ))
        })
        .map_err(|error| error.to_inner_error())
}
