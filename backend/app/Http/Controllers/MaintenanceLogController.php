<?php

namespace App\Http\Controllers;

use App\Models\MaintenanceLog;
use App\Models\MasterAsset;
use App\Models\Log;
use App\Exports\MaintenanceExport;
use App\Traits\ApiResponse;
use App\Http\Requests\MaintenanceLogRequest;
use Illuminate\Http\Request;
use Illuminate\Support\Facades\Cache;
use Illuminate\Support\Facades\DB;
use Maatwebsite\Excel\Facades\Excel;

class MaintenanceLogController extends Controller
{
    use ApiResponse;

    public function index(Request $request)
    {
        try {
            $query = MaintenanceLog::with('asset:id,asset_name,asset_code')
                ->select([
                    'id',
                    'asset_id',
                    'date',
                    'description',
                    'cost',
                    'pic',
                    'status',
                    'created_at',
                ])
                ->orderByDesc('date')
                ->orderByDesc('created_at')
                ->orderByDesc('id');

            if ($request->filled('asset_id')) {
                $query->where('asset_id', $request->asset_id);
            }

            if ($request->filled('status')) {
                $query->where('status', $request->status);
            }

            if ($request->filled('search')) {
                $search = $request->search;
                $query->where(function ($q) use ($search) {
                    $q->where('description', 'like', "%{$search}%")
                      ->orWhere('pic', 'like', "%{$search}%")
                      ->orWhereHas('asset', fn($a) =>
                          $a->where('asset_name', 'like', "%{$search}%")
                            ->orWhere('asset_code', 'like', "%{$search}%")
                      );
                });
            }

            if ($request->filled('date_from') && $request->filled('date_to')) {
                $query->whereBetween('date', [$request->date_from, $request->date_to]);
            }

            // ── Total biaya untuk halaman ini ─────────────────────────────
            $perPage = min((int) $request->get('per_page', 15), 100);
            $cacheKey = 'maintenance:index:' . md5($request->fullUrl());
            $payload = Cache::remember($cacheKey, now()->addSeconds(10), function () use ($query, $perPage) {
                return [
                    'total_cost' => (float) (clone $query)->sum('cost'),
                    'logs' => $query->paginate($perPage),
                ];
            });

            return $this->successResponse([
                'logs'       => $payload['logs'],
                'total_cost' => $payload['total_cost'],
            ], 'Data maintenance log berhasil diambil');

        } catch (\Exception $e) {
            return $this->errorResponse('Terjadi kesalahan: ' . $e->getMessage(), 500);
        }
    }

    public function show($id)
    {
        try {
            $log = MaintenanceLog::with('asset:id,asset_name,asset_code')->find($id);

            if (!$log) {
                return $this->notFoundResponse('Maintenance log tidak ditemukan');
            }

            return $this->successResponse($log, 'Data maintenance log berhasil diambil');
        } catch (\Exception $e) {
            return $this->errorResponse('Terjadi kesalahan: ' . $e->getMessage(), 500);
        }
    }

    public function store(MaintenanceLogRequest $request)
    {
        try {
            $asset = MasterAsset::find($request->asset_id);
            if (!$asset) {
                return $this->notFoundResponse('Aset tidak ditemukan');
            }

            $log = MaintenanceLog::create($request->validated());
            $asset->update(['condition_status' => 'under_maintenance']);

            $this->writeLog(
                $request, 'create_data',
                "Maintenance log untuk aset '{$asset->asset_name}' berhasil ditambahkan"
            );

            return $this->createdResponse(
                $log->load('asset:id,asset_name,asset_code'),
                'Maintenance log berhasil ditambahkan'
            );
        } catch (\Exception $e) {
            return $this->errorResponse('Terjadi kesalahan: ' . $e->getMessage(), 500);
        }
    }

    public function update(MaintenanceLogRequest $request, $id)
    {
        try {
            $log = MaintenanceLog::find($id);

            if (!$log) {
                return $this->notFoundResponse('Maintenance log tidak ditemukan');
            }

            if ($log->status === 'completed') {
                return $this->errorResponse('Maintenance yang sudah selesai tidak dapat diedit', 422);
            }

            $oldStatus  = $log->status;
            $newStatus  = $request->status ?? $log->status;
            $oldAssetId = $log->asset_id;
            $newAssetId = (int) $request->asset_id;
            $assetName  = $log->asset?->asset_name ?? '-';

            if ($oldAssetId !== $newAssetId) {
                $oldStillOngoing = MaintenanceLog::where('asset_id', $oldAssetId)
                    ->where('id', '!=', $id)->where('status', 'ongoing')->exists();
                if (!$oldStillOngoing) {
                    MasterAsset::where('id', $oldAssetId)->update(['condition_status' => 'good']);
                }
                if ($newStatus === 'ongoing') {
                    MasterAsset::where('id', $newAssetId)->update(['condition_status' => 'under_maintenance']);
                }
            }

            if ($oldStatus === 'ongoing' && $newStatus === 'completed') {
                $stillOngoing = MaintenanceLog::where('asset_id', $newAssetId)
                    ->where('id', '!=', $id)->where('status', 'ongoing')->exists();
                if (!$stillOngoing) {
                    MasterAsset::where('id', $newAssetId)->update(['condition_status' => 'good']);
                }
            }

            if ($oldStatus === 'completed' && $newStatus === 'ongoing') {
                MasterAsset::where('id', $newAssetId)->update(['condition_status' => 'under_maintenance']);
            }

            $log->update($request->validated());

            $this->writeLog($request, 'update_data', "Maintenance log ID {$id} berhasil diperbarui");

            return $this->successResponse(
                $log->fresh()->load('asset:id,asset_name,asset_code'),
                'Maintenance log berhasil diperbarui'
            );
        } catch (\Exception $e) {
            return $this->errorResponse('Terjadi kesalahan: ' . $e->getMessage(), 500);
        }
    }

    public function destroy(Request $request, $id)
    {
        try {
            $log = MaintenanceLog::find($id);

            if (!$log) {
                return $this->notFoundResponse('Maintenance log tidak ditemukan');
            }

            $assetId = $log->asset_id;
            $log->delete(); // soft delete

            $stillOngoing = MaintenanceLog::where('asset_id', $assetId)
                ->where('status', 'ongoing')->exists();
            if (!$stillOngoing) {
                MasterAsset::where('id', $assetId)->update(['condition_status' => 'good']);
            }

            $this->writeLog($request, 'delete_data', "Maintenance log ID {$id} berhasil dihapus");

            return $this->successResponse(null, 'Maintenance log berhasil dihapus');
        } catch (\Exception $e) {
            return $this->errorResponse('Terjadi kesalahan: ' . $e->getMessage(), 500);
        }
    }

    // ── Export Excel ──────────────────────────────────────────────────────
    public function export(Request $request)
    {
        $filename = 'maintenance-log-' . now()->format('Ymd-His') . '.xlsx';
        return Excel::download(new MaintenanceExport($request), $filename);
    }

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
}
