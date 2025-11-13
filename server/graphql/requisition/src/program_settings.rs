use async_graphql::*;
use graphql_core::{standard_graphql_error::validate_auth, ContextExt};
use graphql_types::types::{MasterListNode, NameNode, PeriodNode};
use repository::ProgramSupplier;
use service::{
    auth::{Resource, ResourceAccessRequest},
    requisition::program_settings::supplier_program_settings::{
        OrderType, SupplierProgramSettings,
    },
};

#[derive(SimpleObject)]
pub struct SupplierProgramRequisitionSettingNode {
    pub program_name: String,
    pub tag_name: String,
    pub program_id: String,
    pub suppliers: Vec<NameNode>,
    pub master_list: MasterListNode,
    pub order_types: Vec<ProgramRequisitionOrderTypeNode>,
}

#[derive(SimpleObject)]
pub struct ProgramRequisitionOrderTypeNode {
    pub name: String,
    pub id: String,
    pub available_periods: Vec<PeriodNode>,
    pub is_emergency: bool,
}

#[derive(SimpleObject)]
pub struct ProgramSettingNode {
    pub master_list_id: String,
    pub master_list_name: String,
    pub master_list_code: String,
    pub master_list_description: String,
    pub master_list_is_active: bool,
    pub master_list_is_default_price_list: bool,
    pub master_list_discount_percentage: Option<f64>,
    pub master_list_name_tag_id: String,
    pub master_list_name_tag_name: String,
    pub order_types: Vec<ProgramRequisitionOrderTypeNode>,
}

#[derive(SimpleObject)]
pub struct CustomerProgramRequisitionSettingNode {
    pub customer_name_id: String,
    pub program_settings: Vec<ProgramSettingNode>,
}

#[derive(SimpleObject)]
pub struct CustomerAndOrderTypeNode {
    pub customer_name: String,
    pub order_types: Vec<ProgramRequisitionOrderTypeNode>,
}

pub fn get_supplier_program_requisition_settings(
    ctx: &Context<'_>,
    store_id: &str,
) -> Result<Vec<SupplierProgramRequisitionSettingNode>> {
    let user = validate_auth(
        ctx,
        &ResourceAccessRequest {
            resource: Resource::QueryRequisition,
            store_id: Some(store_id.to_string()),
        },
    )?;

    let service_provider = ctx.service_provider();
    let service_context = service_provider.context(store_id.to_string(), user.user_id)?;

    let settings = service_provider
        .requisition_service
        .get_supplier_program_requisition_settings(&service_context, store_id)?;

    let response = settings
        .into_iter()
        .map(
            |SupplierProgramSettings {
                 program_requisition_settings,
                 suppliers,
                 order_types,
             }: SupplierProgramSettings| SupplierProgramRequisitionSettingNode {
                program_name: program_requisition_settings.program_row.name,
                tag_name: program_requisition_settings.name_tag_row.name,
                program_id: program_requisition_settings.program_row.id,
                suppliers: suppliers
                    .into_iter()
                    .map(|ProgramSupplier { supplier, .. }: ProgramSupplier| {
                        NameNode::from_domain(supplier)
                    })
                    .collect(),
                master_list: MasterListNode::from_domain(program_requisition_settings.master_list),
                order_types: order_types
                    .into_iter()
                    .map(
                        |OrderType {
                             order_type,
                             available_periods,
                         }: OrderType| ProgramRequisitionOrderTypeNode {
                            name: order_type.name,
                            id: order_type.id,
                            available_periods: available_periods
                                .into_iter()
                                .map(|period| PeriodNode::from_domain(period))
                                .collect(),
                            is_emergency: order_type.is_emergency,
                        },
                    )
                    .collect(),
            },
        )
        .collect();

    Ok(response)
}

pub fn get_program_requisition_settings_by_customer(
    ctx: &Context<'_>,
    store_id: &str,
    customer_name_id: &str,
) -> Result<CustomerProgramRequisitionSettingNode> {
    let user = validate_auth(
        ctx,
        &ResourceAccessRequest {
            resource: Resource::QueryRequisition,
            store_id: Some(store_id.to_string()),
        },
    )?;

    let service_provider = ctx.service_provider();
    let service_context = service_provider.context(store_id.to_string(), user.user_id)?;

    let settings = service_provider
        .requisition_service
        .get_program_requisition_settings_by_customer(&service_context, customer_name_id)?;

    let response = CustomerProgramRequisitionSettingNode {
        customer_name_id: settings.customer_name_id,
        program_settings: settings
            .program_settings
            .into_iter()
            .map(|master_list_and_orders| ProgramSettingNode {
                // master_list: MasterListNode::from_domain(master_list_and_orders.master_list),
                master_list_id: master_list_and_orders.master_list_id,
                master_list_name: master_list_and_orders.master_list_name,
                master_list_code: master_list_and_orders.master_list_code,
                master_list_description: master_list_and_orders.master_list_description,
                master_list_is_active: master_list_and_orders.master_list_is_active,
                master_list_is_default_price_list: master_list_and_orders
                    .master_list_is_default_price_list,
                master_list_discount_percentage: master_list_and_orders
                    .master_list_discount_percentage,
                master_list_name_tag_id: master_list_and_orders.master_list_name_tag_id,
                master_list_name_tag_name: master_list_and_orders.master_list_name_tag,
                order_types: master_list_and_orders
                    .order_types
                    .into_iter()
                    .map(|order_type| ProgramRequisitionOrderTypeNode {
                        name: order_type.name,
                        id: order_type.id,
                        available_periods: order_type
                            .available_periods
                            .into_iter()
                            .map(|period| PeriodNode::from_domain(period))
                            .collect(),
                        is_emergency: order_type.is_emergency,
                    })
                    .collect(),
            })
            .collect(),
    };

    Ok(response)
}

pub fn has_customer_program_requisition_settings(
    ctx: &Context<'_>,
    store_id: &str,
    customer_name_ids: &[String],
) -> Result<bool> {
    let user = validate_auth(
        ctx,
        &ResourceAccessRequest {
            resource: Resource::QueryRequisition,
            store_id: Some(store_id.to_string()),
        },
    )?;

    let service_provider = ctx.service_provider();
    let service_context = service_provider.context(store_id.to_string(), user.user_id)?;

    Ok(service_provider
        .requisition_service
        .has_customer_program_requisition_settings(&service_context, customer_name_ids)?)
}
