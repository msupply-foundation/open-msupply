use super::{
    item_link_row::item_link::dsl as item_link_dsl,
    item_row::{item, item::dsl as item_dsl},
    master_list_line_row::master_list_line::dsl as master_list_line_dsl,
    master_list_name_join::master_list_name_join::dsl as master_list_name_join_dsl,
    master_list_row::master_list::dsl as master_list_dsl,
    store_row::store::dsl as store_dsl,
    unit_row::{unit, unit::dsl as unit_dsl},
    DBType, ItemRow, ItemRowType, StorageConnection, UnitRow,
};

use diesel::{
    dsl::{IntoBoxed, LeftJoin},
    prelude::*,
};
use util::inline_init;

table! {
    #[sql_name = "stock_movement"]
    ledger (id) {
        id -> Text,
        item_id -> Text,
        store_id -> Text,
        quantity -> BigInt,
        datetime -> Timestamp,
        invoice_type -> crate::db_diesel::invoice_row::InvoiceRowTypeMapping,
    }
}

#[derive(Clone, Queryable, Debug, PartialEq)]
pub struct LedgerRow {
    pub id: String,
    pub item_id: String,
    pub store_id: String,
    pub quantity: i64,
    pub datetime: NaiveDateTime,
    pub invoice_type: InvoiceRowType,
}


#[derive(Clone, Default)]
pub struct LedgerFilter {
    pub stock_line_id: Option<EqualFilter<String>>,
}

impl LedgerFilter {
    pub fn new() -> ItemFilter {
        Self::default()
    }

    pub fn stock_line_id(mut self, filter: EqualFilter<String>) -> Self {
        self.stock_line_id = Some(filter);
        self
    }
}

pub struct LedgerRepository<'a> {
    connection: &'a StorageConnection,
}

impl<'a> LedgerRepository<'a> {
    pub fn new(connection: &'a StorageConnection) -> Self {
        LedgerRepository { connection }
    }


    pub fn query(
        &self,
        filter: Option<ItemFilter>,
    ) -> Result<Vec<LedgerRow>, RepositoryError> {
       let mut query = ledger_dsl::ledger.into_boxed();

    if let Some(f) = filter {
        let LedgerFilter {
            stock_line_id
        } = f;

         apply_equal_filter!(query, stock_line_id, ledger_dsl::stock_line_id);
      
    }


// SORT HERE

        let final_query = query;

        // Debug diesel query
        // println!(
        //    "{}",
        //     diesel::debug_query::<DBType, _>(&final_query).to_string()
        // );

        let result = final_query.load::<LedgerRow>(&self.connection.connection)?;

        Ok(result)
    }
}

// #[cfg(test)]
// mod tests {
//     use std::convert::TryFrom;

//     use util::inline_init;

//     use crate::{
//         mock::{mock_item_b, mock_item_link_from_item, MockDataInserts},
//         test_db, EqualFilter, ItemFilter, ItemLinkRowRepository, ItemRepository, ItemRow,
//         ItemRowRepository, ItemRowType, MasterListLineRow, MasterListLineRowRepository,
//         MasterListNameJoinRepository, MasterListNameJoinRow, MasterListRow,
//         MasterListRowRepository, NameRow, NameRowRepository, Pagination, StoreRow,
//         StoreRowRepository, StringFilter, DEFAULT_PAGINATION_LIMIT,
//     };

//     use super::{Item, ItemSort, ItemSortField};

//     impl PartialEq<ItemRow> for Item {
//         fn eq(&self, other: &ItemRow) -> bool {
//             self.item_row.id == other.id
//                 && self.item_row.name == other.name
//                 && self.item_row.code == other.code
//         }
//     }

//     // TODO this is very repetitive, although it's ok for tests to be 'wet' I think we can do better (and still have readable tests)
//     fn data() -> Vec<ItemRow> {
//         let mut rows = Vec::new();
//         for index in 0..200 {
//             rows.push(inline_init(|r: &mut ItemRow| {
//                 r.id = format!("id{:05}", index);
//                 r.name = format!("name{}", index);
//                 r.code = format!("code{}", index);
//                 r.r#type = ItemRowType::Stock;
//             }));
//         }
//         rows
//     }

