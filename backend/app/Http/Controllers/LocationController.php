<?php

namespace App\Http\Controllers;

use App\Models\Location;
use App\Traits\ApiResponse;
use Illuminate\Http\Request;
use Illuminate\Support\Facades\Cache;

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

            $data = Cache::remember($cacheKey, now()->addMinutes(5), function () use ($request) {
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
}