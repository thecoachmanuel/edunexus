"use client";

import * as React from "react";
import { ChevronsUpDown, Plus } from "lucide-react";

import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuLabel,
  DropdownMenuSeparator,
  DropdownMenuShortcut,
  DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu";
import {
  SidebarMenu,
  SidebarMenuButton,
  SidebarMenuItem,
  useSidebar,
} from "@/components/ui/sidebar";

export function TeamSwitcher({
  teams,
  yearName,
}: {
  teams: {
    name: string;
    logo: React.ElementType;
    logoUrl?: string;
  }[];
  yearName: string;
}) {
  const { isMobile } = useSidebar();
  const [activeTeam, setActiveTeam] = React.useState(teams[0]);

  // Update activeTeam when teams array changes
  React.useEffect(() => {
    setActiveTeam(teams[0]);
  }, [teams]);

  if (!activeTeam) {
    return null;
  }

  return (
    <SidebarMenu>
      <SidebarMenuItem>
        <DropdownMenu>
          <DropdownMenuTrigger asChild>
            <SidebarMenuButton
              size="lg"
              className="data-[state=open]:bg-sidebar-accent data-[state=open]:text-sidebar-accent-foreground h-auto flex flex-col items-start py-3 relative"
            >
              <div className="bg-sidebar-primary text-sidebar-primary-foreground flex aspect-square size-12 items-center justify-center rounded-lg overflow-hidden mb-2">
                {activeTeam.logoUrl ? (
                  <img src={activeTeam.logoUrl} alt="Logo" className="w-full h-full object-cover" />
                ) : (
                  <activeTeam.logo className="size-6" />
                )}
              </div>
              <div className="grid flex-1 text-left text-sm leading-tight w-full pr-6">
                <span className="truncate font-bold text-base">{activeTeam.name}</span>
                <span className="truncate text-xs">{yearName}</span>
              </div>
              <ChevronsUpDown className="absolute right-3 top-1/2 -translate-y-1/2" />
            </SidebarMenuButton>
          </DropdownMenuTrigger>
          <DropdownMenuContent
            className="w-(--radix-dropdown-menu-trigger-width) min-w-56 rounded-lg"
            align="start"
            side={isMobile ? "bottom" : "right"}
            sideOffset={4}
          >
            <DropdownMenuLabel className="text-muted-foreground text-xs">
              Schools
            </DropdownMenuLabel>
            {teams.map((team, index) => (
              <DropdownMenuItem
                key={team.name}
                onClick={() => setActiveTeam(team)}
                className="gap-2 p-2"
              >
                <div className="flex size-6 items-center justify-center rounded-md border overflow-hidden">
                  {team.logoUrl ? (
                    <img src={team.logoUrl} alt="Logo" className="w-full h-full object-cover" />
                  ) : (
                    <team.logo className="size-3.5 shrink-0" />
                  )}
                </div>
                {team.name}
              </DropdownMenuItem>
            ))}
            <DropdownMenuSeparator />
            <DropdownMenuItem className="gap-2 p-2">
              <div className="flex size-6 items-center justify-center rounded-md border bg-transparent">
                <Plus className="size-4" />
              </div>
              <div className="text-muted-foreground font-medium">Add team</div>
            </DropdownMenuItem>
          </DropdownMenuContent>
        </DropdownMenu>
      </SidebarMenuItem>
    </SidebarMenu>
  );
}
