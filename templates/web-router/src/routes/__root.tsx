import * as React from "react";
import { Outlet, createRootRoute } from "@tanstack/react-router";
import { Providers } from "~/providers/index";
import "~/styles/index";

export const Route = createRootRoute({
  component: RootComponent,
});

function RootComponent() {
  return (
    <Providers>
      <Outlet />
    </Providers>
  );
}
