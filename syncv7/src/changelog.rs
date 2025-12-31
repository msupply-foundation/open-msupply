use crate::sync_traits::{Error, SyncType, get_table_names_for_sync_type};

use super::dynamic_queries::*;
use diesel::{dsl::LeftJoinQuerySource, prelude::*, sqlite::Sqlite};

table! {
    store (id) {
        id -> Text,
        site_id -> Bigint,
        name_id -> Text,
    }
}

table! {
    changelog (cursor) {
        cursor -> Bigint,
        last_sync_site_id -> Nullable<Bigint>,
        table_name -> Text,
        record_id -> Text,
        store_id -> Nullable<Text>,
        name_id -> Nullable<Text>,
    }
}

#[derive(Debug, PartialEq, Insertable, Default)]
#[diesel(table_name = changelog)]
pub struct ChangeLogInsertRow {
    pub last_sync_site_id: Option<i64>,
    pub table_name: Changelog,
    pub record_id: String,
    pub name_id: Option<String>,
    pub store_id: Option<String>,
}

#[derive(Debug, PartialEq, Queryable, Default)]
#[diesel(table_name = changelog)]
pub struct ChangeLogRow {
    pub cursor: i64,
    #[diesel(deserialize_as = String)]
    pub table_name: Changelog,
    pub record_id: String,
}

define_sql_function!(
    fn last_insert_rowid() -> BigInt
);

impl ChangeLogInsertRow {
    pub fn insert(&self, connection: &mut SqliteConnection) -> Result<i64, Error> {
        // Insert the record, and then return the cursor of the inserted record
        // SQLite docs say this is safe if you don't have different threads sharing a single connection
        diesel::insert_into(changelog::table)
            .values(self)
            .execute(connection)
            .map_err(|_| Error)?;
        let cursor_id = diesel::select(last_insert_rowid())
            .get_result::<i64>(connection)
            .map_err(|_| Error)?;
        Ok(cursor_id)
    }
}

diesel_string_enum! {
    pub enum Changelog {
        #[default]
        Item,
        Invoice,
    }
}

impl Changelog {
    pub fn sync_table_name(&self) -> String {
        format!("om_{}", (*self).to_string())
    }
}

diesel::alias!(store as transfer_stores: TransferStores);

allow_tables_to_appear_in_same_query!(changelog, store);

// Hover over to get the type, remove ON statements and change joins to LeftJoin
#[diesel::dsl::auto_type]
fn query() -> _ {
    changelog::table
        .left_join(store::table.on(store::id.nullable().eq(changelog::store_id)))
        .left_join(
            transfer_stores.on(transfer_stores
                .field(store::name_id)
                .nullable()
                .eq(changelog::name_id)),
        )
}

type Source = LeftJoinQuerySource<
    LeftJoinQuerySource<
        changelog::table,
        store::table,
        diesel::dsl::Eq<diesel::dsl::Nullable<store::id>, changelog::store_id>,
    >,
    transfer_stores,
    diesel::dsl::Eq<
        diesel::dsl::Nullable<diesel::dsl::Field<transfer_stores, store::name_id>>,
        changelog::name_id,
    >,
>;

create_condition!(
    Source,
    (site_id, number, store::dsl::site_id),
    (cursor, number, changelog::dsl::cursor),
    (last_sync_site_id, number, changelog::dsl::last_sync_site_id),
    (table_name, Changelog, changelog::dsl::table_name),
    (store_id, string, changelog::dsl::store_id),
    (name_id, string, changelog::dsl::name_id),
    (
        transfer_site_id,
        number,
        transfer_stores.field(store::site_id)
    ),
    (transfer_store_id, string, transfer_stores.field(store::id))
);