//     #[actix_rt::test]
//     async fn test_item_query_repository() {
//         // Prepare
//         let (_, storage_connection, _, _) =
//             test_db::setup_all("test_item_query_repository", MockDataInserts::none()).await;
//         let item_query_repository = ItemRepository::new(&storage_connection);

//         let rows = data();
//         for row in rows.iter() {
//             ItemRowRepository::new(&storage_connection)
//                 .upsert_one(row)
//                 .unwrap();
//         }

//         let default_page_size = usize::try_from(DEFAULT_PAGINATION_LIMIT).unwrap();

//         // Test
//         // .count()
//         assert_eq!(
//             usize::try_from(item_query_repository.count("".to_string(), None).unwrap()).unwrap(),
//             rows.len()
//         );

//         // .query, no pagination (default)
//         assert_eq!(
//             item_query_repository
//                 .query(Pagination::new(), None, None, None)
//                 .unwrap()
//                 .len(),
//             default_page_size
//         );

//         // .query, pagination (offset 10)
//         let result = item_query_repository
//             .query(
//                 Pagination {
//                     offset: 10,
//                     limit: DEFAULT_PAGINATION_LIMIT,
//                 },
//                 None,
//                 None,
//                 None,
//             )
//             .unwrap();
//         assert_eq!(result.len(), default_page_size);
//         assert_eq!(result[0], rows[10]);
//         assert_eq!(
//             result[default_page_size - 1],
//             rows[10 + default_page_size - 1]
//         );

//         // .query, pagination (first 10)
//         let result = item_query_repository
//             .query(
//                 Pagination {
//                     offset: 0,
//                     limit: 10,
//                 },
//                 None,
//                 None,
//                 None,
//             )
//             .unwrap();
//         assert_eq!(result.len(), 10);
//         assert_eq!((*result.last().unwrap()), rows[9]);

//         // .query, pagination (offset 150, first 90) <- more then records in table
//         let result = item_query_repository
//             .query(
//                 Pagination {
//                     offset: 150,
//                     limit: 90,
//                 },
//                 None,
//                 None,
//                 None,
//             )
//             .unwrap();
//         assert_eq!(result.len(), rows.len() - 150);
//         assert_eq!((*result.last().unwrap()), (*rows.last().unwrap()));
//     }

//     #[actix_rt::test]
//     async fn test_item_query_filter_repository() {
//         let (_, storage_connection, _, _) = test_db::setup_all(
//             "test_item_query_filter_repository",
//             MockDataInserts::none()
//                 .units()
//                 .items()
//                 .names()
//                 .full_master_list(),
//         )
//         .await;
//         let item_query_repository = ItemRepository::new(&storage_connection);

//         // test any id filter:
//         let results = item_query_repository
//             .query(
//                 Pagination::new(),
//                 Some(
//                     ItemFilter::new()
//                         .id(EqualFilter::equal_any(vec![
//                             "item_b".to_string(),
//                             "item_c".to_string(),
//                         ]))
//                         // query invisible rows
//                         .is_visible(false),
//                 ),
//                 None,
//                 Some("store_a".to_string()),
//             )
//             .unwrap();
//         assert_eq!(results.len(), 2);

//         // test code_or_name
//         let results = item_query_repository
//             .query(
//                 Pagination::new(),
//                 Some(ItemFilter::new().code_or_name(StringFilter::equal_to(&mock_item_b().name))),
//                 None,
//                 Some("store_a".to_string()),
//             )
//             .unwrap();
//         assert_eq!(results[0].item_row.id, mock_item_b().id);
//         let results = item_query_repository
//             .query(
//                 Pagination::new(),
//                 Some(ItemFilter::new().code_or_name(StringFilter::equal_to(&mock_item_b().code))),
//                 None,
//                 Some("store_a".to_string()),
//             )
//             .unwrap();
//         assert_eq!(results[0].item_row.id, mock_item_b().id);
//         // no result when having an `AND code is "does not exist"` clause
//         let results = item_query_repository
//             .query(
//                 Pagination::new(),
//                 Some(
//                     ItemFilter::new()
//                         .code(StringFilter::equal_to("does not exist"))
//                         .code_or_name(StringFilter::equal_to(&mock_item_b().name)),
//                 ),
//                 None,
//                 Some("store_a".to_string()),
//             )
//             .unwrap();
//         assert_eq!(results.len(), 0);
//     }

