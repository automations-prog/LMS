<?php

namespace Database\Seeders;

use App\Models\User;
use Illuminate\Database\Seeder;
use Spatie\Permission\Models\Permission;
use Spatie\Permission\Models\Role;
use Spatie\Permission\PermissionRegistrar;

class RolesAndPermissionsSeeder extends Seeder
{
    /**
     * Seed roles, permissions, and a bootstrap super admin account.
     */
    public function run(): void
    {
        // Flush Spatie's cached permission list first — if this seeder runs
        // after `migrate:fresh`, a stale cache from a previous run can still
        // reference permissions that no longer exist in the (recreated) table.
        app(PermissionRegistrar::class)->forgetCachedPermissions();

        $permissions = [
            'users.view',
            'users.create',
            'users.update',
            'users.delete',
            'users.manage-admins',
        ];

        foreach ($permissions as $permission) {
            Permission::findOrCreate($permission);
        }

        $superAdmin = Role::findOrCreate('super-admin');
        $superAdmin->syncPermissions($permissions);

        $admin = Role::findOrCreate('admin');
        $admin->syncPermissions([
            'users.view',
            'users.create',
            'users.update',
            'users.delete',
        ]);

        Role::findOrCreate('agent');

        $user = User::firstOrCreate(
            ['email' => 'superadmin@example.com'],
            [
                'name' => 'Super Admin',
                'password' => 'password',
                'email_verified_at' => now(),
            ],
        );

        $user->syncRoles(['super-admin']);
    }
}
