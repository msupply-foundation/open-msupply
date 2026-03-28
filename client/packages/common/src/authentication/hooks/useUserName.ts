import { useAuthContext } from '../AuthContext';

export const useUserName = (): string => {
  const { user } = useAuthContext();
  return user?.name ?? '';
};
