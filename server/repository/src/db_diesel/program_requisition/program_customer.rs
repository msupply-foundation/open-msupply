use diesel::prelude::*;

use crate::{
    db_diesel::{
        master_list_name_join::master_list_name_join::dsl as master_list_name_join_dsl,
        master_list_row::master_list::dsl as master_list_dsl,
        name_link_row::name_link::dsl as name_link_dsl, name_row::name::dsl as name_dsl,
        name_store_join::name_store_join::dsl as name_store_join_dsl,
        program_row::program::dsl as program_dsl, store_row::store::dsl as store_dsl,
    },
    diesel_macros::apply_equal_filter,
    name_oms_fields, name_oms_fields_alias,
    repository_error::RepositoryError,
    EqualFilter, Name, NameFilter, NameLinkRow, NameOmsFieldsRow, NameRepository, NameRow,
    NameStoreJoinRow, ProgramRow, StorageConnection, StoreRow,
};

pub type ProgramCustomerJoin = (
    NameRow,
    NameOmsFieldsRow,
    NameLinkRow,
    Option<NameStoreJoinRow>,
    Option<StoreRow>,
    ProgramRow,
);

#[derive(Debug, PartialEq, Clone)]
pub struct ProgramCustomer {
    pub customer: Name,
    pub program: ProgramRow,
}

#[derive(Clone, PartialEq, Debug, Default)]
pub struct ProgramCustomerFilter {
    pub program_id: Option<EqualFilter<String>>,
}

pub struct ProgramCustomerRepository<'a> {
    connection: &'a StorageConnection,
}

impl<'a> ProgramCustomerRepository<'a> {
    pub fn new(connection: &'a StorageConnection) -> Self {
        ProgramCustomerRepository { connection }
    }

    pub fn query(
        &self,
        store_id: &str,
        ProgramCustomerFilter {
            program_id: program_id_filter,
        }: ProgramCustomerFilter,
    ) -> Result<Vec<ProgramCustomer>, RepositoryError> {
        let name_filter = NameFilter::new().is_visible(true).is_customer(true);

        let mut query =
            NameRepository::create_filtered_query(store_id.to_string(), Some(name_filter))
                .inner_join(
                    master_list_name_join_dsl::master_list_name_join
                        .on(master_list_name_join_dsl::name_link_id.eq(name_link_dsl::id)),
                )
                .inner_join(
                    master_list_dsl::master_list
                        .on(master_list_dsl::id.eq(master_list_name_join_dsl::master_list_id)),
                )
                .inner_join(
                    program_dsl::program
                        .on(program_dsl::master_list_id.eq(master_list_dsl::id.nullable())),
                );

        apply_equal_filter!(query, program_id_filter, program_dsl::id);

        //  Debug diesel query
        // println!(
        //     "{}",
        //     diesel::debug_query::<crate::DBType, _>(&query).to_string()
        // );

        let query = query.select((
            // Same as NameRepository
            name_dsl::name::all_columns(),
            name_oms_fields_alias.fields((name_oms_fields::id, name_oms_fields::properties)),
            name_link_dsl::name_link::all_columns()
                .nullable()
                .assume_not_null(),
            name_store_join_dsl::name_store_join::all_columns().nullable(),
            store_dsl::store::all_columns().nullable(),
            program_dsl::program::all_columns()
                .nullable()
                .assume_not_null(),
        ));
        let result = query.load::<ProgramCustomerJoin>(self.connection.lock().connection())?;

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
                    ProgramCustomer {
                        customer: Name::from_join((
                            name_row,
                            (name_link_row, name_store_join_row, store_row),
                            name_oms_fields_row,
                        )),
                        program,
                    }
                },
            )
            .collect())
    }
}

impl ProgramCustomerFilter {
    pub fn new() -> ProgramCustomerFilter {
        Default::default()
    }

    pub fn program_id(mut self, filter: EqualFilter<String>) -> Self {
        self.program_id = Some(filter);
        self
    }
}
