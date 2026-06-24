<?php

namespace App\Services;

use Illuminate\Support\Facades\Http;
use Illuminate\Support\Facades\Cache;
use Illuminate\Support\Facades\Log;

class StoreService
{
    protected string $url;

    public function __construct()
    {
        $this->url = config('services.store.url') ?? '';
    }

    /**
     * Get normalized store options from POS API (cached for 5 minutes)
     *
     * @return array
     */
    public function getStoreOptions(): array
    {
        if (empty($this->url)) {
            return [];
        }

        try {
            return Cache::remember('store_options_list', 300, function () {
                $response = Http::timeout(10)->get($this->url, [
                    'page' => 1,
                    'no_pagination' => 'true',
                    'category_type' => "'store'",
                    'status' => 1,
                    'per_page' => 100,
                ]);

                if (!$response->successful()) {
                    throw new \Exception('Gagal mengambil data store dari server POS');
                }

                $data = $response->json('data') ?? [];

                return array_map(fn($item) => [
                    'id'   => (int) ($item['id'] ?? 0),
                    'code' => (string) ($item['store_id'] ?? ''),
                    'name' => (string) ($item['name'] ?? ''),
                ], $data);
            });
        } catch (\Exception $e) {
            Log::error('StoreService fetch failed: ' . $e->getMessage());

            // Fallback to cache if available
            return Cache::get('store_options_list', []);
        }
    }

    /**
     * Get store by store code
     *
     * @param string $storeCode
     * @return array|null
     */
    public function getStoreByCode(string $storeCode): ?array
    {
        $options = $this->getStoreOptions();

        foreach ($options as $option) {
            if ($option['code'] === $storeCode) {
                return $option;
            }
        }

        return null;
    }

    /**
     * Get store name by store ID
     *
     * @param int $storeId
     * @return string|null
     */
    public function getStoreNameById(int $storeId): ?string
    {
        $options = $this->getStoreOptions();

        foreach ($options as $option) {
            if ((int) $option['id'] === $storeId) {
                return $option['name'];
            }
        }

        return null;
    }
}
