<?php

namespace App\Http\Controllers;

use App\Models\MasterAsset;
use App\Models\Category;
use App\Models\User;
use App\Models\Log;
use App\Traits\ApiResponse;
use App\Http\Requests\MasterAssetRequest;
use Illuminate\Http\Request;

class MasterAssetController extends Controller
{
    use ApiResponse;

    public function index(Request $request)
    {
        try {

            $query = MasterAsset::with([
                'category',
                'location',
                'assignedUser',
                'properties'
            ]);

            // ================= SEARCH =================
            if ($request->has('search')) {
                $search = $request->search;

                $query->where(function ($q) use ($search) {
                    $q->where('asset_code', 'like', "%{$search}%")
                      ->orWhere('asset_name', 'like', "%{$search}%")
                      ->orWhere('brand', 'like', "%{$search}%")
                      ->orWhere('serial_number', 'like', "%{$search}%");
                });
            }

            // ================= FILTER =================
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

            // ================= PAGINATION =================
            // Support per_page=all untuk mengambil semua data tanpa pagination
            $perPage = $request->get('per_page', 10);

            if ($perPage === 'all') {
                $data = $query->orderBy('created_at', 'desc')->get();
            } else {
                $data = $query->orderBy('created_at', 'desc')->paginate((int) $perPage);
            }

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
                'maintenanceLogs',
                'auditLogs',
                'assignments',
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

            // ================= AUTO CATEGORY =================
            $categoryName = strtolower(trim($request->category_name));

            $category = Category::firstOrCreate(
                ['name' => $categoryName],
                [
                    'code' => strtoupper(substr($categoryName, 0, 3)),
                ]
            );

            // ================= AUTO USER =================
            $userId = null;

            if ($request->filled('user_name')) {

                $userName = strtolower(trim($request->user_name));

                $user = User::firstOrCreate(
                    ['name' => $userName],
                    [
                        'email' => $userName . '@default.com',
                        'password' => bcrypt('password'),
                    ]
                );

                $userId = $user->id;
            }

            // ================= SIMPAN =================
            $data = $request->validated();

            $data['category_id'] = $category->id;
            $data['assigned_user_id'] = $userId;

            unset($data['category_name']);
            unset($data['user_name']);

            $asset = MasterAsset::create($data);

            $this->writeLog(
                $request,
                'create_data',
                "Aset '{$asset->asset_name}' ({$asset->asset_code}) berhasil ditambahkan"
            );

            return $this->createdResponse(
                $asset->load(['category', 'location', 'assignedUser']),
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

            // ================= AUTO CATEGORY =================
            if ($request->filled('category_name')) {

                $categoryName = strtolower(trim($request->category_name));

                $category = Category::firstOrCreate(
                    ['name' => $categoryName],
                    [
                        'code' => strtoupper(substr($categoryName, 0, 3)),
                    ]
                );

                $data['category_id'] = $category->id;
                unset($data['category_name']);
            }

            // ================= AUTO USER =================
            if ($request->filled('user_name')) {

                $userName = strtolower(trim($request->user_name));

                $user = User::firstOrCreate(
                    ['name' => $userName],
                    [
                        'email' => $userName . '@default.com',
                        'password' => bcrypt('password'),
                    ]
                );

                $data['assigned_user_id'] = $user->id;
                unset($data['user_name']);
            }

            $asset->update($data);

            $this->writeLog(
                $request,
                'update_data',
                "Aset '{$asset->asset_name}' ({$asset->asset_code}) berhasil diperbarui"
            );

            return $this->successResponse(
                $asset->fresh()->load(['category', 'location', 'assignedUser']),
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
                $request,
                'delete_data',
                "Aset '{$info}' berhasil dihapus"
            );

            return $this->successResponse(null, 'Aset berhasil dihapus');

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