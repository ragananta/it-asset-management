<?php

namespace App\Http\Controllers;

use App\Models\Category;
use App\Models\Log;
use App\Traits\ApiResponse;
use App\Http\Requests\CategoryRequest;
use Illuminate\Http\Request;
use Illuminate\Support\Facades\Cache;

class CategoryController extends Controller
{
    use ApiResponse;

    /**
     * GET /api/categories
     */
    public function index(Request $request)
    {
        try {
            if ($request->get('mode') === 'options') {
                $cacheKey = 'categories:options:' . md5($request->fullUrl());
                $data = Cache::remember($cacheKey, now()->addMinutes(5), function () use ($cacheKey, $request) {
                    $keys = Cache::get('categories:option_keys', []);
                    if (!in_array($cacheKey, $keys)) {
                        $keys[] = $cacheKey;
                        Cache::put('categories:option_keys', $keys, now()->addHours(24));
                    }
                    $limit = min((int) $request->get('limit', 100), 500);

                    return Category::query()
                        ->select(['id', 'name', 'code', 'deleted_at'])
                        ->where('is_active', true)
                        ->orderBy('name')
                        ->limit($limit)
                        ->get();
                });

                return $this->successResponse($data, 'Opsi kategori berhasil diambil');
            }

            // Tampilkan data terhapus (soft deleted) kalau trashed=true.
            // Hitung jumlah asset hanya saat diminta agar list kategori tetap ringan.
            $query = $request->boolean('trashed')
                ? Category::onlyTrashed()
                : Category::query();

            if ($request->boolean('include_counts')) {
                $query->withCount('assets');
            }

            if ($request->filled('search')) {
                $search = $request->search;
                $query->where(function ($q) use ($search) {
                    $q->where('name', 'like', "%{$search}%")
                      ->orWhere('code', 'like', "%{$search}%");
                });
            }

            if ($request->filled('is_active')) {
                $query->where('is_active', $request->boolean('is_active'));
            }

            // Sorting Database dinamis dengan whitelist untuk keamanan
            $sortBy = $request->get('sort_by', 'name');
            $sortOrder = strtolower($request->get('sort_order', 'asc')) === 'asc' ? 'asc' : 'desc';
            $allowedSorts = ['name', 'code', 'is_active', 'created_at', 'updated_at'];
            if (in_array($sortBy, $allowedSorts)) {
                $query->orderBy($sortBy, $sortOrder);
                if ($sortBy !== 'id') {
                    $query->orderBy('id', 'desc');
                }
            } else {
                $query->orderBy('name', 'asc');
            }

            $perPage = min((int) $request->get('per_page', 15), 100);
            $cacheKey = 'categories:index:' . md5($request->fullUrl());
            $data = Cache::remember($cacheKey, now()->addSeconds(10), function () use ($cacheKey, $query, $perPage, $request) {
                $keys = Cache::get('categories:cache_keys', []);
                if (!in_array($cacheKey, $keys)) {
                    $keys[] = $cacheKey;
                    Cache::put('categories:cache_keys', $keys, now()->addHours(1));
                }
                return $request->boolean('simple')
                    ? $query->simplePaginate($perPage)
                    : $query->paginate($perPage);
            });

            return $this->successResponse($data, 'Data kategori berhasil diambil');
        } catch (\Exception $e) {
            return $this->errorResponse('Terjadi kesalahan: ' . $e->getMessage(), 500);
        }
    }
    /**
     * GET /api/categories/{id}
     */
    public function show($id)
    {
        try {
            $category = Category::withCount('assets')->find($id);

            if (!$category) {
                return $this->notFoundResponse('Kategori tidak ditemukan');
            }

            return $this->successResponse($category, 'Data kategori berhasil diambil');
        } catch (\Exception $e) {
            return $this->errorResponse('Terjadi kesalahan: ' . $e->getMessage(), 500);
        }
    }

