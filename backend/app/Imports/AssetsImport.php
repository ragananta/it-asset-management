<?php

namespace App\Imports;

use App\Models\Asset;
use Maatwebsite\Excel\Concerns\ToModel;
use Maatwebsite\Excel\Concerns\WithHeadingRow;
use Maatwebsite\Excel\Concerns\WithStartRow;

class AssetsImport implements ToModel, WithHeadingRow, WithStartRow
{
    public function startRow(): int
    {
        return 3;
    }

    public function model(array $row)
    {
        return new Asset([
            'asset_code' => uniqid('AST-'),
            'asset_name' => $row['model'] ?? 'Laptop',
            'brand' => 'ACER',
            'model' => $row['model'] ?? null,
            'serial_number' => $row['serial_number'] ?? null,
            'purchase_date' => $row['date'] ?? null,
            'notes' => $row['detail_spesifikasi'] ?? null,
        ]);
    }
}