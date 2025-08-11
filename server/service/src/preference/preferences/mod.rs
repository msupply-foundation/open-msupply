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
pub mod use_campaigns;
pub use use_campaigns::*;
pub mod order_in_packs;
pub use order_in_packs::*;
pub mod custom_translations;
pub use custom_translations::*;
pub mod sync_records_display_threshold;
pub use sync_records_display_threshold::*;
pub mod authorise_purchase_order;
pub use authorise_purchase_order::*;

pub struct PreferenceProvider {
    // Global preferences
    pub allow_tracking_of_stock_by_donor: AllowTrackingOfStockByDonor,
    pub gender_options: GenderOptions,
    pub show_contact_tracing: ShowContactTracing,
    pub use_campaigns: UseCampaigns,
    pub custom_translations: CustomTranslations,
    pub sync_records_display_threshold: SyncRecordsDisplayThreshold,
    pub authorise_purchase_order: AuthorisePurchaseOrder,
    // Store preferences
    pub manage_vaccines_in_doses: ManageVaccinesInDoses,
    pub manage_vvm_status_for_stock: ManageVvmStatusForStock,
    pub order_in_packs: OrderInPacks,
    pub sort_by_vvm_status_then_expiry: SortByVvmStatusThenExpiry,
    pub use_simplified_mobile_ui: UseSimplifiedMobileUi,
}

pub fn get_preference_provider() -> PreferenceProvider {
    PreferenceProvider {
        // Global preferences
        allow_tracking_of_stock_by_donor: AllowTrackingOfStockByDonor,
        gender_options: GenderOptions,
        show_contact_tracing: ShowContactTracing,
        use_campaigns: UseCampaigns,
        custom_translations: CustomTranslations,
        sync_records_display_threshold: SyncRecordsDisplayThreshold,
        authorise_purchase_order: AuthorisePurchaseOrder,
        // Store preferences
        manage_vaccines_in_doses: ManageVaccinesInDoses,
        manage_vvm_status_for_stock: ManageVvmStatusForStock,
        order_in_packs: OrderInPacks,
        sort_by_vvm_status_then_expiry: SortByVvmStatusThenExpiry,
        use_simplified_mobile_ui: UseSimplifiedMobileUi,
    }
}
