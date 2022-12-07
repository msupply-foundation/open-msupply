# Remote Server Backup

- *Date*: 2022-12-7
- *Deciders*: 
- *Status*: 
- *Outcome*: 
- *Related Material*: [Backup Issue](https://github.com/openmsupply/open-msupply/issues/767)

## Context

It's important to back up remote server data so that it can be restored in case of corruption/loss. This KDD is to discuss remote synchronised server backup.

In existing 4d mSupply, for remote servers, we have backup files and current journal file. There is no way to re-initialise remote desktop mSupply sites, thus we must rely on local/dropbox backups. There have been cases with quite catastrophic outcomes where backup was restored incorrectly, causing major data synchronisation issues.

### Wrongly Restored
* Wrong backup (not the latest)
* Forget to integrate journal
* Journal data corruption

### Major data syncrhonisation issues

When remote data is not `in sync` with central data (i.e. older backup was used), we almost certainly have a ledge discrepancy that can persist and is hard to fix correctly. 

**Example:**

Consider that remote and central server data is synchronised, and we have the following ledger for stockline: stockline quantity = 10, transaction1 = +15, transaction2 = -2 transaction3 = -3. 15 - 2 - 3 = 10 thus ledge is correct. Now if remote server backup was restored not including transaction 3, stockline quantity would be 13, and any further transaction or create ledger discrepancy for this stockline on central server.

## Options

### Option 1 - Local backup

Local backup with journal

*Pros:*
- Can be restored easier with low bandwidth environment
- Reduce data loss if done correctly in cases where internet was not available and sync not possible

*Cons:*
- Hard to set up correctly and to maintain (for both sqlite and postgres)
- Large disc space requirement
- Risk of incorrect restore and being `out of sync`

### Option 2 - Backup via sync

Re initialise in case of data loss. We can deploy some strategies to improve this process in low bandwidth environment (i.e. restore backup on central server and send data file)

*Pros:*
- Reduced risk of incorrect restore
- No extra setup and maintenance needed

*Cons:*
- Can loose data if there was no internet for syncrhonisation (or if we had sync errors)
- Challenging in low bandwidth environment

## Decision

I suggest going with Option 2, I think it would be quite hard to setup failsafe and maintenance free local backups for both sqlite and postgres. I also hold an assumption that data corruption scenarior is very low risk and if there is data corruption it's likely to be hardware related at which point it's likely local backups are damaged.