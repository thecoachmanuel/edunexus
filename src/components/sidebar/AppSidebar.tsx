"use client";

import {
  Settings2,
  School,
  GraduationCap,
  Users,
  LayoutDashboard,
  Banknote,
  type LucideIcon,
  LogOut,
} from "lucide-react";

import { NavMain } from "@/components/sidebar/nav-main";
import { NavUser } from "@/components/sidebar/nav-user";
import { TeamSwitcher } from "@/components/sidebar/team-switcher";
import {
  Sidebar,
  SidebarContent,
  SidebarFooter,
  SidebarHeader,
  SidebarMenuItem,
  SidebarRail,
  useSidebar,
} from "@/components/ui/sidebar";
import type { UserRole } from "@/types";
import { usePathname, useRouter } from "next/navigation";
import { useAuth } from "@/hooks/AuthProvider";
import { useMemo } from "react";
import { toast } from "sonner";
import { api } from "@/lib/api";
import { cn } from "@/lib/utils";
import { Button } from "@/components/ui/button";
import { ThemeToogle } from "./ThemeToogle";

export interface NavItem {
  title: string;
  url: string; // Used for linking and active state matching
  icon?: LucideIcon;
  isActive?: boolean; // Default open state for collapsibles
  roles?: UserRole[]; // Who can see this section? (undefined = everyone)
  items?: {
    title: string;
    url: string;
    roles?: UserRole[]; // Who can see this specific link?
  }[];
}

// This is sample data.
export const sidebardata = {
  teams: [
    {
      name: "Springfield High",
      logo: School,
    },
  ],
  navMain: [
    {
      title: "Dashboard",
      url: "/dashboard",
      icon: LayoutDashboard,
      isActive: true,
      roles: ["admin", "teacher", "student", "parent"],
      items: [
        {
          title: "Dashboard",
          url: "/dashboard",
          roles: ["admin", "teacher", "student", "parent"],
        },
        {
          title: "Activities Log",
          url: "/activities-log",
          roles: ["admin"], // Restricted to Admin
        },
      ],
    },
    {
      title: "Academics",
      url: "#", // Parent item, no link
      icon: School,
      roles: ["admin", "teacher", "student", "parent"],
      items: [
        {
          title: "Classes",
          url: "/classes",
          roles: ["admin", "teacher"],
        },
        {
          title: "Subjects",
          url: "/subjects",
          roles: ["admin", "teacher"],
        },
        {
          title: "Timetable",
          url: "/timetable",
        },
        {
          title: "Attendance",
          url: "/academics/attendance",
          roles: ["admin", "teacher"],
        },
        {
          title: "Attendance Tracking",
          url: "/academics/attendance/tracking",
          roles: ["admin", "teacher"],
        },
        {
          title: "Report Cards",
          url: "/academics/reports",
          roles: ["admin", "teacher", "parent", "student"],
        },
      ],
    },
    {
      title: "Learning (LMS)",
      url: "#",
      icon: GraduationCap,
      roles: ["teacher", "student", "admin"],
      items: [
        // { title: "Quizzes", url: "/lms/assignments" },
        { title: "Quizzes", url: "/lms/quizzes" },
        { title: "Study Materials", url: "/lms/materials" },
      ],
    },
    {
      title: "People",
      url: "#",
      icon: Users,
      roles: ["admin", "teacher"],
      items: [
        { title: "Students", url: "/users/students" },
        {
          title: "Teachers",
          url: "/users/teachers",
          roles: ["admin"],
        },
        {
          title: "Parents",
          url: "/users/parents",
          roles: ["admin"],
        },
        {
          title: "Admins",
          url: "/users/admins",
          roles: ["admin"],
        },
      ],
    },
    {
      title: "Finance",
      url: "#",
      icon: Banknote,
      roles: ["admin", "student", "parent"],
      items: [
        { title: "Overview", url: "/finance", roles: ["admin"] },
        { title: "Fee Management", url: "/finance/fees", roles: ["admin"] },
        { title: "Expenses", url: "/finance/expenses", roles: ["admin"] },
        { title: "Salary", url: "/finance/salary", roles: ["admin"] },
        { title: "My Fees", url: "/finance/my-fees", roles: ["student", "parent"] },
      ],
    },
    {
      title: "System",
      url: "#",
      icon: Settings2,
      roles: ["admin"],
      items: [
        // { title: "School Settings", url: "/settings/general" },
        { title: "Academic Years", url: "/settings/academic-years" },
        // { title: "Roles & Permissions", url: "/settings/roles" },
      ],
    },
  ] as NavItem[],
};

export function AppSidebar({ ...props }: React.ComponentProps<typeof Sidebar>) {
  const { user, year, setUser } = useAuth();
  const pathname = usePathname();
  const { state } = useSidebar();
  const isCollapsed = state === "collapsed";
  const router = useRouter();

  const userData = {
    name: user?.name || "User",
    email: user?.email || "",
    avatar: "",
  };

  const userRole = (user?.role || "student") as UserRole;

  const filteredNav = useMemo(() => {
    return sidebardata.navMain
      .filter((item) => !item.roles || item.roles.includes(userRole))
      .map((item) => {
        const isChildActive = item.items?.some((sub) => sub.url === pathname);
        const isMainActive = item.url === pathname;
        return {
          ...item,
          isActive: isMainActive || isChildActive,
          items: item.items
            ?.filter(
              (subItem) => !subItem.roles || subItem.roles.includes(userRole),
            )
            .map((subItem) => ({
              ...subItem,
              isActive: subItem.url === pathname,
            })),
        };
      });
  }, [pathname, userRole]);

  const logout = async () => {
    try {
      await api.post("/users/logout").finally(() => {
        setUser(null);
        router.push("/login");
        toast.success("Logged out successfully");
      });
    } catch (error) {
      console.error("Logout failed:", error);
      toast.error("Logout failed. Please try again.");
    }
  };
  return (
    <Sidebar collapsible="icon" {...props}>
      <SidebarHeader>
        <TeamSwitcher teams={sidebardata.teams} yearName={year?.name!} />
      </SidebarHeader>
      <SidebarContent>
        <NavMain items={filteredNav} />
      </SidebarContent>
      <SidebarFooter>
        <div
          className={cn(
            "gap-2",
            isCollapsed ? "flex-row space-y-2" : "flex justify-between",
          )}
        >
          <SidebarMenuItem title="Logout">
            <Button onClick={logout} variant={"ghost"} size="icon-sm">
              <LogOut />
            </Button>
          </SidebarMenuItem>
          <ThemeToogle />
        </div>
        <NavUser user={userData} />
      </SidebarFooter>
      <SidebarRail />
    </Sidebar>
  );
}
