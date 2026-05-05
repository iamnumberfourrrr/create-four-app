/// <reference types="@vitest/browser/matchers" />
import { expect, test } from "vitest";
import { render } from "vitest-browser-react";
import * as React from "react";

// Smoke test: renders a heading without crashing
test("home page renders heading", async () => {
  const result = await render(
    <main>
      <h1>{{ projectName }}</h1>
      <p>
        Get started by editing <code>src/routes/index.tsx</code>
      </p>
    </main>,
  );

  await expect.element(result.getByRole("heading", { level: 1 })).toBeVisible();
});
