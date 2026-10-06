import type { Metadata } from "next";
import { Suspense } from "react";

import { AuthLayout } from "@/components/auth/AuthLayout";
import { LoginForm } from "@/components/auth/AuthForms";

export const metadata: Metadata = { title: "Log in" };

export default function LoginPage() {
  return (
    <AuthLayout title="Welcome back" subtitle="Log in to your meetings, notes and tasks.">
      {/* Reads ?next= and ?demo= via useSearchParams. */}
      <Suspense>
        <LoginForm />
      </Suspense>
    </AuthLayout>
  );
}
