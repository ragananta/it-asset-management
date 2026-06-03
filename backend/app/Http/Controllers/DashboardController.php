<?php

namespace App\Http\Controllers;

use App\Models\MasterAsset;
use App\Models\AssetAssignment;
use App\Models\Category;
use App\Exports\AllDataExport;
use App\Traits\ApiResponse;
use Illuminate\Http\Request;
use Illuminate\Support\Facades\Cache;
use Illuminate\Support\Facades\DB;
use Maatwebsite\Excel\Facades\Excel;

class DashboardController extends Controller
{
    use ApiResponse;

    public function index(Request $request)
    {
        try {
            $data = Cache::remember('dashboard:index', now()->addSeconds(30), function () {
                $conditionStats = MasterAsset::select(
                    DB::raw('COUNT(*) as total'),
                    DB::raw("SUM(CASE WHEN condition_status = 'good' THEN 1 ELSE 0 END) as good"),
                    DB::raw("SUM(CASE WHEN condition_status = 'damaged' THEN 1 ELSE 0 END) as damaged"),
                    DB::raw("SUM(CASE WHEN condition_status = 'under_maintenance' THEN 1 ELSE 0 END) as maintenance")
                )->first();

                $totalBorrowed   = AssetAssignment::whereNull('return_date')->count();
                $totalCategories = Category::count();

                $conditionChart = [
                    ['label' => 'Good',        'value' => (int) $conditionStats->good,        'color' => '#10b981'],
                    ['label' => 'Damaged',     'value' => (int) $conditionStats->damaged,     'color' => '#ef4444'],
                    ['label' => 'Maintenance', 'value' => (int) $conditionStats->maintenance, 'color' => '#f59e0b'],
                ];

                $categoryChart = DB::table('master_assets')
                    ->join('categories', 'master_assets.category_id', '=', 'categories.id')
                    ->select('categories.name as label', DB::raw('COUNT(*) as value'))
                    ->groupBy('categories.id', 'categories.name')
                    ->orderByDesc('value')
                    ->limit(8)
                    ->get();

                return [
                    'stats' => [
                        'total_assets'     => (int) $conditionStats->total,
                        'good_condition'   => (int) $conditionStats->good,
                        'damaged'          => (int) $conditionStats->damaged,
                        'maintenance'      => (int) $conditionStats->maintenance,
                        'total_borrowed'   => $totalBorrowed,
                        'total_categories' => $totalCategories,
                    ],
                    'condition_chart' => $conditionChart,
                    'category_chart'  => $categoryChart,
                ];
            });

            return $this->successResponse($data, 'Data dashboard berhasil diambil');

        } catch (\Exception $e) {
            return $this->errorResponse('Terjadi kesalahan: ' . $e->getMessage(), 500);
        }
    }

    public function export(Request $request)
    {
        $filename = 'laporan-it-asset-' . now()->format('Ymd-His') . '.xlsx';
        return Excel::download(new AllDataExport(), $filename);
    }
}
