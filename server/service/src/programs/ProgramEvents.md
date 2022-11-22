# Program Events

While practitioners are the main driver for entering data there are certain use-cases where data is set in a predefined way.
Currently this is done using program `events`.
Events are stored in documents but are filled automatically, e.g. by the UI form controls while editing a form.
For example, events are currently used for the following purposes:

1. Based on the dispensed pill count encounter, two events are scheduled in the future to change the program status to "Treatment interrupted" or "Lost to follow up"
2. Based on encounter fields being set or not, the specific encounter is labelled as "Pending Lab Report" or "Lap Report Received"

When updating a document (currently only encounter documents) the backend extracts events from the document and puts these events into a `program_event` table.
This table can, for example, be used to find the current encounter status by querying the latest status event which is not scheduled in the future.

## Technical Details

**Event Targets:**
In general there is a multitude of events with each event targeting a different context.
Events might be targeted for a certain patient, a certain document type or a specific document.
Furthermore, an event can have a type and events of different types need to be handled separately.
For example, status changes for one patient should not affect another patient.

Event targets are identified by the following event properties:

- patient id
- document type (e.g. to target the event to a certain program document type)
- document name (e.g. to target the event to a specific encounter)
- type (custom type of the event)

Example list of different event targets:

- `["Patient1", "ProgramType1", undefined, "programStatus"]`
- `["Patient2", "ProgramType1", undefined, "programStatus"]`
- `["Patient1", "EncounterType1", "encounterName1", "encounterStatus"]`
- `["Patient1", "EncounterType1", "encounterName1", "otherEventType"]`

In the following we only discuss the case of one event target; multiple targets can be handled analogously.

**Active Events:**
For a given event target there can only be one active event at a time.

This requirement is needed to model state or status changes over time.
For example, the following timeline shows two events `e1` and `e2` at creation time 20 and creation 40, respectively:

```
---------e1----------e2----
         20          40
```

At time t=30 `e1` is active while it becomes inactive at t=40 where then `e2` becomes active.

**Delayed Event Activation**
Events can be configured to become active after a certain period of time.

For example, after a patient visited a doctor (t=20) the patient's status might change to "Follow up need" after a certain amount of time (at t=40):

```
---------e1-----------------------
         20------------------>40
```

A delayed event can be superseded by a later event and thus never become active.
For example, `e1` is superseded at t=30 where `e2` takes over and later becomes active at t=50:

```
---------e1--------e2---------
         20--------|--------->40
                   30------------------->50
```

This mechanism can be used to keep a patient's "warning status" clear, e.g. if the patient shows up regularly the warning is delayed further into the future in every encounter and the warning never becomes active:

```
---------e1--------e2-------e3--------------e4------------
         20--------|--------|->40           |
                   30-------|----------->50 |
                            38--------------|-->58
                                            53--------------->73
```

**Delayed Event Stacks**
It is also required that events can becomes active in multiple stages, e.g. a status change like "Warning" -> "2nd Warning" -> "Danger".
To achieve this, delayed events can be stacked.
All events in a stack have the same creation time.

For example, three events at time `20` become active in stages ("Warning" at t=30, "2nd Warning" at t=40, "Danger" at t=50):

```
---------s1----------------------------
         20------->30                     "Warning" (active at t=30)
         20------------->40               "2nd Warning" (active at t=40)
         20---------------------->50      "Danger" (active at t=50)
```

A stack can be fully or partially superseded by a newer event.
For example, an event `e2` at t=35 prevents that later events from the first stack become active:

```
---------s1------------e2---------------
         20------->30  |                     "Warning" (active at t=30)
         20------------|--->40               "2nd Warning" (never becomes active)
         20------------|------------>50      "Danger" (never becomes active)
                       35------>45           (active at t=45)
```

**Replacing Stacks**
When updating a document the events in the document might change and thus it must be possible updated or even removed event stacks.
For this the old stack is fully removed and the updated stack is inserted.

**Querying Event at a certain Time**
For reporting it is required to query event, e.g. states, at a certain point in time.
Having the information as described so far (event creation time and activation time) in a database table is theoretically enough to reconstruct any state in time.
However, in practice such a query is relatively complicated and potentially inefficient.

To solve this problem we shift some work from the query to the event insertion by keeping track when events become superseded or deactivated by other events.
To achieve this, we keep track of the `active_start_datetime` and the `active_end_datetime` times.
If an event is not superseded by a later event, the event has `active_end_datetime` set to a max value.
A query for a state at a time `t_search` becomes very simple now, e.g. `SELECT * WHERE active_start_datetime <= t_search AND t_search < active_end_datetime`;
This even works for queries over multiple event targets, e.g. to query the status of all encounters.

In the examples `active_start_datetime` is visualized with the `->` notation while the `active_end_datetime` time is from now on visualizes with `E` which shows when an event becomes deactivated:

```
---------s1----------------------------e2-
         20------->30-------E          |
         20----------------->40-------E|
                                       50
```

When inserting a new event this requires us to also update the `active_end_datetime` time of previous events.
For example, based on the previous example, `e3` is inserted as following:

```
  -------s1-------------e3-------------e2-
a)       20------->30--E|              |
b)       20------------E|--->40        |
c)                      35------>45---E|
d)                                     50
```

When inserting `e3` we need to update update the `active_end_datetime` for the stack `s1` and use the latest `active_end_datetime` from `s1` for `e3`.

Similar the `active_end_datetime` column needs to be update when replacing a stack.