    /**
     * POST /api/categories
     */
    public function store(CategoryRequest $request)
    {
        try {
            $data = $request->validated();
            if ($duplicateResponse = $this->duplicateCategoryResponse($request)) {
                return $duplicateResponse;
            }

            $category = Category::create($data);
            $this->clearCategoryCache();

            $this->writeLog($request, 'create_data', "Kategori '{$category->name}' berhasil ditambahkan");

            return $this->createdResponse($category, 'Kategori berhasil ditambahkan');
        } catch (\Exception $e) {
            return $this->errorResponse('Terjadi kesalahan: ' . $e->getMessage(), 500);
        }
    }

    /**
     * PUT /api/categories/{id}
     */
    public function update(CategoryRequest $request, $id)
    {
        try {
            $category = Category::find($id);

            if (!$category) {
                return $this->notFoundResponse('Kategori tidak ditemukan');
            }

            $data = $request->validated();
            if ($duplicateResponse = $this->duplicateCategoryResponse($request, (int) $category->id)) {
                return $duplicateResponse;
            }

            $category->update($data);
            $this->clearCategoryCache();

            $this->writeLog($request, 'update_data', "Kategori '{$category->name}' berhasil diperbarui");

            return $this->successResponse($category->fresh(), 'Kategori berhasil diperbarui');
        } catch (\Exception $e) {
            return $this->errorResponse('Terjadi kesalahan: ' . $e->getMessage(), 500);
        }
    }

    /**
     * DELETE /api/categories/{id} — soft delete
     */
    public function destroy(Request $request, $id)
    {
        try {
            $category = Category::find($id);

            if (!$category) {
                return $this->notFoundResponse('Kategori tidak ditemukan');
            }

            if ($category->assets()->count() > 0) {
                return $this->errorResponse('Kategori tidak dapat dihapus karena masih memiliki aset', 422);
            }

            $name = $category->name;
            $category->delete(); // soft delete — data tidak hilang permanen

            $this->clearCategoryCache();

            $this->writeLog($request, 'delete_data', "Kategori '{$name}' berhasil dihapus");

            return $this->successResponse(null, 'Kategori berhasil dihapus');
        } catch (\Exception $e) {
            return $this->errorResponse('Terjadi kesalahan: ' . $e->getMessage(), 500);
        }
    }

    /**
     * POST /api/categories/{id}/restore — pulihkan soft deleted
     */
    public function restore(Request $request, $id)
    {
        try {
            $category = Category::onlyTrashed()->find($id);

            if (!$category) {
                return $this->notFoundResponse('Kategori tidak ditemukan');
            }

            $category->restore();
            $this->clearCategoryCache();

            $this->writeLog($request, 'update_data', "Kategori '{$category->name}' berhasil dipulihkan");

            return $this->successResponse($category, 'Kategori berhasil dipulihkan');
        } catch (\Exception $e) {
            return $this->errorResponse('Terjadi kesalahan: ' . $e->getMessage(), 500);
        }
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

    private function clearCategoryCache(): void
    {
        $keys = Cache::get('categories:cache_keys', []);
        foreach ($keys as $key) {
            Cache::forget($key);
        }
        Cache::forget('categories:cache_keys');

        $optionKeys = Cache::get('categories:option_keys', []);
        foreach ($optionKeys as $key) {
            Cache::forget($key);
        }
        Cache::forget('categories:option_keys');

        Cache::forget('dashboard:index');
    }

    private function duplicateCategoryResponse(Request $request, ?int $ignoreId = null)
    {
        $exists = Category::whereRaw('LOWER(name) = ?', [strtolower(trim($request->name))])
            ->when($ignoreId, fn ($query) => $query->where('id', '!=', $ignoreId))
            ->exists();

        if ($exists) {
            return response()->json([
                'message' => 'Nama kategori sudah digunakan.'
            ], 422);
        }

        if ($request->filled('code')) {
            $codeQuery = Category::whereRaw('LOWER(code) = ?', [mb_strtolower($request->code)]);
            if ($ignoreId) {
                $codeQuery->where('id', '!=', $ignoreId);
            }
            if ($codeQuery->exists()) {
                return response()->json([
                    'success' => false,
                    'message' => 'Kode kategori sudah ada',
                    'errors' => [
                        'code' => ['Kode kategori sudah digunakan.'],
                    ],
                ], 422);
            }
        }

        return null;
    }
}
