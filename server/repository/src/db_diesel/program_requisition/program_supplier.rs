use diesel::prelude::*;

use crate::{
    db_diesel::{
        master_list_name_join::master_list_name_join::dsl as master_list_name_join_dsl,
        master_list_row::master_list::dsl as master_list_dsl, name_row::name::dsl as name_dsl,
        name_store_join::name_store_join::dsl as name_store_join_dsl,
        program_row::program::dsl as program_dsl, store_row::store::dsl as store_dsl,
    },
    diesel_macros::apply_equal_filter,
    repository_error::RepositoryError,
    EqualFilter, Name, NameFilter, NameRepository, NameRow, NameStoreJoinRow, ProgramRow,
    StorageConnection, StoreRow,
};

pub type ProgramSupplierJoin = (NameRow, NameStoreJoinRow, StoreRow, ProgramRow);

#[derive(Debug, PartialEq, Clone)]
pub struct ProgramSupplier {
    pub supplier: Name,
    pub program: ProgramRow,
}

#[derive(Clone, PartialEq, Debug, Default)]
pub struct ProgramSupplierFilter {
    pub program_id: Option<EqualFilter<String>>,
    pub name: Option<NameFilter>,
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
            name: name_filter,
        }: ProgramSupplierFilter,
    ) -> Result<Vec<ProgramSupplier>, RepositoryError> {
        let mut query = NameRepository::create_filtered_query(store_id.to_string(), name_filter)
            .inner_join(
                master_list_name_join_dsl::master_list_name_join
                    .on(master_list_name_join_dsl::name_id.eq(name_dsl::id)),
            )
            .inner_join(
                master_list_dsl::master_list
                    .on(master_list_dsl::id.eq(master_list_name_join_dsl::master_list_id)),
            )
            .inner_join(
                program_dsl::program.on(program_dsl::master_list_id.eq(master_list_dsl::id)),
            );

        apply_equal_filter!(query, program_id_filter, program_dsl::id);

        //  Debug diesel query
        println!(
            "{}",
            diesel::debug_query::<crate::DBType, _>(&query).to_string()
        );

        let query = query.select((
            // Same as NameRepository
            name_dsl::name::all_columns(),
            name_store_join_dsl::name_store_join::all_columns(),
            store_dsl::store::all_columns(),
            program_dsl::program::all_columns(),
        ));
        let result = query.load::<ProgramSupplierJoin>(&self.connection.connection)?;

        Ok(result
            .into_iter()
            .map(
                |(name_row, name_store_join_row, store_row, program)| ProgramSupplier {
                    supplier: Name::from_join((
                        name_row,
                        Some(name_store_join_row),
                        Some(store_row),
                    )),
                    program,
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

    pub fn name(mut self, filter: NameFilter) -> Self {
        self.name = Some(filter);
        self
    }
}

#[cfg(test)]
mod test {
    use crate::{
        mock::{MockData, MockDataInserts},
        test_db::setup_all_with_data,
        EqualFilter, MasterListNameJoinRepository, MasterListNameJoinRow, MasterListRow, Name,
        NameFilter, NameRow, NameStoreJoinRepository, NameStoreJoinRow, ProgramRow,
        ProgramSupplier, ProgramSupplierFilter, ProgramSupplierRepository, StoreRow,
    };

    #[actix_rt::test]
    async fn program_requisition_settings_repository() {
        let name1 = NameRow {
            id: "name1".to_string(),
            ..Default::default()
        };

        let store_name1 = NameRow {
            id: "store_name1".to_string(),
            ..Default::default()
        };
        let store1 = StoreRow {
            id: "store1".to_string(),
            name_id: store_name1.id.clone(),
            ..Default::default()
        };
        let store_name2 = NameRow {
            id: "store_name2".to_string(),
            ..Default::default()
        };

        let store2 = StoreRow {
            id: "store2".to_string(),
            name_id: store_name2.id.clone(),
            ..Default::default()
        };

        let store_name3 = NameRow {
            id: "store_name3".to_string(),
            ..Default::default()
        };
        let store3 = StoreRow {
            id: "store3".to_string(),
            name_id: store_name3.id.clone(),
            ..Default::default()
        };

        let master_list1 = MasterListRow {
            id: "master_list1".to_string(),
            ..Default::default()
        };
        let program1 = ProgramRow {
            id: "program1".to_string(),
            master_list_id: master_list1.id.clone(),
            ..Default::default()
        };

        let master_list2 = MasterListRow {
            id: "master_list2".to_string(),
            ..Default::default()
        };

        let program2 = ProgramRow {
            id: "program2".to_string(),
            master_list_id: master_list2.id.clone(),
            ..Default::default()
        };

        let master_list_name_join1 = MasterListNameJoinRow {
            id: "master_list_name_join1".to_string(),
            name_id: name1.id.clone(),
            master_list_id: master_list1.id.clone(),
        };
        let master_list_name_join2 = MasterListNameJoinRow {
            id: "master_list_name_join2".to_string(),
            name_id: store_name1.id.clone(),
            master_list_id: master_list1.id.clone(),
        };
        let master_list_name_join3 = MasterListNameJoinRow {
            id: "master_list_name_join3".to_string(),
            name_id: store_name2.id.clone(),
            master_list_id: master_list2.id.clone(),
        };

        let name_store_join1 = NameStoreJoinRow {
            id: "name_store_join1".to_string(),
            name_id: name1.id.clone(),
            store_id: store3.id.clone(),
            ..Default::default()
        };
        let name_store_join2 = NameStoreJoinRow {
            id: "name_store_join2".to_string(),
            name_id: store_name1.id.clone(),
            store_id: store3.id.clone(),
            ..Default::default()
        };

        let name_store_join3 = NameStoreJoinRow {
            id: "name_store_join3".to_string(),
            name_id: store_name2.id.clone(),
            store_id: store3.id.clone(),
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
                master_lists: vec![master_list1, master_list2],
                programs: vec![program1.clone(), program2.clone()],
                master_list_name_joins: vec![master_list_name_join1, master_list_name_join3],
                name_store_joins: vec![name_store_join1.clone(), name_store_join2.clone()],
                ..Default::default()
            },
        )
        .await;

        // TEST 1 without master list join for store 1 and without name_store_join for store 2
        // should result in nothing (since name1 is not store)
        let repo = ProgramSupplierRepository::new(&connection);

        let filter = ProgramSupplierFilter::new()
            .program_id(EqualFilter::equal_any(vec![
                program1.id.clone(),
                program2.id.clone(),
            ]))
            .name(NameFilter::new().is_store(true).is_visible(true));

        let result = repo.query(&store3.id, filter);

        assert_eq!(result, Ok(Vec::new()));

        // TEST 2 with master list join for store 1 and without name_store_join for store 2
        // should result in one found, store_name1
        let filter = ProgramSupplierFilter::new()
            .program_id(EqualFilter::equal_any(vec![
                program1.id.clone(),
                program2.id.clone(),
            ]))
            .name(NameFilter::new().is_store(true).is_visible(true));

        MasterListNameJoinRepository::new(&connection)
            .upsert_one(&master_list_name_join2)
            .unwrap();

        let result = repo.query(&store3.id, filter);

        assert_eq!(
            result,
            Ok(vec![ProgramSupplier {
                supplier: Name {
                    name_row: store_name1.clone(),
                    name_store_join_row: Some(name_store_join2.clone()),
                    store_row: Some(store1.clone()),
                },
                program: program1.clone()
            }])
        );

        // TEST 3 with master list join for store 1 and with name_store_join for store 2
        // should result in two found, store_name1 and store_name2
        let filter = ProgramSupplierFilter::new()
            .program_id(EqualFilter::equal_any(vec![
                program1.id.clone(),
                program2.id.clone(),
            ]))
            .name(NameFilter::new().is_store(true).is_visible(true));

        NameStoreJoinRepository::new(&connection)
            .upsert_one(&name_store_join3)
            .unwrap();

        let result = repo.query(&store3.id, filter);

        assert_eq!(
            result,
            Ok(vec![
                ProgramSupplier {
                    supplier: Name {
                        name_row: store_name1.clone(),
                        name_store_join_row: Some(name_store_join2.clone()),
                        store_row: Some(store1.clone()),
                    },
                    program: program1.clone()
                },
                ProgramSupplier {
                    supplier: Name {
                        name_row: store_name2.clone(),
                        name_store_join_row: Some(name_store_join3.clone()),
                        store_row: Some(store2.clone()),
                    },
                    program: program2.clone()
                }
            ])
        );
    }
}
