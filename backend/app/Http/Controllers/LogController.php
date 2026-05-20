<?php

namespace App\Http\Controllers;

use App\Models\Log;
use App\Traits\ApiResponse;
use Illuminate\Http\Request;

class LogController extends Controller
{
    use ApiResponse;

    /**
     * GET /api/logs
     */
    public function index(Request $request)
    {
        try {
            $query = Log::with('user')->orderBy('created_at', 'desc');

            if ($request->has('user_id')) {
                $query->where('user_id', $request->user_id);
            }

            if ($request->has('activity')) {
                $query->where('activity', $request->activity);
            }

            if ($request->has('search')) {
                $query->where('description', 'like', '%' . $request->search . '%');
            }

            if ($request->has('date_from') && $request->has('date_to')) {
                $query->whereDate('created_at', '>=', $request->date_from)
                      ->whereDate('created_at', '<=', $request->date_to);
            }

            $perPage = min((int)$request->get('per_page', 15), 50);
            $data = $query->paginate($perPage);

            return $this->successResponse($data, 'Data log aktivitas berhasil diambil');
        } catch (\Exception $e) {
            return $this->errorResponse('Terjadi kesalahan: ' . $e->getMessage(), 500);
        }
    }

    /**
     * GET /api/logs/{id}
     */
    public function show($id)
    {
        try {
            $log = Log::with('user')->find($id);

            if (!$log) {
                return $this->notFoundResponse('Log tidak ditemukan');
            }

            return $this->successResponse($log, 'Data log berhasil diambil');
        } catch (\Exception $e) {
            return $this->errorResponse('Terjadi kesalahan: ' . $e->getMessage(), 500);
        }
    }
}