use diesel::prelude::*;

use crate::{
    db_diesel::{
        master_list_row::master_list::dsl as master_list_dsl,
        name_tag_row::name_tag::dsl as name_tag_dsl,
    },
    program_requisition_settings_row::program_requisition_settings::dsl as program_requisition_settings_dsl,
    program_row::program::dsl as program_dsl,
    repository_error::RepositoryError,
    MasterListFilter, MasterListRepository, MasterListRow, NameTagFilter, NameTagRepository,
    ProgramRequisitionSettingsRow, ProgramRow, StorageConnection,
};

pub type ProgramRequisitionSettingsJoin =
    (ProgramRequisitionSettingsRow, ProgramRow, MasterListRow);

#[derive(Debug, PartialEq)]
pub struct ProgramRequisitionSettings {
    pub program_settings_row: ProgramRequisitionSettingsRow,
    pub program_row: ProgramRow,
    pub master_list: MasterListRow,
}

#[derive(Clone, PartialEq, Debug, Default)]
pub struct ProgramRequisitionSettingsFilter {
    pub name_tag: Option<NameTagFilter>,
    pub master_list: Option<MasterListFilter>,
}

pub struct ProgramRequisitionSettingsRepository<'a> {
    connection: &'a StorageConnection,
}

impl<'a> ProgramRequisitionSettingsRepository<'a> {
    pub fn new(connection: &'a StorageConnection) -> Self {
        ProgramRequisitionSettingsRepository { connection }
    }

    pub fn query(
        &self,
        filter: Option<ProgramRequisitionSettingsFilter>,
    ) -> Result<Vec<ProgramRequisitionSettings>, RepositoryError> {
        let mut query = program_requisition_settings_dsl::program_requisition_settings
            .inner_join(program_dsl::program)
            .inner_join(
                master_list_dsl::master_list
                    .on(master_list_dsl::id.eq(program_dsl::master_list_id)),
            )
            .into_boxed();

        if let Some(ProgramRequisitionSettingsFilter {
            name_tag,
            master_list,
        }) = filter
        {
            if name_tag.is_some() {
                let name_tag_ids =
                    NameTagRepository::create_filtered_query(name_tag).select(name_tag_dsl::id);
                query = query
                    .filter(program_requisition_settings_dsl::name_tag_id.eq_any(name_tag_ids));
            }

            if master_list.is_some() {
                let master_list_ids = MasterListRepository::create_filtered_query(master_list)
                    .select(master_list_dsl::id);
                query = query.filter(program_dsl::master_list_id.eq_any(master_list_ids));
            }
        }

        //  Debug diesel query
        // println!(
        //     "{}",
        //     diesel::debug_query::<crate::DBType, _>(&query).to_string()
        // );

        let result =
            query.load::<ProgramRequisitionSettingsJoin>(self.connection.lock().connection())?;

        Ok(result
            .into_iter()
            .map(
                |(program_settings_row, program_row, master_list)| ProgramRequisitionSettings {
                    program_settings_row,
                    program_row,
                    master_list,
                },
            )
            .collect())
    }
}

impl ProgramRequisitionSettingsFilter {
    pub fn new() -> ProgramRequisitionSettingsFilter {
        Default::default()
    }

    pub fn name_tag(mut self, filter: NameTagFilter) -> Self {
        self.name_tag = Some(filter);
        self
    }

    pub fn master_list(mut self, filter: MasterListFilter) -> Self {
        self.master_list = Some(filter);
        self
    }
}

#[cfg(test)]
mod test {
    use crate::{
        mock::{
            mock_name_store_a, mock_period_schedule_1, mock_store_a, MockData, MockDataInserts,
        },
        test_db::setup_all_with_data,
        ContextRow, EqualFilter, MasterListFilter, MasterListNameJoinRow, MasterListRow,
        NameTagFilter, NameTagJoinRow, NameTagRow, ProgramRequisitionSettings,
        ProgramRequisitionSettingsFilter, ProgramRequisitionSettingsRepository,
        ProgramRequisitionSettingsRow, ProgramRow,
    };

    #[actix_rt::test]
    async fn program_requisition_settings_repository() {
        let name_tag1 = NameTagRow {
            id: "name_tag1".to_string(),
            name: "tag1".to_string(),
        };
        let name_tag_join1 = NameTagJoinRow {
            id: "name_tag_join1".to_string(),
            name_tag_id: name_tag1.id.clone(),
            name_link_id: mock_name_store_a().id,
        };
        let master_list = MasterListRow {
            id: "master_list1".to_string(),
            is_active: true,
            ..Default::default()
        };
        let master_list_name_join = MasterListNameJoinRow {
            id: "master_list_name_join".to_string(),
            name_link_id: mock_name_store_a().id,
            master_list_id: master_list.id.clone(),
        };
        let context = ContextRow {
            id: "program1".to_string(),
            name: "program1".to_string(),
        };
        let program = ProgramRow {
            id: "program1".to_string(),
            master_list_id: master_list.id.clone(),
            context_id: context.id.clone(),
            ..Default::default()
        };
        let program_requisition_setting = ProgramRequisitionSettingsRow {
            id: "program_setting1".to_string(),
            program_id: program.id.clone(),
            name_tag_id: name_tag1.id.clone(),
            period_schedule_id: mock_period_schedule_1().id,
        };
        let (_, connection, _, _) = setup_all_with_data(
            "program_requisition_settings_repository",
            MockDataInserts::none()
                .names()
                .stores()
                .periods()
                .period_schedules(),
            MockData {
                name_tags: vec![name_tag1],
                name_tag_joins: vec![name_tag_join1],
                master_lists: vec![master_list.clone()],
                contexts: vec![context],
                programs: vec![program.clone()],
                master_list_name_joins: vec![master_list_name_join],
                program_requisition_settings: vec![program_requisition_setting.clone()],
                ..Default::default()
            },
        )
        .await;

        let repo = ProgramRequisitionSettingsRepository::new(&connection);

        // TEST that program_requisition_settings can be queried by name_tag belonging to a store
        let result = repo.query(Some(ProgramRequisitionSettingsFilter::new().name_tag(
            NameTagFilter::new().store_id(EqualFilter::equal_to(&mock_store_a().id)),
        )));

        assert_eq!(
            result,
            Ok(vec![ProgramRequisitionSettings {
                program_settings_row: program_requisition_setting.clone(),
                program_row: program.clone(),
                master_list: master_list.clone()
            }])
        );
        // TEST that program_requisition_settings can be queried by master list linked to a store
        let result = repo.query(Some(ProgramRequisitionSettingsFilter::new().master_list(
            MasterListFilter::new().exists_for_store_id(EqualFilter::equal_to(&mock_store_a().id)),
        )));

        assert_eq!(
            result,
            Ok(vec![ProgramRequisitionSettings {
                program_settings_row: program_requisition_setting.clone(),
                program_row: program.clone(),
                master_list: master_list.clone()
            }])
        );
    }
}
