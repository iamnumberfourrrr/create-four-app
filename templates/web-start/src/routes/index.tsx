import { createFileRoute } from "@tanstack/react-router";
import * as React from "react";

export const Route = createFileRoute("/")({
  component: Home,
});

function Home() {
  return (
    <main>
      <h1>{{ projectName }}</h1>
      <p>
        Get started by editing <code>src/routes/index.tsx</code>
      </p>
    </main>
  );
}
