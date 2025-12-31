use crate::{
    changelog::Changelog,
    sync_traits::{Error, Record, SyncType, TranslatorTrait, Upsert, add_sync_visitor},
};
use ctor::ctor;
use diesel::prelude::*;
use serde::{Deserialize, Serialize};

table! {
    item (id) {
        id -> Text,
        name -> Text,
    }
}

#[derive(Debug, Queryable, Insertable, AsChangeset, Serialize, Deserialize)]
#[table_name = "item"]
pub struct Row {
    id: String,
    name: String,
}

impl Record for Row {
    fn find_by_id(connection: &mut SqliteConnection, id: &str) -> Result<Option<Self>, Error> {
        item::table
            .filter(item::id.eq(id))
            .first::<Row>(connection)
            .optional()
            .map_err(|_| Error)
    }

    fn changelog() -> &'static Changelog {
        &Changelog::Item
    }

    fn sync_type() -> &'static SyncType {
        &SyncType::Central
    }

    fn get_id(&self) -> &str {
        &self.id
    }

    fn upsert_internal(&self, connection: &mut SqliteConnection) -> Result<(), Error> {
        diesel::insert_into(item::table)
            .values(self)
            .on_conflict(item::id)
            .do_update()
            .set(self)
            .execute(connection)
            .map_err(|_| Error)?;
        Ok(())
    }

    fn get_store_id(&self) -> String {
        todo!()
    }

    fn get_store_name_id(&self) -> String {
        todo!()
    }
}

struct Translator;

impl TranslatorTrait for Translator {
    type Item = Row;
}
#[ctor]
fn register_my_struct() {
    add_sync_visitor(Box::new(Translator));
}
