export interface EncounterEvent {
  /**
   * Time when the event becomes active. This can be in the future.
   * For example, a status could be set to become active after a certain period of time.
   *
   * @format date-time
   */
  activeDatetime: string;
  /** The document type this event is associated with */
  documentType: string;
  /** The event target document name, if event is associated with a specific document */
  documentName?: string;

  /**
   * Field to group events.
   *
   * Motivation: UI components usually only update a subset of "their" events.
   * The group field can be used to group or "tag" events so that the UI component knows which
   * events to update.
   * Note, the event type is in general not enough since multiple UI components could update events
   * of the same type.
   */
  group?: string;
  /**
   * Name of this specific event. There could be multiple events of the same type but with different
   * names.
   * For example, two event could have type 'status' and name "Status name 1" and "Status name 2"
   */
  name?: string;
  /**
   * For example, encounter 'status'.
   */
  type: string;
}
