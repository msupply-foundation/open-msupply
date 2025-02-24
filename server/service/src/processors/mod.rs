use crate::activity_log::system_log_entry;
use repository::system_log_row::SystemLogType;
use repository::{RepositoryError, StorageConnection};
use std::sync::Arc;
use thiserror::Error;
use tokio::sync::mpsc::{self, Receiver, Sender};
use tokio::sync::oneshot;
use tokio::task::JoinHandle;
use util::format_error;

use crate::service_provider::ServiceProvider;

use self::transfer::invoice::ProcessInvoiceTransfersError;
use self::transfer::requisition::ProcessRequisitionTransfersError;
use self::transfer::{
    invoice::process_invoice_transfers, requisition::process_requisition_transfers,
};
use general_processor::{process_records, ProcessorError};

mod contact_form;
mod general_processor;
mod load_plugin;
pub use general_processor::ProcessorType;
#[cfg(test)]
mod test_helpers;
pub(crate) mod transfer;

const CHANNEL_BUFFER_SIZE: usize = 30;

#[derive(Clone)]
pub struct ProcessorsTrigger {
    requisition_transfer: Sender<()>,
    invoice_transfer: Sender<()>,
    general_processor: Sender<ProcessorType>,
    await_process_queue: Sender<oneshot::Sender<()>>,
}

pub struct Processors {
    requisition_transfer: Receiver<()>,
    invoice_transfer: Receiver<()>,
    general_processor: Receiver<ProcessorType>,
    await_process_queue: Receiver<oneshot::Sender<()>>,
}

#[derive(Debug, Error)]
enum ProcessorsError {
    #[error("Error in invoice transfer processor ({0})")]
    InvoiceTransfer(ProcessInvoiceTransfersError),
    #[error("Error in requisition transfer processor ({0})")]
    RequisitionTransfer(ProcessRequisitionTransfersError),
    #[error("Error in central record processor ({0})")]
    ProcessCentralRecord(ProcessorError),
    #[error("Error when waiting for the process queue to be processed")]
    AwaitProcessQueue(()),
}

impl Processors {
    pub fn init() -> (ProcessorsTrigger, Processors) {
        let (requisition_transfer_sender, requisition_transfer_receiver) =
            mpsc::channel(CHANNEL_BUFFER_SIZE);

        let (invoice_transfer_sender, invoice_transfer_receiver) =
            mpsc::channel(CHANNEL_BUFFER_SIZE);

        let (general_processor_sender, general_processor_receiver) =
            mpsc::channel(CHANNEL_BUFFER_SIZE);

        let (request_check_sender, request_check_receiver) = mpsc::channel(CHANNEL_BUFFER_SIZE);

        (
            ProcessorsTrigger {
                requisition_transfer: requisition_transfer_sender,
                invoice_transfer: invoice_transfer_sender,
                general_processor: general_processor_sender,
                await_process_queue: request_check_sender,
            },
            Processors {
                requisition_transfer: requisition_transfer_receiver,
                invoice_transfer: invoice_transfer_receiver,
                general_processor: general_processor_receiver,
                await_process_queue: request_check_receiver,
            },
        )
    }

    pub fn spawn(self, service_provider: Arc<ServiceProvider>) -> JoinHandle<()> {
        let Processors {
            mut requisition_transfer,
            mut invoice_transfer,
            mut general_processor,
            mut await_process_queue,
        } = self;

        tokio::spawn(async move {
            loop {
                // See test below for reasoning behind biased, even though there is no foreseen use case where
                // requisition must be processed before shipment, it easy to reason about future use cases if
                // order is guaranteed when requisition transfer is triggered before shipment transfer (like it is in synchroniser)
                // The biased flag also makes sure that `await_process_queue` is only called after all other channels are empty.
                let result = tokio::select! {
                    biased;
                    Some(_) = requisition_transfer.recv() => {
                        process_requisition_transfers(&service_provider).map_err(ProcessorsError::RequisitionTransfer)
                    },
                    Some(_) = invoice_transfer.recv() => {
                        process_invoice_transfers(&service_provider).map_err(ProcessorsError::InvoiceTransfer)
                    },
                    Some(r#type) = general_processor.recv() => {
                        process_records(&service_provider, r#type).map_err(ProcessorsError::ProcessCentralRecord)
                    },
                    Some(sender) = await_process_queue.recv() => {
                        sender.send(()).map_err(ProcessorsError::AwaitProcessQueue)
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

    pub(crate) fn trigger_invoice_transfer_processors(&self) {
        if let Err(error) = self.invoice_transfer.try_send(()) {
            log::error!("Problem triggering invoice transfer processor {:#?}", error)
        }
    }

    pub(crate) fn trigger_processor(&self, r#type: ProcessorType) {
        if let Err(error) = self.general_processor.try_send(r#type.clone()) {
            let description = r#type.get_processor().get_description();
            log::error!("Problem triggering {description} processor {:#?}", error)
        }
    }

    /// Waits till all current events in the processor queue are handled.
    /// Its guaranteed that all queued processor events that where in the queue before calling
    /// this method are handled when this method returns.
    /// However, new events might have been added while this method was running.
    pub async fn await_events_processed(&self) {
        let (sender, receiver) = oneshot::channel();
        if let Err(error) = self.await_process_queue.try_send(sender) {
            log::error!(
                "Problem sending the await_events_processed queue {:#?}",
                error
            );
        }

        if let Err(error) = receiver.await {
            log::error!(
                "Problem receiving the await_events_processed response {:#?}",
                error
            );
        }
    }

    /// Empty processor triggers for test that don't use processors but require processors for construction of ServiceContext and ServiceProvider
    pub(crate) fn new_void() -> ProcessorsTrigger {
        ProcessorsTrigger {
            requisition_transfer: mpsc::channel(1).0,
            invoice_transfer: mpsc::channel(1).0,
            general_processor: mpsc::channel(1).0,
            await_process_queue: mpsc::channel(1).0,
        }
    }
}

fn log_system_error(
    connection: &StorageConnection,
    error: &impl std::error::Error,
) -> Result<(), RepositoryError> {
    let error_message = format_error(error);
    log::error!("{}", error_message);
    system_log_entry(connection, SystemLogType::ProcessorError, &error_message)?;
    Ok(())
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
        // Unbiased assert not equal
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
