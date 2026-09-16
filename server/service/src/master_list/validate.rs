use repository::{
    EqualFilter, MasterListFilter, MasterListRepository, RepositoryError, StorageConnection,
    StringFilter,
};

pub fn check_master_list_code_is_unique(
    id: &str,
    code_option: Option<String>,
    connection: &StorageConnection,
) -> Result<bool, RepositoryError> {
    match code_option {
        None => Ok(true),
        Some(code) => {
            let master_lists = MasterListRepository::new(connection).query_by_filter(
                MasterListFilter::new()
                    .code(StringFilter::equal_to(&code))
                    .id(EqualFilter::not_equal_to(id.to_string())),
            )?;

            Ok(master_lists.is_empty())
        }
    }
}
