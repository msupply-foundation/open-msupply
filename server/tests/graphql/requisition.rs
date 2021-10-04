#![allow(where_clauses_object_safety)]

mod graphql {
    use remote_server::{
        database::{
            loader::get_loaders,
            mock::{mock_names, mock_requisitions, mock_stores},
            repository::{
                get_repositories, NameRepository, RequisitionRepository, StorageConnectionManager,
                StoreRepository,
            },
            schema::{NameRow, RequisitionRow, StoreRow},
        },
        server::{
            data::{LoaderRegistry, RepositoryRegistry},
            service::graphql::config as graphql_config,
        },
        util::test_db,
    };

    #[actix_rt::test]
    async fn get_requisition_by_id_is_success() {
        let mock_names: Vec<NameRow> = mock_names();
        let mock_stores: Vec<StoreRow> = mock_stores();
        let mock_requisitions: Vec<RequisitionRow> = mock_requisitions();

        let settings = test_db::get_test_settings("omsupply-database-simple-repository-test");

        // Initialise a new test database.
        test_db::setup(&settings.database).await;

        let repositories = get_repositories(&settings).await;
        let loaders = get_loaders(&settings).await;
        let connection_manager = repositories.get::<StorageConnectionManager>().unwrap();
        let connection = connection_manager.connection().unwrap();

        let name_repository = NameRepository::new(&connection);
        let store_repository = StoreRepository::new(&connection);
        let requisition_repository = repositories.get::<RequisitionRepository>().unwrap();

        for name in mock_names {
            name_repository.insert_one(&name).await.unwrap();
        }

        for store in mock_stores {
            store_repository.insert_one(&store).await.unwrap();
        }

        for requisition in mock_requisitions {
            requisition_repository
                .insert_one(&requisition)
                .await
                .unwrap();
        }

        let repository_registry = RepositoryRegistry { repositories };
        let loader_registry = LoaderRegistry { loaders };

        let repository_registry = actix_web::web::Data::new(repository_registry);
        let loader_registry = actix_web::web::Data::new(loader_registry);

        let mut app = actix_web::test::init_service(
            actix_web::App::new()
                .data(repository_registry.clone())
                .data(loader_registry.clone())
                .configure(graphql_config(repository_registry, loader_registry)),
        )
        .await;

        // TODO: parameterise gql test payloads and expected results.
        let payload = r#"{"query":"{requisition(id:\"requisition_a\"){id}}"}"#.as_bytes();

        let req = actix_web::test::TestRequest::post()
            .header("content-type", "application/json")
            .set_payload(payload)
            .uri("/graphql")
            .to_request();

        let res = actix_web::test::read_response(&mut app, req).await;
        let body = String::from_utf8(res.to_vec()).expect("Failed to parse response");

        assert_eq!(body, r#"{"data":{"requisition":{"id":"requisition_a"}}}"#);
    }
}
