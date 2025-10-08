pub mod show_contact_tracing;
pub use show_contact_tracing::*;
pub mod manage_vaccines_in_doses;
pub use manage_vaccines_in_doses::*;
pub mod sort_by_vvm_status_then_expiry;
pub use sort_by_vvm_status_then_expiry::*;
pub mod manage_vvm_status_for_stock;
pub use manage_vvm_status_for_stock::*;
pub mod allow_tracking_of_stock_by_donor;
pub use allow_tracking_of_stock_by_donor::*;
pub mod use_simplified_mobile_ui;
pub use use_simplified_mobile_ui::*;
pub mod gender_options;
pub use gender_options::*;
pub mod order_in_packs;
pub use order_in_packs::*;
pub mod custom_translations;
pub use custom_translations::*;
pub mod sync_records_display_threshold;
pub use sync_records_display_threshold::*;
pub mod authorise_purchase_order;
pub use authorise_purchase_order::*;
pub mod prevent_transfers_months_before_initialisation;
pub use prevent_transfers_months_before_initialisation::*;
pub mod authorise_goods_received;
pub use authorise_goods_received::*;
pub mod use_procurement_functionality;
pub use use_procurement_functionality::*;
pub mod disable_manual_returns;
pub use disable_manual_returns::*;
pub mod can_create_internal_order_from_a_requisition;
pub use can_create_internal_order_from_a_requisition::*;
pub mod select_destination_store_for_an_internal_order;
pub use select_destination_store_for_an_internal_order::*;
pub mod number_of_months_to_check_for_consumption_when_calculating_out_of_stock_products;
pub use number_of_months_to_check_for_consumption_when_calculating_out_of_stock_products::*;
pub mod number_of_months_threshold_to_show_low_stock_alerts_for_products;
pub use number_of_months_threshold_to_show_low_stock_alerts_for_products::*;
pub mod first_threshold_for_expiring_items;
pub use first_threshold_for_expiring_items::*;
pub mod second_threshold_for_expiring_items;
pub use second_threshold_for_expiring_items::*;

pub struct PreferenceProvider {
    // Global preferences
    pub allow_tracking_of_stock_by_donor: AllowTrackingOfStockByDonor,
    pub authorise_goods_received: AuthoriseGoodsReceived,
    pub authorise_purchase_order: AuthorisePurchaseOrder,
    pub custom_translations: CustomTranslations,
    pub gender_options: GenderOptions,
    pub prevent_transfers_months_before_initialisation: PreventTransfersMonthsBeforeInitialisation,
    pub show_contact_tracing: ShowContactTracing,
    pub sync_records_display_threshold: SyncRecordsDisplayThreshold,
    // Store preferences
    pub manage_vaccines_in_doses: ManageVaccinesInDoses,
    pub manage_vvm_status_for_stock: ManageVvmStatusForStock,
    pub order_in_packs: OrderInPacks,
    pub use_procurement_functionality: UseProcurementFunctionality,
    pub sort_by_vvm_status_then_expiry: SortByVvmStatusThenExpiry,
    pub use_simplified_mobile_ui: UseSimplifiedMobileUi,
    pub disable_manual_returns: DisableManualReturns,
    pub can_create_internal_order_from_a_requisition: CanCreateInternalOrderFromARequisition,
    pub select_destination_store_for_an_internal_order: SelectDestinationStoreForAnInternalOrder,
    pub number_of_months_to_check_for_consumption_when_calculating_out_of_stock_products:
        NumberOfMonthsToCheckForConsumptionWhenCalculatingOutOfStockProducts,
    pub number_of_months_threshold_to_show_low_stock_alerts_for_products:
        NumberOfMonthsThresholdToShowLowStockAlertsForProducts,
    pub first_threshold_for_expiring_items: FirstThresholdForExpiringItems,
    pub second_threshold_for_expiring_items: SecondThresholdForExpiringItems,
}

pub fn get_preference_provider() -> PreferenceProvider {
    PreferenceProvider {
        // Global preferences
        allow_tracking_of_stock_by_donor: AllowTrackingOfStockByDonor,
        authorise_goods_received: AuthoriseGoodsReceived,
        authorise_purchase_order: AuthorisePurchaseOrder,
        custom_translations: CustomTranslations,
        gender_options: GenderOptions,
        show_contact_tracing: ShowContactTracing,
        sync_records_display_threshold: SyncRecordsDisplayThreshold,
        prevent_transfers_months_before_initialisation: PreventTransfersMonthsBeforeInitialisation,
        // Store preferences
        manage_vaccines_in_doses: ManageVaccinesInDoses,
        manage_vvm_status_for_stock: ManageVvmStatusForStock,
        order_in_packs: OrderInPacks,
        use_procurement_functionality: UseProcurementFunctionality,
        sort_by_vvm_status_then_expiry: SortByVvmStatusThenExpiry,
        use_simplified_mobile_ui: UseSimplifiedMobileUi,
        disable_manual_returns: DisableManualReturns,
        can_create_internal_order_from_a_requisition: CanCreateInternalOrderFromARequisition,
        select_destination_store_for_an_internal_order: SelectDestinationStoreForAnInternalOrder,
        number_of_months_to_check_for_consumption_when_calculating_out_of_stock_products:
            NumberOfMonthsToCheckForConsumptionWhenCalculatingOutOfStockProducts,
        number_of_months_threshold_to_show_low_stock_alerts_for_products:
            NumberOfMonthsThresholdToShowLowStockAlertsForProducts,
        first_threshold_for_expiring_items: FirstThresholdForExpiringItems,
        second_threshold_for_expiring_items: SecondThresholdForExpiringItems,
    }
}
