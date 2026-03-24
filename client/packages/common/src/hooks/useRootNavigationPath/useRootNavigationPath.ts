import { RouteBuilder } from '@common/utils';
import { AppRoute } from '@openmsupply-client/config';
import { useIsExtraSmallScreen } from '../useIsExtraSmallScreen';
import { usePreferences } from '../../authentication/api/hooks/usePreferences';
import { useIsCentralServerApi } from '../../authentication/api/hooks/useIsCentralServer';

/**
 * Returns the appropriate root navigation path based on device type and configuration.
 * 
 * - Desktop: Replenishment -> Inbound Shipment
 * - Mobile GAPS (central server): Manage -> Equipment  
 * - Mobile GAPS (store): Coldchain -> Equipment
 * - Mobile default: Replenishment -> Inbound Shipment
 */
export const useRootNavigationPath = (): string => {
    const isExtraSmallScreen = useIsExtraSmallScreen();
    const { isGaps } = usePreferences();
    const isCentralServer = useIsCentralServerApi();

    // Desktop: Inbound Shipment (avoids heavy dashboard queries on login)
    if (!isExtraSmallScreen) {
        return RouteBuilder.create(AppRoute.Replenishment)
            .addPart(AppRoute.InboundShipment)
            .build();
    }

    // GAPS deployments on mobile: Equipment page (manage or coldchain depending on server type)
    if (isGaps) {
        const gapsRoute = isCentralServer ? AppRoute.Manage : AppRoute.Coldchain;
        return RouteBuilder.create(gapsRoute)
            .addPart(AppRoute.Equipment)
            .build();
    }

    // Default mobile landing page: Inbound Shipment
    return RouteBuilder.create(AppRoute.Replenishment)
        .addPart(AppRoute.InboundShipment)
        .build();
};
