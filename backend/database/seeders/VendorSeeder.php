<?php

namespace Database\Seeders;

use Illuminate\Database\Seeder;
use App\Models\Vendor;

class VendorSeeder extends Seeder
{
    public function run()
    {
        Vendor::firstOrCreate(
            ['vendor_name' => 'Dell Vendor'],
            [
                'vendor_type' => 'Hardware Supplier',
                'contact_person' => 'Budi',
                'phone' => '08123',
                'email' => 'dell@email.com',
                'address' => 'Jakarta',
                'sla_contract' => 'Standard SLA',
                'notes' => 'Main IT vendor',
            ]
        );

        Vendor::firstOrCreate(
            ['vendor_name' => 'Canon Vendor'],
            [
                'vendor_type' => 'Printer Supplier',
                'contact_person' => 'Andi',
                'phone' => '08222',
                'email' => 'canon@email.com',
                'address' => 'Bandung',
                'sla_contract' => 'Premium SLA',
                'notes' => 'Printer specialist',
            ]
        );
    }
}