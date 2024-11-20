use convert_case::{Case, Casing};
use prettyplease;
use quote::{format_ident, quote};
use syn;

pub fn generate_repository_code(name_camel_case: &str) -> String {
    let name_snake_case = name_camel_case.to_case(Case::Snake);

    let repository_name = format_ident!("{}RowRepository", name_camel_case);
    let struct_name = format_ident!("{}Row", name_camel_case);
    let path_name = format_ident!("{}_row", name_snake_case);
    let table_name = format_ident!("{}", name_snake_case);
    let change_log_table_name = format_ident!("{}", name_camel_case);

    let output = quote! {use super::#path_name::#table_name::dsl::*;

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

    pub struct #repository_name<'a> {
        connection: &'a StorageConnection,
    }

    impl<'a> #repository_name<'a> {
        pub fn new(connection: &'a StorageConnection) -> Self {
            #repository_name { connection }
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
            let change_log_id = #repository_name::new(con).upsert_one(self)?;
            Ok(Some(change_log_id))
        }

        // Test only
        fn assert_upserted(&self, con: &StorageConnection) {
            assert_eq!(
                #repository_name::new(con).find_one_by_id(&self.id),
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

        assert!(result.contains("TestTableRowRepository"));
    }
}
