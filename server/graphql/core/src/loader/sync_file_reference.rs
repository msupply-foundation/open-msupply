use repository::{
    sync_file_reference::{SyncFileReference, SyncFileReferenceFilter, SyncFileReferenceSort},
    Pagination, RepositoryError, StorageConnectionManager, SyncFileReferenceSortField,
};
use repository::{EqualFilter, SyncFileReferenceRepository};

use async_graphql::dataloader::*;
use async_graphql::*;
use std::collections::HashMap;

pub struct SyncFileReferenceLoader {
    pub connection_manager: StorageConnectionManager,
}

#[async_trait::async_trait]
impl Loader<String> for SyncFileReferenceLoader {
    type Value = Vec<SyncFileReference>;
    type Error = RepositoryError;

    async fn load(&self, ids: &[String]) -> Result<HashMap<String, Self::Value>, Self::Error> {
        let connection = self.connection_manager.connection()?;
        let repo = SyncFileReferenceRepository::new(&connection);

        let sync_file_references = repo.query(
            Pagination::all(),
            Some(
                SyncFileReferenceFilter::new()
                    .record_id(EqualFilter::equal_any(ids.to_owned()))
                    .is_deleted(false),
            ),
            Some(SyncFileReferenceSort {
                key: SyncFileReferenceSortField::FileName,
                desc: Some(false),
            }),
        )?;

        let mut map: HashMap<String, Vec<SyncFileReference>> = HashMap::new();

        for sync_file_reference in sync_file_references {
            let asset_id = sync_file_reference
                .sync_file_reference_row
                .record_id
                .clone();
            let list = map
                .entry(asset_id)
                .or_insert_with(|| Vec::<SyncFileReference>::new());
            list.push(sync_file_reference);
        }

        Ok(map)

        // Ok(result
        //     .into_iter()
        //     .map(|sync_file_reference| {
        //         (
        //             sync_file_reference.sync_file_reference_row.id.clone(),
        //             sync_file_reference,
        //         )
        //     })
        //     .collect())

        //     for location in locations {
        //         let asset_id = asset_ids_by_location
        //             .get(&location.location_row.id)
        //             .unwrap_or(&"".to_string())
        //             .to_owned();

        //         let list = map
        //             .entry(asset_id)
        //             .or_insert_with(|| Vec::<Location>::new());
        //         list.push(location);
        //     }

        // let sync_file_references =
        //     sync_file_reference_repo.query_by_filter(SyncFileReferenceFilter::new().id(
        //         EqualFilter::equal_any(ids.iter().map(String::clone).collect()),
        //     ))?;

        // let mut asset_ids_by_sync_file_reference: HashMap<String, String> = HashMap::new();
        // for sync_file_reference in sync_file_references {
        //     asset_ids_by_sync_file_reference.insert(sync_file_reference.id, location.record_id);
        // }

        // let locations = location_repo.query_by_filter(LocationFilter::new().id(
        //     EqualFilter::equal_any(asset_ids_by_location.clone().into_keys().collect()),
        // ))?;

        // let mut map: HashMap<String, Vec<Location>> = HashMap::new();
        // for location in locations {
        //     let asset_id = asset_ids_by_location
        //         .get(&location.location_row.id)
        //         .unwrap_or(&"".to_string())
        //         .to_owned();

        //     let list = map
        //         .entry(asset_id)
        //         .or_insert_with(|| Vec::<Location>::new());
        //     list.push(location);
        // }

        // Ok(map)
    }
}

// #[cfg(test)]
// mod tests {
//     use async_graphql::dataloader::Loader;
//     use repository::{
//         asset_internal_location_row::AssetInternalLocationRow,
//         location::Location,
//         mock::{
//             mock_asset_a, mock_asset_b, mock_location_1, mock_location_2, mock_location_3,
//             MockDataInserts,
//         },
//         test_db, Upsert,
//     };

//     use crate::loader::SyncFileReferenceLoader;

//     #[tokio::test]
//     async fn asset_location_loader() {
//         // Prepare
//         let (_, storage_connection, connection_manager, _) = test_db::setup_all(
//             "asset_location_loader",
//             MockDataInserts::none().assets().locations(),
//         )
//         .await;

//         // add asset internal location to asset_a

//         let asset_internal_location_row = &AssetInternalLocationRow {
//             id: "asset_location_id".to_string(),
//             asset_id: mock_asset_a().id,
//             location_id: mock_location_1().id,
//         };

//         let _result = asset_internal_location_row.upsert_sync(&storage_connection);

//         let loader = SyncFileReferenceLoader { connection_manager };

//         // Check location exists on asset_a

//         let ids: &[String] = &[mock_asset_a().id, mock_asset_b().id];

//         let result: std::collections::HashMap<String, Vec<Location>> =
//             loader.load(ids).await.unwrap();

//         assert_eq!(
//             result.get(&mock_asset_a().id),
//             Some(&vec![Location {
//                 location_row: mock_location_1()
//             }])
//         );

//         // Check loader returns multiple locations

//         let asset_internal_location_row = &AssetInternalLocationRow {
//             id: "asset_location_2_id".to_string(),
//             asset_id: mock_asset_a().id,
//             location_id: mock_location_2().id,
//         };

//         let _result = asset_internal_location_row.upsert_sync(&storage_connection);

//         let result: std::collections::HashMap<String, Vec<Location>> =
//             loader.load(ids).await.unwrap();

//         let mut asset_1_locations: Vec<Location> =
//             result.get(&mock_asset_a().id).unwrap().to_owned();

//         asset_1_locations
//             .sort_by(|a, b| a.location_row.id.partial_cmp(&b.location_row.id).unwrap());

//         assert_eq!(
//             asset_1_locations,
//             vec![
//                 Location {
//                     location_row: mock_location_1()
//                 },
//                 Location {
//                     location_row: mock_location_2()
//                 }
//             ]
//         );

//         // add asset internal location to asset_b

//         let asset_internal_location_row = &AssetInternalLocationRow {
//             id: "asset_location_3_id".to_string(),
//             asset_id: mock_asset_b().id,
//             location_id: mock_location_3().id,
//         };

//         let _result = asset_internal_location_row.upsert_sync(&storage_connection);

//         let result: std::collections::HashMap<String, Vec<Location>> =
//             loader.load(ids).await.unwrap();

//         // Check call for asset 1 only returns asset 1's locations

//         let mut asset_1_locations: Vec<Location> =
//             result.get(&mock_asset_a().id).unwrap().to_owned();

//         asset_1_locations
//             .sort_by(|a, b| a.location_row.id.partial_cmp(&b.location_row.id).unwrap());

//         assert_eq!(
//             asset_1_locations,
//             vec![
//                 Location {
//                     location_row: mock_location_1()
//                 },
//                 Location {
//                     location_row: mock_location_2()
//                 }
//             ]
//         );

//         // Check call for asset 2 only returns asset 2's location

//         let asset_2_locations: Vec<Location> = result.get(&mock_asset_b().id).unwrap().to_owned();

//         assert_eq!(
//             asset_2_locations,
//             vec![Location {
//                 location_row: mock_location_3()
//             },]
//         );
//     }
// }
