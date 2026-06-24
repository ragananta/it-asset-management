<?php

namespace App\Http\Controllers;

use App\Models\Location;
use App\Models\Log;
use App\Traits\ApiResponse;
use Illuminate\Http\Request;
use Illuminate\Support\Facades\Cache;
use Illuminate\Support\Facades\Validator;
use Illuminate\Support\Str;

class LocationController extends Controller
{
    use ApiResponse;

    /**
     * GET /api/locations
     */
    public function index(Request $request)
    {
        try {
            $cacheKey = 'locations:index:' . md5($request->fullUrl());

            $data = Cache::remember($cacheKey, now()->addMinutes(5), function () use ($cacheKey, $request) {
                // Register cache key
                $keys = Cache::get('locations:cache_keys', []);
                if (!in_array($cacheKey, $keys)) {
                    $keys[] = $cacheKey;
                    Cache::put('locations:cache_keys', $keys, now()->addHours(24));
                }

                $query = Location::query();

                // Hanya ambil yang aktif kecuali secara eksplisit meminta semua
                if ($request->boolean('active_only', true)) {
                    $query->where('is_active', true);
                }

                if ($request->get('mode') === 'options') {
                    return $query->select(['id', 'name', 'code'])->orderBy('name')->get();
                }

                return $query->orderBy('name')->get();
            });

            return $this->successResponse($data, 'Data lokasi berhasil diambil');
        } catch (\Exception $e) {
            return $this->errorResponse('Terjadi kesalahan: ' . $e->getMessage(), 500);
        }
    }

    /**
     * GET /api/locations/{id}
     */
    public function show($id)
    {
        try {
            $location = Location::find($id);

            if (!$location) {
                return $this->notFoundResponse('Lokasi tidak ditemukan');
            }

            return $this->successResponse($location, 'Data lokasi berhasil diambil');
        } catch (\Exception $e) {
            return $this->errorResponse('Terjadi kesalahan: ' . $e->getMessage(), 500);
        }
    }

    /**
     * POST /api/locations
     */
    public function store(Request $request)
    {
        try {
            $validator = Validator::make($request->all(), [
                'name'      => 'required|string|max:255',
                'code'      => 'nullable|string|max:50|unique:locations,code',
                'building'  => 'nullable|string|max:255',
                'floor'     => 'nullable|string|max:50',
                'room'      => 'nullable|string|max:50',
                'address'   => 'nullable|string',
                'is_active' => 'nullable|boolean',
            ]);

            if ($validator->fails()) {
                return $this->errorResponse('Validasi gagal: ' . implode(', ', $validator->errors()->all()), 422);
            }

            $data = $validator->validated();

            // Auto-generate code if empty
            if (empty($data['code'])) {
                $nameClean = strtoupper(preg_replace('/[^a-zA-Z0-9]/', '', $data['name']));
                $prefix = substr($nameClean, 0, 3);
                if (strlen($prefix) < 3) {
                    $prefix = 'LOC';
                }
                $code = $prefix . '-' . strtoupper(Str::random(5));
                while (Location::where('code', $code)->exists()) {
                    $code = $prefix . '-' . strtoupper(Str::random(5));
                }
                $data['code'] = $code;
            }

            $location = Location::create($data);
            $this->clearLocationCache();

            $this->writeLog($request, 'create_data', "Lokasi '{$location->name}' berhasil ditambahkan");

            return $this->createdResponse($location, 'Lokasi berhasil ditambahkan');
        } catch (\Exception $e) {
            return $this->errorResponse('Terjadi kesalahan: ' . $e->getMessage(), 500);
        }
    }

    /**
     * PUT /api/locations/{id}
     */
    public function update(Request $request, $id)
    {
        try {
            $location = Location::find($id);

            if (!$location) {
                return $this->notFoundResponse('Lokasi tidak ditemukan');
            }

            $validator = Validator::make($request->all(), [
                'name'      => 'sometimes|required|string|max:255',
                'code'      => 'sometimes|required|string|max:50|unique:locations,code,' . $id,
                'building'  => 'nullable|string|max:255',
                'floor'     => 'nullable|string|max:50',
                'room'      => 'nullable|string|max:50',
                'address'   => 'nullable|string',
                'is_active' => 'nullable|boolean',
            ]);

            if ($validator->fails()) {
                return $this->errorResponse('Validasi gagal: ' . implode(', ', $validator->errors()->all()), 422);
            }

            $location->update($validator->validated());
            $this->clearLocationCache();

            $this->writeLog($request, 'update_data', "Lokasi '{$location->name}' berhasil diperbarui");

            return $this->successResponse($location->fresh(), 'Lokasi berhasil diperbarui');
        } catch (\Exception $e) {
            return $this->errorResponse('Terjadi kesalahan: ' . $e->getMessage(), 500);
        }
    }

    /**
     * DELETE /api/locations/{id}
     */
    public function destroy(Request $request, $id)
    {
        try {
            $location = Location::find($id);

            if (!$location) {
                return $this->notFoundResponse('Lokasi tidak ditemukan');
            }

            if ($location->assets()->count() > 0) {
                return $this->errorResponse('Lokasi tidak dapat dihapus karena masih memiliki aset', 422);
            }

            $name = $location->name;
            $location->delete();
            $this->clearLocationCache();

            $this->writeLog($request, 'delete_data', "Lokasi '{$name}' berhasil dihapus");

            return $this->successResponse(null, 'Lokasi berhasil dihapus');
        } catch (\Exception $e) {
            return $this->errorResponse('Terjadi kesalahan: ' . $e->getMessage(), 500);
        }
    }

    private function clearLocationCache(): void
    {
        $keys = Cache::get('locations:cache_keys', []);
        foreach ($keys as $key) {
            Cache::forget($key);
        }
        Cache::forget('locations:cache_keys');
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