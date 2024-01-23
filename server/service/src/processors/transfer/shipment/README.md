# Shipment Transfer Processor

As per general description in [transfer processors](../README.md) and these diagrams:

From [TMF internal google doc](https://docs.google.com/presentation/d/1eEe0uBGvkXbYnKc2oLO2U0qRwFv4l0ws4QwFZa6e74s/edit#slide=id.p):

![omSupply shipment transfer processors](./doc/omSupply_shipment_transfer_workflow.png)

From [TMF internal docs](https://app.diagrams.net/#G1o_xRQAhjVsnqhxhJEu9dY6AZ_lJfG9co)

![omSupply shipment transfer processors](./doc/omSupply_shipment_transfer_processors.png)

## Request Requisition linked to Inbound Shipment

When an inbound shipment is created from outbound shipment, we check for a requisition linked to the outbound shipment (response requisition) and check which request requisition is linked to that response requisition and link the inbound shipment with correct request requisition

## Invoice Line on Update

When an outbound shipment is updated and an inbound shipment is already generated, invoice lines will be dropped and reinstated to match the outbound shipment (this is the simplest way to update potentially changed invoice lines)

## Same site transfer (both stores on same site)

You may want to refer to [requisition transfer docs](../requisition/README.md#same-site-transfer-both-stores-on-same-site) for example of how one instance of triggered processor can itself upsert records and process them in the next iteration

## Merged names

Stores have a direct FK to names via `store.name_id`. `changelog.name_id` is indirect, really being a FK to via `name_link.id`. As processors use the changelog to find records that require transfers to be generated, keep in mind that the change_logs need to selected for matching any `name_link.id` related to `store.name_id -> name_link.name_id, name_link.id -> changelog.name_id`. This will be more apparent when `changelog.name_id` is renamed to `changelog.name_link_id`.
