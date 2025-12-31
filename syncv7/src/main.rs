use crate::{
    changelog::get_push_changelogs,
    sync_traits::{deserialize, serialize, set_sync_site},
};
use diesel::{connection::SimpleConnection, prelude::*};
use serde_json::json;

pub mod changelog;
pub mod check_enum;
pub mod dynamic_queries;
pub mod invoice_row;
pub mod item_row;
pub mod sync_traits;

fn main() {
    let mut connection = SqliteConnection::establish("file:test?mode=memory&cache=shared").unwrap();

    set_sync_site(2);

    connection
        .batch_execute(
            r#"
            CREATE TABLE item (
                id TEXT PRIMARY KEY,
                name TEXT NOT NULL
            );

            CREATE TABLE invoice (
                id TEXT PRIMARY KEY,
                store_id TEXT NOT NULL,
                name TEXT NOT NULL,
                name_id TEXT NOT NULL
            );

            CREATE TABLE changelog (
                cursor INTEGER PRIMARY KEY AUTOINCREMENT,
                last_sync_site_id NUMBER,
                table_name TEXT NOT NULL,
                record_id TEXT NOT NULL,
                store_id TEXT,
                name_id TEXT
            );

            CREATE TABLE store (
                id TEXT PRIMARY KEY,
                site_id NUMBER NOT NULL,
                name_id TEXT NOT NULL
            );

            INSERT INTO store (id, site_id, name_id) VALUES
                ("store_a", 2, "store_a_name"),
                ("store_b", 3, "store_b_name");
        "#,
        )
        .unwrap();

    deserialize(
        "om_invoice",
        json! ({
            "id": "invoice_a",
            "store_id": "store_a",
            "name": "invoice_a",
            "name_id": "store_b_name"
        }),
    )
    .unwrap()
    .unwrap()
    .upsert(&mut connection)
    .unwrap();

    deserialize(
        "om_item",
        json!({
            "id": "example_item",
            "name": "example item"
        }),
    )
    .unwrap()
    .unwrap()
    .upsert(&mut connection)
    .unwrap();

    println!(
        "{:#?}",
        serialize(&mut connection, changelog::Changelog::Item, "example_item")
    );
    println!(
        "{:#?}",
        serialize(&mut connection, changelog::Changelog::Invoice, "invoice_a")
    );

    println!("{:#?}", get_push_changelogs(&mut connection, 2, 0));
}
