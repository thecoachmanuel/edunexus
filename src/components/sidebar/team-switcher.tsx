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
              className="data-[state=open]:bg-sidebar-accent data-[state=open]:text-sidebar-accent-foreground"
            >
              <div className="bg-sidebar-primary text-sidebar-primary-foreground flex aspect-square size-8 items-center justify-center rounded-lg overflow-hidden bg-violet-600">
                {activeTeam.logoUrl ? (
                  <img src={activeTeam.logoUrl} alt="Logo" className="w-full h-full object-cover" />
                ) : activeTeam.name ? (
                  <span className="text-lg font-black text-white leading-none">{activeTeam.name.charAt(0).toUpperCase()}</span>
                ) : (
                  <span className="w-4 h-4 rounded bg-white/20 animate-pulse block" />
                )}
              </div>
              <div className="grid flex-1 text-left text-sm leading-tight">
                {activeTeam.name ? (
                  <span className="truncate font-bold text-base">{activeTeam.name}</span>
                ) : (
                  <span className="h-4 w-28 rounded bg-sidebar-accent animate-pulse block" />
                )}
                <span className="truncate text-xs">{yearName}</span>
              </div>
              <ChevronsUpDown className="ml-auto" />
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
                <div className="flex size-6 items-center justify-center rounded-md border overflow-hidden bg-violet-600">
                  {team.logoUrl ? (
                    <img src={team.logoUrl} alt="Logo" className="w-full h-full object-cover" />
                  ) : (
                    <span className="text-xs font-black text-white leading-none">{team.name.charAt(0).toUpperCase()}</span>
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
