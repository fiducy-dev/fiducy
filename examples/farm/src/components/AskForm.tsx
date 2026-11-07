'use client';

import { useState } from 'react';

export const AskForm = () => {
  const [reply, setReply] = useState('');

  const ask = async (formData: FormData) => {
    const response = await fetch('/api/ask', {
      method: 'POST',
      headers: { 'content-type': 'application/json' },
      body: JSON.stringify({ question: formData.get('question') })
    });
    const body = (await response.json()) as { data: { answer: string } | null; message: string };
    setReply(body.data?.answer ?? body.message);
  };

  return (
    <form action={ask} className="ask">
      <label htmlFor="question">Question</label>
      <input id="question" name="question" defaultValue="Say hello" />
      <button type="submit">Ask</button>
      <output>{reply}</output>
    </form>
  );
};
