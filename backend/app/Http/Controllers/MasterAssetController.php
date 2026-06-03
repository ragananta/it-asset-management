<?php

namespace App\Http\Controllers;

use App\Models\MasterAsset;
use App\Models\Category;
use App\Models\User;
use App\Models\Log;
use App\Exports\AssetsExport;
use App\Traits\ApiResponse;
use App\Http\Requests\MasterAssetRequest;
use Illuminate\Http\Request;
use Illuminate\Support\Facades\Cache;
use Maatwebsite\Excel\Facades\Excel;

class MasterAssetController extends Controller
{
    use ApiResponse;

    public function index(Request $request)
    {
        try {
            $query = MasterAsset::with([
                'category:id,name',
                'assignedUser:id,name',
            ])->select([
                'id',
                'asset_code',
                'asset_name',
                'category_id',
                'location_id',
                'assigned_user_id',
                'brand',
                'model',
                'serial_number',
                'condition_status',
                'status',
                'created_at',
            ]);

            if ($request->has('search')) {
                $search = $request->search;
                $query->where(function ($q) use ($search) {
                    $q->where('asset_code', 'like', "%{$search}%")
                      ->orWhere('asset_name', 'like', "%{$search}%")
                      ->orWhere('brand', 'like', "%{$search}%")
                      ->orWhere('serial_number', 'like', "%{$search}%");
                });
            }

            if ($request->filled('category_id')) {
                $query->where('category_id', $request->category_id);
            }

            if ($request->filled('condition_status')) {
                $query->where('condition_status', $request->condition_status);
            }

            if ($request->filled('status')) {
                $query->where('status', $request->status);
            }

            if ($request->filled('location_id')) {
                $query->where('location_id', $request->location_id);
            }

            $perPage = min((int) $request->get('per_page', 10), 100);
            $cacheKey = 'assets:index:' . md5($request->fullUrl());
            $data = Cache::remember($cacheKey, now()->addSeconds(10), function () use ($query, $perPage) {
                return $query->orderBy('created_at', 'desc')->paginate($perPage);
            });

            return $this->successResponse($data, 'Data aset berhasil diambil');

        } catch (\Exception $e) {
            return $this->errorResponse('Terjadi kesalahan: ' . $e->getMessage(), 500);
        }
    }

    public function show($id)
    {
        try {
            $asset = MasterAsset::with([
                'category',
                'location',
                'assignedUser',
                'properties',
                'maintenanceLogs' => fn($q) => $q->orderByDesc('date')->limit(10),
                'auditLogs'       => fn($q) => $q->orderByDesc('created_at')->limit(20),
                'assignments'     => fn($q) => $q->orderByDesc('assign_date')->limit(10),
            ])->find($id);

            if (!$asset) {
                return $this->notFoundResponse('Aset tidak ditemukan');
            }

            return $this->successResponse($asset, 'Detail aset berhasil diambil');

        } catch (\Exception $e) {
            return $this->errorResponse('Terjadi kesalahan: ' . $e->getMessage(), 500);
        }
    }

    public function store(MasterAssetRequest $request)
    {
        try {
            $categoryName = strtolower(trim($request->category_name));
            $category = Category::firstOrCreate(
                ['name' => $categoryName],
                ['code' => strtoupper(substr($categoryName, 0, 3))]
            );

            $userId = null;
            if ($request->filled('user_name')) {
                $userName = strtolower(trim($request->user_name));
                $user = User::firstOrCreate(
                    ['name' => $userName],
                    [
                        'email'    => $userName . '@default.com',
                        'password' => bcrypt('password'),
                    ]
                );
                $userId = $user->id;
            }

            $data = $request->validated();
            $data['category_id']      = $category->id;
            $data['assigned_user_id'] = $userId;
            unset($data['category_name'], $data['user_name']);

            $asset = MasterAsset::create($data);

            $this->writeLog(
                $request, 'create_data',
                "Aset '{$asset->asset_name}' ({$asset->asset_code}) berhasil ditambahkan"
            );

            return $this->createdResponse(
                $asset->load(['category', 'assignedUser']),
                'Aset berhasil ditambahkan'
            );

        } catch (\Exception $e) {
            return $this->errorResponse('Terjadi kesalahan: ' . $e->getMessage(), 500);
        }
    }

    public function update(MasterAssetRequest $request, $id)
    {
        try {
            $asset = MasterAsset::find($id);

            if (!$asset) {
                return $this->notFoundResponse('Aset tidak ditemukan');
            }

            $data = $request->validated();

            if ($request->filled('category_name')) {
                $categoryName = strtolower(trim($request->category_name));
                $category = Category::firstOrCreate(
                    ['name' => $categoryName],
                    ['code' => strtoupper(substr($categoryName, 0, 3))]
                );
                $data['category_id'] = $category->id;
                unset($data['category_name']);
            }

            if ($request->filled('user_name')) {
                $userName = strtolower(trim($request->user_name));
                $user = User::firstOrCreate(
                    ['name' => $userName],
                    [
                        'email'    => $userName . '@default.com',
                        'password' => bcrypt('password'),
                    ]
                );
                $data['assigned_user_id'] = $user->id;
                unset($data['user_name']);
            }

            $asset->update($data);

            $this->writeLog(
                $request, 'update_data',
                "Aset '{$asset->asset_name}' ({$asset->asset_code}) berhasil diperbarui"
            );

            return $this->successResponse(
                $asset->fresh()->load(['category', 'assignedUser']),
                'Aset berhasil diperbarui'
            );

        } catch (\Exception $e) {
            return $this->errorResponse('Terjadi kesalahan: ' . $e->getMessage(), 500);
        }
    }

    public function destroy(Request $request, $id)
    {
        try {
            $asset = MasterAsset::find($id);

            if (!$asset) {
                return $this->notFoundResponse('Aset tidak ditemukan');
            }

            $info = "{$asset->asset_name} ({$asset->asset_code})";
            $asset->delete();

            $this->writeLog(
                $request, 'delete_data',
                "Aset '{$info}' berhasil dihapus"
            );

            return $this->successResponse(null, 'Aset berhasil dihapus');

        } catch (\Exception $e) {
            return $this->errorResponse('Terjadi kesalahan: ' . $e->getMessage(), 500);
        }
    }

    public function export(Request $request)
    {
        $filename = 'data-aset-' . now()->format('Ymd-His') . '.xlsx';
    return Excel::download(new AssetsExport($request), $filename);
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
