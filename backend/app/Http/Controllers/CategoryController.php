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
            // Tampilkan data terhapus (soft deleted) kalau trashed=true
            $query = $request->boolean('trashed')
                ? Category::onlyTrashed()->withCount('assets')
                : Category::withCount('assets');

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

            $perPage = min((int) $request->get('per_page', 15), 100);
            $cacheKey = 'categories:index:' . md5($request->fullUrl());
            $data = Cache::remember($cacheKey, now()->addSeconds(10), function () use ($query, $perPage) {
                return $query->paginate($perPage);
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
            $category = Category::create($request->validated());

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

            $category->update($request->validated());

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
}
