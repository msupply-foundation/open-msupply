import { useNavigate } from 'react-router';

export const useOpenInNewTab = () => {
  const navigate = useNavigate();
  return (url: string) => {
    const win = window.open(url, '_blank');
    if (win) {
      win.focus();
    } else {
      navigate(url);
    }
  };
};
