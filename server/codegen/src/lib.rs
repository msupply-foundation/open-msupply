use convert_case::{Case, Casing};
use prettyplease;
use quote::{format_ident, quote};
use syn;

pub fn generate_repository_code(name_camel_case: &str) -> String {
    let name_snake_case = name_camel_case.to_case(Case::Snake);

    let row_repository_name = format_ident!("{}RowRepository", name_camel_case);
    let repository_name = format_ident!("{}Repository", name_camel_case);
    let struct_name = format_ident!("{}Row", name_camel_case);
    let row_path_name = format_ident!("{}_row", name_snake_case);
    let table_name = format_ident!("{}", name_snake_case);
    let dsl = format_ident!("{}_dsl", name_snake_case);
    let filter_name = format_ident!("{}Filter", name_camel_case);
    let sort_name = format_ident!("{}Sort", name_camel_case);
    let store_field_name = format_ident!("{}SortField", name_camel_case);
    let boxed_query_name = format_ident!("Boxed{}Query", name_camel_case);

    let output = quote! {use super::#row_path_name::{
        #table_name::{self, dsl as #dsl},
        #struct_name,
    };

    use diesel::{dsl::IntoBoxed, prelude::*};

    use crate::{
        diesel_macros::{apply_equal_filter, apply_sort_no_case, apply_string_filter},
        repository_error::RepositoryError,
        DBType, EqualFilter, Pagination, Sort, StorageConnection, StringFilter,
    };

    pub enum #store_field_name {
        Name,
    }

    pub type #sort_name = Sort<#store_field_name>;

    #[derive(Clone, Default)]
    pub struct #filter_name {
        pub id: Option<EqualFilter<String>>,
        pub name: Option<StringFilter>,
    }

    impl #filter_name {
        pub fn new() -> #filter_name {
            Self::default()
        }

        pub fn id(mut self, filter: EqualFilter<String>) -> Self {
            self.id = Some(filter);
            self
        }

        pub fn name(mut self, filter: StringFilter) -> Self {
            self.name = Some(filter);
            self
        }
    }

    pub struct #repository_name<'a> {
        connection: &'a StorageConnection,
    }

    impl<'a> #repository_name<'a> {
        pub fn new(connection: &'a StorageConnection) -> Self {
            #repository_name { connection }
        }

        pub fn count(&self, filter: Option<#filter_name>) -> Result<i64, RepositoryError> {
            let query = create_filtered_query(filter);

            Ok(query
                .count()
                .get_result(self.connection.lock().connection())?)
        }

        pub fn query_one(
            &self,
            filter: #filter_name,
        ) -> Result<Option<#struct_name>, RepositoryError> {
            Ok(self.query_by_filter(filter)?.pop())
        }

        pub fn query_by_filter(
            &self,
            filter: #filter_name,
        ) -> Result<Vec<#struct_name>, RepositoryError> {
            self.query(Pagination::all(), Some(filter), None)
        }

        pub fn query(
            &self,
            pagination: Pagination,
            filter: Option<#filter_name>,
            sort: Option<#sort_name>,
        ) -> Result<Vec<#struct_name>, RepositoryError> {
            let mut query = create_filtered_query(filter);

            if let Some(sort) = sort {
                match sort.key {
                    #store_field_name::Name => {
                        apply_sort_no_case!(query, sort, #dsl::name);
                    }
                }
            } else {
                query = query.order(#dsl::id.asc())
            }

            let final_query = query
                .offset(pagination.offset as i64)
                .limit(pagination.limit as i64);

            // Debug diesel query
            // println!(
            //    "{}",
            //     diesel::debug_query::<DBType, _>(&final_query).to_string()
            // );

            let result = final_query.load::<#struct_name>(self.connection.lock().connection())?;

            Ok(result.into_iter().map(to_domain).collect())
        }
    }

    fn to_domain(record_row: #struct_name) -> #struct_name {
        record_row
    }

    type #boxed_query_name = IntoBoxed<'static, #table_name::table, DBType>;

    fn create_filtered_query(filter: Option<#filter_name>) -> #boxed_query_name {
        let mut query = #dsl::#table_name.into_boxed();

        if let Some(f) = filter {
            let #filter_name { id, name } = f;

            apply_equal_filter!(query, id, #dsl::id);
            apply_string_filter!(query, name, #dsl::name);
        }
        query
    }

    #[cfg(test)]
    mod tests {
        use crate::{
            assets::{
                #table_name::#repository_name,
                asset_class_row::{#struct_name, #row_repository_name},
            },
            mock::MockDataInserts,
            test_db, EqualFilter, StringFilter,
        };

        use super::#filter_name;

        #[actix_rt::test]
        async fn test_asset_class_query_repository() {
            // Prepare
            let (_, storage_connection, _, _) =
                test_db::setup_all("test_asset_class_query_repository", MockDataInserts::none()).await;

            let id = "test_id".to_string();
            let name = "test_name".to_string();

            // Insert a row
            let _reference_data_row =
                #row_repository_name::new(&storage_connection).upsert_one(&#struct_name {
                    id: id.clone(),
                    name: name.clone(),
                });

            // Query by id
            let reference_data = #repository_name::new(&storage_connection)
                .query_one(#filter_name::new().id(EqualFilter::equal_to(&id)))
                .unwrap()
                .unwrap();
            assert_eq!(reference_data.id, id);
            assert_eq!(reference_data.name, name);

            // Query by name
            let reference_data = #repository_name::new(&storage_connection)
                .query_one(#filter_name::new().name(StringFilter::equal_to(&name)))
                .unwrap()
                .unwrap();
            assert_eq!(reference_data.id, id);
            assert_eq!(reference_data.name, name);
        }
    }

        };
    // output.to_string()

    // print!("{}", output);

    let syntax_tree = syn::parse2(output).unwrap();
    let formatted = prettyplease::unparse(&syntax_tree);
    // println!("{}", formatted);
    formatted
}

pub fn generate_repository_row_code(name_camel_case: &str) -> String {
    let name_snake_case = name_camel_case.to_case(Case::Snake);

    let row_repository_name = format_ident!("{}RowRepository", name_camel_case);
    let struct_name = format_ident!("{}Row", name_camel_case);
    let row_path_name = format_ident!("{}_row", name_snake_case);
    let table_name = format_ident!("{}", name_snake_case);
    let change_log_table_name = format_ident!("{}", name_camel_case);

    let output = quote! {use super::#row_path_name::#table_name::dsl::*;

    use crate::RepositoryError;
    use crate::StorageConnection;
    use crate::Upsert;
    use crate::{ChangeLogInsertRow, ChangelogRepository, ChangelogTableName, RowActionType};

    use diesel::prelude::*;
    use serde::Deserialize;
    use serde::Serialize;

    table! {
        #table_name (id) {
            id -> Text,
            name -> Text,
        }
    }

    #[derive(
        Clone, Insertable, Queryable, Debug, PartialEq, AsChangeset, Eq, Serialize, Deserialize, Default,
    )]
    #[diesel(table_name = #table_name)]
    pub struct #struct_name {
        pub id: String,
        pub name: String,
    }

    pub struct #row_repository_name<'a> {
        connection: &'a StorageConnection,
    }

    impl<'a> #row_repository_name<'a> {
        pub fn new(connection: &'a StorageConnection) -> Self {
            #row_repository_name { connection }
        }

        pub fn upsert_one(&self, row: &#struct_name) -> Result<i64, RepositoryError> {
            diesel::insert_into(#table_name)
                .values(row)
                .on_conflict(id)
                .do_update()
                .set(row)
                .execute(self.connection.lock().connection())?;
            self.insert_changelog(&row.id, RowActionType::Upsert)
        }

        fn insert_changelog(&self, uid: &str, action: RowActionType) -> Result<i64, RepositoryError> {
            let row = ChangeLogInsertRow {
                table_name: ChangelogTableName::#change_log_table_name,
                record_id: uid.to_string(),
                row_action: action,
                store_id: None,
                name_link_id: None,
            };

            ChangelogRepository::new(self.connection).insert(&row)
        }

        pub fn find_one_by_id(
            &self,
            record_id: &str,
        ) -> Result<Option<#struct_name>, RepositoryError> {
            let result = #table_name
                .filter(id.eq(record_id))
                .first(self.connection.lock().connection())
                .optional()?;
            Ok(result)
        }

    }

    impl Upsert for #struct_name {
        fn upsert(&self, con: &StorageConnection) -> Result<Option<i64>, RepositoryError> {
            let change_log_id = #row_repository_name::new(con).upsert_one(self)?;
            Ok(Some(change_log_id))
        }

        // Test only
        fn assert_upserted(&self, con: &StorageConnection) {
            assert_eq!(
                #row_repository_name::new(con).find_one_by_id(&self.id),
                Ok(Some(self.clone()))
            )
        }
    }


    };
    // output.to_string()

    // print!("{}", output);

    let syntax_tree = syn::parse2(output).unwrap();
    let formatted = prettyplease::unparse(&syntax_tree);
    // println!("{}", formatted);
    formatted
}

#[cfg(test)]
mod tests {
    use super::*;

    #[test]
    fn test_generate_repository_code() {
        let result = generate_repository_code("TestTable");

        assert!(result.contains("TestTableRepository"));
    }

    #[test]
    fn test_generate_repository_row_code() {
        let result = generate_repository_row_code("TestTable");

        assert!(result.contains("TestTableRowRepository"));
    }
}
