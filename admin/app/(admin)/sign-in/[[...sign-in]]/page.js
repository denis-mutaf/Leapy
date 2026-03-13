import { SignIn } from '@clerk/nextjs';

export default function SignInPage() {
  return (
    <div className="min-h-[60vh] flex items-center justify-center bg-page">
      <SignIn />
    </div>
  );
}
