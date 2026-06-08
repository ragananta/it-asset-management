<?php

namespace App\Http\Controllers;

use App\Models\AssetProperty;
use App\Models\MasterAsset;
use App\Traits\ApiResponse;
use App\Http\Requests\AssetPropertyRequest;
use Illuminate\Http\Request;
use Illuminate\Support\Facades\Cache;

class AssetPropertyController extends Controller
{
    use ApiResponse;

    public function index(Request $request)
    {
        try {
            $cacheKey = 'asset_properties:index:' . md5($request->fullUrl());

            $data = Cache::remember($cacheKey, now()->addSeconds(30), function () use ($cacheKey, $request) {
                // Track cache key
                $keys = Cache::get('asset_properties:cache_keys', []);
                if (!in_array($cacheKey, $keys)) {
                    $keys[] = $cacheKey;
                    Cache::put('asset_properties:cache_keys', $keys, now()->addHours(1));
                }

                $query = AssetProperty::select(['id', 'asset_id', 'property_name', 'value', 'note', 'created_at'])
                    ->orderBy('property_name');

                if ($request->filled('asset_id')) {
                    $query->where('asset_id', $request->integer('asset_id'));
                }

                if ($request->filled('search')) {
                    $query->where('property_name', 'like', '%' . $request->search . '%');
                }

                $perPage = min($request->integer('per_page', 15), 100);

                return $query->paginate($perPage);
            });

            return $this->successResponse($data, 'Data properti aset berhasil diambil');
        } catch (\Exception $e) {
            return $this->errorResponse('Terjadi kesalahan: ' . $e->getMessage(), 500);
        }
    }

    public function show($id)
    {
        try {
            $property = AssetProperty::find($id);

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
            $this->clearPropertyCache();

            return $this->createdResponse($property, 'Properti aset berhasil ditambahkan');
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
            $this->clearPropertyCache();

            return $this->successResponse($property->fresh(), 'Properti aset berhasil diperbarui');
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
            $this->clearPropertyCache();

            return $this->successResponse(null, 'Properti aset berhasil dihapus');
        } catch (\Exception $e) {
            return $this->errorResponse('Terjadi kesalahan: ' . $e->getMessage(), 500);
        }
    }

    private function clearPropertyCache(): void
    {
        $keys = Cache::get('asset_properties:cache_keys', []);
        foreach ($keys as $key) {
            Cache::forget($key);
        }
        Cache::forget('asset_properties:cache_keys');
    }
}