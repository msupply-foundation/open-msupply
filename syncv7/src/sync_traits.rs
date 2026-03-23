use diesel::prelude::*;
use serde::{Serialize, de::DeserializeOwned};
use std::marker::PhantomData;
use std::sync::RwLock;
use strum::IntoEnumIterator;

use crate::changelog::ChangeLogInsertRow;

use super::changelog::Changelog;

static SYNC_SITE: RwLock<i64> = RwLock::new(0);

static SYNC_VISITORS: RwLock<Vec<Box<dyn Syncable>>> = RwLock::new(Vec::new());
pub fn add_sync_visitor<T: Record + Sync + Send + 'static>() {
    let mut visitors = SYNC_VISITORS.write().unwrap();
    visitors.push(Box::new(SyncAdapter::<T>::new()));
}
pub fn set_sync_site(site_id: i64) {
    let mut sync_site = SYNC_SITE.write().unwrap();
    *sync_site = site_id;
}
pub fn get_sync_site() -> i64 {
    let sync_site = SYNC_SITE.read().unwrap();
    *sync_site
}

#[derive(PartialEq, strum::EnumIter)]
pub enum SyncType {
    Remote,
    Central,
}

pub trait Record: Serialize + DeserializeOwned
where
    Self: Sized,
{
    // fn table_name(&self) -> &'static str;
    fn find_by_id(connection: &mut SqliteConnection, id: &str) -> Result<Option<Self>, Error>; // fn upsert(&self) -> bool;
    fn changelog() -> &'static Changelog;
    fn sync_type() -> &'static SyncType;
    fn upsert_internal(&self, connection: &mut SqliteConnection) -> Result<(), Error>;
    fn get_id(&self) -> &str;
    fn get_store_id(&self) -> String;
    fn get_store_name_id(&self) -> String;

    // Default implementation
    fn changelog_extra(
        &self,
        _connection: &mut SqliteConnection,
    ) -> Result<Option<ChangeLogInsertRow>, Error> {
        Ok(None)
    }

    fn upsert(&self, connection: &mut SqliteConnection) -> Result<Option<i64>, Error> {
        self.upsert_internal(connection)?;

        let record_id = self.get_id().to_string();
        let table_name = Self::changelog().clone();
        let last_sync_site_id = Some(*SYNC_SITE.read().unwrap());

        let extra_changelog = self.changelog_extra(connection)?.unwrap_or_default();

        Ok(Some(
            ChangeLogInsertRow {
                table_name,
                record_id,
                last_sync_site_id,
                ..extra_changelog
            }
            .insert(connection)?,
        ))
    }
}

// Object-safe subset of the Record trait for dynamic dispatch (auto-implemented for all Record types)
pub trait DynRecord: Send + Sync {
    fn upsert(&self, connection: &mut SqliteConnection) -> Result<Option<i64>, Error>;
    fn sync_type(&self) -> &'static SyncType;
    fn get_store_id(&self) -> String;
}

impl<T: Record + Sync + Send> DynRecord for T {
    fn upsert(&self, connection: &mut SqliteConnection) -> Result<Option<i64>, Error> {
        Record::upsert(self, connection)
    }

    fn sync_type(&self) -> &'static SyncType {
        Self::sync_type()
    }

    fn get_store_id(&self) -> String {
        Record::get_store_id(self)
    }
}

trait Syncable: Send + Sync {
    fn serialize(
        &self,
        connection: &mut SqliteConnection,
        changelog: &Changelog,
        id: &str,
    ) -> Result<Option<serde_json::Value>, Error>;

    fn deserialize(
        &self,
        table_name: &str,
        value: serde_json::Value,
    ) -> Result<Option<Box<dyn DynRecord>>, Error>;

    fn sync_type(&self) -> &'static SyncType;
    fn changelog(&self) -> Changelog;
}

// We need phantom data to have an unused generic type parameter
struct SyncAdapter<T: Record>(PhantomData<T>);

