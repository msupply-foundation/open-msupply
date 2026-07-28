import { v7 } from 'uuid';

/**
 * Mints ids for new records — UUID v7 (time-ordered), the same format the
 * current app generates. Never mint ids with `crypto.randomUUID` (banned by
 * lint): it exists only in secure contexts, so it crashes on tablets
 * reaching a site server over a plain-HTTP LAN origin (#499). `uuid`'s
 * generator is built on `crypto.getRandomValues`, which insecure contexts
 * do have.
 */
export const generateUUID = () => v7();
