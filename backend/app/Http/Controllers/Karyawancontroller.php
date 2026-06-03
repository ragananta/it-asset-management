<?php

namespace App\Http\Controllers;

use App\Traits\ApiResponse;
use Illuminate\Http\Request;
use Illuminate\Support\Facades\Http;
use Illuminate\Support\Facades\Cache;

class KaryawanController extends Controller
{
    use ApiResponse;

    private string $apiUrl = 'https://dummydatakaryawan.salokapark.app/api/get_all_karyawan';

    /**
     * GET /api/karyawan
     * Proxy ke API eksternal, cache 5 menit supaya tidak hit API tiap request
     */
    public function index(Request $request)
    {
        try {
            $karyawan = Cache::remember('karyawan_list', 300, function () {
                $response = Http::timeout(10)->get($this->apiUrl);

                if (!$response->successful()) {
                    throw new \Exception('Gagal mengambil data karyawan dari server');
                }

                $data = $response->json();
                return $data['karyawanActive'] ?? [];
            });

            // Filter by search kalau ada
            if ($request->filled('search')) {
                $search = strtolower($request->search);
                $karyawan = array_values(array_filter($karyawan, function ($k) use ($search) {
                    return str_contains(strtolower($k['name'] ?? ''), $search)
                        || str_contains(strtolower($k['departemen'] ?? ''), $search);
                }));
            }

            // Limit hasil supaya tidak berat — ambil 20 teratas
            $limit = min((int) $request->get('limit', 20), 200);
            $karyawan = array_slice($karyawan, 0, $limit);

            // Hanya return field yang dibutuhkan frontend
            $result = array_map(fn($k) => [
                'username'    => $k['username'] ?? '',
                'name'        => $k['name'] ?? '',
                'departemen'  => $k['departemen'] ?? '',
                'pos'         => $k['pos'] ?? '',
                'email'       => $k['email'] ?? '',
            ], $karyawan);

            return $this->successResponse($result, 'Data karyawan berhasil diambil');
        } catch (\Exception $e) {
            return $this->errorResponse('Terjadi kesalahan: ' . $e->getMessage(), 500);
        }
    }
}