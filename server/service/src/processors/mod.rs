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
                let result = tokio::select! {
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
    pub(crate) fn trigger_requisition_transfers(&self) {
        if let Err(error) = self.requisition_transfer.try_send(()) {
            log::error!(
                "Problem triggering requisition transfer processor {:#?}",
                error
            )
        }
    }

    pub(crate) fn trigger_shipment_transfers(&self) {
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
