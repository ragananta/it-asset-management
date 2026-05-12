<?php

namespace Database\Seeders;

use App\Models\User;
use App\Models\Category;
use App\Models\Location;
use App\Models\MasterAsset;
use App\Models\AssetProperty;
use App\Models\MaintenanceLog;
use App\Models\AuditLog;
use App\Models\AssetAssignment;
use Illuminate\Database\Seeder;
use Illuminate\Support\Facades\Hash;

class DatabaseSeeder extends Seeder
{
    public function run(): void
    {
        // ─── Users ───────────────────────────────────────────────
        $admin = User::firstOrCreate(
            [
                'email' => 'admin@itasset.com'
            ],
            [
                'name'     => 'Administrator',
                'password' => Hash::make('password'),
            ]
        );

        $user1 = User::firstOrCreate(
            [
                'email' => 'budi@itasset.com'
            ],
            [
                'name'     => 'Budi Santoso',
                'password' => Hash::make('password'),
            ]
        );

        $user2 = User::firstOrCreate(
            [
                'email' => 'sari@itasset.com'
            ],
            [
                'name'     => 'Sari Dewi',
                'password' => Hash::make('password'),
            ]
        );

        // ─── Categories ───────────────────────────────────────────
        $catLaptop  = Category::create(['name' => 'Laptop',    'code' => 'CAT-LPT', 'description' => 'Perangkat laptop dan notebook']);
        $catPrinter = Category::create(['name' => 'Printer',   'code' => 'CAT-PRN', 'description' => 'Printer dan perangkat cetak']);
        $catNetwork = Category::create(['name' => 'Networking', 'code' => 'CAT-NET', 'description' => 'Perangkat jaringan (switch, router, AP)']);
        $catServer  = Category::create(['name' => 'Server',    'code' => 'CAT-SRV', 'description' => 'Server dan perangkat komputasi berat']);
        $catMonitor = Category::create(['name' => 'Monitor',   'code' => 'CAT-MON', 'description' => 'Monitor dan display']);

        // ─── Locations ────────────────────────────────────────────
        $loc1 = Location::create(['name' => 'Kantor Pusat - Lantai 1', 'code' => 'LOC-HO-L1', 'building' => 'Gedung HO', 'floor' => '1', 'room' => 'R101']);
        $loc2 = Location::create(['name' => 'Kantor Pusat - Lantai 2', 'code' => 'LOC-HO-L2', 'building' => 'Gedung HO', 'floor' => '2', 'room' => 'R201']);
        $loc3 = Location::create(['name' => 'Server Room',             'code' => 'LOC-SRV',   'building' => 'Gedung HO', 'floor' => 'B1', 'room' => 'SR-01']);

        // ─── Master Assets ─────────────────────────────────────────
        $asset1 = MasterAsset::create([
            'asset_code'       => 'AST-LPT-001',
            'asset_name'       => 'Laptop Dell Latitude 5420',
            'category_id'      => $catLaptop->id,
            'location_id'      => $loc1->id,
            'assigned_user_id' => $user1->id,
            'brand'            => 'Dell',
            'model'            => 'Latitude 5420',
            'serial_number'    => 'SN-DELL-001-2024',
            'vendor'           => 'PT. Dell Indonesia',
            'purchase_date'    => '2023-03-15',
            'purchase_price'   => 15000000,
            'warranty_expired' => '2026-03-15',
            'condition_status' => 'good',
            'note'             => 'Laptop untuk staff IT',
        ]);

        $asset2 = MasterAsset::create([
            'asset_code'       => 'AST-PRN-001',
            'asset_name'       => 'Printer HP LaserJet Pro M404',
            'category_id'      => $catPrinter->id,
            'location_id'      => $loc1->id,
            'assigned_user_id' => null,
            'brand'            => 'HP',
            'model'            => 'LaserJet Pro M404',
            'serial_number'    => 'SN-HP-PRN-002-2024',
            'vendor'           => 'PT. HP Indonesia',
            'purchase_date'    => '2022-08-10',
            'purchase_price'   => 5500000,
            'warranty_expired' => '2025-08-10',
            'condition_status' => 'good',
        ]);

        $asset3 = MasterAsset::create([
            'asset_code'       => 'AST-NET-001',
            'asset_name'       => 'Cisco Switch Catalyst 2960',
            'category_id'      => $catNetwork->id,
            'location_id'      => $loc3->id,
            'brand'            => 'Cisco',
            'model'            => 'Catalyst 2960-24TT',
            'serial_number'    => 'SN-CISCO-SW-003-2024',
            'vendor'           => 'PT. Cisco Indonesia',
            'purchase_date'    => '2021-01-20',
            'purchase_price'   => 25000000,
            'warranty_expired' => '2026-01-20',
            'condition_status' => 'good',
        ]);

        $asset4 = MasterAsset::create([
            'asset_code'       => 'AST-LPT-002',
            'asset_name'       => 'Laptop Lenovo ThinkPad E14',
            'category_id'      => $catLaptop->id,
            'location_id'      => $loc2->id,
            'assigned_user_id' => $user2->id,
            'brand'            => 'Lenovo',
            'model'            => 'ThinkPad E14 Gen 4',
            'serial_number'    => 'SN-LNV-004-2024',
            'vendor'           => 'PT. Lenovo Indonesia',
            'purchase_date'    => '2023-06-01',
            'purchase_price'   => 14500000,
            'warranty_expired' => '2026-06-01',
            'condition_status' => 'good',
        ]);

        // ─── Asset Properties ──────────────────────────────────────
        // Laptop Dell properties
        AssetProperty::create(['asset_id' => $asset1->id, 'property_name' => 'RAM',       'value' => '16 GB DDR4',             'note' => '2x8GB dual channel']);
        AssetProperty::create(['asset_id' => $asset1->id, 'property_name' => 'Processor',  'value' => 'Intel Core i5-1145G7',  'note' => null]);
        AssetProperty::create(['asset_id' => $asset1->id, 'property_name' => 'Storage',    'value' => '512 GB NVMe SSD',       'note' => null]);
        AssetProperty::create(['asset_id' => $asset1->id, 'property_name' => 'IP Address', 'value' => '192.168.1.101',         'note' => 'IP statis']);
        AssetProperty::create(['asset_id' => $asset1->id, 'property_name' => 'MAC Address','value' => 'A4:C3:F0:12:34:56',    'note' => 'WiFi adapter']);

        // Printer properties
        AssetProperty::create(['asset_id' => $asset2->id, 'property_name' => 'Toner Type', 'value' => 'HP 59A (CF259A)',       'note' => 'Black toner']);
        AssetProperty::create(['asset_id' => $asset2->id, 'property_name' => 'IP Address', 'value' => '192.168.1.200',         'note' => 'IP jaringan printer']);

        // Switch properties
        AssetProperty::create(['asset_id' => $asset3->id, 'property_name' => 'Firmware Version', 'value' => '12.2(55)SE12',   'note' => 'Last update: 2024-01']);
        AssetProperty::create(['asset_id' => $asset3->id, 'property_name' => 'IP Address',       'value' => '192.168.1.254',  'note' => 'Management IP']);
        AssetProperty::create(['asset_id' => $asset3->id, 'property_name' => 'Port Count',       'value' => '24 ports',       'note' => '24x GigabitEthernet']);

        // Lenovo properties
        AssetProperty::create(['asset_id' => $asset4->id, 'property_name' => 'RAM',        'value' => '8 GB DDR4',            'note' => null]);
        AssetProperty::create(['asset_id' => $asset4->id, 'property_name' => 'Processor',  'value' => 'AMD Ryzen 5 5600U',   'note' => null]);
        AssetProperty::create(['asset_id' => $asset4->id, 'property_name' => 'IP Address', 'value' => '192.168.1.102',       'note' => 'IP statis']);

        // ─── Maintenance Logs ──────────────────────────────────────
        MaintenanceLog::create([
            'asset_id'    => $asset1->id,
            'date'        => '2024-01-15',
            'description' => 'Pembersihan debu internal, penggantian thermal paste',
            'cost'        => 150000,
            'pic'         => 'Agus Teknisi',
        ]);

        MaintenanceLog::create([
            'asset_id'    => $asset2->id,
            'date'        => '2024-02-20',
            'description' => 'Penggantian drum unit printer karena hasil cetak bergaris',
            'cost'        => 850000,
            'pic'         => 'Bimo Teknisi',
        ]);

        MaintenanceLog::create([
            'asset_id'    => $asset3->id,
            'date'        => '2024-03-05',
            'description' => 'Firmware update dari versi 12.2(55)SE10 ke 12.2(55)SE12',
            'cost'        => 0,
            'pic'         => 'Admin IT',
        ]);

        MaintenanceLog::create([
            'asset_id'    => $asset1->id,
            'date'        => '2024-06-10',
            'description' => 'Upgrade RAM dari 8GB ke 16GB',
            'cost'        => 750000,
            'pic'         => 'Agus Teknisi',
        ]);

        // ─── Audit Logs ─────────────────────────────────────────────
        AuditLog::create([
            'asset_id'    => $asset1->id,
            'action'      => 'update',
            'description' => 'Update data aset laptop Dell setelah upgrade RAM',
            'pic'         => 'Admin IT',
        ]);

        AuditLog::create([
            'asset_id'    => $asset2->id,
            'action'      => 'repair',
            'description' => 'Perbaikan printer HP LaserJet - penggantian drum unit',
            'pic'         => 'Bimo Teknisi',
        ]);

        AuditLog::create([
            'asset_id'    => $asset3->id,
            'action'      => 'renew',
            'description' => 'Perpanjangan garansi Cisco switch sampai 2028',
            'pic'         => 'Admin IT',
        ]);

        // ─── Asset Assignments ─────────────────────────────────────
        AssetAssignment::create([
            'asset_id'    => $asset1->id,
            'user_name'   => 'Budi Santoso',
            'assign_date' => '2023-03-16',
            'return_date' => null,
            'note'        => 'Penugasan permanen untuk staff IT',
        ]);

        AssetAssignment::create([
            'asset_id'    => $asset4->id,
            'user_name'   => 'Sari Dewi',
            'assign_date' => '2023-06-02',
            'return_date' => null,
            'note'        => 'Penugasan untuk staff Finance',
        ]);

        AssetAssignment::create([
            'asset_id'    => $asset2->id,
            'user_name'   => 'Divisi Umum',
            'assign_date' => '2022-08-11',
            'return_date' => null,
            'note'        => 'Printer shared untuk lantai 1',
        ]);

        $this->command->info('✅ Database seeder berhasil dijalankan!');
        $this->command->info('👤 Admin: admin@itasset.com / password');
        $this->command->info('👤 User1: budi@itasset.com / password');
        $this->command->info('👤 User2: sari@itasset.com / password');
    }
}