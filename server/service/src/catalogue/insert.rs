use crate::{
    activity_log::activity_log_entry, service_provider::ServiceContext, SingleRecordError,
};
use repository::{
    asset_catalogue_item::{AssetCatalogueItemFilter, AssetCatalogueItemRepository},
    asset_catalogue_item_row::{AssetCatalogueItemRow, AssetCatalogueItemRowRepository},
    ActivityLogType, EqualFilter, RepositoryError, StorageConnection, StringFilter,
};

use super::query_catalogue_item::get_asset_catalogue_item;

#[derive(PartialEq, Debug)]
pub enum InsertAssetCatalogueItemError {
    ItemAlreadyExists,
    CodeAlreadyExists,
    ManufacturerAndModelAlreadyExist,
    CreatedRecordNotFound,
    DatabaseError(RepositoryError),
}

#[derive(PartialEq, Debug, Clone)]
pub struct InsertAssetCatalogueItem {
    pub id: String,
    pub sub_catalogue: String,
    pub category_id: String,
    pub class_id: String,
    pub code: String,
    pub manufacturer: Option<String>,
    pub model: String,
    pub type_id: String,
    pub properties: Option<String>,
}

pub fn insert_asset_catalogue_item(
    ctx: &ServiceContext,
    input: InsertAssetCatalogueItem,
) -> Result<AssetCatalogueItemRow, InsertAssetCatalogueItemError> {
    let asset_item = ctx
        .connection
        .transaction_sync(|connection| {
            validate(&input, connection)?;
            let new_item = generate(input);
            AssetCatalogueItemRowRepository::new(connection).upsert_one(&new_item)?;

            activity_log_entry(
                ctx,
                ActivityLogType::AssetCatalogueItemCreated,
                Some(new_item.id.clone()),
                None,
                None,
            )?;

            get_asset_catalogue_item(&ctx.connection, new_item.id)
                .map_err(InsertAssetCatalogueItemError::from)
        })
        .map_err(|error| error.to_inner_error())?;

    asset_item.ok_or(InsertAssetCatalogueItemError::CreatedRecordNotFound)
}

pub fn validate(
    input: &InsertAssetCatalogueItem,
    connection: &StorageConnection,
) -> Result<(), InsertAssetCatalogueItemError> {
    let repo = AssetCatalogueItemRepository::new(connection);

    // Check the item does not already exist
    if repo.count(Some(
        AssetCatalogueItemFilter::new().id(EqualFilter::equal_to(&input.id)),
    ))? > 0
    {
        return Err(InsertAssetCatalogueItemError::ItemAlreadyExists);
    }

    // Check the code is unique
    if repo.count(Some(
        AssetCatalogueItemFilter::new().code(StringFilter::equal_to(&input.code)),
    ))? > 0
    {
        return Err(InsertAssetCatalogueItemError::CodeAlreadyExists);
    }

    // Check the manufacturer and model are unique
    if let Some(manufacturer) = &input.manufacturer {
        if repo.count(Some(
            AssetCatalogueItemFilter::new()
                .manufacturer(StringFilter::equal_to(manufacturer))
                .model(StringFilter::equal_to(&input.model)),
        ))? > 0
        {
            return Err(InsertAssetCatalogueItemError::ManufacturerAndModelAlreadyExist);
        }
    }

    Ok(())
}

pub fn generate(
    InsertAssetCatalogueItem {
        id,
        sub_catalogue,
        category_id,
        class_id,
        code,
        manufacturer,
        model,
        type_id,
        properties,
    }: InsertAssetCatalogueItem,
) -> AssetCatalogueItemRow {
    AssetCatalogueItemRow {
        id,
        sub_catalogue,
        category_id,
        class_id,
        code,
        manufacturer,
        model,
        type_id,
        properties,
        deleted_datetime: None,
    }
}

impl From<RepositoryError> for InsertAssetCatalogueItemError {
    fn from(error: RepositoryError) -> Self {
        InsertAssetCatalogueItemError::DatabaseError(error)
    }
}

impl From<SingleRecordError> for InsertAssetCatalogueItemError {
    fn from(error: SingleRecordError) -> Self {
        use InsertAssetCatalogueItemError::*;
        match error {
            SingleRecordError::DatabaseError(error) => DatabaseError(error),
            SingleRecordError::NotFound(_) => CreatedRecordNotFound,
        }
    }
}
