use std::collections::HashMap;

use repository::{
    asset::{Asset, AssetFilter, AssetRepository},
    EqualFilter, RepositoryError,
};
use util::{parse_gs1_string, GS1ParseError};

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

fn lookup_item_by_id(ctx: &ServiceContext, id: String) -> Result<Asset, ScannedDataParseError> {
    let repository = AssetRepository::new(&ctx.connection);

    let mut result =
        repository.query_by_filter(AssetFilter::new().id(EqualFilter::equal_to(&id)))?;

    if let Some(record) = result.pop() {
        Ok(record)
    } else {
        Err(ScannedDataParseError::NotFound)
    }
}

fn create_draft_asset_from_gs1(
    gs1: HashMap<String, String>,
) -> Result<Asset, ScannedDataParseError> {
    let mut asset = Asset::default();

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
        _ => return lookup_item_by_id(ctx, scanned_data),
    }

    let gs1 = parse_gs1_string(scanned_data).map_err(|e| match e {
        GS1ParseError::InvalidFormat => ScannedDataParseError::ParseError,
    })?;

    // Look up the item by the Serial Number

    // If we find it, return it

    // If we don't find it, create a draft asset with the GS1 data
    create_draft_asset_from_gs1(gs1)
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
            Some("ac08c366-fbd6-4a6a-85c3-f553e2932804".to_string())
        ); // this is looked up from the PQS code E003/002
        assert_eq!(draft_asset.store_id, Some(mock_store_a().id));
        assert_eq!(draft_asset.warranty_start, Some("241007".parse().unwrap()));
        assert_eq!(draft_asset.warranty_end, Some("310101".parse().unwrap()));
    }
}
