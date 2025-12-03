use std::collections::BTreeMap;

use async_graphql::*;
use graphql_core::{standard_graphql_error::validate_auth, ContextExt};
use graphql_types::types::{patient::GenderTypeNode, InvoiceNodeStatus};
use repository::GenderType;
use service::{
    auth::{Resource, ResourceAccessRequest},
    preference::{StorePrefUpdate, UpsertPreferences, WarnWhenMissingRecentStocktakeData},
};

#[derive(InputObject)]
pub struct BoolStorePrefInput {
    pub store_id: String,
    pub value: bool,
}

#[derive(InputObject)]
pub struct IntegerStorePrefInput {
    pub store_id: String,
    pub value: i32,
}

#[derive(InputObject)]
pub struct StringStorePrefInput {
    pub store_id: String,
    pub value: String,
}

#[derive(InputObject)]
pub struct WarnWhenMissingRecentStocktakeDataInput {
    pub enabled: bool,
    pub max_age: u32,
    pub min_items: u32,
}

#[derive(InputObject)]
pub struct WarnWhenMissingRecentStocktakeInput {
    pub store_id: String,
    pub value: WarnWhenMissingRecentStocktakeDataInput,
}

#[derive(InputObject)]
pub struct InvoiceStatusOptionsInput {
    pub store_id: String,
    pub value: Vec<InvoiceNodeStatus>,
}

#[derive(InputObject)]
pub struct UpsertPreferencesInput {
    // Global preferences
    pub allow_tracking_of_stock_by_donor: Option<bool>,
    pub authorise_purchase_order: Option<bool>,
    pub authorise_goods_received: Option<bool>,
    pub custom_translations: Option<BTreeMap<String, String>>,
    pub gender_options: Option<Vec<GenderTypeNode>>,
    pub prevent_transfers_months_before_initialisation: Option<i32>,
    pub show_contact_tracing: Option<bool>,
    pub sync_records_display_threshold: Option<i32>,
    pub warning_for_excess_request: Option<bool>,
    pub adjust_for_number_of_days_out_of_stock: Option<bool>,
    pub days_in_month: Option<f64>,
    pub expired_stock_prevent_issue: Option<bool>,
    pub expired_stock_issue_threshold: Option<i32>,

    // Store preferences
    pub manage_vaccines_in_doses: Option<Vec<BoolStorePrefInput>>,
    pub manage_vvm_status_for_stock: Option<Vec<BoolStorePrefInput>>,
    pub order_in_packs: Option<Vec<BoolStorePrefInput>>,
    pub use_procurement_functionality: Option<Vec<BoolStorePrefInput>>,
    pub sort_by_vvm_status_then_expiry: Option<Vec<BoolStorePrefInput>>,
    pub use_simplified_mobile_ui: Option<Vec<BoolStorePrefInput>>,
    pub disable_manual_returns: Option<Vec<BoolStorePrefInput>>,
    pub requisition_auto_finalise: Option<Vec<BoolStorePrefInput>>,
    pub inbound_shipment_auto_verify: Option<Vec<BoolStorePrefInput>>,
    pub can_create_internal_order_from_a_requisition: Option<Vec<BoolStorePrefInput>>,
    pub select_destination_store_for_an_internal_order: Option<Vec<BoolStorePrefInput>>,
    pub number_of_months_to_check_for_consumption_when_calculating_out_of_stock_products:
        Option<Vec<IntegerStorePrefInput>>,
    pub number_of_months_threshold_to_show_low_stock_alerts_for_products:
        Option<Vec<IntegerStorePrefInput>>,
    pub first_threshold_for_expiring_items: Option<Vec<IntegerStorePrefInput>>,
    pub second_threshold_for_expiring_items: Option<Vec<IntegerStorePrefInput>>,
    pub warn_when_missing_recent_stocktake: Option<Vec<WarnWhenMissingRecentStocktakeInput>>,
    pub store_custom_colour: Option<Vec<StringStorePrefInput>>,
    pub invoice_status_options: Option<Vec<InvoiceStatusOptionsInput>>,
}

