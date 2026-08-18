import { Link, usePage } from '@inertiajs/react';
import { BookOpen, FolderCog, LayoutGrid, Users } from 'lucide-react';
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
import { index as categoriesIndex } from '@/routes/categories';
import { browse as coursesBrowse, index as coursesIndex } from '@/routes/courses';
import { index as usersIndex } from '@/routes/users';
import type { Auth, NavItem } from '@/types';

export function AppSidebar() {
    const { auth } = usePage<{ auth: Auth }>().props;
    const permissions = auth.user?.permissions ?? [];

    const coursesHref = permissions.includes('courses.view')
        ? coursesIndex()
        : coursesBrowse();

    const mainNavItems: NavItem[] = [
        {
            title: 'Dashboard',
            href: dashboard(),
            icon: LayoutGrid,
        },
        ...(permissions.includes('courses.view') ||
        permissions.includes('courses.browse')
            ? [
                  {
                      title: 'Resources',
                      href: coursesHref,
                      icon: BookOpen,
                  },
              ]
            : []),
        ...(permissions.includes('courses.view')
            ? [
                  {
                      title: 'Categories',
                      href: categoriesIndex(),
                      icon: FolderCog,
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
