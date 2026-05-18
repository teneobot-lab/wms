import { redirect } from 'next/navigation';

export default function HomePage() {
  // Server-side redirect - no client-side check needed
  // The middleware will handle authentication check
  redirect('/dashboard');
}