//     // TODO not sure where this fits, seems like this unit test has a lot of dependencies
//     // I think test snapshot-like functionality is need ?

//     // Really wanted to test visibility join, so added here for now

//     #[actix_rt::test]
//     async fn test_item_query_repository_visibility() {
//         // Prepare
//         let (_, storage_connection, _, _) = test_db::setup_all(
//             "test_item_query_repository_visibility",
//             MockDataInserts::none(),
//         )
//         .await;
//         let item_query_repository = ItemRepository::new(&storage_connection);

//         let item_rows = vec![
//             inline_init(|r: &mut ItemRow| {
//                 r.id = "item1".to_owned();
//                 r.name = "name1".to_owned();
//                 r.code = "name1".to_owned();
//                 r.r#type = ItemRowType::Stock;
//             }),
//             inline_init(|r: &mut ItemRow| {
//                 r.id = "item2".to_owned();
//                 r.name = "name2".to_owned();
//                 r.code = "name2".to_owned();
//                 r.r#type = ItemRowType::Stock;
//             }),
//             inline_init(|r: &mut ItemRow| {
//                 r.id = "item3".to_owned();
//                 r.name = "name3".to_owned();
//                 r.code = "name3".to_owned();
//                 r.r#type = ItemRowType::Stock;
//             }),
//             inline_init(|r: &mut ItemRow| {
//                 r.id = "item4".to_owned();
//                 r.name = "name4".to_owned();
//                 r.code = "name4".to_owned();
//                 r.r#type = ItemRowType::Stock;
//             }),
//             inline_init(|r: &mut ItemRow| {
//                 r.id = "item5".to_owned();
//                 r.name = "name5".to_owned();
//                 r.code = "name5".to_owned();
//                 r.r#type = ItemRowType::Stock;
//             }),
//         ];

//         let item_link_rows = vec![
//             mock_item_link_from_item(&item_rows[0]),
//             mock_item_link_from_item(&item_rows[1]),
//             mock_item_link_from_item(&item_rows[2]),
//             mock_item_link_from_item(&item_rows[3]),
//             mock_item_link_from_item(&item_rows[4]),
//         ];

//         let master_list_rows = vec![
//             MasterListRow {
//                 id: "master_list1".to_owned(),
//                 name: "".to_owned(),
//                 code: "".to_owned(),
//                 description: "".to_owned(),
//                 is_active: true,
//             },
//             MasterListRow {
//                 id: "master_list2".to_owned(),
//                 name: "".to_owned(),
//                 code: "".to_owned(),
//                 description: "".to_owned(),
//                 is_active: true,
//             },
//         ];

//         let master_list_line_rows = vec![
//             MasterListLineRow {
//                 id: "id1".to_owned(),
//                 item_link_id: "item1".to_owned(),
//                 master_list_id: "master_list1".to_owned(),
//             },
//             MasterListLineRow {
//                 id: "id2".to_owned(),
//                 item_link_id: "item2".to_owned(),
//                 master_list_id: "master_list1".to_owned(),
//             },
//             MasterListLineRow {
//                 id: "id3".to_owned(),
//                 item_link_id: "item3".to_owned(),
//                 master_list_id: "master_list2".to_owned(),
//             },
//             MasterListLineRow {
//                 id: "id4".to_owned(),
//                 item_link_id: "item4".to_owned(),
//                 master_list_id: "master_list2".to_owned(),
//             },
//         ];

