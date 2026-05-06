<?php

namespace Database\Seeders;

use Illuminate\Database\Seeder;
use App\Models\Category;

class CategorySeeder extends Seeder
{
    public function run()
{
    $categories = [
        'Laptop',
        'PC',
        'Tablet',
        'Handphone',
        'Printer',
        'Scanner',
        'Access Point',
        'Attendance Machine',
        'Laminating Machine',
        'OTG',
        'Charger'
    ];

    foreach ($categories as $cat) {
        \App\Models\Category::firstOrCreate([
            'category_name' => $cat,
        ], [
            'sub_category' => 'IT Equipment',
            'asset_type' => 'Electronics'
        ]);
    }
    }
}