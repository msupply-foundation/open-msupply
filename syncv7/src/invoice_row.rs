use crate::{
    changelog::{ChangeLogInsertRow, Changelog},
    sync_traits::{Error, Record, SyncType, TranslatorTrait, add_sync_visitor},
};
use ctor::ctor;
use diesel::prelude::*;
use serde::{Deserialize, Serialize};

table! {
    invoice (id) {
        id -> Text,
        store_id -> Text,
        name -> Text,
        name_id -> Text,
    }
}

#[derive(Debug, Queryable, Insertable, AsChangeset, Serialize, Deserialize)]
#[table_name = "invoice"]
pub struct Row {
    id: String,
    store_id: String,
    name: String,
    name_id: String,
}

impl Record for Row {
    fn find_by_id(connection: &mut SqliteConnection, id: &str) -> Result<Option<Self>, Error> {
        invoice::table
            .filter(invoice::id.eq(id))
            .first::<Row>(connection)
            .optional()
            .map_err(|_| Error)
    }

    fn changelog() -> &'static Changelog {
        &Changelog::Invoice
    }

    fn sync_type() -> &'static SyncType {
        &SyncType::Remote
    }

    fn upsert_internal(&self, connection: &mut SqliteConnection) -> Result<(), Error> {
        diesel::insert_into(invoice::table)
            .values(self)
            .on_conflict(invoice::id)
            .do_update()
            .set(self)
            .execute(connection)
            .map_err(|_| Error)?;
        Ok(())
    }

    fn get_id(&self) -> &str {
        &self.id
    }

    fn changelog_extra(
        &self,
        _: &mut SqliteConnection,
    ) -> Result<Option<ChangeLogInsertRow>, Error> {
        Ok(Some(ChangeLogInsertRow {
            name_id: Some(self.name_id.clone()),
            store_id: Some(self.store_id.clone()),
            ..Default::default()
        }))
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
