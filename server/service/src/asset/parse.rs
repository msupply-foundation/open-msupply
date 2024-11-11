use repository::{
    asset::{Asset, AssetFilter, AssetRepository},
    asset_catalogue_item::{AssetCatalogueItemFilter, AssetCatalogueItemRepository},
    EqualFilter, RepositoryError, StringFilter,
};
use util::{GS1ParseError, GS1};

use crate::service_provider::ServiceContext;

#[derive(Debug)]
pub enum ScannedDataParseError {
    ParseError,
    NotFound,
    DatabaseError(RepositoryError),
}

impl From<RepositoryError> for ScannedDataParseError {
    fn from(error: RepositoryError) -> Self {
        ScannedDataParseError::DatabaseError(error)
    }
}

fn lookup_asset_by_id(ctx: &ServiceContext, id: String) -> Result<Asset, ScannedDataParseError> {
    let repository = AssetRepository::new(&ctx.connection);

    let mut result =
        repository.query_by_filter(AssetFilter::new().id(EqualFilter::equal_to(&id)))?;

    if let Some(record) = result.pop() {
        Ok(record)
    } else {
        Err(ScannedDataParseError::NotFound)
    }
}

fn lookup_asset_by_serial_number(
    ctx: &ServiceContext,
    id: String,
) -> Result<Option<Asset>, RepositoryError> {
    let repository = AssetRepository::new(&ctx.connection);

    let mut result =
        repository.query_by_filter(AssetFilter::new().id(EqualFilter::equal_to(&id)))?;

    Ok(result.pop())
}

fn lookup_asset_catalogue_id_by_pqs_code(
    ctx: &ServiceContext,
    pqs_code: String,
) -> Result<Option<String>, RepositoryError> {
    let repository = AssetCatalogueItemRepository::new(&ctx.connection);

    let mut result = repository
        .query_by_filter(AssetCatalogueItemFilter::new().code(StringFilter::equal_to(&pqs_code)))?;

    let catalogue_item_id = result.pop().map(|item| item.id);

    Ok(catalogue_item_id)
}

fn create_draft_asset_from_gs1(
    ctx: &ServiceContext,
    gs1: GS1,
) -> Result<Asset, ScannedDataParseError> {
    let mut asset = Asset::default();

    asset.serial_number = gs1.serial_number();
    let (warranty_start, warranty_end) = gs1
        .warranty_dates()
        .ok_or(ScannedDataParseError::ParseError)?;

    asset.warranty_start = Some(warranty_start);
    asset.warranty_end = Some(warranty_end);

    if let Some(part_number) = gs1.part_number() {
        asset.catalogue_item_id = lookup_asset_catalogue_id_by_pqs_code(ctx, part_number)?;
    }

    Ok(asset)
}

pub fn parse_from_scanned_data(
    ctx: &ServiceContext,
    scanned_data: String,
) -> Result<Asset, ScannedDataParseError> {
    // check if the scanned data starts with '('
    // If it does not, we check if it's an ID query from our own barcodes

    match scanned_data.chars().nth(0) {
        Some('(') => (),
        _ => return lookup_asset_by_id(ctx, scanned_data),
    }

    let gs1 = GS1::parse(scanned_data).map_err(|e| match e {
        GS1ParseError::InvalidFormat => ScannedDataParseError::ParseError,
    })?;

    // Look up the item by the Serial Number

    let serial_number = gs1
        .serial_number()
        .ok_or(ScannedDataParseError::ParseError)?;

    // Look up the item by the serial number
    if let Some(asset) = lookup_asset_by_serial_number(ctx, serial_number)? {
        return Ok(asset);
    }

    // If we don't find it, create a draft asset with the GS1 data
    create_draft_asset_from_gs1(ctx, gs1)
}

#[cfg(test)]
mod test {
    use crate::{asset::parse::parse_from_scanned_data, service_provider::ServiceProvider};
    use repository::{
        mock::{mock_asset_a, mock_store_a, MockDataInserts},
        test_db::setup_all,
    };

    #[actix_rt::test]
    async fn parse_asset_data_internal_id() {
        let (_, _connection, connection_manager, _) = setup_all(
            "parse_asset_data_internal_id",
            MockDataInserts::none().assets().locations(),
        )
        .await;

        let service_provider = ServiceProvider::new(connection_manager, "app_data");
        let ctx = service_provider
            .context(mock_store_a().id, "".to_string())
            .unwrap();

        // Check we can find an asset by ID if that's the input
        let result = parse_from_scanned_data(&ctx, mock_asset_a().id.clone());
        let asset = result.unwrap();

        assert_eq!(asset.id, mock_asset_a().id);
    }

    #[actix_rt::test]
    async fn parse_asset_data_gs1_data() {
        let (_, _connection, connection_manager, _) = setup_all(
            "parse_asset_data_gs1_data",
            MockDataInserts::none().assets().locations(),
        )
        .await;

        let service_provider = ServiceProvider::new(connection_manager, "app_data");
        let ctx = service_provider
            .context(mock_store_a().id, "".to_string())
            .unwrap();

        // Check we can create a draft asset from GS1 data

        let example_gs1 = "(01)00012345600012(11)241007(21)S12345678(241)E003/002(3121)82(3131)67(3111)63(8013)HBD 116(90)001(91)241007-310101(92){\"pqs\":\"https://apps.who.int/immunization_standards/vaccine_quality/pqs_catalogue/LinkPDF.aspx?UniqueID=3bf9439f-3316-49b4-845e-d50360f8280f&TipoDoc=DataSheet&ID=0\"}";

        let draft_asset = parse_from_scanned_data(&ctx, example_gs1.to_string()).unwrap();

        assert_eq!(draft_asset.id, ""); // Draft asset has an empty ID
        assert_eq!(draft_asset.serial_number, Some("S12345678".to_string()));
        assert_eq!(
            draft_asset.catalogue_item_id,
            Some("c7d48b5c-74b2-4077-94f5-2b25d67a447b".to_string())
        ); // this is looked up from the PQS code E003/002

        assert_eq!(
            draft_asset.warranty_start,
            Some("2024-10-07".parse().unwrap())
        );
        assert_eq!(
            draft_asset.warranty_end,
            Some("2031-01-01".parse().unwrap())
        );
    }
}