pub fn upsert_preferences(
    ctx: &Context<'_>,
    store_id: String,
    input: UpsertPreferencesInput,
) -> Result<()> {
    validate_auth(
        ctx,
        &ResourceAccessRequest {
            resource: Resource::MutatePreferences,
            store_id: Some(store_id.to_string()),
        },
    )?;
    let service_provider = ctx.service_provider();
    let service_context = service_provider.basic_context()?;

    service_provider
        .preference_service
        .upsert(&service_context, input.to_domain())?;

    Ok(())
}

impl UpsertPreferencesInput {
    pub fn to_domain(&self) -> UpsertPreferences {
        let UpsertPreferencesInput {
            // Global preferences
            allow_tracking_of_stock_by_donor,
            authorise_goods_received,
            authorise_purchase_order,
            custom_translations,
            prevent_transfers_months_before_initialisation,
            gender_options,
            show_contact_tracing,
            sync_records_display_threshold,
            warning_for_excess_request,
            adjust_for_number_of_days_out_of_stock,
            days_in_month,
            expired_stock_prevent_issue,
            expired_stock_issue_threshold,
            // Store preferences
            manage_vaccines_in_doses,
            manage_vvm_status_for_stock,
            order_in_packs,
            use_procurement_functionality,
            sort_by_vvm_status_then_expiry,
            use_simplified_mobile_ui,
            disable_manual_returns,
            requisition_auto_finalise,
            inbound_shipment_auto_verify,
            can_create_internal_order_from_a_requisition,
            select_destination_store_for_an_internal_order,
            number_of_months_to_check_for_consumption_when_calculating_out_of_stock_products,
            number_of_months_threshold_to_show_low_stock_alerts_for_products,
            first_threshold_for_expiring_items,
            second_threshold_for_expiring_items,
            warn_when_missing_recent_stocktake,
            store_custom_colour,
            invoice_status_options,
        } = self;

        UpsertPreferences {
            // Global preferences
            allow_tracking_of_stock_by_donor: *allow_tracking_of_stock_by_donor,
            authorise_goods_received: *authorise_goods_received,
            authorise_purchase_order: *authorise_purchase_order,
            custom_translations: custom_translations.clone(),
            gender_options: gender_options
                .as_ref()
                .map(|i| i.iter().map(|i| GenderType::from(*i)).collect()),
            prevent_transfers_months_before_initialisation:
                *prevent_transfers_months_before_initialisation,
            show_contact_tracing: *show_contact_tracing,
            sync_records_display_threshold: *sync_records_display_threshold,
            warning_for_excess_request: *warning_for_excess_request,

            adjust_for_number_of_days_out_of_stock: *adjust_for_number_of_days_out_of_stock,
            days_in_month: *days_in_month,
            expired_stock_prevent_issue: *expired_stock_prevent_issue,
            expired_stock_issue_threshold: *expired_stock_issue_threshold,
            // Store preferences
            manage_vaccines_in_doses: manage_vaccines_in_doses
                .as_ref()
                .map(|i| i.iter().map(|i| i.to_domain()).collect()),
            manage_vvm_status_for_stock: manage_vvm_status_for_stock
                .as_ref()
                .map(|i| i.iter().map(|i| i.to_domain()).collect()),
            order_in_packs: order_in_packs
                .as_ref()
                .map(|i| i.iter().map(|i| i.to_domain()).collect()),
            use_procurement_functionality: use_procurement_functionality
                .as_ref()
                .map(|i| i.iter().map(|i| i.to_domain()).collect()),
            sort_by_vvm_status_then_expiry: sort_by_vvm_status_then_expiry
                .as_ref()
                .map(|i| i.iter().map(|i| i.to_domain()).collect()),
            use_simplified_mobile_ui: use_simplified_mobile_ui
                .as_ref()
                .map(|i| i.iter().map(|i| i.to_domain()).collect()),
            disable_manual_returns: disable_manual_returns
                .as_ref()
                .map(|i| i.iter().map(|i| i.to_domain()).collect()),
            requisition_auto_finalise: requisition_auto_finalise
                .as_ref()
                .map(|i| i.iter().map(|i| i.to_domain()).collect()),
            inbound_shipment_auto_verify: inbound_shipment_auto_verify
                .as_ref()
                .map(|i| i.iter().map(|i| i.to_domain()).collect()),
            can_create_internal_order_from_a_requisition:
                can_create_internal_order_from_a_requisition
                    .as_ref()
                    .map(|i| i.iter().map(|i| i.to_domain()).collect()),
            select_destination_store_for_an_internal_order:
                select_destination_store_for_an_internal_order
                    .as_ref()
                    .map(|i| i.iter().map(|i| i.to_domain()).collect()),
            number_of_months_to_check_for_consumption_when_calculating_out_of_stock_products:
                number_of_months_to_check_for_consumption_when_calculating_out_of_stock_products
                    .as_ref()
                    .map(|i| i.iter().map(|i| i.to_domain()).collect()),
            number_of_months_threshold_to_show_low_stock_alerts_for_products:
                number_of_months_threshold_to_show_low_stock_alerts_for_products
                    .as_ref()
                    .map(|i| i.iter().map(|i| i.to_domain()).collect()),
            first_threshold_for_expiring_items: first_threshold_for_expiring_items
                .as_ref()
                .map(|i| i.iter().map(|i| i.to_domain()).collect()),
            second_threshold_for_expiring_items: second_threshold_for_expiring_items
                .as_ref()
                .map(|i| i.iter().map(|i| i.to_domain()).collect()),
            warn_when_missing_recent_stocktake: warn_when_missing_recent_stocktake
                .as_ref()
                .map(|i| i.iter().map(|i| i.to_domain()).collect()),
            store_custom_colour: store_custom_colour
                .as_ref()
                .map(|i| i.iter().map(|i| i.to_domain()).collect()),
            invoice_status_options: invoice_status_options
                .as_ref()
                .map(|i| i.iter().map(|i| i.to_domain()).collect()),
        }
    }
}

