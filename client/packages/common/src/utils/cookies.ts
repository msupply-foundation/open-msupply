export const readCookie = (name: string): string => {
  const cookies = document.cookie.split('; ');
  const key = `${name}=`;
  const cookie = cookies.find(c => c.startsWith(key));
  return cookie?.replace(key, '') || '';
};
