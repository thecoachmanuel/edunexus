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
import { useMemo, useState, useEffect } from "react";
import { toast } from "sonner";
import { api } from "@/lib/api";
import { cn } from "@/lib/utils";
import { Button } from "@/components/ui/button";
import { ThemeToogle } from "./ThemeToogle";
import { NotificationBell } from "@/components/notifications/NotificationBell";

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
          roles: ["admin", "teacher", "student"],
        },
        {
          title: "Parent Portal",
          url: "/parent/portal",
          roles: ["parent"],
        },
        {
          title: "Activities Log",
          url: "/activities-log",
          roles: ["admin"], // Restricted to Admin
        },
      ],
    },
    {
      title: "Workspace",
      url: "#",
      icon: LayoutDashboard,
      roles: ["admin", "teacher"],
      items: [
        {
          title: "Kanban Board",
          url: "/tasks",
        },
        {
          title: "Calendar",
          url: "/calendar",
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
          title: "Results Broadsheet",
          url: "/academics/results",
          roles: ["admin", "teacher"],
        },
        {
          title: "Grading Config",
          url: "/academics/grading-config",
          roles: ["admin"],
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
        { title: "Analytics", url: "/analytics" },
        { title: "School Settings", url: "/settings/school" },
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

  // Dynamic School Settings state
  const [schoolInfo, setSchoolInfo] = useState({
    name: "Springfield High",
    logoUrl: "",
  });

  useEffect(() => {
    // Fetch global school settings for sidebar branding
    api.get("/settings/school")
      .then((res) => {
        if (res.data?.settings) {
          setSchoolInfo({
            name: res.data.settings.schoolName || "Springfield High",
            logoUrl: res.data.settings.schoolLogo || "",
          });
        }
      })
      .catch((err) => console.error("Failed to load school branding for sidebar", err));
  }, []);

  const dynamicTeams = [
    {
      name: schoolInfo.name,
      logo: School,
      logoUrl: schoolInfo.logoUrl,
    },
  ];

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
      <SidebarHeader className="pt-6 pb-4 px-6 group-data-[collapsible=icon]:px-2 group-data-[collapsible=icon]:pt-4">
        <div className="flex items-center gap-3 overflow-hidden">
          <div className="flex aspect-square size-10 items-center justify-center rounded-xl bg-gradient-to-br from-[#8b5cf6] to-[#7c3aed] text-white shadow-md shrink-0">
            <span className="font-bold text-xl leading-none italic">ia</span>
          </div>
          <div className="grid flex-1 text-left text-sm leading-tight transition-all duration-200 group-data-[collapsible=icon]:opacity-0 group-data-[collapsible=icon]:w-0 group-data-[collapsible=icon]:hidden">
            <span className="truncate font-bold text-xl text-[#7c3aed] tracking-tight whitespace-nowrap">
              ia Academy
            </span>
          </div>
        </div>
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
          {!isCollapsed && <NotificationBell />}
          <ThemeToogle />
        </div>
        <NavUser user={userData} />
      </SidebarFooter>
      <SidebarRail />
    </Sidebar>
  );
}
