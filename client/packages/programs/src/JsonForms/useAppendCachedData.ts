import {
    isObject,
} from '@common/utils';
import { JsonData } from "./common";


// Adds new data to the cached data, but only if the new data is not empty.
// This is to capture case where state updating of newData hasn't completed yet, and new Data is mi
// missing cached encounter fields
export const appendCachedData = (
    cached: JsonData | undefined,
    newData: JsonData | undefined
): JsonData | undefined => {
    if (newData === undefined || newData === null) return undefined;
    if (cached === undefined || cached === null) return newData;
    if (isObject(newData) && isObject(cached)) {
        return { ...cached, ...newData };
    }
    return newData;
}