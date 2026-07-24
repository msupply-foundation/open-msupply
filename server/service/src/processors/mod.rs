use repository::system_log_row::SystemLogType;
use repository::{RepositoryError, StorageConnection};
use std::sync::Arc;
use thiserror::Error;
use tokio::sync::mpsc::{self, Receiver, Sender};
use tokio::sync::oneshot;
use tokio::task::JoinHandle;

use crate::activity_log::system_error_log;
use crate::service_provider::ServiceProvider;

use self::transfer::invoice::ProcessInvoiceTransfersError;
use self::transfer::requisition::ProcessRequisitionTransfersError;
use self::transfer::{
    invoice::process_invoice_transfers, requisition::process_requisition_transfers,
};
use general_processor::{process_records, ProcessorError};

mod add_central_patient_visibility;
// Processor currently disabled (not constructed in ProcessorType::get_processors), see #12547
#[allow(dead_code, unused_imports)]
mod assign_prescription_number;
mod assign_requisition_number;
mod contact_form;
mod general_processor;
mod load_plugin;
mod plugin_processor;
mod requisition_auto_finalise;
mod support_upload_files;
pub use general_processor::ProcessorType;
#[cfg(test)]
mod test_helpers;
pub(crate) mod transfer;

const CHANNEL_BUFFER_SIZE: usize = 30;

/// Number of re-trigger/re-drain attempts `await_events_processed` makes so processors converge
/// past the `ChangelogCursorTracker` clamp (see `await_events_processed` for details).
const AWAIT_EVENTS_DRAIN_ATTEMPTS: usize = 10;
/// Pause between drain attempts, giving an in-flight sibling transaction time to commit and lift
/// its changelog cursor clamp before the next re-read.
const AWAIT_EVENTS_DRAIN_INTERVAL: std::time::Duration = std::time::Duration::from_millis(20);

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
                        process_records(&service_provider, r#type).await.map_err(ProcessorsError::ProcessCentralRecord)
                    },
                    Some(sender) = await_process_queue.recv() => {
                        sender.send(()).map_err(ProcessorsError::AwaitProcessQueue)
                    },
                    // None will be returned by recv if channel is closed, this would only really happen if all receivers were dropped
                    else => break,
                };

                if let Err(error) = result {
                    log::error!("{error}");
                }
            }
        })
    }
}

impl ProcessorsTrigger {
    pub(crate) fn trigger_requisition_transfer_processors(&self) {
        if let Err(error) = self.requisition_transfer.try_send(()) {
            log::error!("Problem triggering requisition transfer processor {error:#?}")
        }
    }

    pub(crate) fn trigger_invoice_transfer_processors(&self) {
        if let Err(error) = self.invoice_transfer.try_send(()) {
            log::error!("Problem triggering invoice transfer processor {error:#?}")
        }
    }

    pub(crate) fn trigger_processor(&self, r#type: ProcessorType) {
        if let Err(error) = self.general_processor.try_send(r#type.clone()) {
            let description = r#type.get_description();
            log::error!("Problem triggering {description} processor {error:#?}")
        }
    }

    /// Waits till all current events in the processor queue are handled.
    /// Its guaranteed that all queued processor events that where in the queue before calling
    /// this method are handled when this method returns.
    /// However, new events might have been added while this method was running.
    pub async fn await_events_processed(&self) {
        // A single drain is no longer sufficient since the changelog read race is guarded by the
        // in-memory `ChangelogCursorTracker` (replacing the old `LOCK TABLE` approach). Under that
        // clamp a changelog reader no longer blocks on an in-flight writer on another connection;
        // it returns immediately with rows above the in-flight cursor hidden. So a processor drain
        // can finish having skipped a record that is committed-but-clamped behind a concurrent
        // transaction (e.g. one of the sibling instances in the concurrent transfer tests). The
        // skipped record is not lost - the processor cursor is not advanced past it, so the next
        // trigger re-reads it once the clamp clears. In production that next trigger arrives with
        // ordinary activity; tests need to drive it here.
        //
        // Re-trigger the transfer processors and re-drain a few times, with a short pause for any
        // in-flight sibling transaction to commit and lift its clamp, so the processors converge
        // before this method returns - matching the eventual consistency a running system has.
        for iteration in 0..AWAIT_EVENTS_DRAIN_ATTEMPTS {
            self.trigger_requisition_transfer_processors();
            self.trigger_invoice_transfer_processors();

            let (sender, receiver) = oneshot::channel();
            if let Err(error) = self.await_process_queue.send(sender).await {
                log::error!("Problem sending the await_events_processed queue {error:#?}");
            }

            if let Err(error) = receiver.await {
                log::error!("Problem receiving the await_events_processed response {error:#?}");
            }

            if iteration + 1 < AWAIT_EVENTS_DRAIN_ATTEMPTS {
                tokio::time::sleep(AWAIT_EVENTS_DRAIN_INTERVAL).await;
            }
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
    system_error_log(connection, SystemLogType::ProcessorError, &error, "")?;
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
