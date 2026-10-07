import type { Metadata } from "next";

import SignIn from "@/components/SignIn";

export const metadata: Metadata = {
  title: "Prelegal — Sign in",
};

export default function SignInPage() {
  return <SignIn />;
}
