<?php

namespace App\Http\Controllers;

use App\Models\MasterAsset;
use App\Models\StoreAssetMapping;
use App\Models\Log;
use App\Services\StoreService;
use App\Traits\ApiResponse;
use Illuminate\Http\Request;
use Illuminate\Support\Facades\Auth;
use Illuminate\Support\Facades\DB;
use Illuminate\Support\Facades\Validator;

class StorePackageController extends Controller
{
    use ApiResponse;

    protected StoreService $storeService;

    public function __construct(StoreService $storeService)
    {
        $this->storeService = $storeService;
    }

    /**
     * GET /api/store-packages
     */
    public function index()
    {
        try {
            $stores = $this->storeService->getStoreOptions();
            
            // Get asset counts grouped by store_code
            $mappings = StoreAssetMapping::select('store_code', DB::raw('count(*) as total'))
                ->groupBy('store_code')
                ->get()
                ->pluck('total', 'store_code')
                ->toArray();

            $result = [];
            foreach ($stores as $store) {
                $code = $store['code'];
                $total = $mappings[$code] ?? 0;
                
                if ($total > 0) {
                    $result[] = [
                        'store_code'   => $code,
                        'store_name'   => $store['name'],
                        'total_assets' => $total,
                    ];
                }
            }

            return $this->successResponse($result, 'Store packages berhasil diambil');
        } catch (\Exception $e) {
            return $this->errorResponse('Terjadi kesalahan: ' . $e->getMessage(), 500);
        }
    }

    /**
     * GET /api/store-packages/{store_code}
     */
    public function show($storeCode)
    {
        try {
            $mappings = StoreAssetMapping::where('store_code', $storeCode)
                ->with('asset.category')
                ->get();

            if ($mappings->isEmpty()) {
                $store = $this->storeService->getStoreByCode($storeCode);
                if (!$store) {
                    return $this->notFoundResponse('Store tidak ditemukan');
                }
                $storeName = $store['name'];
                $storeCode = $store['code'];
            } else {
                $storeName = $mappings->first()->store_name;
            }

            $assets = $mappings->map(function ($mapping) {
                $asset = $mapping->asset;
                if (!$asset) return null;
                return [
                    'id'         => $asset->id,
                    'asset_code' => $asset->asset_code,
                    'asset_name' => $asset->asset_name,
                    'category'   => $asset->category?->name ?? '-',
                    'status'     => $asset->status,
                    'condition'  => $asset->condition_status,
                ];
            })->filter()->values()->toArray();

            $data = [
                'store_code'   => $storeCode,
                'store_name'   => $storeName,
                'total_assets' => count($assets),
                'assets'       => $assets,
            ];

            return $this->successResponse($data, 'Detail Store Package berhasil diambil');
        } catch (\Exception $e) {
            return $this->errorResponse('Terjadi kesalahan: ' . $e->getMessage(), 500);
        }
    }

    /**
     * POST /api/store-packages
     */
    public function store(Request $request)
    {
        $validator = Validator::make($request->all(), [
            'store_code' => 'required|string',
            'asset_ids'  => 'required|array|min:1',
            'asset_ids.*'=> 'integer|exists:master_assets,id',
        ], [
            'store_code.required' => 'Store wajib dipilih.',
            'asset_ids.required'  => 'Paling sedikit satu asset harus dipilih.',
            'asset_ids.min'       => 'Paling sedikit satu asset harus dipilih.',
        ]);

        if ($validator->fails()) {
            return $this->errorResponse($validator->errors()->first(), 422);
        }

        $storeCode = $request->input('store_code');
        $assetIds = $request->input('asset_ids');

        $store = $this->storeService->getStoreByCode($storeCode);
        if (!$store) {
            return $this->errorResponse('Store tidak valid atau tidak terdaftar di POS API.', 422);
        }

        DB::beginTransaction();
        try {
            // Check if any asset is already assigned to another store package
            $exists = StoreAssetMapping::whereIn('asset_id', $assetIds)->first();
            if ($exists) {
                return response()->json([
                    'message' => 'Asset sudah terdaftar pada Store lain.'
                ], 409);
            }

            // Pre-load all assets in a single query to prevent N+1 queries
            $assets = MasterAsset::whereIn('id', $assetIds)->get()->keyBy('id');

            foreach ($assetIds as $assetId) {
                StoreAssetMapping::create([
                    'store_id'   => $store['id'],
                    'store_code' => $store['code'],
                    'store_name' => $store['name'],
                    'asset_id'   => $assetId,
                    'created_by' => Auth::id(),
                ]);

                $asset = $assets->get($assetId);
                if ($asset) {
                    $this->writeLog($request, 'store_package', "Asset {$asset->asset_name} ditambahkan ke Store {$store['name']}");
                }
            }

            DB::commit();
            return $this->successResponse(null, 'Store Package berhasil dibuat');
        } catch (\Exception $e) {
            DB::rollBack();
            return $this->errorResponse('Terjadi kesalahan: ' . $e->getMessage(), 500);
        }
    }

