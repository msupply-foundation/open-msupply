// #![allow(where_clauses_object_safety)]

// mod graphql {
//     use crate::graphql::assert_gql_query;
//     use remote_server::{
//         database::{
//             mock::{mock_names, mock_requisitions, mock_stores},
//             repository::{
//                 get_repositories, NameRepository, RequisitionRepository, StorageConnectionManager,
//                 StoreRepository,
//             },
//             schema::{NameRow, RequisitionRow, StoreRow},
//         },
//         util::test_db,
//     };

//     use serde_json::json;

//     #[actix_rt::test]
//     async fn get_requisition_by_id_is_success() {
//         let mock_names: Vec<NameRow> = mock_names();
//         let mock_stores: Vec<StoreRow> = mock_stores();
//         let mock_requisitions: Vec<RequisitionRow> = mock_requisitions();

//         let settings = test_db::get_test_settings("omsupply-database-simple-repository-test");

//         // Initialise a new test database.
//         test_db::setup(&settings.database).await;

//         let repositories = get_repositories(&settings).await;
//         let connection_manager = repositories.get::<StorageConnectionManager>().unwrap();
//         let connection = connection_manager.connection().unwrap();

//         let name_repository = NameRepository::new(&connection);
//         let store_repository = StoreRepository::new(&connection);
//         let requisition_repository = RequisitionRepository::new(&connection);

//         for name in mock_names {
//             name_repository.insert_one(&name).await.unwrap();
//         }

//         for store in mock_stores {
//             store_repository.insert_one(&store).await.unwrap();
//         }

//         for requisition in mock_requisitions {
//             requisition_repository.insert_one(&requisition).unwrap();
//         }

//         let query = r#"query RequisitionId($id: String) {
//             requisition(id: $id){
//                 id
//             }
//         }"#;
//         let variables = Some(json!({
//           "id": "requisition_a"
//         }));
//         let expected = json!({
//             "requisition": {
//                 "id":"requisition_a"
//             }
//           }
//         );
//         assert_gql_query(&settings, query, &variables, &expected).await;
//     }
// }
