import { createFileRoute } from "@tanstack/react-router";
import { AnchorNav } from "~/components/anchor-nav";
import { Choices } from "~/components/choices";
import { Configurator } from "~/components/configurator";
import { Hero } from "~/components/hero";
import { AddModel } from "~/components/add-model";
import { Footer } from "~/components/footer";
import { Idempotency } from "~/components/idempotency";
import { ModuleTable } from "~/components/module-table";
import { Seams } from "~/components/seams";
import { TreeSection } from "~/components/tree-section";
import { MetadataAside } from "~/components/metadata-aside";
import { SiteHeader } from "~/components/site-header";

export const Route = createFileRoute("/")({
  component: Home,
});

function Home() {
  return (
    <div className="min-h-screen">
      <SiteHeader />
      <div className="grid grid-cols-1 lg:grid-cols-[minmax(220px,1fr)_minmax(0,2.4fr)_minmax(220px,1fr)]">
        <AnchorNav className="order-2 lg:order-1" />
        <main className="order-1 lg:order-2">
          <Hero />
          <Choices />
          <Configurator />
          <ModuleTable />
          <Seams />
          <TreeSection />
          <AddModel />
          <Idempotency />
        </main>
        <MetadataAside className="order-3" />
      </div>
      <Footer />
    </div>
  );
}
