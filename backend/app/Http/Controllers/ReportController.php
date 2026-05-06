<?php

namespace App\Http\Controllers;

use App\Models\Asset;
use App\Exports\AssetsExport;
use Maatwebsite\Excel\Facades\Excel;
use Barryvdh\DomPDF\Facade\Pdf;

class ReportController extends Controller
{
    public function exportAssets()
    {
        return Excel::download(
            new AssetsExport,
            'asset_report.xlsx'
        );
    }

    public function exportAssetsPdf()
    {
        $assets = Asset::with([
            'category',
            'vendor',
            'location'
        ])->get();

        $pdf = Pdf::loadView('reports.assets_pdf', compact('assets'));

        return $pdf->download('asset_report.pdf');
    }
}