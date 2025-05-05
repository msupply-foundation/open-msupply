use repository::{
    period, program_row::program, EqualFilter, MasterListFilter, NameRowRepository, NameTagFilter,
    PeriodRow, PeriodRowRepository, ProgramRequisitionOrderTypeRow,
    ProgramRequisitionOrderTypeRowRepository, ProgramRequisitionSettings,
    ProgramRequisitionSettingsFilter, ProgramRequisitionSettingsRepository, RepositoryError,
    RequisitionType, RequisitionsInPeriod, RequisitionsInPeriodFilter,
    RequisitionsInPeriodRepository, StoreFilter, StoreRepository,
};

use crate::{
    requisition::program_settings::common::{get_program_ids, period_is_available},
    service_provider::ServiceContext,
};

#[derive(Debug, PartialEq)]

pub struct ProgramRequisitionOrderType {
    pub name: String,
    pub program_requisition_settings_id: String,
    pub max_mos: f64,
    pub max_items_in_emergency_order: i32,
    pub id: String,
    pub is_emergency: bool,
    pub max_order_per_period: i32,
    pub threshold_mos: f64,
    pub available_periods: Vec<PeriodRow>,
}

// TODO automatically spread MasterList values rather than manual mapping
#[derive(Debug, PartialEq)]

pub struct MasterListWithOrderTypes {
    pub id: String,
    pub name: String,
    pub code: String,
    pub description: String,
    pub is_active: bool,
    pub is_default_price_list: bool,
    pub discount_percentage: Option<f64>,
    pub name_tag_id: String,
    pub name_tag: String,
    pub program_requisition_settings_id: String,
    pub order_types: Vec<ProgramRequisitionOrderType>,
}

#[derive(Debug, PartialEq)]
pub struct CustomerProgramRequisitionSetting {
    pub customer_name: String,
    pub master_lists: Vec<MasterListWithOrderTypes>,
}

/// Get program_settings, order_types, periods and requisitions_in_periods for a store.
/// program_requisition_settings are matched to store by name_tag and by visibility of the program master_list.
pub(super) fn prepare_program_requisition_settings_by_customer(
    ctx: &ServiceContext,
    customer_name_id: &str,
) -> Result<CustomerProgramRequisitionSetting, RepositoryError> {
    // get customer name
    let customer_name: Option<repository::NameRow> =
        match NameRowRepository::new(&ctx.connection).find_one_by_id(&customer_name_id) {
            Ok(Some(name_row)) => Some(name_row),
            Ok(None) => None,
            Err(_) => None,
        };

    let filter = StoreFilter::new().name_id(EqualFilter::equal_to(customer_name_id));
    // Find customer store id by customer name id
    let Some(customer_store) = StoreRepository::new(&ctx.connection).query_one(filter)? else {
        return Err(RepositoryError::NotFound);
    };

    let equal_to_store_id = EqualFilter::equal_to(&customer_store.store_row.id);

    let filter = ProgramRequisitionSettingsFilter::new()
        .master_list(MasterListFilter::new().exists_for_store_id(equal_to_store_id.clone()))
        .name_tag(NameTagFilter::new().store_id(equal_to_store_id.clone()));

    // All program settings for store
    let mut settings =
        ProgramRequisitionSettingsRepository::new(&ctx.connection).query(Some(filter))?;
    println!("settings length{:?}", settings.len());
    settings.sort_by(|a, b| a.master_list.id.cmp(&b.master_list.id));
    settings.dedup();
    println!("settings length{:?}", settings.len());

    // Order Types (matching settings program_settings_ids)
    let program_requisition_settings_ids: Vec<String> = settings
        .iter()
        .map(|s| s.program_settings_row.id.clone())
        .collect();

    let program_ids = get_program_ids(&ctx.connection, &settings)?;

    let order_types = ProgramRequisitionOrderTypeRowRepository::new(&ctx.connection)
        .find_many_by_program_requisition_settings_ids(&program_requisition_settings_ids)?;

    // Periods (matching settings program_schedule_ids)
    let program_schedule_ids: Vec<&str> = settings
        .iter()
        .map(|s| s.program_settings_row.period_schedule_id.as_str())
        .collect();

    let periods = PeriodRowRepository::new(&ctx.connection)
        .find_many_by_program_schedule_ids(program_schedule_ids)?;

    let period_ids: Vec<String> = periods.iter().map(|p| p.id.clone()).collect();

    // Requisitions in Period (for all periods and store)
    let filter = RequisitionsInPeriodFilter::new()
        .store_id(equal_to_store_id)
        .program_id(EqualFilter::equal_any(program_ids.clone()))
        .period_id(EqualFilter::equal_any(period_ids))
        .r#type(RequisitionType::Response.equal_to());

    let requisitions_in_periods =
        RequisitionsInPeriodRepository::new(&ctx.connection).query(filter)?;

    Ok(CustomerProgramRequisitionSetting {
        customer_name: customer_name.unwrap().name,
        master_lists: settings
            .iter()
            .map(|setting| {
                let order_types_mapped = order_types
                    .iter()
                    // only map order types to their respective program requisition settings
                    .filter(|order_type| {
                        order_type
                            .program_requisition_settings_id
                            .eq(&setting.program_settings_row.id)
                    })
                    .map(|order_type| {
                        // only map periods (and their availability) to their respective order types
                        map_period_rows_and_requisitions_to_order_type(
                            order_type.clone(),
                            periods.clone(),
                            setting,
                            requisitions_in_periods.clone(),
                        )
                    })
                    .collect();

                MasterListWithOrderTypes {
                    id: setting.master_list.id.clone(),
                    name: setting.master_list.name.clone(),
                    code: setting.master_list.code.clone(),
                    description: setting.master_list.description.clone(),
                    is_active: setting.master_list.is_active,
                    is_default_price_list: setting.master_list.is_default_price_list,
                    discount_percentage: setting.master_list.discount_percentage,
                    name_tag_id: setting.name_tag_row.id.clone(),
                    name_tag: setting.name_tag_row.name.clone(),
                    program_requisition_settings_id: setting.program_settings_row.id.clone(),
                    order_types: order_types_mapped,
                }
            })
            .collect(),
    })
}

