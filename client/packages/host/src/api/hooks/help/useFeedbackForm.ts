import { useState } from 'react';

// TODO: replace with backend type once generated
interface DummyFeedbackFormInput {
  email: string;
  message: string;
}
export function useFeedbackForm() {
  const [draft, setDraft] = useState<DummyFeedbackFormInput>({
    email: '',
    message: '',
  });

  const updateDraft = (newData: Partial<DummyFeedbackFormInput>) => {
    const newDraft: DummyFeedbackFormInput = { ...draft, ...newData };
    console.log('newDraft:', newDraft);
    setDraft(newDraft);
  };

  const resetDraft = () => {
    const resetDraft: DummyFeedbackFormInput = {
      email: '',
      message: '',
    };
    setDraft(resetDraft);
  };

  return {
    updateDraft,
    resetDraft,
    draft,
  };
}
