<?php

namespace App\Http\Controllers;

use App\Models\MasterAsset;
use App\Models\Log;
use App\Traits\ApiResponse;
use App\Http\Requests\MasterAssetRequest;
use Illuminate\Http\Request;

class MasterAssetController extends Controller
{
    use ApiResponse;

    /**
     * GET /api/assets
     */
    public function index(Request $request)
    {
        try {
            $query = MasterAsset::with(['category', 'location', 'assignedUser']);

            if ($request->has('search')) {
                $search = $request->search;
                $query->where(function ($q) use ($search) {
                    $q->where('asset_code', 'like', "%{$search}%")
                      ->orWhere('asset_name', 'like', "%{$search}%")
                      ->orWhere('brand', 'like', "%{$search}%")
                      ->orWhere('serial_number', 'like', "%{$search}%");
                });
            }

            if ($request->has('category_id')) {
                $query->where('category_id', $request->category_id);
            }

            if ($request->has('condition_status')) {
                $query->where('condition_status', $request->condition_status);
            }

            if ($request->has('location_id')) {
                $query->where('location_id', $request->location_id);
            }

            $perPage = $request->get('per_page', 15);
            $data    = $perPage === 'all' ? $query->get() : $query->paginate($perPage);

            return $this->successResponse($data, 'Data aset berhasil diambil');
        } catch (\Exception $e) {
            return $this->errorResponse('Terjadi kesalahan: ' . $e->getMessage(), 500);
        }
    }

    /**
     * GET /api/assets/{id}
     */
    public function show($id)
    {
        try {
            $asset = MasterAsset::with([
                'category',
                'location',
                'assignedUser',
                'properties',
                'maintenanceLogs',
                'auditLogs',
                'assignments',
            ])->find($id);

            if (!$asset) {
                return $this->notFoundResponse('Aset tidak ditemukan');
            }

            return $this->successResponse($asset, 'Detail aset berhasil diambil');
        } catch (\Exception $e) {
            return $this->errorResponse('Terjadi kesalahan: ' . $e->getMessage(), 500);
        }
    }

    /**
     * POST /api/assets
     */
    public function store(MasterAssetRequest $request)
    {
        try {
            $asset = MasterAsset::create($request->validated());

            $this->writeLog($request, 'create_data', "Aset '{$asset->asset_name}' ({$asset->asset_code}) berhasil ditambahkan");

            return $this->createdResponse(
                $asset->load(['category', 'location', 'assignedUser']),
                'Aset berhasil ditambahkan'
            );
        } catch (\Exception $e) {
            return $this->errorResponse('Terjadi kesalahan: ' . $e->getMessage(), 500);
        }
    }

    /**
     * PUT /api/assets/{id}
     */
    public function update(MasterAssetRequest $request, $id)
    {
        try {
            $asset = MasterAsset::find($id);

            if (!$asset) {
                return $this->notFoundResponse('Aset tidak ditemukan');
            }

            $asset->update($request->validated());

            $this->writeLog($request, 'update_data', "Aset '{$asset->asset_name}' ({$asset->asset_code}) berhasil diperbarui");

            return $this->successResponse(
                $asset->fresh()->load(['category', 'location', 'assignedUser']),
                'Aset berhasil diperbarui'
            );
        } catch (\Exception $e) {
            return $this->errorResponse('Terjadi kesalahan: ' . $e->getMessage(), 500);
        }
    }

    /**
     * DELETE /api/assets/{id}
     */
    public function destroy(Request $request, $id)
    {
        try {
            $asset = MasterAsset::find($id);

            if (!$asset) {
                return $this->notFoundResponse('Aset tidak ditemukan');
            }

            $info = "{$asset->asset_name} ({$asset->asset_code})";
            $asset->delete();

            $this->writeLog($request, 'delete_data', "Aset '{$info}' berhasil dihapus");

            return $this->successResponse(null, 'Aset berhasil dihapus');
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