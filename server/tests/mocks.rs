use remote_server::database;
// use remote_server::util;

// use sqlx::{Connection, Executor, PgConnection};

// pub async fn get_test_database() -> database::connection::DatabaseConnection {
//     let mut configuration =
//         util::configuration::get_configuration().expect("Failed to parse configuration settings");

//     configuration.database.database_name = uuid::Uuid::new_v4().to_string();

//     let mut connection =
//         PgConnection::connect(&configuration.database.connection_string_without_db())
//             .await
//             .expect("Failed to connect to Postgres");

//     connection
//         .execute(&*format!(
//             r#"CREATE DATABASE "{}";"#,
//             configuration.database.database_name
//         ))
//         .await
//         .expect("Failed to create database");

//     let database: database::connection::DatabaseConnection =
//         database::connection::DatabaseConnection::new(&configuration.database.connection_string())
//             .await;

//     sqlx::migrate!("./migrations")
//         .run(&database.pool)
//         .await
//         .expect("Failed to migrate the databse");

//     database
// }

#[allow(dead_code)]
pub fn get_name_store_a() -> database::schema::NameRow {
    database::schema::NameRow {
        id: "name_store_a".to_string(),
        name: "Store A".to_string(),
    }
}

#[allow(dead_code)]
pub fn get_name_store_b() -> database::schema::NameRow {
    database::schema::NameRow {
        id: "name_store_b".to_string(),
        name: "Store B".to_string(),
    }
}

#[allow(dead_code)]
pub fn get_store_a() -> database::schema::StoreRow {
    database::schema::StoreRow {
        id: "store_a".to_string(),
        name_id: "name_store_a".to_string(),
    }
}

#[allow(dead_code)]
pub fn get_store_b() -> database::schema::StoreRow {
    database::schema::StoreRow {
        id: "store_b".to_string(),
        name_id: "name_store_b".to_string(),
    }
}

pub fn get_request_requisition_a_to_b() -> database::schema::RequisitionRow {
    database::schema::RequisitionRow {
        id: "requisition_a".to_string(),
        name_id: "name_store_a".to_string(),
        store_id: "store_b".to_string(),
        type_of: database::schema::RequisitionRowType::Request,
    }
}
