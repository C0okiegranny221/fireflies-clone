import type { Metadata } from "next";
import { Suspense } from "react";

import { AuthLayout } from "@/components/auth/AuthLayout";
import { SignupForm } from "@/components/auth/AuthForms";

export const metadata: Metadata = { title: "Sign up" };

export default function SignupPage() {
  return (
    <AuthLayout
      title="Create your account"
      subtitle="Free forever for this demo. You'll join the shared demo workspace."
    >
      <Suspense>
        <SignupForm />
      </Suspense>
    </AuthLayout>
  );
}
