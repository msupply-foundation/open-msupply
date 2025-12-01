use crate::service_provider::ServiceContext;

pub mod types;
use repository::StorageConnection;
pub use types::*;
mod query_preference;

pub mod preferences;
pub use preferences::*;
pub mod upsert;
pub mod upsert_helpers;

pub use upsert::*;

pub trait PreferenceServiceTrait: Sync + Send {
    fn get_preference_provider(&self) -> PreferenceProvider {
        get_preference_provider()
    }

    fn get_preference_descriptions(
        &self,
        connection: StorageConnection,
        store_id: Option<String>,
        pref_type: PreferenceType,
    ) -> Result<Vec<PreferenceDescription>, PreferenceError> {
        let PreferenceProvider {
            // Global preferences
            allow_tracking_of_stock_by_donor,
            authorise_goods_received,
            authorise_purchase_order,
            custom_translations,
            gender_options,
            prevent_transfers_months_before_initialisation,
            show_contact_tracing,
            sync_records_display_threshold,
            warning_for_excess_request,
            adjust_for_number_of_days_out_of_stock,
            days_in_month,
            expired_stock_prevent_issue,
            expired_stock_issue_threshold,
            show_indicative_price_in_requisitions,

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
            skip_intermediate_statuses_in_outbound,
            warn_when_missing_recent_stocktake,
            store_custom_colour,
        } = self.get_preference_provider();

        let input = AppendIfTypeInputs {
            pref_type,
            connection,
            store_id: store_id.clone(),
        };

        let mut prefs: Vec<PreferenceDescription> = Vec::new();

        // Global preferences
        append_if_type(allow_tracking_of_stock_by_donor, &mut prefs, &input)?;
        append_if_type(authorise_goods_received, &mut prefs, &input)?;
        append_if_type(authorise_purchase_order, &mut prefs, &input)?;
        append_if_type(custom_translations, &mut prefs, &input)?;
        append_if_type(gender_options, &mut prefs, &input)?;
        append_if_type(
            prevent_transfers_months_before_initialisation,
            &mut prefs,
            &input,
        )?;
        append_if_type(show_contact_tracing, &mut prefs, &input)?;
        append_if_type(sync_records_display_threshold, &mut prefs, &input)?;
        append_if_type(warning_for_excess_request, &mut prefs, &input)?;
        append_if_type(adjust_for_number_of_days_out_of_stock, &mut prefs, &input)?;
        append_if_type(days_in_month, &mut prefs, &input)?;
        append_if_type(expired_stock_prevent_issue, &mut prefs, &input)?;
        append_if_type(expired_stock_issue_threshold, &mut prefs, &input)?;
        append_if_type(show_indicative_price_in_requisitions, &mut prefs, &input)?;

        // Store preferences
        append_if_type(order_in_packs, &mut prefs, &input)?;
        append_if_type(use_procurement_functionality, &mut prefs, &input)?;
        append_if_type(sort_by_vvm_status_then_expiry, &mut prefs, &input)?;
        append_if_type(use_simplified_mobile_ui, &mut prefs, &input)?;
        append_if_type(disable_manual_returns, &mut prefs, &input)?;
        append_if_type(requisition_auto_finalise, &mut prefs, &input)?;
        append_if_type(inbound_shipment_auto_verify, &mut prefs, &input)?;
        append_if_type(manage_vvm_status_for_stock, &mut prefs, &input)?;
        append_if_type(manage_vaccines_in_doses, &mut prefs, &input)?;
        append_if_type(
            can_create_internal_order_from_a_requisition,
            &mut prefs,
            &input,
        )?;
        append_if_type(
            select_destination_store_for_an_internal_order,
            &mut prefs,
            &input,
        )?;
        append_if_type(
            number_of_months_to_check_for_consumption_when_calculating_out_of_stock_products,
            &mut prefs,
            &input,
        )?;
        append_if_type(
            number_of_months_threshold_to_show_low_stock_alerts_for_products,
            &mut prefs,
            &input,
        )?;
        append_if_type(first_threshold_for_expiring_items, &mut prefs, &input)?;
        append_if_type(second_threshold_for_expiring_items, &mut prefs, &input)?;
        append_if_type(skip_intermediate_statuses_in_outbound, &mut prefs, &input)?;
        append_if_type(store_custom_colour, &mut prefs, &input)?;
        append_if_type(warn_when_missing_recent_stocktake, &mut prefs, &input)?;

        Ok(prefs)
    }

    fn upsert(
        &self,
        ctx: &ServiceContext,
        input: UpsertPreferences,
    ) -> Result<(), UpsertPreferenceError> {
        upsert_preferences(ctx, input)
    }
}

pub struct PreferenceService {}
impl PreferenceServiceTrait for PreferenceService {}

struct AppendIfTypeInputs {
    pref_type: PreferenceType,
    connection: StorageConnection,
    store_id: Option<String>,
}

fn append_if_type(
    pref: impl Preference,
    pref_descriptions: &mut Vec<PreferenceDescription>,
    AppendIfTypeInputs {
        pref_type,
        connection,
        store_id,
    }: &AppendIfTypeInputs,
) -> Result<(), PreferenceError> {
    if &pref.preference_type() == pref_type {
        pref_descriptions.push(pref.as_description(connection, store_id.clone())?);
    }
    Ok(())
}

// Note, we don't have a get_preference() function here as preferences can be accessed like this:
// `let can_manage = ManageVvmStatus.load(connection, store_id);`
