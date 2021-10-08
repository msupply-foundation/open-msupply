mod graphql {
    use crate::graphql::assert_gql_query;
    use remote_server::{
        database::{
            mock::{mock_name_store_joins, mock_names, mock_stores},
            repository::{
                get_repositories, NameRepository, NameStoreJoinRepository,
                StorageConnectionManager, StoreRepository,
            },
            schema::{NameRow, NameStoreJoinRow, StoreRow},
        },
        util::test_db,
    };
    use serde_json::json;

    #[actix_rt::test]
    async fn test_graphql_names_query() {
        let settings = test_db::get_test_settings("omsupply-database-gql-names-query");
        test_db::setup(&settings.database).await;
        let repositories = get_repositories(&settings).await;
        let connection_manager = repositories.get::<StorageConnectionManager>().unwrap();
        let connection = connection_manager.connection().unwrap();

        // setup
        let name_repository = NameRepository::new(&connection);
        let store_repository = StoreRepository::new(&connection);
        let name_store_repository = NameStoreJoinRepository::new(&connection);
        let mock_names: Vec<NameRow> = mock_names();
        let mock_stores: Vec<StoreRow> = mock_stores();
        let mock_name_store_joins: Vec<NameStoreJoinRow> = mock_name_store_joins();
        for name in &mock_names {
            name_repository.insert_one(&name).await.unwrap();
        }
        for store in &mock_stores {
            store_repository.insert_one(&store).await.unwrap();
        }
        for name_store_join in &mock_name_store_joins {
            name_store_repository.upsert_one(name_store_join).unwrap();
        }

        let query = r#"{
            names{
                nodes{
                    id,
                }
            }
        }"#;
        let expected = json!({
          "names": {
              "nodes": mock_names.iter().map(|name| json!({
                "id": name.id,
              })).collect::<serde_json::Value>(),
            }
          }
        );
        assert_gql_query(&settings, query, &None, &expected).await;

        // test sorting
        let query = r#"query Names($sort: [NameSortInput]) {
          names(sort: $sort){
              nodes{
                  id,
              }
          }
        }"#;
        let variables = Some(json!({
          "sort": [{
            "key": "NAME",
            "desc": true,
          }]
        }));
        let mut sorted_mock_names = mock_names.clone();
        sorted_mock_names.sort_by(|a, b| b.name.cmp(&a.name));
        let expected = json!({
          "names": {
              "nodes": sorted_mock_names.iter().map(|name| json!({
                "id": name.id,
              })).collect::<serde_json::Value>(),
            }
          }
        );
        assert_gql_query(&settings, query, &variables, &expected).await;
    }
}
