mod map;
mod prepare;

use map::map;
use prepare::prepare;

use repository::{
    PeriodRow, ProgramRequisitionOrderTypeRow, ProgramRequisitionSettings, ProgramSupplier,
    RepositoryError,
};

use crate::service_provider::ServiceContext;

#[derive(Debug, PartialEq)]
pub struct OrderType {
    pub order_type: ProgramRequisitionOrderTypeRow,
    pub available_periods: Vec<PeriodRow>,
}

#[derive(Debug, PartialEq)]
pub struct ProgramSettings {
    pub program_requisition_settings: ProgramRequisitionSettings,
    pub suppliers: Vec<ProgramSupplier>,
    pub order_types: Vec<OrderType>,
}

// TODO only return and calculate for X number of periods from now ? (back and forward)

/// Method will calculate program settings for a store, broken down into two tasks, prepare and map
/// See prepare and map for detailed descriptions
pub(super) fn get_program_requisition_settings(
    ctx: &ServiceContext,
    store_id: &str,
) -> Result<Vec<ProgramSettings>, RepositoryError> {
    // Get program_settings, order_types, periods and requisitions_in_periods for a store
    let Some(prepared) = prepare(ctx, store_id)? else {
        return Ok(Vec::new());
    };

    // Map program_settings, order_types, periods and requisitions_in_periods to ProgramSettings
    Ok(map(prepared))
}

#[cfg(test)]
mod test {
    use repository::{
        mock::{
            mock_name_store_a, mock_name_store_b, mock_name_store_c, mock_store_a, mock_store_b,
            mock_store_c, MockData, MockDataInserts,
        },
        ContextRow, MasterListNameJoinRow, MasterListRow, Name, NameStoreJoinRow, NameTagJoinRow,
        NameTagRow, PeriodRow, PeriodScheduleRow, ProgramRequisitionOrderTypeRow,
        ProgramRequisitionSettings, ProgramRequisitionSettingsRow, ProgramRow, ProgramSupplier,
        RequisitionRow,
    };

    use crate::{
        requisition::program_settings::{OrderType, ProgramSettings},
        test_helpers::{setup_all_with_data_and_service_provider, ServiceTestContext},
    };

