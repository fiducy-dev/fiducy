<script setup lang="ts">
import { FiducyKey } from '@fiducy/sdk/vue';

const reply = ref('');

const ask = async (event: Event) => {
  const formData = new FormData(event.currentTarget as HTMLFormElement);
  const response = await fetch('/api/ask', {
    method: 'POST',
    headers: { 'content-type': 'application/json' },
    body: JSON.stringify({ question: formData.get('question') })
  });
  const body = (await response.json()) as { data: { answer: string } | null; message: string };
  reply.value = body.data?.answer ?? body.message;
};
</script>

<template>
  <main>
    <h1>Fiducy with Nuxt</h1>
    <form method="post" action="/api/session">
      <button type="submit">Sign in as a test user</button>
    </form>
    <FiducyKey provider="openai" />
    <form class="ask" @submit.prevent="ask">
      <label for="question">Question</label>
      <input id="question" name="question" value="Say hello" />
      <button type="submit">Ask</button>
      <output>{{ reply }}</output>
    </form>
  </main>
</template>
