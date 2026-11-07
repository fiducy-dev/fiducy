import '@fiducy/sdk/element';

const form = document.querySelector<HTMLFormElement>('#ask');
const reply = document.querySelector<HTMLOutputElement>('#reply');

form?.addEventListener('submit', async (event) => {
  event.preventDefault();
  const response = await fetch('/api/ask', {
    method: 'POST',
    headers: { 'content-type': 'application/json' },
    body: JSON.stringify({ question: new FormData(form).get('question') })
  });
  const body = (await response.json()) as { data: { answer: string } | null; message: string };
  if (reply) reply.value = body.data?.answer ?? body.message;
});
