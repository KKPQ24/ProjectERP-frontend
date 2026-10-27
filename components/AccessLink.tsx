"use client";

import Link from "next/link";
import type { ReactNode } from "react";
import { useAuth } from "./AuthProvider";
import { canAccessPath } from "@/lib/access";

export default function AccessLink({ href, children, className }: { href: string; children: ReactNode; className?: string }) {
  const { user } = useAuth();
  if (!user || !canAccessPath(href, user.roles ?? [])) return <span>{children}</span>;
  return <Link href={href} className={className}>{children}</Link>;
}
