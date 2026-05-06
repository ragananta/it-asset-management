<?php

namespace App\Exports;

use App\Models\Asset;
use Maatwebsite\Excel\Concerns\FromCollection;

class AssetsExport implements FromCollection
{
    public function collection()
    {
        return Asset::with([
            'category',
            'vendor',
            'location'
        ])->get();
    }
}