'use client';

import { Tabs, TabsContent, TabsList, TabsTrigger } from '@qavio/ui';

export interface ProjectTabsProps {
  overview: React.ReactNode;
  environments: React.ReactNode;
}

/**
 * Both tabs' content is fetched up front by the page (a Server
 * Component) and handed in as already-rendered children — this only
 * owns which one is visible. Keeps every data fetch server-side instead
 * of lazily fetching per-tab from the client.
 */
export function ProjectTabs({ overview, environments }: ProjectTabsProps) {
  return (
    <Tabs defaultValue="overview">
      <TabsList>
        <TabsTrigger value="overview">Overview</TabsTrigger>
        <TabsTrigger value="environments">Environments</TabsTrigger>
      </TabsList>
      <TabsContent value="overview" className="mt-6">
        {overview}
      </TabsContent>
      <TabsContent value="environments" className="mt-6" id="environments">
        {environments}
      </TabsContent>
    </Tabs>
  );
}
