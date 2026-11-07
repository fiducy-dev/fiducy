import { AskForm } from '@/components/AskForm';
import { KeySettings } from '@/components/KeySettings';

const HomePage = () => (
  <main>
    <h1>Fiducy with Next.js</h1>
    <form method="post" action="/api/session">
      <button type="submit">Sign in as a test user</button>
    </form>
    <KeySettings />
    <AskForm />
  </main>
);

export default HomePage;
