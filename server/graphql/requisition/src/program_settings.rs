use async_graphql::*;
use graphql_core::{standard_graphql_error::validate_auth, ContextExt};
use graphql_types::types::{MasterListNode, NameNode, PeriodNode};
use repository::{ProgramCustomer, ProgramSupplier};
use service::{
    auth::{Resource, ResourceAccessRequest},
    requisition::program_settings::{
        customer_program_settings::CustomerProgramSettings,
        supplier_program_settings::{OrderType, SupplierProgramSettings},
    },
};

#[derive(SimpleObject)]
pub struct ProgramRequisitionOrderTypeNode {
    pub name: String,
    pub id: String,
    pub available_periods: Vec<PeriodNode>,
    pub is_emergency: bool,
}

#[derive(SimpleObject)]
pub struct SupplierProgramRequisitionSettingNode {
    pub program_name: String,
    pub program_id: String,
    pub suppliers: Vec<NameNode>,
    pub master_list: MasterListNode,
    pub order_types: Vec<ProgramRequisitionOrderTypeNode>,
}

#[derive(SimpleObject)]
pub struct CustomerProgramRequisitionSettingNode {
    pub program_name: String,
    pub program_id: String,
    pub master_list: MasterListNode,
    pub customer_and_order_types: Vec<CustomerAndOrderTypeNode>,
}

#[derive(SimpleObject)]
pub struct CustomerAndOrderTypeNode {
    pub customer: NameNode,
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
                                .map(PeriodNode::from_domain)
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

pub fn get_customer_program_requisition_settings(
    ctx: &Context<'_>,
    store_id: &str,
) -> Result<Vec<CustomerProgramRequisitionSettingNode>> {
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
        .get_customer_program_requisition_settings(&service_context, store_id)?;

    let response = settings
        .into_iter()
        .map(
            |CustomerProgramSettings {
                 program_requisition_settings,
                 customer_and_order_types,
             }: CustomerProgramSettings| CustomerProgramRequisitionSettingNode {
                program_name: program_requisition_settings.program_row.name,
                program_id: program_requisition_settings.program_row.id,
                master_list: MasterListNode::from_domain(program_requisition_settings.master_list),
                customer_and_order_types: customer_and_order_types
                    .into_iter()
                    .map(
                        |(ProgramCustomer { customer, .. }, order_types): (
                            ProgramCustomer,
                            Vec<OrderType>,
                        )| CustomerAndOrderTypeNode {
                            customer: NameNode::from_domain(customer),
                            order_types: order_types
                                .into_iter()
                                .map(
                                    |OrderType {
                                         order_type,
                                         available_periods,
                                     }: OrderType| {
                                        ProgramRequisitionOrderTypeNode {
                                            name: order_type.name,
                                            id: order_type.id,
                                            available_periods: available_periods
                                                .into_iter()
                                                .map(PeriodNode::from_domain)
                                                .collect(),
                                            is_emergency: order_type.is_emergency,
                                        }
                                    },
                                )
                                .collect(),
                        },
                    )
                    .collect(),
            },
        )
        .collect();

    Ok(response)
}
