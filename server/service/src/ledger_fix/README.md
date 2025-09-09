# Ledger Fix

Due to migration from existing mSupply sites and omSupply bug we've had ledger discrepancies, which are:

- Where total movements of stock (invoice_lines) does not add up to current stock balance (stock_line)
- Where as any point in history, sum of invoice_lines as negative.

### Strategy to deal with ledger discrepancies

#### Prevent

Make it harder to implement things that will cause ledger discrepancy.

- Emphasise tests
- Service/repo structure with one point of entry for operations that affect stock

#### Fix and Notify

We understand that some ledger problems will sneak through (even with our best effort at prevention), to deal with affect of ledger discrepancies on users we will

- Implement a strategy of timely awareness of ledger discrepancies
- Strategy to fix ledger discrepancies in as much of a safe manner as possible

Logic in this section of our codebase is related to fix and notify.

### Ledger driver

There is a scheduler that would attempt to run, in the background

- Once a day
- After initialisation
- After upgrade to this version

This scheduler will try to find ledger discrepancies and then fix them. Scheduler last execution period is stored in key value store. Detailed logging for each stock line ledger fix would be added to normal file/console log and system log (to be synced to omSupply central), notifications can be made to support and dev team via system log (dashboard/notify)

### Find Ledger Discrepancies

This operations should be quick and efficient, using partition sql introduced in stock_line/item ledger view, for each stock_line:

- Find any negative running balances
- Find any cases where final running balances does not add up to total quantity and total quantity is not available quantity + any stock that is reserved but not yet applied to total

### Fix Ledger discrepancies

Each stock line will go through a series of fixes based on know invalid 'states' of ledger. After each fix a ledger discrepancy check is performed, if ledger is not yet fixed the next fix is attempted.

### States and Fixes

In the order of execution (this order is important).

#### Delete - remove_unused_orphan_stock_lines

Legacy mSupply sync v1 sites had an edge case where the V1 API would create orphan stock lines for OMS sites if

1. Their customer invoice was in "confirmed" status
2. OMS had synced, generated a "picked" inbound shipment, and synced it back to central
3. Legacy users continued adding lines on their "confirmed" customer invoice - when synced to central, V1 sync would create trans_lines for the OMS inbound shipment (OMS should have been left to do this),
   and item_lines (without a link to the trans_line). This increases SOH before the inbound shipment is received/verified.
4. Once OMS users finally do receive/verify their inbound shipment, this would further create the valid stock lines as intended by the system, however doubling up on the already erroneously introduced stock.

[Source of issue fixed in Legacy Central.](https://github.com/msupply-foundation/msupply/issues/17137)

Note that if users have issued the stock, we cannot delete the stock line. Later executed ledger fix to introduce the stock with a inventory adjustment will need to address the discrepancy.
If it is deleted and users had already done a stocktake to reduced SOH and adjusted the valid stock line rather than the erroneous one, after delete users will
notice their SOH has decreased and will likely need to do stocktake to increase it again.

`state` total and balance don't add up, available + reserved = total, the ID format is not OMS and the stock line has no related invoice lines

`fix` delete the stock line

#### Adjust historic incoming invoices - adjust_historic_incoming_invoices

We've found use cases where stock introduction after issue, all of them were with mSupply mobile or mSupply uuids.

`state` running balance is negative at some point in history, but current total adds up to available + reserved not picked and to final running balance.

`fix` backdate stock in invoices (with as little impact as possible)

#### Balance ledger with inventory adjustments - inventory_adjustment_to_balance

There are cases where total adds up to reserved not picked, but running balance doesn't not most of them where mSupply mobile or mSupply uuids but some were omSupply uuids (closer investigation of omSupply uuids showed that they were from ledger discrepancy caused by 'cancelled' prescriptions)

`state` final running balance is not total and total is available + reserved not picked, and stock line uuid is not omSupply

`fix` create inventory adjustment to balance final running balance with total, positive inventory adjustment is added to the very start of stock line ledger, negative inventory adjustment is added as far back as possible without causing negative historic ledger

#### Adjust total to match ledger - adjust_total_to_match_ledger

A case where available and reserved is the same as final running balance but total is not. Most of this looks like a ledger discrepancy issue caused by omSupply and mSupply sync interaction, as [per this issue](https://github.com/msupply-foundation/open-msupply/issues/8654).

`state` final running balance is available plus reserved not yet picked, total is not

`fix` adjust total to match available plus reserved not yet picked

#### Cancellations - fix_cancellations

We had a bug in omSupply where cancellations were not putting stock back into stock line, this since has been fixed, but we did find some use cases of this as ledger discrepancies.

`state` where available + reserved not picked + sum of cancelled prescriptions = final running and total + sum of cancelled prescriptions = final running balance

`fix` adjust total by sum of cancelled prescriptions and adjust available by sum of cancelled prescriptions

### Nothing matches - adjust_all_to_match_available

Some unknown use case where final running balance and total and available + reserve not picked are all different from each other, we found only 1 case of this in the data we looked at, which had 6k ledger discrepancies.

`state` available + reserved not picked is not total or running balance, total is not final running balance

`fix` adjust total to be available + reserved not picked and final running balance to be the same, use inventory adjustment method for final running balance as per 'inventory_adjustment_to_balance

## IMPORTANT

Some changes will affect the user, we are trying to keep this to a minimum and most times ledger fixes will have an impact on just the historic reporting. However some times total is adjusted, user may see different in total for item from previous hour/day, in some case this will cause stock line to be 'resurrected', and in even a worse case it will be 'resurrected' but with all balance reserved, this will mean it will not be adjustable unless un-reserved(finding all outbound shipment where stock is reserved and removing stock from those or 'picking/shipping' those outbounds).

This is captured in carry over issue, alongside some improvements to existing logic + future goals

### Tips and Ticks

To re-run ledger fix, you can empty key value store value for 'last ledger fix run' and then restart the app, ledger fix scheduler fix tries to run 5 seconds after startup and then hourly (always checking last ledger fix run, to not run more then once a day)

A good way to investigate ledger fixes is to get a remote database, run a view to find ledger problems, export to excel and start investigating one line at a time with `stock_line_ledger` view. We also found that looking at activity log was helpful (at least in finding the double picked issue). Pay attention to stock_line_id uuids(), all caps = mSupply, lower case = mSupply mobile, the ones with dashes are omSupply.

See 'summary' docs in [this google drive folder](https://drive.google.com/drive/u/1/folders/1dh8hWZ0_GgKWnrf7ldRjAtgp5jg9ZyVi) for sql view, alongside excel files with those views and investigation details.
