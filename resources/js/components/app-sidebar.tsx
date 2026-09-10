import { Link, usePage } from '@inertiajs/react';
import {
    BadgeCheck,
    LayoutGrid,
    Lock,
    Mic,
    ShieldCheck,
    Users,
} from 'lucide-react';
import AppLogo from '@/components/app-logo';
import { NavMain } from '@/components/nav-main';
import { NavUser } from '@/components/nav-user';
import {
    Sidebar,
    SidebarContent,
    SidebarFooter,
    SidebarHeader,
    SidebarMenu,
    SidebarMenuButton,
    SidebarMenuItem,
} from '@/components/ui/sidebar';
import { dashboard } from '@/routes';
import { index as agentsIndex } from '@/routes/agents';
import { index as onboardingIndex } from '@/routes/onboarding';
import { index as roleplayIndex } from '@/routes/roleplay';
import { index as roleplayAccessIndex } from '@/routes/roleplay/access';
import { index as rolesIndex } from '@/routes/roles';
import { index as usersIndex } from '@/routes/users';
import type { Auth, NavItem } from '@/types';

export function AppSidebar() {
    const { auth } = usePage<{ auth: Auth }>().props;
    const permissions = auth.user?.permissions ?? [];

    const mainNavItems: NavItem[] = [
        {
            title: 'Dashboard',
            href: dashboard(),
            icon: LayoutGrid,
        },
        {
            title: 'Sales Roleplay',
            href: roleplayIndex(),
            icon: Mic,
        },
        ...(permissions.includes('roleplay.manage')
            ? [
                  {
                      title: 'Roleplay Coaching',
                      href: roleplayAccessIndex(),
                      icon: Mic,
                  },
              ]
            : []),
        ...(permissions.includes('onboarding.review')
            ? [
                  {
                      title: 'License Agents Onboarding',
                      href: onboardingIndex(),
                      icon: ShieldCheck,
                  },
              ]
            : []),
        ...(permissions.includes('agents.view')
            ? [
                  {
                      title: 'Verified agents',
                      href: agentsIndex(),
                      icon: BadgeCheck,
                  },
              ]
            : []),
        ...(permissions.includes('roles.manage')
            ? [
                  {
                      title: 'Roles & Permissions',
                      href: rolesIndex(),
                      icon: Lock,
                  },
              ]
            : []),
        ...(permissions.includes('users.view')
            ? [
                  {
                      title: 'Users',
                      href: usersIndex(),
                      icon: Users,
                  },
              ]
            : []),
    ];

    return (
        <Sidebar collapsible="icon" variant="inset">
            <SidebarHeader>
                <SidebarMenu>
                    <SidebarMenuItem>
                        <SidebarMenuButton size="lg" asChild>
                            <Link href={dashboard()} prefetch>
                                <AppLogo />
                            </Link>
                        </SidebarMenuButton>
                    </SidebarMenuItem>
                </SidebarMenu>
            </SidebarHeader>

            <SidebarContent>
                <NavMain items={mainNavItems} />
            </SidebarContent>

            <SidebarFooter>
                <NavUser />
            </SidebarFooter>
        </Sidebar>
    );
}
