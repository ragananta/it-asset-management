<?php

namespace Database\Seeders;

use App\Models\Asset;
use Illuminate\Database\Seeder;

class AssetSeeder extends Seeder
{
    public function run()
    {
        $purchase = 15000000;
        $current = 13000000;

        Asset::create([
            'asset_code' => 'AST-' . strtoupper(uniqid()),
            'asset_name' => 'Laptop Dell',

            'category_id' => 1,
            'vendor_id' => 1,
            'location_id' => 1,
            'assigned_user_id' => 1,

            'brand' => 'Dell',
            'model' => 'Latitude 5430',
            'serial_number' => 'SN123456',

            'purchase_date' => '2025-01-01',
            'purchase_price' => $purchase,
            'current_value' => $current,
            'depreciation_value' => $purchase - $current,

            'warranty_expiry' => '2026-01-01',

            'condition_status' => 'Good',
            'lifecycle_status' => 'Active',
            'notes' => 'Seeder data',
        ]);
    }
}