//         let name_row = inline_init(|r: &mut NameRow| {
//             r.id = "name1".to_owned();
//             r.name = "".to_owned();
//             r.code = "".to_owned();
//             r.is_supplier = true;
//             r.is_customer = true;
//         });

//         let store_row = inline_init(|r: &mut StoreRow| {
//             r.id = "name1_store".to_owned();
//             r.name_id = "name1".to_owned();
//         });

//         let master_list_name_join_1 = MasterListNameJoinRow {
//             id: "id1".to_owned(),
//             name_link_id: "name1".to_owned(),
//             master_list_id: "master_list1".to_owned(),
//         };

//         for row in item_rows.iter() {
//             ItemRowRepository::new(&storage_connection)
//                 .upsert_one(row)
//                 .unwrap();
//         }

//         for row in item_link_rows.iter() {
//             ItemLinkRowRepository::new(&storage_connection)
//                 .upsert_one(row)
//                 .unwrap();
//         }

//         for row in master_list_rows {
//             MasterListRowRepository::new(&storage_connection)
//                 .upsert_one(&row)
//                 .unwrap();
//         }

//         for row in master_list_line_rows {
//             MasterListLineRowRepository::new(&storage_connection)
//                 .upsert_one(&row)
//                 .unwrap();
//         }

//         NameRowRepository::new(&storage_connection)
//             .upsert_one(&name_row)
//             .unwrap();

//         StoreRowRepository::new(&storage_connection)
//             .upsert_one(&store_row)
//             .unwrap();

//         // Before adding any joins
//         let results0 = item_query_repository
//             .query(Pagination::new(), None, None, None)
//             .unwrap();

//         assert_eq!(results0, item_rows);

//         // item1 and item2 visible
//         MasterListNameJoinRepository::new(&storage_connection)
//             .upsert_one(&master_list_name_join_1)
//             .unwrap();

//         // test is_visible filter:
//         let results = item_query_repository
//             .query(
//                 Pagination::new(),
//                 // query invisible rows
//                 Some(ItemFilter::new().is_visible(false)),
//                 None,
//                 Some("name1_store".to_string()),
//             )
//             .unwrap();
//         assert_eq!(results.len(), 3);
//         // get visible rows
//         let results = item_query_repository
//             .query(
//                 Pagination::new(),
//                 Some(ItemFilter::new().is_visible(true)),
//                 None,
//                 Some("name1_store".to_string()),
//             )
//             .unwrap();
//         assert_eq!(results.len(), 2);
//     }

//     #[actix_rt::test]
//     async fn test_item_query_sort() {
//         let (_, connection, _, _) =
//             test_db::setup_all("test_item_query_sort", MockDataInserts::all()).await;
//         let repo = ItemRepository::new(&connection);

//         let mut items = repo.query(Pagination::new(), None, None, None).unwrap();

//         let sorted = repo
//             .query(
//                 Pagination::new(),
//                 None,
//                 Some(ItemSort {
//                     key: ItemSortField::Name,
//                     desc: None,
//                 }),
//                 None,
//             )
//             .unwrap();

//         items.sort_by(|a, b| {
//             a.item_row
//                 .name
//                 .to_lowercase()
//                 .cmp(&b.item_row.name.to_lowercase())
//         });

//         for (count, item) in items.iter().enumerate() {
//             assert_eq!(
//                 item.item_row.name.clone().to_lowercase(),
//                 sorted[count].item_row.name.clone().to_lowercase(),
//             );
//         }

//         let sorted = repo
//             .query(
//                 Pagination::new(),
//                 None,
//                 Some(ItemSort {
//                     key: ItemSortField::Code,
//                     desc: Some(true),
//                 }),
//                 None,
//             )
//             .unwrap();

//         items.sort_by(|b, a| {
//             a.item_row
//                 .code
//                 .to_lowercase()
//                 .cmp(&b.item_row.code.to_lowercase())
//         });

//         for (count, item) in items.iter().enumerate() {
//             assert_eq!(
//                 item.item_row.code.clone().to_lowercase(),
//                 sorted[count].item_row.code.clone().to_lowercase(),
//             );
//         }
//     }
// }