fn get_total_and_changelogs(
    connection: &mut SqliteConnection,
    conditions: Vec<Condition>,
    limit: i64,
) -> Result<(i64, Vec<ChangeLogRow>), Error> {
    let select_query = query().filter(create_and_filter(conditions.clone()).unwrap());

    let changelogs: Vec<ChangeLogRow> = select_query
        .select((
            changelog::cursor,
            changelog::table_name,
            changelog::record_id,
        ))
        .limit(limit)
        .load::<ChangeLogRow>(connection)
        .map_err(|_| Error)?;

    let total_query = query().filter(create_and_filter(conditions).unwrap());
    let total: i64 = total_query
        .count()
        .get_result(connection)
        .map_err(|_| Error)?;

    Ok((total, changelogs))
}

pub fn get_pull_changelogs_for_site(
    connection: &mut SqliteConnection,
    site_id: i64,
    cursor: i64,
    is_initialising: bool,
) -> Result<(i64, Vec<ChangeLogRow>), Error> {
    get_total_and_changelogs(
        connection,
        pull_changelogs_for_site(site_id, cursor, is_initialising),
        30,
    )
}

pub fn get_push_changelogs(
    connection: &mut SqliteConnection,
    site_id: i64,
    cursor: i64,
) -> Result<(i64, Vec<ChangeLogRow>), Error> {
    get_total_and_changelogs(connection, push_changelogs(site_id, cursor), 30)
}

pub fn pull_changelogs_for_site(
    site_id: i64,
    cursor: i64,
    is_initialising: bool,
) -> Vec<Condition> {
    let mut conditions = vec![
        Condition::cursor(NumberFilter::GreaterThen(cursor)),
        Condition::Or(vec![
            central_data(),
            remote_data_for_stores(Stores::SiteId(site_id.clone())),
            transfer_data_for_stores(Stores::SiteId(site_id.clone())),
        ]),
    ];

    if !is_initialising {
        conditions.push(Condition::last_sync_site_id(NumberFilter::NotEqual(
            site_id,
        )));
    }
    conditions
}

pub fn pull_changelogs_for_stores(stores: Vec<String>, cursor: i64) -> Vec<Condition> {
    vec![
        Condition::cursor(NumberFilter::GreaterThen(cursor)),
        Condition::Or(vec![
            remote_data_for_stores(Stores::StoreIds(stores.clone())),
            transfer_data_for_stores(Stores::StoreIds(stores)),
        ]),
    ]
}

// Check on central
pub fn push_changelogs(site_id: i64, cursor: i64) -> Vec<Condition> {
    vec![
        Condition::cursor(NumberFilter::GreaterThen(cursor)),
        Condition::last_sync_site_id(NumberFilter::Equal(site_id)),
        Condition::Or(vec![remote_data_for_stores(Stores::SiteId(site_id))]),
    ]
}

pub enum Stores {
    SiteId(i64),
    StoreIds(Vec<String>),
}

pub fn remote_data_for_stores(stores: Stores) -> Condition {
    let table_names = get_table_names_for_sync_type(&SyncType::Remote);

    Condition::And(vec![
        Condition::table_name(GeneralFilter::In(table_names)),
        match stores {
            Stores::SiteId(site_id) => Condition::site_id(NumberFilter::Equal(site_id)),
            Stores::StoreIds(ids) => Condition::store_id(GeneralFilter::In(ids)),
        },
    ])
}

pub fn transfer_data_for_stores(stores: Stores) -> Condition {
    let table_names = get_table_names_for_sync_type(&SyncType::Remote);

    Condition::And(vec![
        Condition::table_name(GeneralFilter::In(table_names)),
        match stores {
            Stores::SiteId(site_id) => Condition::transfer_site_id(NumberFilter::Equal(site_id)),
            Stores::StoreIds(ids) => Condition::transfer_store_id(GeneralFilter::In(ids)),
        },
    ])
}

pub fn central_data() -> Condition {
    let table_names = get_table_names_for_sync_type(&SyncType::Central);

    Condition::table_name(GeneralFilter::In(table_names))
}
