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
pub mod show_purchase_order_and_goods_received;
pub use show_purchase_order_and_goods_received::*;

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
    pub show_purchase_order_and_goods_received: ShowPurchaseOrderAndGoodsReceived,
    pub sort_by_vvm_status_then_expiry: SortByVvmStatusThenExpiry,
    pub use_simplified_mobile_ui: UseSimplifiedMobileUi,
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
        show_purchase_order_and_goods_received: ShowPurchaseOrderAndGoodsReceived,
        sort_by_vvm_status_then_expiry: SortByVvmStatusThenExpiry,
        use_simplified_mobile_ui: UseSimplifiedMobileUi,
    }
}
