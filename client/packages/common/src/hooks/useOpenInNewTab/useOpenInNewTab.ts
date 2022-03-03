import { useNavigate } from 'react-router';

export const useOpenInNewTab = () => {
  const navigate = useNavigate();
  const { origin } = window.location;
  return (url: string) => {
    const to = `${origin}${url}`;
    const win = window.open(to, '_blank');
    if (win) {
      win.focus();
    } else {
      navigate(to);
    }
  };
};
