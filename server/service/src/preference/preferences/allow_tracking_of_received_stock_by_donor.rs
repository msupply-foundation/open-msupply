use super::Preference;

pub struct AllowTrackingOfReceivedStockByDonor;

impl Preference for AllowTrackingOfReceivedStockByDonor {
    type Value = bool;

    fn key(&self) -> &'static str {
        "allow_tracking_of_received_stock_by_donor"
    }
}
