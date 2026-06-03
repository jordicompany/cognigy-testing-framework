"use client";

import Link from "next/link";
import { usePathname } from "next/navigation";
import { Settings, Upload, Play, Bot, BarChart2 } from "lucide-react";

const links = [
  { href: "/", label: "Dashboard", icon: Bot },
  { href: "/settings", label: "Settings", icon: Settings },
  { href: "/create", label: "Create Tests", icon: Upload },
  { href: "/run", label: "Run Tests", icon: Play },
  { href: "/results", label: "Results", icon: BarChart2 },
];

export default function Nav() {
  const pathname = usePathname();
  return (
    <nav className="bg-white border-b border-gray-200 shadow-sm">
      <div className="container mx-auto px-4 max-w-6xl flex items-center gap-1 h-14">
        <span className="font-semibold text-indigo-600 mr-6 text-sm tracking-wide uppercase">
          Cognigy Testing
        </span>
        {links.map(({ href, label, icon: Icon }) => {
          const active = pathname === href;
          return (
            <Link
              key={href}
              href={href}
              className={`flex items-center gap-1.5 px-3 py-1.5 rounded-md text-sm font-medium transition-colors ${
                active
                  ? "bg-indigo-50 text-indigo-700"
                  : "text-gray-600 hover:text-gray-900 hover:bg-gray-100"
              }`}
            >
              <Icon className="w-4 h-4" />
              {label}
            </Link>
          );
        })}
      </div>
    </nav>
  );
}
