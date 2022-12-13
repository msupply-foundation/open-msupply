use std::sync::Arc;
use thiserror::Error;
use tokio::sync::mpsc::{self, Receiver, Sender};
use tokio::task::JoinHandle;

use crate::service_provider::ServiceProvider;

use self::transfer::requisition::ProcessRequisitionTransfersError;
use self::transfer::shipment::ProcessShipmentTransfersError;
use self::transfer::{
    requisition::process_requisition_transfers, shipment::process_shipment_transfers,
};

#[cfg(test)]
mod test_helpers;
pub(crate) mod transfer;

const CHANNEL_BUFFER_SIZE: usize = 30;

#[derive(Clone)]
pub struct ProcessorsTrigger {
    requisition_transfer: Sender<()>,
    shipment_transfer: Sender<()>,
}

pub struct Processors {
    requisition_transfer: Receiver<()>,
    shipment_transfer: Receiver<()>,
}

#[derive(Debug, Error)]
enum ProcessorsError {
    #[error("Error in shipment transfer processor ({0})")]
    ShipmentTransfer(ProcessShipmentTransfersError),
    #[error("Error in requisition transfer processor ({0})")]
    RequisitionTransfer(ProcessRequisitionTransfersError),
}

impl Processors {
    pub fn init() -> (ProcessorsTrigger, Processors) {
        let (requisition_transfer_sender, requisition_transfer_receiver) =
            mpsc::channel(CHANNEL_BUFFER_SIZE);

        let (shipment_transfer_sender, shipment_transfer_receiver) =
            mpsc::channel(CHANNEL_BUFFER_SIZE);

        (
            ProcessorsTrigger {
                requisition_transfer: requisition_transfer_sender,
                shipment_transfer: shipment_transfer_sender,
            },
            Processors {
                requisition_transfer: requisition_transfer_receiver,
                shipment_transfer: shipment_transfer_receiver,
            },
        )
    }

    pub fn spawn(self, service_provider: Arc<ServiceProvider>) -> JoinHandle<()> {
        let Processors {
            mut requisition_transfer,
            mut shipment_transfer,
        } = self;

        tokio::spawn(async move {
            loop {
                // See test below for reasoning behind biased, even though there is no foreseen use case where
                // requisition must be processed before shipment, it easy to reason about future use cases if
                // order is guaranteed when requisition transfer is triggered before shipment transfer (like it is in synchroniser)
                let result = tokio::select! {
                    biased;
                    Some(_) = requisition_transfer.recv() => {
                        process_requisition_transfers(&service_provider).map_err(ProcessorsError::RequisitionTransfer)
                    },
                    Some(_) = shipment_transfer.recv() => {
                        process_shipment_transfers(&service_provider).map_err(ProcessorsError::ShipmentTransfer)
                    },
                    // None will be returned by recv if channel is closed, this would only really happen if all receivers were dropped
                    else => break,
                };

                if let Err(error) = result {
                    log::error!("{}", error);
                }
            }
        })
    }
}

impl ProcessorsTrigger {
    pub(crate) fn trigger_requisition_transfer_processors(&self) {
        if let Err(error) = self.requisition_transfer.try_send(()) {
            log::error!(
                "Problem triggering requisition transfer processor {:#?}",
                error
            )
        }
    }

    pub(crate) fn trigger_shipment_transfer_processors(&self) {
        if let Err(error) = self.shipment_transfer.try_send(()) {
            log::error!(
                "Problem triggering shipment transfer processor {:#?}",
                error
            )
        }
    }

    /// Empty processor triggers for test that don't use processors but require processors for construction of ServiceContext and ServiceProvider
    pub(crate) fn new_void() -> ProcessorsTrigger {
        ProcessorsTrigger {
            requisition_transfer: mpsc::channel(1).0,
            shipment_transfer: mpsc::channel(1).0,
        }
    }
}

#[cfg(test)]
mod test {
    use std::{sync::Arc, time::Duration};

    use actix_rt::task::JoinHandle;
    use tokio::{
        sync::{
            mpsc::{self, Sender},
            Mutex,
        },
        time,
    };

    use super::CHANNEL_BUFFER_SIZE;

    fn trigger(sender1: Sender<()>, sender2: Sender<()>) -> JoinHandle<Vec<i32>> {
        tokio::spawn(async move {
            let mut triggered_compare = Vec::new();
            for _ in 0..1000 {
                time::sleep(Duration::from_millis(1)).await;
                sender1.try_send(()).unwrap();
                sender2.try_send(()).unwrap();
                triggered_compare.push(1);
                triggered_compare.push(2);
                time::sleep(Duration::from_millis(1)).await;
            }
            triggered_compare
        })
    }

    #[actix_rt::test]
    async fn tokio_unbiased_select() {
        // UNBIASED (unordered select)
        let (sender1, mut receiver1) = mpsc::channel(CHANNEL_BUFFER_SIZE);
        let (sender2, mut receiver2) = mpsc::channel(CHANNEL_BUFFER_SIZE);

        let triggered = Arc::new(Mutex::new(Vec::new()));
        let triggered_clone = triggered.clone();

        let processor_handle = tokio::spawn(async move {
            loop {
                tokio::select! {
                    Some(_) = receiver1.recv() => {
                        triggered_clone.lock().await.push(1);
                    },
                    Some(_) = receiver2.recv() => {
                        triggered_clone.lock().await.push(2);
                    },
                    else => break,
                };
            }
        });

        let trigger_handle = trigger(sender1.clone(), sender2.clone());
        let triggered_compare = tokio::select! {
            err = processor_handle => unreachable!("Processor handle shouldn't exit {:?}", err),
            triggered_compare = trigger_handle => triggered_compare.unwrap()
        };
        // Unbaised assert not equal
        assert_ne!(triggered_compare, triggered.lock().await.clone());

        // BIASED (ordered select)
        let (sender1, mut receiver1) = mpsc::channel(CHANNEL_BUFFER_SIZE);
        let (sender2, mut receiver2) = mpsc::channel(CHANNEL_BUFFER_SIZE);

        let triggered = Arc::new(Mutex::new(Vec::new()));
        let triggered_clone = triggered.clone();

        let processor_handle = tokio::spawn(async move {
            loop {
                // Notice biased added to select
                tokio::select! {
                    biased;
                    Some(_) = receiver1.recv() => {
                        triggered_clone.lock().await.push(1);
                    },
                    Some(_) = receiver2.recv() => {
                        triggered_clone.lock().await.push(2);
                    },
                    else => break,
                };
            }
        });

        let trigger_handle = trigger(sender1.clone(), sender2.clone());
        let triggered_compare = tokio::select! {
            err = processor_handle => unreachable!("Processor handle shouldn't exit {:?}", err),
            triggered_compare = trigger_handle => triggered_compare.unwrap()
        };
        // Biased assert equal
        assert_eq!(triggered_compare, triggered.lock().await.clone());
    }
}