    /**
     * PUT /api/store-packages/{store_code}
     */
    public function update(Request $request, $storeCode)
    {
        $validator = Validator::make($request->all(), [
            'asset_ids'   => 'required|array',
            'asset_ids.*' => 'integer|exists:master_assets,id',
        ]);

        if ($validator->fails()) {
            return $this->errorResponse($validator->errors()->first(), 422);
        }

        $store = $this->storeService->getStoreByCode($storeCode);
        if (!$store) {
            return $this->notFoundResponse('Store tidak ditemukan');
        }

        $incomingAssetIds = $request->input('asset_ids');

        DB::beginTransaction();
        try {
            $currentAssetIds = StoreAssetMapping::where('store_code', $storeCode)
                ->pluck('asset_id')
                ->toArray();

            $toAdd = array_diff($incomingAssetIds, $currentAssetIds);
            $toRemove = array_diff($currentAssetIds, $incomingAssetIds);

            // Check if any added asset is already assigned to another store
            if (!empty($toAdd)) {
                $exists = StoreAssetMapping::whereIn('asset_id', $toAdd)
                    ->where('store_code', '!=', $storeCode)
                    ->first();

                if ($exists) {
                    return response()->json([
                        'message' => 'Asset sudah terdaftar pada Store lain.'
                    ], 409);
                }
            }

            // Pre-load all affected assets in a single query to prevent N+1 queries
            $affectedAssetIds = array_unique(array_merge($toAdd, $toRemove));
            $assets = MasterAsset::whereIn('id', $affectedAssetIds)->get()->keyBy('id');

            // Remove deselected mappings in a single bulk query
            if (!empty($toRemove)) {
                StoreAssetMapping::where('store_code', $storeCode)
                    ->whereIn('asset_id', $toRemove)
                    ->delete();

                foreach ($toRemove as $assetId) {
                    $asset = $assets->get($assetId);
                    if ($asset) {
                        $this->writeLog($request, 'store_package', "Asset {$asset->asset_name} dilepas dari Store {$store['name']}");
                    }
                }
            }

            // Add new mappings
            if (!empty($toAdd)) {
                foreach ($toAdd as $assetId) {
                    StoreAssetMapping::create([
                        'store_id'   => $store['id'],
                        'store_code' => $store['code'],
                        'store_name' => $store['name'],
                        'asset_id'   => $assetId,
                        'updated_by' => Auth::id(),
                    ]);

                    $asset = $assets->get($assetId);
                    if ($asset) {
                        $this->writeLog($request, 'store_package', "Asset {$asset->asset_name} ditambahkan ke Store {$store['name']}");
                    }
                }
            }

            DB::commit();
            return $this->successResponse(null, 'Store Package berhasil diperbarui');
        } catch (\Exception $e) {
            DB::rollBack();
            return $this->errorResponse('Terjadi kesalahan: ' . $e->getMessage(), 500);
        }
    }

    /**
     * DELETE /api/store-packages/{store_code}
     */
    public function destroy(Request $request, $storeCode)
    {
        try {
            $store = $this->storeService->getStoreByCode($storeCode);
            $storeName = $store ? $store['name'] : $storeCode;

            DB::beginTransaction();
            StoreAssetMapping::where('store_code', $storeCode)->delete();
            
            $this->writeLog($request, 'store_package', "Store Package {$storeName} dibersihkan");
            DB::commit();

            return $this->successResponse(null, 'Store Package berhasil dibersihkan');
        } catch (\Exception $e) {
            DB::rollBack();
            return $this->errorResponse('Terjadi kesalahan: ' . $e->getMessage(), 500);
        }
    }

    private function writeLog(Request $request, string $activity, string $description): void
    {
        Log::create([
            'user_id'     => Auth::id() ?? $request->user()?->id,
            'activity'    => $activity,
            'description' => $description,
            'ip_address'  => $request->ip(),
            'user_agent'  => $request->userAgent(),
        ]);
    }
}