fn map_period_rows_and_requisitions_to_order_type(
    order_type: ProgramRequisitionOrderTypeRow,
    periods: Vec<PeriodRow>,
    settings: &ProgramRequisitionSettings,
    requisitions_in_periods: Vec<RequisitionsInPeriod>,
) -> ProgramRequisitionOrderType {
    ProgramRequisitionOrderType {
        name: order_type.clone().name,
        id: order_type.clone().id,
        available_periods: periods
            .clone()
            .iter()
            .filter_map(|period| {
                if period_is_available(
                    period,
                    settings,
                    &order_type.clone(),
                    &requisitions_in_periods,
                ) {
                    Some(period)
                } else {
                    None
                }
            })
            .cloned()
            .collect(),
        is_emergency: order_type.is_emergency,
        max_order_per_period: order_type.max_order_per_period,
        program_requisition_settings_id: order_type.program_requisition_settings_id.clone(),
        max_mos: order_type.max_mos,
        max_items_in_emergency_order: order_type.max_items_in_emergency_order,
        threshold_mos: order_type.threshold_mos,
    }
}

#[cfg(test)]
mod test {
    use repository::{
        mock::{
            mock_name_store_a, mock_name_store_b, mock_name_store_c, mock_store_a, mock_store_b,
            mock_store_c, MockData, MockDataInserts,
        },
        ContextRow, MasterListNameJoinRow, MasterListRow, NameStoreJoinRow, NameTagJoinRow,
        NameTagRow, PeriodRow, PeriodScheduleRow, ProgramRequisitionOrderTypeRow,
        ProgramRequisitionSettingsRow, ProgramRow, RequisitionRow, RequisitionType,
    };

    use crate::{
        requisition::program_settings::customer_program_settings::prepare::{
            CustomerProgramRequisitionSetting, MasterListWithOrderTypes,
            ProgramRequisitionOrderType,
        },
        test_helpers::{setup_all_with_data_and_service_provider, ServiceTestContext},
    };

