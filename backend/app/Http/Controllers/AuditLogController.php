<?php

namespace App\Http\Controllers;

use App\Models\AuditLog;
use App\Models\Log;
use App\Traits\ApiResponse;
use App\Http\Requests\AuditLogRequest;
use Illuminate\Http\Request;

class AuditLogController extends Controller
{
    use ApiResponse;

    public function index(Request $request)
    {
        try {
            $query = AuditLog::with('asset:id,asset_name,asset_code')
                ->select(['id', 'asset_id', 'action', 'description', 'pic', 'created_at'])
                ->orderBy('created_at', 'desc');

            if ($request->filled('asset_id')) {
                $query->where('asset_id', $request->asset_id);
            }

            if ($request->filled('action')) {
                $query->where('action', $request->action);
            }

            if ($request->filled('search')) {
                $search = $request->search;
                $query->where(function ($q) use ($search) {
                    $q->where('description', 'like', "%{$search}%")
                      ->orWhere('pic', 'like', "%{$search}%");
                });
            }

            $perPage = min((int) $request->get('per_page', 15), 100);
            $data    = $query->paginate($perPage);

            return $this->successResponse($data, 'Data audit log berhasil diambil');
        } catch (\Exception $e) {
            return $this->errorResponse('Terjadi kesalahan: ' . $e->getMessage(), 500);
        }
    }

    public function show($id)
    {
        try {
            $log = AuditLog::with('asset')->find($id);

            if (!$log) {
                return $this->notFoundResponse('Audit log tidak ditemukan');
            }

            return $this->successResponse($log, 'Data audit log berhasil diambil');
        } catch (\Exception $e) {
            return $this->errorResponse('Terjadi kesalahan: ' . $e->getMessage(), 500);
        }
    }

    public function store(AuditLogRequest $request)
    {
        try {
            $log = AuditLog::create($request->validated());

            $this->writeLog($request, 'create_data', "Audit log action '{$log->action}' berhasil ditambahkan");

            return $this->createdResponse($log->load('asset'), 'Audit log berhasil ditambahkan');
        } catch (\Exception $e) {
            return $this->errorResponse('Terjadi kesalahan: ' . $e->getMessage(), 500);
        }
    }

    public function update(AuditLogRequest $request, $id)
    {
        try {
            $log = AuditLog::find($id);

            if (!$log) {
                return $this->notFoundResponse('Audit log tidak ditemukan');
            }

            $log->update($request->validated());

            $this->writeLog($request, 'update_data', "Audit log ID {$id} berhasil diperbarui");

            return $this->successResponse($log->fresh()->load('asset'), 'Audit log berhasil diperbarui');
        } catch (\Exception $e) {
            return $this->errorResponse('Terjadi kesalahan: ' . $e->getMessage(), 500);
        }
    }

    public function destroy(Request $request, $id)
    {
        try {
            $log = AuditLog::find($id);

            if (!$log) {
                return $this->notFoundResponse('Audit log tidak ditemukan');
            }

            $log->delete();

            $this->writeLog($request, 'delete_data', "Audit log ID {$id} berhasil dihapus");

            return $this->successResponse(null, 'Audit log berhasil dihapus');
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
