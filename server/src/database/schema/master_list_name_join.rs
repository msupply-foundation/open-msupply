use super::diesel_schema::master_list_name_join;

#[derive(Clone, Insertable, Queryable, Debug, PartialEq, Eq, AsChangeset)]
#[table_name = "master_list_name_join"]
pub struct MasterListNameJoinRow {
    pub id: String,
    pub master_list_id: String,
    pub name_id: String,
}
