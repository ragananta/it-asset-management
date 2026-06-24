<?php

namespace App\Services;

use Illuminate\Support\Facades\Http;
use Illuminate\Support\Facades\Cache;

class KaryawanService
{
    protected string $url;

    public function __construct()
    {
        $this->url = config('services.karyawan.url') ?? '';
    }

    /**
     * Get all active employees from cache or external API
     *
     * @return array
     * @throws \Exception
     */
    public function getAllActiveKaryawan(): array
    {
        if (empty($this->url)) {
            throw new \Exception('Karyawan API URL is not configured in services config.');
        }

        return Cache::remember('karyawan_list', 300, function () {
            $response = Http::timeout(10)->get($this->url);

            if (!$response->successful()) {
                throw new \Exception('Gagal mengambil data karyawan dari server');
            }

            $data = $response->json();
            return $data['karyawanActive'] ?? [];
        });
    }

    /**
     * Get filtered, constrained, and mapped employee data
     *
     * @param string|null $search
     * @param int $limit
     * @return array
     */
    public function getKaryawan(?string $search = null, int $limit = 20): array
    {
        $karyawan = $this->getAllActiveKaryawan();

        // Filter by search (name or departemen, case-insensitive)
        if (!empty($search)) {
            $searchQuery = strtolower($search);
            $karyawan = array_values(array_filter($karyawan, function ($k) use ($searchQuery) {
                return str_contains(strtolower($k['name'] ?? ''), $searchQuery)
                    || str_contains(strtolower($k['departemen'] ?? ''), $searchQuery);
            }));
        }

        // Apply limit validation (minimum 1, maximum 200)
        $limit = max(1, min($limit, 200));

        // Slice results
        $karyawan = array_slice($karyawan, 0, $limit);

        // Transform response structure
        return array_map(fn($k) => [
            'username'   => $k['username'] ?? '',
            'name'       => $k['name'] ?? '',
            'departemen' => $k['departemen'] ?? '',
            'pos'        => $k['pos'] ?? '',
            'email'      => $k['email'] ?? '',
        ], $karyawan);
    }
}
