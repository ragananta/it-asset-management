<?php

namespace App\Http\Controllers;

use App\Models\MaintenanceLog;
use App\Models\MasterAsset;
use App\Models\Log;
use App\Traits\ApiResponse;
use App\Http\Requests\MaintenanceLogRequest;
use Illuminate\Http\Request;

class MaintenanceLogController extends Controller
{
    use ApiResponse;

    public function index(Request $request)
    {
        try {
            $query = MaintenanceLog::with('asset');

            if ($request->has('asset_id')) {
                $query->where('asset_id', $request->asset_id);
            }

            if ($request->has('search')) {
                $query->where('description', 'like', '%' . $request->search . '%')
                      ->orWhere('pic', 'like', '%' . $request->search . '%');
            }

            if ($request->has('date_from') && $request->has('date_to')) {
                $query->whereBetween('date', [$request->date_from, $request->date_to]);
            }

            $perPage = $request->get('per_page', 15);
            $data    = $perPage === 'all' ? $query->get() : $query->paginate($perPage);

            return $this->successResponse($data, 'Data maintenance log berhasil diambil');
        } catch (\Exception $e) {
            return $this->errorResponse('Terjadi kesalahan: ' . $e->getMessage(), 500);
        }
    }

    public function show($id)
    {
        try {
            $log = MaintenanceLog::with('asset')->find($id);

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

            $this->writeLog($request, 'create_data', "Maintenance log untuk aset '{$asset->asset_name}' berhasil ditambahkan");

            return $this->createdResponse($log->load('asset'), 'Maintenance log berhasil ditambahkan');
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

            $log->update($request->validated());

            $this->writeLog($request, 'update_data', "Maintenance log ID {$id} berhasil diperbarui");

            return $this->successResponse($log->fresh()->load('asset'), 'Maintenance log berhasil diperbarui');
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

            $log->delete();

            $this->writeLog($request, 'delete_data', "Maintenance log ID {$id} berhasil dihapus");

            return $this->successResponse(null, 'Maintenance log berhasil dihapus');
        } catch (\Exception $e) {
            return $this->errorResponse('Terjadi kesalahan: ' . $e->getMessage(), 500);
        }
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