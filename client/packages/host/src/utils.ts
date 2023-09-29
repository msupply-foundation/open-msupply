import { ReactNode, useState, useEffect } from 'react';

export const getBadgeProps = (value?: number) => ({
  badgeContent: (value ?? 0) as ReactNode,
  max: 99,
  color: 'primary' as 'primary' | 'default',
});

export const useDeviceDetect = () => {
  const [isMobile, setMobile] = useState(false);

  useEffect(() => {
    const userAgent =
      typeof window.navigator === 'undefined' ? '' : navigator.userAgent;
    const mobile = Boolean(
      userAgent.match(
        /Android|BlackBerry|iPhone|iPad|iPod|Opera Mini|IEMobile|WPDesktop/i
      )
    );
    setMobile(mobile);
  }, []);

  return { isMobile };
};
