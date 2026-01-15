import { Suspense } from 'react';
import { AppClient } from "./app-client";

export default function Home() {
  return (
    <main>
      <Suspense fallback={<div>Loading...</div>}>
        <AppClient />
      </Suspense>
    </main>
  );
}