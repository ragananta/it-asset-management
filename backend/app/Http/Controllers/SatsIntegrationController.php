<?php

namespace App\Http\Controllers;

use App\Models\MasterAsset;
use App\Models\AssetContainer;
use App\Models\AssetAssignment;
use App\Models\AuditLog;
use App\Models\MaintenanceLog;
use App\Models\Log;
use App\Traits\ApiResponse;
use Illuminate\Http\Request;
use Illuminate\Support\Facades\DB;
use Illuminate\Support\Facades\Cache;

class SatsIntegrationController extends Controller
{
    use ApiResponse;

    // ==========================================
    // NEW BAG ENDPOINTS
    // ==========================================

    /**
     * GET /api/integrations/sats/bags/{asset_code}
     */
    public function getBagByQr($assetCode)
    {
        try {
            $tas = MasterAsset::where('asset_code', $assetCode)
                ->whereHas('category', function ($q) {
                    $q->where('code', 'CAT-TAS');
                })
                ->with([
                    'containedAssets.category',
                    'assignments' => fn($q) => $q->whereNull('return_date'),
                ])
                ->first();

            if (!$tas) {
                return $this->notFoundResponse('Tas tidak ditemukan');
            }

            // Determine logical status mapped consistently to SATS expectations (lowercase)
            $logicalStatus = 'available';
            if ($tas->condition_status === 'under_maintenance') {
                $logicalStatus = 'maintenance';
            } elseif ($tas->status === 'borrowed') {
                $logicalStatus = 'borrowed';
            } elseif ($tas->status === 'disposed') {
                $logicalStatus = 'lost';
            }

            // contents = legacy field (maintained for backward compatibility with old clients)
            $contents = $tas->containedAssets->map(function ($asset) {
                return [
                    'asset_code'       => $asset->asset_code,
                    'asset_name'       => $asset->asset_name,
                    'category'         => $asset->category?->name ?? '-',
                    'condition_status' => $asset->condition_status,
                    'status'           => $asset->status,
                ];
            })->values()->toArray();

            // assets = current standard field (contains complete mapped details for new SATS clients)
            $conditionMap = [
                'good'              => 'Good',
                'damaged'           => 'Damaged',
                'under_maintenance' => 'Maintenance',
                'retired'           => 'Retired',
            ];
            $statusMap = [
                'active'   => 'Aktif',
                'borrowed' => 'Dipinjam',
                'disposed' => 'Disposed',
            ];

            $assets = $tas->containedAssets->map(function ($asset) use ($conditionMap, $statusMap) {
                return [
                    'asset_code' => $asset->asset_code,
                    'asset_name' => $asset->asset_name,
                    'category'   => $asset->category?->name ?? '-',
                    'condition'  => $conditionMap[$asset->condition_status ?? ''] ?? $asset->condition_status ?? '-',
                    'status'     => $statusMap[$asset->status ?? ''] ?? $asset->status ?? '-',
                ];
            })->values()->toArray();

            $activeAssignment = $tas->assignments->first();

            $data = [
                'asset_code'   => $tas->asset_code,
                'asset_name'   => $tas->asset_name,
                'store_name'   => $tas->store_name,
                'status'       => $logicalStatus,
                'total_assets' => count($assets),
                'borrowed_by'  => $activeAssignment ? $activeAssignment->user_name : null,
                'borrowed_at'  => $activeAssignment && $activeAssignment->assign_date ? $activeAssignment->assign_date->format('Y-m-d H:i:s') : null,
                'contents'     => $contents, // legacy field
                'assets'       => $assets,   // current standard field
            ];

            return $this->successResponse($data, 'Detail Tas berhasil diambil');
        } catch (\Exception $e) {
            return $this->errorResponse('Terjadi kesalahan: ' . $e->getMessage(), 500);
        }
    }

