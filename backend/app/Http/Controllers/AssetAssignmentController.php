<?php

namespace App\Http\Controllers;

use App\Models\AssetAssignment;
use App\Models\MasterAsset;
use App\Models\Log;
use App\Traits\ApiResponse;
use App\Http\Requests\AssetAssignmentRequest;
use Illuminate\Http\Request;

class AssetAssignmentController extends Controller
{
    use ApiResponse;

    public function index(Request $request)
    {
        try {
            $query = AssetAssignment::with('asset');

            if ($request->has('asset_id')) {
                $query->where('asset_id', $request->asset_id);
            }

            if ($request->has('search')) {
                $query->where('user_name', 'like', '%' . $request->search . '%');
            }

            // Filter yang sedang aktif (belum dikembalikan)
            if ($request->has('active') && $request->boolean('active')) {
                $query->whereNull('return_date');
            }

            $perPage = $request->get('per_page', 15);
            $data    = $perPage === 'all' ? $query->get() : $query->paginate($perPage);

            return $this->successResponse($data, 'Data penugasan aset berhasil diambil');
        } catch (\Exception $e) {
            return $this->errorResponse('Terjadi kesalahan: ' . $e->getMessage(), 500);
        }
    }

    public function show($id)
    {
        try {
            $assignment = AssetAssignment::with('asset.category')->find($id);

            if (!$assignment) {
                return $this->notFoundResponse('Penugasan aset tidak ditemukan');
            }

            return $this->successResponse($assignment, 'Data penugasan aset berhasil diambil');
        } catch (\Exception $e) {
            return $this->errorResponse('Terjadi kesalahan: ' . $e->getMessage(), 500);
        }
    }

    public function store(AssetAssignmentRequest $request)
    {
        try {
            $asset = MasterAsset::find($request->asset_id);
            if (!$asset) {
                return $this->notFoundResponse('Aset tidak ditemukan');
            }

            $assignment = AssetAssignment::create($request->validated());

            // Update assigned_user_id di tabel master_assets
            $asset->update(['assigned_user_id' => null]); // reset if needed

            $this->writeLog($request, 'create_data', "Aset '{$asset->asset_name}' ditugaskan kepada '{$assignment->user_name}'");

            return $this->createdResponse($assignment->load('asset'), 'Penugasan aset berhasil ditambahkan');
        } catch (\Exception $e) {
            return $this->errorResponse('Terjadi kesalahan: ' . $e->getMessage(), 500);
        }
    }

    public function update(AssetAssignmentRequest $request, $id)
    {
        try {
            $assignment = AssetAssignment::find($id);

            if (!$assignment) {
                return $this->notFoundResponse('Penugasan aset tidak ditemukan');
            }

            $assignment->update($request->validated());

            $this->writeLog($request, 'update_data', "Penugasan aset ID {$id} berhasil diperbarui");

            return $this->successResponse($assignment->fresh()->load('asset'), 'Penugasan aset berhasil diperbarui');
        } catch (\Exception $e) {
            return $this->errorResponse('Terjadi kesalahan: ' . $e->getMessage(), 500);
        }
    }

    public function destroy(Request $request, $id)
    {
        try {
            $assignment = AssetAssignment::find($id);

            if (!$assignment) {
                return $this->notFoundResponse('Penugasan aset tidak ditemukan');
            }

            $assignment->delete();

            $this->writeLog($request, 'delete_data', "Penugasan aset ID {$id} berhasil dihapus");

            return $this->successResponse(null, 'Penugasan aset berhasil dihapus');
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