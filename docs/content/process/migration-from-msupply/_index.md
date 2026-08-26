+++
title = "Migration from mSupply"
weight = 50
sort_by = "weight"
template = "docs/section.html"

[extra]
source = "docs"
+++

# Migration from mSupply

When migrating an implementation from mSupply to Open mSupply please be aware of the following:

## Distribution

#### Outbound Shipment

- Status: **Picked**. Goods are no longer part of inventory. This was done to match mSupply's `cn` status

## Replenishment

## Catalogue

## Inventory

#### Repacks

- If you have a repack in the `new` status, then this will not be transferred to Open mSupply. There is no `new` status in Open mSupply for repacks, these are saved in the system as finalised and the stock adjusted when you save.

## Dispensary

## Coldchain
