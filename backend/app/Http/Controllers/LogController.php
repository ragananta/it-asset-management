<?php

namespace App\Http\Controllers;

use App\Models\Log;
use App\Traits\ApiResponse;
use Carbon\Carbon;
use Illuminate\Http\Request;
use Illuminate\Support\Facades\Cache;

class LogController extends Controller
{
    use ApiResponse;

    public function index(Request $request)
    {
        try {
            $query = Log::with('user:id,name,email')
                ->select([
                    'id',
                    'user_id',
                    'activity',
                    'description',
                    'ip_address',
                    'user_agent',
                    'created_at',
                ])
                ->orderBy('created_at', 'desc');

            if ($request->has('user_id')) {
                $query->where('user_id', $request->user_id);
            }

            if ($request->has('activity')) {
                $query->where('activity', $request->activity);
            }

            if ($request->has('search')) {
                $search = $request->search;
                $query->where(function ($q) use ($search) {
                    $q->where('description', 'like', "%{$search}%")
                      ->orWhere('activity', 'like', "%{$search}%")
                      ->orWhere('ip_address', 'like', "%{$search}%")
                      ->orWhereHas('user', function ($u) use ($search) {
                          $u->where('name', 'like', "%{$search}%")
                            ->orWhere('email', 'like', "%{$search}%");
                      });
                });
            }

            if ($request->has('date_from') && $request->has('date_to')) {
                $query->whereBetween('created_at', [
                    Carbon::parse($request->date_from)->startOfDay(),
                    Carbon::parse($request->date_to)->endOfDay(),
                ]);
            }

            $perPage = min((int)$request->get('per_page', 15), 50);
            $cacheKey = 'logs:index:' . md5($request->fullUrl());
            $data = Cache::remember($cacheKey, now()->addSeconds(10), function () use ($query, $perPage) {
                return $query->paginate($perPage);
            });

            return $this->successResponse($data, 'Data log aktivitas berhasil diambil');
        } catch (\Exception $e) {
            return $this->errorResponse('Terjadi kesalahan: ' . $e->getMessage(), 500);
        }
    }

    public function show($id)
    {
        try {
            $log = Log::with('user:id,name,email')->find($id);

            if (!$log) {
                return $this->notFoundResponse('Log tidak ditemukan');
            }

            return $this->successResponse($log, 'Data log berhasil diambil');
        } catch (\Exception $e) {
            return $this->errorResponse('Terjadi kesalahan: ' . $e->getMessage(), 500);
        }
    }
}
