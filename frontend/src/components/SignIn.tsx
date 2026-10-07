"use client";

import { useRouter } from "next/navigation";
import type { FormEvent } from "react";

const inputClass =
  "mt-1.5 w-full rounded-md border border-neutral-300 bg-white px-3 py-2 text-sm text-neutral-900 " +
  "placeholder:text-neutral-500 focus:border-neutral-900 focus:ring-1 focus:ring-neutral-900 focus:outline-none";

/**
 * Placeholder sign-in screen. Authentication arrives with the multi-user
 * stage; until then the credentials are neither checked nor sent anywhere, and
 * submitting simply enters the application.
 */
export default function SignIn() {
  const router = useRouter();

  const submit = (event: FormEvent<HTMLFormElement>) => {
    event.preventDefault();
    router.push("/nda/");
  };

  return (
    <main className="flex min-h-screen items-center justify-center px-6 py-12">
      <div className="w-full max-w-sm rounded-md bg-white p-8 shadow-lg ring-1 ring-neutral-300/70">
        <h1 className="text-2xl font-semibold text-neutral-900">Prelegal</h1>
        <p className="mt-1 text-sm text-neutral-500">
          Sign in to draft your legal agreements.
        </p>

        <form onSubmit={submit} className="mt-8 space-y-5">
          <div>
            <label htmlFor="email" className="block text-sm font-medium text-neutral-900">
              Email
            </label>
            <input
              id="email"
              name="email"
              type="email"
              autoComplete="email"
              required
              placeholder="you@company.com"
              className={inputClass}
            />
          </div>
          <div>
            <label htmlFor="password" className="block text-sm font-medium text-neutral-900">
              Password
            </label>
            <input
              id="password"
              name="password"
              type="password"
              autoComplete="current-password"
              required
              className={inputClass}
            />
          </div>
          <button
            type="submit"
            className="w-full rounded-md bg-neutral-900 px-4 py-2 text-sm font-medium text-white hover:bg-neutral-700"
          >
            Sign in
          </button>
        </form>
      </div>
    </main>
  );
}
