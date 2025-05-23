use diesel::prelude::*;

use crate::{
    db_diesel::{
        master_list_name_join::master_list_name_join, master_list_row::master_list,
        name_link_row::name_link, name_row::name, name_store_join::name_store_join,
        program_row::program, store_row::store,
    },
    diesel_macros::apply_equal_filter,
    name_oms_fields, name_oms_fields_alias,
    repository_error::RepositoryError,
    EqualFilter, Name, NameFilter, NameLinkRow, NameOmsFieldsRow, NameRepository, NameRow,
    NameStoreJoinRow, ProgramRow, StorageConnection, StoreRow,
};

pub type ProgramSupplierJoin = (
    NameRow,
    NameOmsFieldsRow,
    NameLinkRow,
    NameStoreJoinRow,
    StoreRow,
    ProgramRow,
);

#[derive(Debug, PartialEq, Clone)]
pub struct ProgramSupplier {
    pub supplier: Name,
    pub program: ProgramRow,
}

#[derive(Clone, PartialEq, Debug, Default)]
pub struct ProgramSupplierFilter {
    pub program_id: Option<EqualFilter<String>>,
}

pub struct ProgramSupplierRepository<'a> {
    connection: &'a StorageConnection,
}

impl<'a> ProgramSupplierRepository<'a> {
    pub fn new(connection: &'a StorageConnection) -> Self {
        ProgramSupplierRepository { connection }
    }

    pub fn query(
        &self,
        store_id: &str,
        ProgramSupplierFilter {
            program_id: program_id_filter,
        }: ProgramSupplierFilter,
    ) -> Result<Vec<ProgramSupplier>, RepositoryError> {
        // If this filter is lifter to service layer, we may have an issue this after `query.select` below, name_store_join_row and store_row
        // becomes not null, but can be if this filter is not exposed, causing diesel deserialization error TODO add issue with diesel
        let name_filter = NameFilter::new()
            .is_store(true)
            .is_visible(true)
            .match_is_supplier(true);

        let mut query =
            NameRepository::create_filtered_query(store_id.to_string(), Some(name_filter))
                .inner_join(
                    master_list_name_join::table
                        .on(master_list_name_join::name_link_id.eq(name_link::id)),
                )
                .inner_join(
                    master_list::table
                        .on(master_list::id.eq(master_list_name_join::master_list_id)),
                )
                .inner_join(
                    program::table.on(program::master_list_id.eq(master_list::id.nullable())),
                );

        apply_equal_filter!(query, program_id_filter, program::id);

        //  Debug diesel query
        // println!(
        //     "{}",
        //     diesel::debug_query::<crate::DBType, _>(&query).to_string()
        // );

        let query = query.select((
            // Same as NameRepository
            name::table::all_columns(),
            name_oms_fields_alias.fields((name_oms_fields::id, name_oms_fields::properties)),
            name_link::table::all_columns().nullable().assume_not_null(),
            name_store_join::table::all_columns()
                .nullable()
                .assume_not_null(),
            store::table::all_columns().nullable().assume_not_null(),
            program::table::all_columns().nullable().assume_not_null(),
        ));
        let result = query.load::<ProgramSupplierJoin>(self.connection.lock().connection())?;

        Ok(result
            .into_iter()
            .map(
                |(
                    name_row,
                    name_oms_fields_row,
                    name_link_row,
                    name_store_join_row,
                    store_row,
                    program,
                )| {
                    ProgramSupplier {
                        supplier: Name::from_join((
                            name_row,
                            (name_link_row, Some(name_store_join_row), Some(store_row)),
                            name_oms_fields_row,
                        )),
                        program,
                    }
                },
            )
            .collect())
    }
}

impl ProgramSupplierFilter {
    pub fn new() -> ProgramSupplierFilter {
        Default::default()
    }

    pub fn program_id(mut self, filter: EqualFilter<String>) -> Self {
        self.program_id = Some(filter);
        self
    }
}

#[cfg(test)]
mod test {
    use crate::{
        mock::{MockData, MockDataInserts},
        test_db::setup_all_with_data,
        ContextRow, EqualFilter, MasterListNameJoinRepository, MasterListNameJoinRow,
        MasterListRow, Name, NameLinkRow, NameRow, NameStoreJoinRepository, NameStoreJoinRow,
        ProgramRow, ProgramSupplier, ProgramSupplierFilter, ProgramSupplierRepository, StoreRow,
    };

