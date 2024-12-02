use chrono::Utc;
use repository::{
    asset::{Asset, AssetFilter, AssetRepository},
    asset_catalogue_item::{AssetCatalogueItemFilter, AssetCatalogueItemRepository},
    EqualFilter, RepositoryError, StringFilter,
};
use util::{GS1DataElement, GS1};

use crate::service_provider::ServiceContext;

#[derive(Debug)]
pub enum AssetFromGs1Error {
    ParseError,
    MissingPartNumber,
    MissingSerialNumber,
    NotFound,
    DatabaseError(RepositoryError),
}

impl From<RepositoryError> for AssetFromGs1Error {
    fn from(error: RepositoryError) -> Self {
        AssetFromGs1Error::DatabaseError(error)
    }
}

fn check_if_asset_already_exists(
    ctx: &ServiceContext,
    gs1: &GS1,
) -> Result<Option<Asset>, AssetFromGs1Error> {
    // Look up the item by the Serial Number & part number
    let serial_number = gs1
        .serial_number()
        .ok_or(AssetFromGs1Error::MissingSerialNumber)?;
    log::info!("Looking up asset by serial number: {}", serial_number);

    let mut filter = AssetFilter::new().serial_number(StringFilter::equal_to(&serial_number));

    let part_number = gs1
        .part_number()
        .ok_or(AssetFromGs1Error::MissingPartNumber)?;

    if let Some(asset_catalogue_id) = lookup_asset_catalogue_id_by_pqs_code(ctx, &part_number)? {
        filter = filter.catalogue_item_id(EqualFilter::equal_to(&asset_catalogue_id));
    }

    // Look up the item by the serial number & part number
    let repository = AssetRepository::new(&ctx.connection);

    let mut result = repository.query_by_filter(filter)?;

    // If we have duplicate serial numbers, we'll just return the first one, hopefully it's the right one :)
    // Reasons we might have duplicates:
    // 1. We don't have a part number to filter by and multiple assets have the same serial number
    // 2. The same asset has been imported in different sync sites there's no guarantee that serial numbers are unique across sync sites
    Ok(result.pop())
}

fn lookup_asset_catalogue_id_by_pqs_code(
    ctx: &ServiceContext,
    pqs_code: &str,
) -> Result<Option<String>, RepositoryError> {
    let repository = AssetCatalogueItemRepository::new(&ctx.connection);

    let mut result = repository
        .query_by_filter(AssetCatalogueItemFilter::new().code(StringFilter::equal_to(pqs_code)))?;

    let catalogue_item_id = result.pop().map(|item| item.id);

    Ok(catalogue_item_id)
}

fn create_draft_asset_from_gs1(ctx: &ServiceContext, gs1: GS1) -> Result<Asset, AssetFromGs1Error> {
    let mut asset = Asset::default();

    asset.serial_number = gs1.serial_number();

    // Default the asset Number to the part number and serial number
    asset.asset_number = Some(format!(
        "{}:{}",
        gs1.part_number().unwrap_or_default(),
        gs1.serial_number().unwrap_or_default()
    ));

    let (warranty_start, warranty_end) =
        gs1.warranty_dates().ok_or(AssetFromGs1Error::ParseError)?;

    asset.warranty_start = Some(warranty_start);
    asset.warranty_end = Some(warranty_end);

    if let Some(part_number) = gs1.part_number() {
        asset.catalogue_item_id = lookup_asset_catalogue_id_by_pqs_code(ctx, &part_number)?;
    }

    asset.installation_date = Some(Utc::now().naive_local().date()); // Default to today's date

    Ok(asset)
}

pub fn get_or_create_from_gs1_data(
    ctx: &ServiceContext,
    gs1_data: Vec<GS1DataElement>,
) -> Result<Asset, AssetFromGs1Error> {
    let gs1 = GS1::from_data_elements(gs1_data);

    // Look up the item by the serial number & part number
    if let Some(asset) = check_if_asset_already_exists(ctx, &gs1)? {
        return Ok(asset);
    }

    // If we don't find it, create a draft asset with the GS1 data
    create_draft_asset_from_gs1(ctx, gs1)
}

#[cfg(test)]
mod test {
    use crate::{asset::parse::get_or_create_from_gs1_data, service_provider::ServiceProvider};
    use repository::{
        mock::{mock_asset_a, mock_store_a, MockDataInserts},
        test_db::setup_all,
    };
    use util::GS1;

    #[actix_rt::test]
    async fn parse_asset_data_gs1_data() {
        let (_, _connection, connection_manager, _) = setup_all(
            "parse_asset_data_gs1_data",
            MockDataInserts::none().assets().locations(),
        )
        .await;

        let service_provider = ServiceProvider::new(connection_manager);
        let ctx = service_provider
            .context(mock_store_a().id, "".to_string())
            .unwrap();

        // Check we can create a draft asset from GS1 data

        let example_gs1 = "(01)00012345600012(11)241007(21)S12345678(241)E003/002(3121)82(3131)67(3111)63(8013)HBD 116(90)001(91)241007-310101(92){\"pqs\":\"https://apps.who.int/immunization_standards/vaccine_quality/pqs_catalogue/LinkPDF.aspx?UniqueID=3bf9439f-3316-49b4-845e-d50360f8280f&TipoDoc=DataSheet&ID=0\"}";

        let gs1 = GS1::from_human_readable_string(example_gs1.to_string()).unwrap();

        let draft_asset = get_or_create_from_gs1_data(&ctx, gs1.to_data_elements()).unwrap();

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

    #[actix_rt::test]
    async fn check_existing_asset_is_found() {
        let (_, _connection, connection_manager, _) = setup_all(
            "check_existing_asset_is_found",
            MockDataInserts::none().assets().locations(),
        )
        .await;

        let service_provider = ServiceProvider::new(connection_manager);
        let ctx = service_provider
            .context(mock_store_a().id, "".to_string())
            .unwrap();

        // Check we can find an existing asset by serial number and part number

        let gs1_data = format!(
            "(01)00012345600012(11)241007(21){}(241)E003/002",
            mock_asset_a().serial_number.unwrap()
        ); // Note E003/002 has to match the catalogue item ID for mock_asset_a

        let gs1 = GS1::from_human_readable_string(gs1_data).unwrap();

        let existing_asset = get_or_create_from_gs1_data(&ctx, gs1.to_data_elements()).unwrap();

        assert_eq!(existing_asset.id, mock_asset_a().id);
    }
}