    #[actix_rt::test]
    async fn get_program_requisition_settings() {
        // Mock Data

        // Two tags for store a
        let name_tag1 = NameTagRow {
            id: "name_tag1".to_string(),
            ..Default::default()
        };
        let name_tag_join1 = NameTagJoinRow {
            id: "name_tag_join1".to_string(),
            name_tag_id: name_tag1.id.clone(),
            name_link_id: mock_name_store_a().id,
            ..Default::default()
        };
        let name_tag2 = NameTagRow {
            id: "name_tag2".to_string(),
            ..Default::default()
        };
        let name_tag_join2 = NameTagJoinRow {
            id: "name_tag_join2".to_string(),
            name_tag_id: name_tag2.id.clone(),
            name_link_id: mock_name_store_a().id,
            ..Default::default()
        };

        // Two programs, with master list both joined to store a
        let master_list1 = MasterListRow {
            id: "master_list1".to_string(),
            is_active: true,
            ..Default::default()
        };
        let master_list_name_join1 = MasterListNameJoinRow {
            id: "master_list_name_join1".to_string(),
            name_link_id: mock_name_store_a().id,
            master_list_id: master_list1.id.clone(),
        };
        let context1 = ContextRow {
            id: "program1".to_string(),
            name: "program1".to_string(),
        };
        let program1 = ProgramRow {
            id: "program1".to_string(),
            master_list_id: master_list1.id.clone(),
            context_id: context1.id.clone(),
            ..Default::default()
        };
        let master_list2 = MasterListRow {
            id: "master_list2".to_string(),
            is_active: true,
            ..Default::default()
        };
        let master_list_name_join2 = MasterListNameJoinRow {
            id: "master_list_name_join2".to_string(),
            name_link_id: mock_name_store_a().id,
            master_list_id: master_list2.id.clone(),
        };
        let context2 = ContextRow {
            id: "program2".to_string(),
            name: "program2".to_string(),
        };
        let program2 = ProgramRow {
            id: "program2".to_string(),
            master_list_id: master_list2.id.clone(),
            context_id: context2.id.clone(),
            ..Default::default()
        };

        // Two periods schedules with two periods
        let period_schedule1 = PeriodScheduleRow {
            id: "period_schedule1".to_string(),
            ..Default::default()
        };
        let period_schedule2 = PeriodScheduleRow {
            id: "period_schedule2".to_string(),
            ..Default::default()
        };
        let period1 = PeriodRow {
            id: "period1".to_string(),
            period_schedule_id: period_schedule1.id.clone(),
            ..Default::default()
        };
        let period2 = PeriodRow {
            id: "period2".to_string(),
            period_schedule_id: period_schedule1.id.clone(),
            ..Default::default()
        };
        let period3 = PeriodRow {
            id: "period3".to_string(),
            period_schedule_id: period_schedule2.id.clone(),
            ..Default::default()
        };
        let period4 = PeriodRow {
            id: "period4".to_string(),
            period_schedule_id: period_schedule2.id.clone(),
            ..Default::default()
        };

        // Two program settings, for tag1 and tag2, with one order type
        let program_requisition_setting1 = ProgramRequisitionSettingsRow {
            id: "program_setting1".to_string(),
            program_id: program1.id.clone(),
            name_tag_id: name_tag1.id.clone(),
            period_schedule_id: period_schedule1.id.clone(),
            ..Default::default()
        };
        let order_type1 = ProgramRequisitionOrderTypeRow {
            id: "order_type1".to_string(),
            name: "Order Type 1".to_string(),
            program_requisition_settings_id: program_requisition_setting1.id.clone(),
            max_order_per_period: 1,
            ..Default::default()
        };
        let program_requisition_setting2 = ProgramRequisitionSettingsRow {
            id: "program_setting2".to_string(),
            program_id: program2.id.clone(),
            name_tag_id: name_tag2.id.clone(),
            period_schedule_id: period_schedule2.id.clone(),
            ..Default::default()
        };
        let order_type2 = ProgramRequisitionOrderTypeRow {
            id: "order_type2".to_string(),
            name: "Order Type 2".to_string(),
            program_requisition_settings_id: program_requisition_setting2.id.clone(),
            max_order_per_period: 1,
            ..Default::default()
        };

        // Two requisitions, one for period 1 for program 1 for order type 1
        // second for period 4 for program 2 for order type 2
        let requisition1 = RequisitionRow {
            id: "requisition1".to_string(),
            order_type: Some("Order Type 1".to_string()),
            name_link_id: mock_name_store_a().id,
            store_id: mock_store_a().id,
            period_id: Some(period1.id.clone()),
            program_id: Some(program1.id.clone()),
            ..Default::default()
        };
        let requisition2 = RequisitionRow {
            id: "requisition2".to_string(),
            // Checking case insensitive match
            order_type: Some("OrDeR TyPe 2".to_string()),
            name_link_id: mock_name_store_a().id,
            store_id: mock_store_a().id,
            period_id: Some(period4.id.clone()),
            program_id: Some(program2.id.clone()),
            ..Default::default()
        };

        // mock_name_store_b and mock_name_store_c to be joined
        // to program 1 and program 2 respecively and visible in mock_store_a
        let master_list_name_join3 = MasterListNameJoinRow {
            id: "master_list_name_join3".to_string(),
            name_link_id: mock_name_store_b().id,
            master_list_id: master_list1.id.clone(),
        };
        let master_list_name_join4 = MasterListNameJoinRow {
            id: "master_list_name_join4".to_string(),
            name_link_id: mock_name_store_c().id,
            master_list_id: master_list2.id.clone(),
        };
        let name_store_join1 = NameStoreJoinRow {
            id: "name_store_join1".to_string(),
            name_link_id: mock_name_store_b().id.clone(),
            store_id: mock_store_a().id,
            name_is_supplier: true,
            ..Default::default()
        };
        let name_store_join2 = NameStoreJoinRow {
            id: "name_store_join2".to_string(),
            name_link_id: mock_name_store_c().id.clone(),
            store_id: mock_store_a().id,
            name_is_supplier: true,
            ..Default::default()
        };
        let ServiceTestContext {
            service_provider,
            service_context,
            ..
        } = setup_all_with_data_and_service_provider(
            "get_program_requisition_settings",
            MockDataInserts::none().names().stores().period_schedules(),
            MockData {
                periods: vec![
                    period1.clone(),
                    period2.clone(),
                    period3.clone(),
                    period4.clone(),
                ],
                period_schedules: vec![period_schedule1, period_schedule2],
                name_tags: vec![name_tag1, name_tag2],
                name_tag_joins: vec![name_tag_join1, name_tag_join2],
                name_store_joins: vec![name_store_join1.clone(), name_store_join2.clone()],
                master_lists: vec![master_list1.clone(), master_list2.clone()],
                master_list_name_joins: vec![
                    master_list_name_join1,
                    master_list_name_join2,
                    master_list_name_join3,
                    master_list_name_join4,
                ],
                program_requisition_settings: vec![
                    program_requisition_setting1.clone(),
                    program_requisition_setting2.clone(),
                ],
                program_order_types: vec![order_type1.clone(), order_type2.clone()],
                contexts: vec![context1.clone(), context2.clone()],
                programs: vec![program1.clone(), program2.clone()],
                requisitions: vec![requisition1.clone(), requisition2.clone()],
                ..Default::default()
            },
        )
        .await;

        // Test

        let mut result = service_provider
            .requisition_service
            .get_program_requisition_settings(&service_context, &mock_store_a().id)
            .unwrap();
        result.sort_by(|a, b| {
            a.program_requisition_settings
                .program_settings_row
                .id
                .cmp(&b.program_requisition_settings.program_settings_row.id)
        });

        assert_eq!(
            result,
            // Should have two program settings (two programs)
            vec![
                ProgramSettings {
                    program_requisition_settings: ProgramRequisitionSettings {
                        program_settings_row: program_requisition_setting1.clone(),
                        program_row: program1.clone(),
                        master_list: master_list1.clone()
                    },
                    order_types: vec![OrderType {
                        order_type: order_type1.clone(),
                        available_periods: vec![
                            // Only period1 and period2 for this program setting period_schedule
                            // period1 is used by 1st requisition
                            period2
                        ]
                    }],
                    suppliers: vec![ProgramSupplier {
                        // program1 master list only visible in mock_name_store_b supplier
                        supplier: Name {
                            name_row: mock_name_store_b(),
                            name_store_join_row: Some(name_store_join1.clone()),
                            store_row: Some(mock_store_b()),
                        },
                        program: program1.clone(),
                    }]
                },
                ProgramSettings {
                    program_requisition_settings: ProgramRequisitionSettings {
                        program_settings_row: program_requisition_setting2.clone(),
                        program_row: program2.clone(),
                        master_list: master_list2.clone()
                    },
                    order_types: vec![OrderType {
                        order_type: order_type2.clone(),
                        available_periods: vec![
                            // Only period3 and period4 for this program setting period_schedule
                            // period4 is used by 1st requisition
                            period3
                        ]
                    }],
                    suppliers: vec![ProgramSupplier {
                        // program2 master list only visible in mock_name_store_c supplier
                        supplier: Name {
                            name_row: mock_name_store_c(),
                            name_store_join_row: Some(name_store_join2.clone()),
                            store_row: Some(mock_store_c()),
                        },
                        program: program2.clone(),
                    }]
                }
            ]
        )
    }
}
