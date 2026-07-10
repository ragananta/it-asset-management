<?php

namespace App\Http\Controllers;

use App\Models\AssetAssignment;
use App\Models\MasterAsset;
use App\Traits\ApiResponse;
use App\Exports\AssetByEmployeeExport;
use App\Services\KaryawanService;
use Illuminate\Http\Request;
use Maatwebsite\Excel\Facades\Excel;

class ReportController extends Controller
{
    use ApiResponse;

    protected KaryawanService $karyawanService;

    public function __construct(KaryawanService $karyawanService)
    {
        $this->karyawanService = $karyawanService;
    }

    /**
     * Menampilkan data aset yang dikelompokkan per karyawan.
     * Mendukung search, filter department, dan pagination manual.
     */
    public function assetsByEmployee(Request $request)
    {
        try {
            // Query active assignments (belum dikembalikan)
            $query = AssetAssignment::whereNull('return_date')
                ->with([
                    'asset' => fn($q) => $q->select('id', 'asset_name', 'asset_code', 'category_id', 'condition_status', 'status', 'purchase_price'),
                    'asset.category' => fn($q) => $q->select('id', 'name'),
                ]);

            // Filter pencarian berdasarkan nama karyawan, nama aset, atau kode aset
            if ($request->filled('search')) {
                $search = $request->search;
                $query->where(function ($q) use ($search) {
                    $q->where('user_name', 'like', "%{$search}%")
                      ->orWhereHas('asset', function ($assetQuery) use ($search) {
                          $assetQuery->where('asset_name', 'like', "%{$search}%")
                                    ->orWhere('asset_code', 'like', "%{$search}%");
                      });
                });
            }

            // Ambil semua data dan group berdasarkan user_name
            $grouped = $query->orderBy('user_name', 'ASC')
                ->orderBy('assign_date', 'DESC')
                ->orderBy('id', 'DESC')
                ->get()
                ->groupBy('user_name');

            // Transform setiap group menjadi format response
            $allGrouped = $grouped->map(function ($assignments, $userName) {
                return [
                    'user_name'    => $userName,
                    'phone'        => $assignments->first()->phone,
                    'total_assets' => $assignments->count(),
                    'total_value'  => $assignments->sum(fn($a) => $a->asset->purchase_price ?? 0),
                    'assets'       => $assignments->map(fn($a) => [
                        'id'               => $a->asset->id,
                        'asset_code'       => $a->asset->asset_code,
                        'asset_name'       => $a->asset->asset_name,
                        'category'         => $a->asset->category->name ?? '-',
                        'condition_status' => $a->asset->condition_status,
                        'status'           => $a->asset->status,
                        'purchase_price'   => $a->asset->purchase_price,
                        'assign_date'      => $a->assign_date,
                    ])->values(),
                ];
            });

            // Filter berdasarkan department (cross-reference dengan API karyawan)
            if ($request->filled('department')) {
                $karyawanList = $this->karyawanService->getAllActiveKaryawan();

                $department = $request->department;

                // Ambil nama-nama karyawan yang sesuai department
                $matchingNames = collect($karyawanList)
                    ->filter(fn($k) => ($k['departemen'] ?? '') === $department)
                    ->pluck('name')
                    ->toArray();

                // Filter grouped data hanya yang namanya cocok
                $allGrouped = $allGrouped->filter(function ($group) use ($matchingNames) {
                    return in_array($group['user_name'], $matchingNames);
                });
            }

            // Reset keys setelah filter
            $allGrouped = $allGrouped->values();

            // Pagination manual (client-side slicing)
            $page    = (int) $request->get('page', 1);
            $perPage = (int) $request->get('per_page', 10);
            $offset  = ($page - 1) * $perPage;

            $paginatedData = $allGrouped->slice($offset, $perPage);

            return $this->successResponse([
                'employees' => $paginatedData->values(),
                'summary'   => [
                    'total_employees'      => $allGrouped->count(),
                    'total_assigned_assets' => $allGrouped->sum(fn($g) => $g['total_assets']),
                    'total_asset_value'    => $allGrouped->sum(fn($g) => $g['total_value']),
                ],
                'pagination' => [
                    'current_page' => $page,
                    'per_page'     => $perPage,
                    'total'        => $allGrouped->count(),
                    'last_page'    => (int) ceil($allGrouped->count() / $perPage),
                ],
            ], 'Data aset per karyawan berhasil diambil');

        } catch (\Exception $e) {
            return $this->errorResponse('Terjadi kesalahan: ' . $e->getMessage(), 500);
        }
    }

    /**
     * Export data aset per karyawan ke file Excel.
     */
    public function exportByEmployee(Request $request)
    {
        $filename = 'aset-per-karyawan-' . now()->format('Ymd-His') . '.xlsx';
        return Excel::download(new AssetByEmployeeExport($request), $filename);
    }
}