impl<T: Record + Sync + Send + 'static> SyncAdapter<T> {
    fn new() -> Self {
        SyncAdapter(PhantomData)
    }
}

impl<T: Record + Sync + Send + 'static> Syncable for SyncAdapter<T> {
    fn serialize(
        &self,
        connection: &mut SqliteConnection,
        changelog: &Changelog,
        id: &str,
    ) -> Result<Option<serde_json::Value>, Error> {
        if T::changelog() != changelog {
            return Ok(None);
        };

        if let Some(record) = T::find_by_id(connection, id).map_err(|_| Error)? {
            serde_json::to_value(&record).map_err(|_| Error).map(Some)
        } else {
            Err(Error)
        }
    }

    fn deserialize(
        &self,
        table_name: &str,
        value: serde_json::Value,
    ) -> Result<Option<Box<dyn DynRecord>>, Error> {
        if T::changelog().sync_table_name() != table_name {
            return Ok(None);
        };

        let record: T = serde_json::from_value(value).map_err(|_| Error)?;

        Ok(Some(Box::new(record)))
    }

    fn sync_type(&self) -> &'static SyncType {
        T::sync_type()
    }

    fn changelog(&self) -> Changelog {
        T::changelog().to_owned()
    }
}

#[derive(Debug)]
pub struct Error;

pub fn serialize(
    connection: &mut SqliteConnection,
    changelog: Changelog,
    id: &str,
) -> Result<Option<serde_json::Value>, Error> {
    let visitors = SYNC_VISITORS.read().unwrap();
    for visitor in visitors.iter() {
        if let Some(value) = visitor.serialize(connection, &changelog, id)? {
            return Ok(Some(value));
        }
    }
    Ok(None)
}

pub fn deserialize(
    table_name: &str,
    value: serde_json::Value,
) -> Result<Option<Box<dyn DynRecord>>, Error> {
    let visitors = SYNC_VISITORS.read().unwrap();
    for visitor in visitors.iter() {
        if let Some(upsert) = visitor.deserialize(table_name, value.clone())? {
            return Ok(Some(upsert));
        }
    }
    Ok(None)
}

pub fn get_table_names_for_sync_type(sync_type: &SyncType) -> Vec<Changelog> {
    let visitors = SYNC_VISITORS.read().unwrap();
    visitors
        .iter()
        .filter(|r| r.sync_type() == sync_type)
        .map(|visitor| visitor.changelog().to_owned())
        .collect()
}

fn operations_by_sync_type(
    operations: &mut Vec<Box<dyn DynRecord>>,
    sync_type: &SyncType,
) -> Vec<Box<dyn DynRecord>> {
    let original = std::mem::take(operations);
    let (matching, remaining) = original
        .into_iter()
        .partition(|op| op.sync_type() == sync_type);

    *operations = remaining;
    matching
}

pub fn validate_remote(mut operations: Vec<Box<dyn DynRecord>>, is_initialising: bool) {
    let mut accept: Vec<Box<dyn DynRecord>> = Vec::new();
    let mut reject: Vec<Box<dyn DynRecord>> = Vec::new();

    SyncType::iter().for_each(|sync_type| match sync_type {
        SyncType::Central => {
            accept.append(&mut operations_by_sync_type(&mut operations, &sync_type));
        }
        SyncType::Remote => {
            let active_store_ids = vec!["store_a", "store_b"];
            // let active_stores_name_ids = vec!["store_name_a", "store_name_b"];

            let remotes = operations_by_sync_type(&mut operations, &sync_type);
            let (mut a, mut r) = remotes.into_iter().partition(|op| {
                // let is_transfer = active_stores_name_ids.contains(&op.get_store_name_id().as_str());
                // if (is_transfer) {
                //     return true;
                // }
                let is_active_store = active_store_ids.contains(&op.get_store_id().as_str());
                is_initialising && is_active_store
            });
            accept.append(&mut a);
            reject.append(&mut r);
        }
    });
}
