# Program Practitioners

- _Date_: 2022-12-12
- _Deciders_:
- _Status_:
- _Outcome_:

## Context

Program encounters need to store the practitioner who actually saw a patient.
The practitioner is not necessarily the currently logged in user, e.g. a data clerk could enter an encounter on behave of a practitioner.
Furthermore, for the UI it would be nice to have a drop down list of existing practitioners.

Currently there is also no way to figure out if a user is a practitioner or just a normal mSupply user.
If a user is a practitioner the users should be used as a default practitioner for a new encounter.

## Options

### Option 1

Use existing `clinician` table to manage clinicians.
What missing is the ability to map a user to a clinician entry (to be able find the clinician entry of the currently logged in user).
Could the `clinician.code` column be used? or better a new `clinician.user_id` column?

_Cons:_

- If a user is a practitioner, user data is stored in the `user` and the `clinician` table

### Option 2

Add option to flag users to a practitioner.
Moreover, use the clinician table for practitioner that don't have an mSupply user account.

_Cons:_

- Two sources for practitioners (but could be unified through a view)

### Option 3

Manage practitioners that are no user through a config file.

_Cons:_

- Probably harder to manage.