    /**
     * POST /api/integrations/sats/bags/borrow
     */
    /**
     * POST /api/integrations/sats/bags/borrow
     */
    public function borrowBag(Request $request)
    {
        // Support aliases by mapping them to performed_by if performed_by is missing
        if (!$request->has('performed_by')) {
            if ($request->has('borrowed_by')) {
                $request->merge(['performed_by' => $request->borrowed_by]);
            } elseif ($request->has('employee_name')) {
                $request->merge(['performed_by' => $request->employee_name]);
            }
        }

        $request->validate([
            'asset_code'   => 'required|string|exists:master_assets,asset_code',
            'performed_by' => 'required|string',
            'employee_id'  => 'nullable|string',
        ]);

        $performedBy = $request->input('performed_by');
        $employeeId = $request->input('employee_id');

        DB::beginTransaction();
        try {
            $tas = MasterAsset::where('asset_code', $request->asset_code)
                ->whereHas('category', function ($q) {
                    $q->where('code', 'CAT-TAS');
                })->first();

            if (!$tas) {
                return $this->notFoundResponse('Tas tidak ditemukan');
            }

            if ($tas->status === 'borrowed') {
                return $this->errorResponse('Tas sedang dipinjam.', 409);
            }

            if ($tas->condition_status === 'under_maintenance') {
                return $this->errorResponse('Tas sedang dalam perbaikan (Maintenance)', 422);
            }

            if ($tas->condition_status === 'retired' || $tas->status === 'disposed') {
                return $this->errorResponse('Tas sudah tidak aktif atau dibuang', 422);
            }

            // Update status Tas saja
            $tas->update(['status' => 'borrowed']);

            // Create assignment for Tas itself
            AssetAssignment::create([
                'asset_id'    => $tas->id,
                'user_name'   => $performedBy,
                'phone'       => '',
                'assign_date' => now(),
                'note'        => "Dipinjam via SATS" . ($employeeId ? " (ID Karyawan: {$employeeId})" : ""),
            ]);

            // Create Audit Log
            AuditLog::create([
                'asset_id'    => $tas->id,
                'action'      => 'BORROW',
                'description' => "Tas dipinjam oleh {$performedBy} via SATS",
                'pic'         => $performedBy,
            ]);

            // Create Asset History (Spatie Activity Log)
            activity()
                ->performedOn($tas)
                ->event('BORROW')
                ->causedBy($request->user())
                ->log("Tas dipinjam oleh {$performedBy}" . ($employeeId ? " (ID: {$employeeId})" : ""));

            DB::commit();

            $this->clearCache();
            $this->writeLog($request, 'borrow_bag', "Tas '{$tas->asset_name}' ({$tas->asset_code}) dipinjam oleh {$performedBy}");

            return $this->successResponse(null, 'Tas berhasil dipinjam');
        } catch (\Exception $e) {
            DB::rollBack();
            return $this->errorResponse('Terjadi kesalahan: ' . $e->getMessage(), 500);
        }
    }

    /**
     * POST /api/integrations/sats/bags/return
     */
    public function returnBag(Request $request)
    {
        // Support alias by mapping it to performed_by if performed_by is missing
        if (!$request->has('performed_by')) {
            if ($request->has('returned_by')) {
                $request->merge(['performed_by' => $request->returned_by]);
            }
        }

        $request->validate([
            'asset_code'   => 'required|string|exists:master_assets,asset_code',
            'performed_by' => 'required|string',
        ]);

        DB::beginTransaction();
        try {
            $tas = MasterAsset::where('asset_code', $request->asset_code)
                ->whereHas('category', function ($q) {
                    $q->where('code', 'CAT-TAS');
                })->first();

            if (!$tas) {
                return $this->notFoundResponse('Tas tidak ditemukan');
            }

            if ($tas->status !== 'borrowed') {
                return $this->errorResponse('Tas tidak sedang dipinjam.', 409);
            }

            $performedBy = $request->input('performed_by');

            // Update status Tas saja
            $tas->update(['status' => 'active']);

            // Close active assignment
            AssetAssignment::where('asset_id', $tas->id)
                ->whereNull('return_date')
                ->update(['return_date' => now()]);

            // Create Audit Log
            AuditLog::create([
                'asset_id'    => $tas->id,
                'action'      => 'RETURN',
                'description' => "Tas dikembalikan oleh {$performedBy} via SATS",
                'pic'         => $performedBy,
            ]);

            // Create Asset History (Spatie Activity Log)
            activity()
                ->performedOn($tas)
                ->causedBy($request->user())
                ->log("Tas dikembalikan oleh {$performedBy}");

            DB::commit();

            $this->clearCache();
            $this->writeLog($request, 'return_bag', "Tas '{$tas->asset_name}' ({$tas->asset_code}) dikembalikan oleh {$performedBy}");

            return $this->successResponse(null, 'Tas berhasil dikembalikan');
        } catch (\Exception $e) {
            DB::rollBack();
            return $this->errorResponse('Terjadi kesalahan: ' . $e->getMessage(), 500);
        }
    }

