# Shipment Transfer Processor

As per general description in [transfer processors](../README.md) and these diagrams:

From [TMF internal google doc](https://docs.google.com/presentation/d/1eEe0uBGvkXbYnKc2oLO2U0qRwFv4l0ws4QwFZa6e74s/edit#slide=id.p):

![omSupply shipment transfer processors](./doc/omSupply_shipment_transfer_workflow.png)

From [TMF internal docs](https://app.diagrams.net/#G1o_xRQAhjVsnqhxhJEu9dY6AZ_lJfG9co)

![omSupply shipment transfer processors](./doc/omSupply_shipment_transfer_processors.png)

## Request Requisition linked to Inbound Shipment

When inbound shipment is created from outbound shipment, we check for requisition linked to outbound shipment (response requisition) and check what request requisition is linked to that response requisition and link inbound shipment with correct request requisition

## Invoice Line on Update

When outbound shipment is updated and inbound shipment was already generated, invoice lines will be dropped and and reinstanted to match outbound shipment (this is the simples way to update potentially changed invoice lines)