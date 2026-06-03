<?php

namespace App\Exports;

use Maatwebsite\Excel\Concerns\WithMultipleSheets;

class AllDataExport implements WithMultipleSheets
{
    public function sheets(): array
    {
        return [
            new AssetsExport(request()),
            new AssignmentExport(request()),
            new MaintenanceExport(request()),
        ];
    }
}