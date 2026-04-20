use repository::{
    ancillary_item::{
        validate_ancillary_item_link, AncillaryItemFilter, AncillaryItemRepository,
        AncillaryItemValidationError,
    },
    ancillary_item_row::{AncillaryItemRow, AncillaryItemRowRepository},
    EqualFilter, ItemLinkRowRepository, RepositoryError, StorageConnection,
};

use crate::{service_provider::ServiceContext, sync::CentralServerConfig};

#[derive(PartialEq, Debug)]
pub enum UpsertAncillaryItemError {
    /// Ancillary item links can only be created or updated on the central server
    NotCentralServer,
    PrincipalItemDoesNotExist,
    AncillaryItemDoesNotExist,
    DuplicateAncillaryItem,
    CanNotLinkItemWithItself,
    /// Adding this link would create a cycle through existing ancillary item links
    CycleDetected,
    /// Adding this link would push a chain past the maximum allowed depth
    MaxDepthExceeded { max: u32, actual: u32 },
    /// Both `item_quantity` and `ancillary_quantity` must be > 0
    RatioMustBePositive,
    CreatedRecordNotFound,
    DatabaseError(RepositoryError),
}

#[derive(Default, Clone, Debug)]
pub struct UpsertAncillaryItem {
    pub id: String,
    pub item_link_id: String,
    pub ancillary_item_link_id: String,
    /// Left-hand side of the user-entered `x:y` ratio (principal count).
    pub item_quantity: f64,
    /// Right-hand side of the user-entered `x:y` ratio (ancillary count).
    pub ancillary_quantity: f64,
}

pub fn upsert_ancillary_item(
    ctx: &ServiceContext,
    input: UpsertAncillaryItem,
) -> Result<AncillaryItemRow, UpsertAncillaryItemError> {
    let row = ctx
        .connection
        .transaction_sync(|connection| {
            validate(connection, &input)?;
            let new_row = generate(input.clone());
            let repo = AncillaryItemRowRepository::new(connection);

            repo.upsert_one(&new_row)?;

            repo.find_one_by_id(&new_row.id)?
                .ok_or(UpsertAncillaryItemError::CreatedRecordNotFound)
        })
        .map_err(|error| error.to_inner_error())?;
    Ok(row)
}

impl From<RepositoryError> for UpsertAncillaryItemError {
    fn from(error: RepositoryError) -> Self {
        UpsertAncillaryItemError::DatabaseError(error)
    }
}

impl From<AncillaryItemValidationError> for UpsertAncillaryItemError {
    fn from(error: AncillaryItemValidationError) -> Self {
        match error {
            AncillaryItemValidationError::SelfLink => {
                UpsertAncillaryItemError::CanNotLinkItemWithItself
            }
            AncillaryItemValidationError::Cycle => UpsertAncillaryItemError::CycleDetected,
            AncillaryItemValidationError::DepthExceeded { max, actual } => {
                UpsertAncillaryItemError::MaxDepthExceeded { max, actual }
            }
            AncillaryItemValidationError::DatabaseError(e) => {
                UpsertAncillaryItemError::DatabaseError(e)
            }
        }
    }
}

fn generate(
    UpsertAncillaryItem {
        id,
        item_link_id,
        ancillary_item_link_id,
        item_quantity,
        ancillary_quantity,
    }: UpsertAncillaryItem,
) -> AncillaryItemRow {
    AncillaryItemRow {
        id,
        item_link_id,
        ancillary_item_link_id,
        item_quantity,
        ancillary_quantity,
        deleted_datetime: None,
    }
}

fn validate(
    connection: &StorageConnection,
    input: &UpsertAncillaryItem,
) -> Result<(), UpsertAncillaryItemError> {
    if !CentralServerConfig::is_central_server() {
        return Err(UpsertAncillaryItemError::NotCentralServer);
    }

    if input.item_quantity <= 0.0 || input.ancillary_quantity <= 0.0 {
        return Err(UpsertAncillaryItemError::RatioMustBePositive);
    }

    let item_link_repo = ItemLinkRowRepository::new(connection);
    if item_link_repo.find_one_by_id(&input.item_link_id)?.is_none() {
        return Err(UpsertAncillaryItemError::PrincipalItemDoesNotExist);
    }
    if item_link_repo
        .find_one_by_id(&input.ancillary_item_link_id)?
        .is_none()
    {
        return Err(UpsertAncillaryItemError::AncillaryItemDoesNotExist);
    }

    // Self-link, cycle and depth checks (also reused at order time as a cheap precaution)
    let excluding_id = if AncillaryItemRowRepository::new(connection)
        .find_one_by_id(&input.id)?
        .is_some()
    {
        Some(input.id.as_str())
    } else {
        None
    };
    validate_ancillary_item_link(
        connection,
        &input.item_link_id,
        &input.ancillary_item_link_id,
        excluding_id,
    )?;

    // No two undeleted rows for the same (principal, ancillary) pair — otherwise we wouldn't know
    // which ratio to apply at order time.
    let duplicate_count = AncillaryItemRepository::new(connection).count(Some(
        AncillaryItemFilter::new()
            .item_link_id(EqualFilter::equal_to(input.item_link_id.clone()))
            .ancillary_item_link_id(EqualFilter::equal_to(input.ancillary_item_link_id.clone()))
            .id(EqualFilter::not_equal_to(input.id.clone())),
    ))?;
    if duplicate_count > 0 {
        return Err(UpsertAncillaryItemError::DuplicateAncillaryItem);
    }

    Ok(())
}
