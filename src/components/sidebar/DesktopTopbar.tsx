"use client";

import { Search, Bell, MessageSquare, ChevronDown } from "lucide-react";
import { useAuth } from "@/hooks/AuthProvider";
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuLabel,
  DropdownMenuSeparator,
  DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu";

export function DesktopTopbar() {
  const { user, logout } = useAuth();

  return (
    <div className="hidden md:flex items-center justify-between h-16 px-8 border-b bg-white shrink-0 sticky top-0 z-40">
      {/* Left side: Search */}
      <div className="flex-1 max-w-md">
        <div className="relative">
          <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-slate-400" />
          <input
            type="text"
            placeholder="What do you want to find?"
            className="w-full h-10 pl-10 pr-4 rounded-full bg-slate-50 border-none focus:outline-none focus:ring-1 focus:ring-primary/30 text-sm text-slate-700 placeholder:text-slate-400"
          />
        </div>
      </div>

      {/* Right side: Actions & Profile */}
      <div className="flex items-center gap-6">
        <div className="flex items-center gap-4">
          <button className="relative p-2 text-slate-500 hover:text-slate-700 hover:bg-slate-50 rounded-full transition-colors">
            <Bell className="h-5 w-5" />
            <span className="absolute top-1.5 right-1.5 h-2 w-2 rounded-full bg-red-500 border border-white"></span>
          </button>
          <button className="relative p-2 text-slate-500 hover:text-slate-700 hover:bg-slate-50 rounded-full transition-colors">
            <MessageSquare className="h-5 w-5" />
            <span className="absolute top-1.5 right-1.5 h-2 w-2 rounded-full bg-green-500 border border-white"></span>
          </button>
        </div>

        <div className="h-8 w-px bg-slate-200 mx-2" />

        <DropdownMenu>
          <DropdownMenuTrigger className="flex items-center gap-3 focus:outline-none">
            <div className="h-9 w-9 rounded-full bg-indigo-100 flex items-center justify-center overflow-hidden border border-indigo-200">
              <span className="text-sm font-bold text-indigo-700">
                {user?.name?.charAt(0).toUpperCase() || "U"}
              </span>
            </div>
            <div className="text-left hidden lg:block">
              <p className="text-sm font-bold text-slate-800 leading-tight">{user?.name || "User"}</p>
              <p className="text-xs font-medium text-slate-500 capitalize leading-tight">{user?.role || "Role"}</p>
            </div>
            <ChevronDown className="h-4 w-4 text-slate-400 ml-1" />
          </DropdownMenuTrigger>
          <DropdownMenuContent align="end" className="w-56 mt-2 border-slate-100 shadow-lg rounded-xl">
            <DropdownMenuLabel className="font-bold text-slate-800">My Account</DropdownMenuLabel>
            <DropdownMenuSeparator className="bg-slate-100" />
            <DropdownMenuItem className="cursor-pointer font-medium text-slate-600 hover:text-primary hover:bg-slate-50">
              Profile
            </DropdownMenuItem>
            <DropdownMenuItem className="cursor-pointer font-medium text-slate-600 hover:text-primary hover:bg-slate-50">
              Settings
            </DropdownMenuItem>
            <DropdownMenuSeparator className="bg-slate-100" />
            <DropdownMenuItem 
              className="cursor-pointer font-bold text-red-600 hover:bg-red-50 focus:text-red-600"
              onClick={logout}
            >
              Sign out
            </DropdownMenuItem>
          </DropdownMenuContent>
        </DropdownMenu>
      </div>
    </div>
  );
}
