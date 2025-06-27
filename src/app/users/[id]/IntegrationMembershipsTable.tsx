"use client";

import React from "react";
import Table from "@/src/components/Table";
import AppIcon from "@/src/components/AppIcon";

type IntegrationMembership = {
  id: string;
  integration: {
    name: string;
    appType: {
      name: string;
      icon?: string;
    };
  };
};

interface IntegrationMembershipsTableProps {
  memberships: IntegrationMembership[];
}

export default function IntegrationMembershipsTable({ memberships }: IntegrationMembershipsTableProps) {
  return (
    <Table
      data={memberships}
      columns={[
        {
          header: "Integration Name",
          accessor: (membership) => membership.integration.name,
          sortKey: "integration.name",
          sortable: false,
        },
        {
          header: "Type",
          accessor: (membership) => (
            <div className="flex items-center">
              <AppIcon 
                iconName={membership.integration.appType.icon} 
                size={20} 
                className="mr-2" 
              />
              {membership.integration.appType.name}
            </div>
          ),
          sortKey: "integration.appType.name",
          sortable: false,
        }
      ]}
      keyExtractor={(membership) => membership.id}
      defaultRowsPerPage={10}
      emptyMessage="No integrations assigned"
    />
  );
}
