<?php

namespace App\Http\Controllers;

use App\Models\AssetProperty;
use App\Models\MasterAsset;
use App\Traits\ApiResponse;
use App\Http\Requests\AssetPropertyRequest;
use Illuminate\Http\Request;

class AssetPropertyController extends Controller
{
    use ApiResponse;

    /**
     * GET /api/asset-properties?asset_id={id}
     */
    public function index(Request $request)
    {
        try {
            $query = AssetProperty::with('asset');

            if ($request->has('asset_id')) {
                $query->where('asset_id', $request->asset_id);
            }

            if ($request->has('search')) {
                $query->where('property_name', 'like', '%' . $request->search . '%');
            }

            $perPage = $request->get('per_page', 15);
            $data    = $perPage === 'all' ? $query->get() : $query->paginate($perPage);

            return $this->successResponse($data, 'Data properti aset berhasil diambil');
        } catch (\Exception $e) {
            return $this->errorResponse('Terjadi kesalahan: ' . $e->getMessage(), 500);
        }
    }

    public function show($id)
    {
        try {
            $property = AssetProperty::with('asset')->find($id);

            if (!$property) {
                return $this->notFoundResponse('Properti aset tidak ditemukan');
            }

            return $this->successResponse($property, 'Data properti aset berhasil diambil');
        } catch (\Exception $e) {
            return $this->errorResponse('Terjadi kesalahan: ' . $e->getMessage(), 500);
        }
    }

    public function store(AssetPropertyRequest $request)
    {
        try {
            $asset = MasterAsset::find($request->asset_id);
            if (!$asset) {
                return $this->notFoundResponse('Aset tidak ditemukan');
            }

            $property = AssetProperty::create($request->validated());

            return $this->createdResponse($property->load('asset'), 'Properti aset berhasil ditambahkan');
        } catch (\Exception $e) {
            return $this->errorResponse('Terjadi kesalahan: ' . $e->getMessage(), 500);
        }
    }

    public function update(AssetPropertyRequest $request, $id)
    {
        try {
            $property = AssetProperty::find($id);

            if (!$property) {
                return $this->notFoundResponse('Properti aset tidak ditemukan');
            }

            $property->update($request->validated());

            return $this->successResponse($property->fresh()->load('asset'), 'Properti aset berhasil diperbarui');
        } catch (\Exception $e) {
            return $this->errorResponse('Terjadi kesalahan: ' . $e->getMessage(), 500);
        }
    }

    public function destroy($id)
    {
        try {
            $property = AssetProperty::find($id);

            if (!$property) {
                return $this->notFoundResponse('Properti aset tidak ditemukan');
            }

            $property->delete();

            return $this->successResponse(null, 'Properti aset berhasil dihapus');
        } catch (\Exception $e) {
            return $this->errorResponse('Terjadi kesalahan: ' . $e->getMessage(), 500);
        }
    }
}