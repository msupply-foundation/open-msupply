import { Utils } from './utils';
import { Document } from './document';

export const useDemographicData = {
  utils: {
    demographics: Utils.useDemographicsApi,
  },

  document: {
    getIndicator: Document.useDemographicIndicator,
    listIndicator: Document.useDemographicIndicators,
    insertIndicator: Document.useDemographicIndicatorInsert,
    updateIndicator: Document.useDemographicIndicatorUpdate,

    getProjection: Document.useDemographicProjection,
    listProjection: Document.useDemographicProjections,
    insertProjection: Document.useDemographicProjectionInsert,
    updateProjection: Document.useDemographicProjectionUpdate,
  },
};
