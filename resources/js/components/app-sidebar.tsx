import { Link, usePage } from '@inertiajs/react';
import {
    LayoutGrid,
    ListChecks,
    Lock,
    Mic,
    ShieldCheck,
    ToggleLeft,
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
import { index as featuresIndex } from '@/routes/features';
import {
    index as onboardingIndex,
    journey as onboardingJourneyIndex,
} from '@/routes/onboarding';
import { index as roleplayIndex } from '@/routes/roleplay';
import { index as roleplayAccessIndex } from '@/routes/roleplay/access';
import { index as rolesIndex } from '@/routes/roles';
import { index as usersIndex } from '@/routes/users';
import type { Auth, NavItem } from '@/types';

export function AppSidebar() {
    const { auth, eligibilityStatus } = usePage<{ auth: Auth }>().props;
    const permissions = auth.user?.permissions ?? [];
    const roles = auth.user?.roles ?? [];
    const isAgent = roles.includes('agent');
    // An agent whose eligibility hasn't been decided yet — no attestation
    // at all, or still under review — hasn't unlocked anything else yet;
    // hide the nav items that only make sense once it's decided. Doesn't
    // apply to admins/super-admins, who never have an eligibility
    // attestation of their own.
    const hasAnsweredEligibility =
        !isAgent ||
        (eligibilityStatus !== null && eligibilityStatus !== 'under_review');

    const mainNavItems: NavItem[] = [
        {
            title: 'Dashboard',
            href: dashboard(),
            icon: LayoutGrid,
        },
        ...(isAgent && hasAnsweredEligibility
            ? [
                  {
                      title: 'My Onboarding',
                      href: onboardingJourneyIndex(),
                      icon: ListChecks,
                  },
              ]
            : []),
        ...(hasAnsweredEligibility
            ? [
                  {
                      title: 'Sales Roleplay',
                      href: roleplayIndex(),
                      icon: Mic,
                  },
              ]
            : []),
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
        ...(permissions.includes('roles.manage')
            ? [
                  {
                      title: 'Roles & Permissions',
                      href: rolesIndex(),
                      icon: Lock,
                  },
              ]
            : []),
        ...(permissions.includes('features.manage')
            ? [
                  {
                      title: 'Feature Access',
                      href: featuresIndex(),
                      icon: ToggleLeft,
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
