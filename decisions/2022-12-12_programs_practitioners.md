# Program Practitioners

- _Date_: 2022-12-12
- _Deciders_: Chris, Clemens, Mark
- _Status_: DECIDED
- _Outcome_: Option 1

## Context

Program encounters need to store the practitioner who actually saw a patient.
The practitioner is not necessarily the currently logged-in user, e.g. a data clerk could enter an encounter on behalf of a practitioner.
Furthermore, for the UI it would be nice to have a dropdown list of existing practitioners.

Currently there is also no way to figure out if a user is a practitioner or just a normal mSupply user.
If a user is a practitioner the users should be used as a default practitioner for a new encounter.

## Options

### Option 1

Use existing `clinician` table to manage clinicians.
What missing is the ability to map a user to a clinician entry (to be able to find the clinician entry of the currently logged-in user).
This could be done by creating a link between the clinician to the user table.

Note:
If a clinician works on multiple sites, we'd likely want to sync both their user and clinician records to the site in some manner.
Otherwise, a limitation of clinicians and users created centrally might be worth noting as a con here (some might say this is desirable wink).

_Cons:_

- If a user is a practitioner, user data is stored in the `user` and the `clinician` table

### Option 2

In the `name` table add a column to flag a user as a practitioner.
Moreover, use the clinician table for practitioner that don't have an mSupply user account.

_Cons:_

- Two sources for practitioners (but could be unified through a view)

### Option 3

Manage practitioners that are not users through a config file.

_Cons:_

- Probably harder to manage.