    #[actix_rt::test]
    async fn program_supplier_repository() {
        let name1 = NameRow {
            id: "name1".to_string(),
            ..Default::default()
        };
        let name_link1 = NameLinkRow {
            id: "name1".to_string(),
            name_id: "name1".to_string(),
        };

        let store_name1 = NameRow {
            id: "store_name1".to_string(),
            ..Default::default()
        };
        let store_name_link1 = NameLinkRow {
            id: "store_name1".to_string(),
            name_id: "store_name1".to_string(),
        };
        let store1 = StoreRow {
            id: "store1".to_string(),
            name_link_id: store_name1.id.clone(),
            ..Default::default()
        };
        let store_name2 = NameRow {
            id: "store_name2".to_string(),
            ..Default::default()
        };
        let store_name_link2 = NameLinkRow {
            id: "store_name2".to_string(),
            name_id: "store_name2".to_string(),
        };

        let store2 = StoreRow {
            id: "store2".to_string(),
            name_link_id: store_name2.id.clone(),
            ..Default::default()
        };

        let store_name3 = NameRow {
            id: "store_name3".to_string(),
            ..Default::default()
        };
        let store_name_link3 = NameLinkRow {
            id: "store_name3".to_string(),
            name_id: "store_name3".to_string(),
        };
        let store3 = StoreRow {
            id: "store3".to_string(),
            name_link_id: store_name3.id.clone(),
            ..Default::default()
        };

        let master_list1 = MasterListRow {
            id: "master_list1".to_string(),
            is_active: true,
            ..Default::default()
        };
        let context1 = ContextRow {
            id: "program1".to_string(),
            name: "program1".to_string(),
        };
        let program1 = ProgramRow {
            id: "program1".to_string(),
            master_list_id: Some(master_list1.id.clone()),
            context_id: context1.id.clone(),
            ..Default::default()
        };

        let master_list2 = MasterListRow {
            id: "master_list2".to_string(),
            is_active: true,
            ..Default::default()
        };

        let context2 = ContextRow {
            id: "program2".to_string(),
            name: "program2".to_string(),
        };
        let program2 = ProgramRow {
            id: "program2".to_string(),
            master_list_id: Some(master_list2.id.clone()),
            context_id: context2.id.clone(),
            ..Default::default()
        };

        let master_list_name_join1 = MasterListNameJoinRow {
            id: "master_list_name_join1".to_string(),
            name_link_id: name1.id.clone(),
            master_list_id: master_list1.id.clone(),
        };
        let master_list_name_join2 = MasterListNameJoinRow {
            id: "master_list_name_join2".to_string(),
            name_link_id: store_name1.id.clone(),
            master_list_id: master_list1.id.clone(),
        };
        let master_list_name_join3 = MasterListNameJoinRow {
            id: "master_list_name_join3".to_string(),
            name_link_id: store_name2.id.clone(),
            master_list_id: master_list2.id.clone(),
        };

        let name_store_join1 = NameStoreJoinRow {
            id: "name_store_join1".to_string(),
            name_link_id: name1.id.clone(),
            store_id: store3.id.clone(),
            name_is_supplier: true,
            ..Default::default()
        };
        let name_store_join2 = NameStoreJoinRow {
            id: "name_store_join2".to_string(),
            name_link_id: store_name1.id.clone(),
            store_id: store3.id.clone(),
            name_is_supplier: true,
            ..Default::default()
        };

        let name_store_join3 = NameStoreJoinRow {
            id: "name_store_join3".to_string(),
            name_link_id: store_name2.id.clone(),
            store_id: store3.id.clone(),
            name_is_supplier: true,
            ..Default::default()
        };

        let (_, connection, _, _) = setup_all_with_data(
            "program_supplier_repository",
            MockDataInserts::none(),
            MockData {
                stores: vec![store1.clone(), store2.clone(), store3.clone()],
                names: vec![
                    name1,
                    store_name1.clone(),
                    store_name2.clone(),
                    store_name3.clone(),
                ],
                name_links: vec![
                    name_link1,
                    store_name_link1.clone(),
                    store_name_link2.clone(),
                    store_name_link3,
                ],
                master_lists: vec![master_list1, master_list2],
                contexts: vec![context1, context2],
                programs: vec![program1.clone(), program2.clone()],
                master_list_name_joins: vec![master_list_name_join1, master_list_name_join3],
                name_store_joins: vec![name_store_join1.clone(), name_store_join2.clone()],
                ..Default::default()
            },
        )
        .await;

        // TEST 1 without master list join for store 1 and without name_store_join for store 2
        // should result in nothing (since name1 is not store)
        let filter = ProgramSupplierFilter::new().program_id(EqualFilter::equal_any(vec![
            program1.id.clone(),
            program2.id.clone(),
        ]));

        let result = ProgramSupplierRepository::new(&connection).query(&store3.id, filter);

        assert_eq!(result, Ok(Vec::new()));

        // TEST 2 with master list join for store 1 and without name_store_join for store 2
        // should result in one found, store_name1
        let filter = ProgramSupplierFilter::new().program_id(EqualFilter::equal_any(vec![
            program1.id.clone(),
            program2.id.clone(),
        ]));

        MasterListNameJoinRepository::new(&connection)
            .upsert_one(&master_list_name_join2)
            .unwrap();

        let result = ProgramSupplierRepository::new(&connection).query(&store3.id, filter);

        assert_eq!(
            result,
            Ok(vec![ProgramSupplier {
                supplier: Name {
                    name_row: store_name1.clone(),
                    name_link_row: store_name_link1.clone(),
                    name_store_join_row: Some(name_store_join2.clone()),
                    store_row: Some(store1.clone()),
                    properties: None,
                },
                program: program1.clone()
            }])
        );

        // TEST 3 with master list join for store 1 and with name_store_join for store 2
        // should result in two found, store_name1 and store_name2
        let filter = ProgramSupplierFilter::new().program_id(EqualFilter::equal_any(vec![
            program1.id.clone(),
            program2.id.clone(),
        ]));

        NameStoreJoinRepository::new(&connection)
            .upsert_one(&name_store_join3)
            .unwrap();

        let mut result = ProgramSupplierRepository::new(&connection)
            .query(&store3.id, filter)
            .unwrap();
        result.sort_by(|a, b| a.supplier.name_row.id.cmp(&b.supplier.name_row.id));

        assert_eq!(
            result,
            vec![
                ProgramSupplier {
                    supplier: Name {
                        name_row: store_name1.clone(),
                        name_link_row: store_name_link1,
                        name_store_join_row: Some(name_store_join2.clone()),
                        store_row: Some(store1.clone()),
                        properties: None,
                    },
                    program: program1.clone()
                },
                ProgramSupplier {
                    supplier: Name {
                        name_row: store_name2.clone(),
                        name_link_row: store_name_link2,
                        name_store_join_row: Some(name_store_join3.clone()),
                        store_row: Some(store2.clone()),
                        properties: None,
                    },
                    program: program2.clone()
                }
            ]
        );
    }
}