    #[actix_rt::test]
    async fn get_customer_program_requisition_settings() {
        // Mock Data

        // Two tags for store a
        let name_tag1 = NameTagRow {
            id: "name_tag1".to_string(),
            name: "tag1".to_string(),
            ..Default::default()
        };
        let name_tag_join1 = NameTagJoinRow {
            id: "name_tag_join1".to_string(),
            name_tag_id: name_tag1.id.clone(),
            name_link_id: mock_name_store_a().id,
        };
        let name_tag2 = NameTagRow {
            id: "name_tag2".to_string(),
            name: "tag2".to_string(),
            ..Default::default()
        };
        let name_tag_join2 = NameTagJoinRow {
            id: "name_tag_join2".to_string(),
            name_tag_id: name_tag2.id.clone(),
            name_link_id: mock_name_store_a().id,
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
            master_list_id: Some(master_list1.id.clone()),
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
            master_list_id: Some(master_list2.id.clone()),
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
        };
        let order_type2 = ProgramRequisitionOrderTypeRow {
            id: "order_type2".to_string(),
            name: "Order Type 2".to_string(),
            program_requisition_settings_id: program_requisition_setting2.id.clone(),
            max_order_per_period: 1,
            ..Default::default()
        };

        // store b name tag + program settings
        let name_tag_join3 = NameTagJoinRow {
            id: "name_tag_join3".to_string(),
            name_tag_id: name_tag1.id.clone(),
            name_link_id: mock_name_store_b().id,
        };
        let program_requisition_setting3 = ProgramRequisitionSettingsRow {
            id: "program_setting3".to_string(),
            program_id: program1.id.clone(),
            name_tag_id: name_tag1.id.clone(),
            period_schedule_id: period_schedule1.id.clone(),
        };
        // store c
        let name_tag_join4 = NameTagJoinRow {
            id: "name_tag_join4".to_string(),
            name_tag_id: name_tag2.id.clone(),
            name_link_id: mock_name_store_c().id,
        };
        let program_requisition_setting4 = ProgramRequisitionSettingsRow {
            id: "program_setting4".to_string(),
            program_id: program2.id.clone(),
            name_tag_id: name_tag2.id.clone(),
            period_schedule_id: period_schedule2.id.clone(),
        };

        // Two requisitions, one for period 1 for program 1 for order type 1
        // second for period 4 for program 2 for order type 2
        let requisition1 = RequisitionRow {
            id: "requisition1".to_string(),
            order_type: Some("Order Type 1".to_string()),
            name_link_id: mock_name_store_b().id,
            store_id: mock_store_a().id,
            period_id: Some(period1.id.clone()),
            program_id: Some(program1.id.clone()),
            r#type: RequisitionType::Response,
            ..Default::default()
        };
        let requisition2 = RequisitionRow {
            id: "requisition2".to_string(),
            // Checking case insensitive match
            order_type: Some("OrDeR TyPe 2".to_string()),
            name_link_id: mock_name_store_b().id,
            store_id: mock_store_a().id,
            period_id: Some(period4.id.clone()),
            program_id: Some(program2.id.clone()),
            r#type: RequisitionType::Response,
            ..Default::default()
        };

        // mock_name_store_b and mock_name_store_c to be joined
        // to program 1 and program 2 respectively and visible in mock_store_a
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
            name_is_customer: true,
            ..Default::default()
        };
        let name_store_join2 = NameStoreJoinRow {
            id: "name_store_join2".to_string(),
            name_link_id: mock_name_store_c().id.clone(),
            store_id: mock_store_a().id,
            name_is_customer: true,
            ..Default::default()
        };

