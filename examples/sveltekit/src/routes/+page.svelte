<script lang="ts">
import { fiducyKey } from '@fiducy/sdk/svelte';

let reply = $state('');

const ask = async (event: SubmitEvent) => {
  event.preventDefault();
  const formData = new FormData(event.currentTarget as HTMLFormElement);
  const response = await fetch('/api/ask', {
    method: 'POST',
    headers: { 'content-type': 'application/json' },
    body: JSON.stringify({ question: formData.get('question') })
  });
  const body = (await response.json()) as { data: { answer: string } | null; message: string };
  reply = body.data?.answer ?? body.message;
};
</script>

<main>
  <h1>Fiducy with SvelteKit</h1>
  <form method="post" action="/api/session">
    <button type="submit">Sign in as a test user</button>
  </form>
  <div use:fiducyKey={{ provider: 'openai' }}></div>
  <form class="ask" onsubmit={ask}>
    <label for="question">Question</label>
    <input id="question" name="question" value="Say hello" />
    <button type="submit">Ask</button>
    <output>{reply}</output>
  </form>
</main>
