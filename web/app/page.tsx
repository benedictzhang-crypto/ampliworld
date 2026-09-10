import { chatGPTSignInPath, getChatGPTUser } from './chatgpt-auth';
import { GameShell } from './game-shell';

export const dynamic = 'force-dynamic';

export default async function Home() {
  const user = await getChatGPTUser();
  return <GameShell playerName={user?.displayName ?? 'Guest Trader'} signedIn={Boolean(user)} signInPath={chatGPTSignInPath('/')} />;
}
