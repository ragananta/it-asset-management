<?php

namespace Database\Seeders;

use Illuminate\Database\Seeder;
use App\Models\MasterUser;
use Illuminate\Support\Facades\Hash; // 🔥 TAMBAH INI

class UserSeeder extends Seeder
{
    public function run()
    {
        MasterUser::create([
        'employee_name' => 'Admin User',
        'email' => 'admin@email.com',
        'password' => '123456', 
        'status' => 'Active',
        'department_id' => 1,
        'role_id' => 1,
        'phone' => '08123456789',
        'approval_role' => 'Manager',
    ]);
    }
}