        let ServiceTestContext {
            service_provider,
            service_context,
            ..
        } = setup_all_with_data_and_service_provider(
            "get_customer_program_requisition_settings",
            MockDataInserts::none().names().stores(),
            MockData {
                periods: vec![
                    period1.clone(),
                    period2.clone(),
                    period3.clone(),
                    period4.clone(),
                ],
                period_schedules: vec![period_schedule1, period_schedule2],
                name_tags: vec![name_tag1.clone(), name_tag2.clone()],
                name_tag_joins: vec![
                    name_tag_join1,
                    name_tag_join2,
                    name_tag_join3,
                    name_tag_join4,
                ],
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
                    program_requisition_setting3.clone(),
                    program_requisition_setting4.clone(),
                ],
                program_order_types: vec![order_type1.clone(), order_type2.clone()],
                contexts: vec![context1.clone(), context2.clone()],
                programs: vec![program1.clone(), program2.clone()],
                requisitions: vec![requisition1.clone(), requisition2.clone()],
                ..Default::default()
            },
        )
        .await;

        let mut result = service_provider
            .requisition_service
            .get_program_requisition_settings_by_customer(&service_context, &mock_name_store_a().id)
            .unwrap();
        result.master_lists.sort_by(|a, b| a.id.cmp(&b.id));

        println!("result: {:?}", result.master_lists.len());
        result.master_lists.iter().for_each(|master_list| {
            println!("master_list: {:?}", master_list.id);
        });
        assert_eq!(
            result,
            CustomerProgramRequisitionSetting {
                customer_name: mock_name_store_a().name.clone(),
                master_lists: vec![
                    MasterListWithOrderTypes {
                        id: master_list1.id.clone(),
                        name: master_list1.name.clone(),
                        code: master_list1.code.clone(),
                        description: master_list1.description.clone(),
                        is_active: master_list1.is_active,
                        is_default_price_list: master_list1.is_default_price_list,
                        discount_percentage: None,
                        name_tag_id: name_tag1.id.clone(),
                        name_tag: name_tag1.name.clone(),
                        program_requisition_settings_id: program_requisition_setting1.id.clone(),
                        order_types: vec![ProgramRequisitionOrderType {
                            name: order_type1.name.clone(),
                            program_requisition_settings_id: program_requisition_setting1
                                .id
                                .clone(),
                            max_mos: order_type1.max_mos,
                            max_items_in_emergency_order: order_type1.max_items_in_emergency_order,
                            id: order_type1.id.clone(),
                            is_emergency: order_type1.is_emergency,
                            max_order_per_period: order_type1.max_order_per_period,
                            threshold_mos: order_type1.threshold_mos,
                            // only one period available because requisition is already in use for period 1
                            available_periods: vec![period2.clone()]
                        }]
                    },
                    MasterListWithOrderTypes {
                        id: master_list1.id.clone(),
                        name: master_list1.name.clone(),
                        code: master_list1.code.clone(),
                        description: master_list1.description.clone(),
                        is_active: master_list1.is_active,
                        is_default_price_list: master_list1.is_default_price_list,
                        discount_percentage: None,
                        name_tag_id: name_tag1.id.clone(),
                        name_tag: name_tag1.name.clone(),
                        program_requisition_settings_id: program_requisition_setting3.id.clone(),
                        // no order types because requisitions in both periods
                        order_types: vec![],
                    },
                    MasterListWithOrderTypes {
                        id: master_list2.id.clone(),
                        name: master_list2.name.clone(),
                        code: master_list2.code.clone(),
                        description: master_list2.description.clone(),
                        is_active: master_list2.is_active,
                        is_default_price_list: master_list2.is_default_price_list,
                        discount_percentage: None,
                        name_tag_id: name_tag2.id.clone(),
                        name_tag: name_tag2.name.clone(),
                        program_requisition_settings_id: program_requisition_setting2.id.clone(),
                        // no order types because requisitions in both periods
                        order_types: vec![ProgramRequisitionOrderType {
                            name: order_type2.name.clone(),
                            program_requisition_settings_id: program_requisition_setting2
                                .id
                                .clone(),
                            max_mos: order_type2.max_mos,
                            max_items_in_emergency_order: order_type2.max_items_in_emergency_order,
                            id: order_type2.id.clone(),
                            is_emergency: order_type2.is_emergency,
                            max_order_per_period: order_type2.max_order_per_period,
                            threshold_mos: order_type2.threshold_mos,
                            // only one period available because requisition is already in use for period 4
                            available_periods: vec![period3.clone()]
                        }],
                    },
                    MasterListWithOrderTypes {
                        id: master_list2.id.clone(),
                        name: master_list2.name.clone(),
                        code: master_list2.code.clone(),
                        description: master_list2.description.clone(),
                        is_active: master_list2.is_active,
                        is_default_price_list: master_list2.is_default_price_list,
                        discount_percentage: None,
                        name_tag_id: name_tag2.id.clone(),
                        name_tag: name_tag2.name.clone(),
                        program_requisition_settings_id: program_requisition_setting4.id.clone(),
                        // no order types because requisitions in both periods
                        order_types: vec![],
                    },
                ]
            }
        )
    }
}