impl BoolStorePrefInput {
    pub fn to_domain(&self) -> StorePrefUpdate<bool> {
        StorePrefUpdate {
            store_id: self.store_id.clone(),
            value: self.value,
        }
    }
}

impl IntegerStorePrefInput {
    pub fn to_domain(&self) -> StorePrefUpdate<i32> {
        StorePrefUpdate {
            store_id: self.store_id.clone(),
            value: self.value,
        }
    }
}

impl StringStorePrefInput {
    pub fn to_domain(&self) -> StorePrefUpdate<String> {
        StorePrefUpdate {
            store_id: self.store_id.clone(),
            value: self.value.clone(),
        }
    }
}

impl WarnWhenMissingRecentStocktakeDataInput {
    pub fn to_domain(&self) -> WarnWhenMissingRecentStocktakeData {
        WarnWhenMissingRecentStocktakeData {
            enabled: self.enabled,
            max_age: self.max_age,
            min_items: self.min_items,
        }
    }
}

impl WarnWhenMissingRecentStocktakeInput {
    pub fn to_domain(&self) -> StorePrefUpdate<WarnWhenMissingRecentStocktakeData> {
        StorePrefUpdate {
            store_id: self.store_id.clone(),
            value: self.value.to_domain(),
        }
    }
}

impl InvoiceStatusOptionsInput {
    pub fn to_domain(&self) -> StorePrefUpdate<Vec<repository::InvoiceStatus>> {
        StorePrefUpdate {
            store_id: self.store_id.clone(),
            value: self.value.iter().map(|s| (*s).into()).collect(),
        }
    }
}
