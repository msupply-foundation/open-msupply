use crate::{
    activity_log::activity_log_entry, service_provider::ServiceContext, SingleRecordError,
};
use repository::{
    asset_catalogue_item_property::{
        AssetCatalogueItemPropertyRepository, AssetCataloguePropertyItemFilter,
    },
    asset_catalogue_item_property_row::{
        AssetCatalogueItemPropertyRow, AssetCatalogueItemPropertyRowRepository,
    },
    ActivityLogType, EqualFilter, RepositoryError, StorageConnection,
};

#[derive(PartialEq, Debug)]
pub enum InsertAssetCatalogueItemPropertyError {
    ItemAlreadyExists,
    CreatedRecordNotFound,
    DatabaseError(RepositoryError),
}

#[derive(PartialEq, Debug, Clone)]
pub struct InsertAssetCatalogueItemProperty {
    pub id: String,
    pub catalogue_item_id: String,
    pub catalogue_property_id: String,
    pub value_string: Option<String>,
    pub value_int: Option<i32>,
    pub value_float: Option<f64>,
    pub value_bool: Option<bool>,
}

fn get_asset_catalogue_item_property(
    connection: &StorageConnection,
    id: String,
) -> Result<Option<AssetCatalogueItemPropertyRow>, RepositoryError> {
    let repository = AssetCatalogueItemPropertyRepository::new(connection);
    let mut result = repository.query(Some(
        AssetCataloguePropertyItemFilter::new().id(EqualFilter::equal_to(&id)),
    ))?;
    Ok(result.pop())
}

pub fn insert_asset_catalogue_item_property(
    ctx: &ServiceContext,
    input: InsertAssetCatalogueItemProperty,
) -> Result<AssetCatalogueItemPropertyRow, InsertAssetCatalogueItemPropertyError> {
    let asset_catalogue_item_property = ctx
        .connection
        .transaction_sync(|connection| {
            validate(&input, connection)?;
            let new_item = generate(input);
            AssetCatalogueItemPropertyRowRepository::new(connection).upsert_one(&new_item)?;

            activity_log_entry(
                ctx,
                ActivityLogType::AssetCatalogueItemCreated,
                Some(new_item.id.clone()),
                None,
                None,
            )?;

            get_asset_catalogue_item_property(&ctx.connection, new_item.id)
                .map_err(InsertAssetCatalogueItemPropertyError::from)
        })
        .map_err(|error| error.to_inner_error())?;

    asset_catalogue_item_property
        .ok_or(InsertAssetCatalogueItemPropertyError::CreatedRecordNotFound)
}

pub fn validate(
    input: &InsertAssetCatalogueItemProperty,
    connection: &StorageConnection,
) -> Result<(), InsertAssetCatalogueItemPropertyError> {
    let repo = AssetCatalogueItemPropertyRepository::new(connection);

    // Check the item does not already exist
    if repo.count(Some(
        AssetCataloguePropertyItemFilter::new()
            .catalogue_item_id(EqualFilter::equal_to(&input.catalogue_item_id))
            .catalogue_property_id(EqualFilter::equal_to(&input.catalogue_property_id)),
    ))? > 0
    {
        return Err(InsertAssetCatalogueItemPropertyError::ItemAlreadyExists);
    }

    Ok(())
}

pub fn generate(
    InsertAssetCatalogueItemProperty {
        id,
        catalogue_item_id,
        catalogue_property_id,
        value_string,
        value_int,
        value_float,
        value_bool,
    }: InsertAssetCatalogueItemProperty,
) -> AssetCatalogueItemPropertyRow {
    AssetCatalogueItemPropertyRow {
        id,
        catalogue_item_id,
        catalogue_property_id,
        value_string,
        value_int,
        value_float,
        value_bool,
    }
}

impl From<RepositoryError> for InsertAssetCatalogueItemPropertyError {
    fn from(error: RepositoryError) -> Self {
        InsertAssetCatalogueItemPropertyError::DatabaseError(error)
    }
}

impl From<SingleRecordError> for InsertAssetCatalogueItemPropertyError {
    fn from(error: SingleRecordError) -> Self {
        use InsertAssetCatalogueItemPropertyError::*;
        match error {
            SingleRecordError::DatabaseError(error) => DatabaseError(error),
            SingleRecordError::NotFound(_) => CreatedRecordNotFound,
        }
    }
}