    /**
     * POST /api/integrations/sats/report-maintenance
     */
    public function reportMaintenance(Request $request)
    {
        $request->validate([
            'bag_asset_code' => 'required|string|exists:master_assets,asset_code',
            'asset_code'     => 'required|string|exists:master_assets,asset_code',
            'description'    => 'required|string',
            'performed_by'   => 'nullable|string',
            'reported_by'    => 'nullable|string',
            'pic'            => 'nullable|string',
        ]);

        DB::beginTransaction();
        try {
            $bag = MasterAsset::where('asset_code', $request->bag_asset_code)
                ->whereHas('category', function ($q) {
                    $q->where('code', 'CAT-TAS');
                })->first();

            $child = MasterAsset::where('asset_code', $request->asset_code)->first();

            if (!$bag || !$child) {
                return $this->notFoundResponse('Tas atau Asset tidak ditemukan');
            }

            // Check relation
            $belongsToBag = AssetContainer::where('container_asset_id', $bag->id)
                ->where('contained_asset_id', $child->id)
                ->exists();

            if (!$belongsToBag) {
                return $this->errorResponse('Asset tidak berada di dalam Asset Package.', 422);
            }

            $performedBy = $request->input('performed_by') ?? $request->input('reported_by') ?? $request->input('pic') ?? 'SATS Reporter';

            // Create Maintenance Log for the child asset
            MaintenanceLog::create([
                'asset_id'    => $child->id,
                'date'        => now(),
                'description' => "Laporan perbaikan via SATS: " . $request->description,
                'pic'         => $performedBy,
                'status'      => 'ongoing',
                'cost'        => 0,
            ]);

            // Create Audit Log for the child asset
            AuditLog::create([
                'asset_id'    => $child->id,
                'action'      => 'repair',
                'description' => "Aset dilaporkan rusak via SATS: {$request->description}",
                'pic'         => $performedBy,
            ]);

            // Create Spatie Activity Log for child (Asset History)
            activity()
                ->performedOn($child)
                ->causedBy($request->user())
                ->log("Aset dilaporkan rusak via SATS: {$request->description}");

            // Create Audit Log for the parent bag/package
            AuditLog::create([
                'asset_id'    => $bag->id,
                'action'      => 'MAINTENANCE_REPORT',
                'description' => "Tas dilaporkan rusak via SATS karena aset di dalamnya ({$child->asset_code}) rusak: {$request->description}",
                'pic'         => $performedBy,
            ]);

            // Update child asset condition status to under_maintenance
            $child->update(['condition_status' => 'under_maintenance']);

            // Update bag (Tas) condition status to under_maintenance as well
            $bag->update(['condition_status' => 'under_maintenance']);

            // Create Spatie Activity Log for bag (Asset History)
            activity()
                ->performedOn($bag)
                ->causedBy($request->user())
                ->log("Bag dilaporkan rusak karena aset di dalamnya ({$child->asset_code}) rusak");

            DB::commit();

            $this->clearCache();
            $this->writeLog($request, 'report_maintenance', "Aset '{$child->asset_name}' ({$child->asset_code}) dalam Tas '{$bag->asset_name}' dilaporkan rusak via SATS oleh {$performedBy}");

            return $this->successResponse(null, 'Laporan kerusakan berhasil dikirim');
        } catch (\Exception $e) {
            DB::rollBack();
            return $this->errorResponse('Terjadi kesalahan: ' . $e->getMessage(), 500);
        }
    }

    /**
     * GET /api/integrations/sats/bags/{asset_code}/history
     */
    public function history($assetCode)
    {
        try {
            $tas = MasterAsset::where('asset_code', $assetCode)
                ->whereHas('category', function ($q) {
                    $q->where('code', 'CAT-TAS');
                })->first();

            if (!$tas) {
                return $this->notFoundResponse('Tas tidak ditemukan');
            }

            $history = AuditLog::where('asset_id', $tas->id)
                ->whereIn('action', [
                    'BORROW', 'borrow',
                    'RETURN', 'return',
                    'MAINTENANCE_REPORT', 'maintenance_report'
                ])
                ->orderBy('created_at', 'desc')
                ->get()
                ->map(function ($log) {
                    return [
                        'event_type'   => strtoupper($log->action),
                        'performed_by' => $log->pic ?? '-',
                        'timestamp'    => $log->created_at->format('Y-m-d H:i:s'),
                    ];
                });

            return $this->successResponse($history, 'History Tas berhasil diambil');
        } catch (\Exception $e) {
            return $this->errorResponse('Terjadi kesalahan: ' . $e->getMessage(), 500);
        }
    }

    // ==========================================
    // BACKWARD COMPATIBILITY ENDPOINTS (OLD SATS)
    // ==========================================

    /**
     * GET /api/integrations/sats/packages/{code}
     */
    public function getPackageByQr($code)
    {
        return $this->getBagByQr($code);
    }

    /**
     * POST /api/integrations/sats/borrow
     */
    public function borrowPackage(Request $request)
    {
        $request->merge([
            'asset_code' => $request->ploting_code,
        ]);
        return $this->borrowBag($request);
    }

    /**
     * POST /api/integrations/sats/return
     */
    public function returnPackage(Request $request)
    {
        $request->merge([
            'asset_code' => $request->ploting_code,
        ]);
        return $this->returnBag($request);
    }

    /**
     * POST /api/integrations/sats/report-damage
     */
    public function reportDamage(Request $request)
    {
        $request->merge([
            'bag_asset_code' => $request->ploting_code,
        ]);
        return $this->reportMaintenance($request);
    }

    // ==========================================
    // HELPERS
    // ==========================================

    private function writeLog(Request $request, string $activity, string $description): void
    {
        Log::create([
            'user_id'     => $request->user()?->id,
            'activity'    => $activity,
            'description' => $description,
            'ip_address'  => $request->ip(),
            'user_agent'  => $request->userAgent(),
        ]);
    }

    private function clearCache(): void
    {
        $keys = Cache::get('assets:cache_keys', []);
        foreach ($keys as $key) {
            Cache::forget($key);
        }
        Cache::forget('assets:cache_keys');

        Cache::forget('dashboard:index');
    }
}
