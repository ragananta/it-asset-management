<?php

namespace App\Http\Controllers;

use App\Services\KaryawanService;
use App\Traits\ApiResponse;
use Illuminate\Http\Request;

class KaryawanController extends Controller
{
    use ApiResponse;

    protected KaryawanService $karyawanService;

    public function __construct(KaryawanService $karyawanService)
    {
        $this->karyawanService = $karyawanService;
    }

    /**
     * GET /api/karyawan
     * Proxy ke API eksternal via KaryawanService
     */
    public function index(Request $request)
    {
        try {
            $search = $request->get('search');
            $limit = (int) $request->get('limit', 20);

            $result = $this->karyawanService->getKaryawan($search, $limit);

            return $this->successResponse($result, 'Data karyawan berhasil diambil');
        } catch (\Exception $e) {
            return $this->errorResponse('Terjadi kesalahan: ' . $e->getMessage(), 500);
        }
    }
}