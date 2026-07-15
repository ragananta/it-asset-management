<?php

namespace App\Http\Controllers;

use App\Models\MasterAsset;
use App\Traits\ApiResponse;
use App\Http\Resources\SatsBagsResource;
use App\Http\Resources\SatsBagDetailResource;
use App\Http\Resources\SatsStoreResource;
use App\Http\Resources\SatsStorePackageResource;
use App\Http\Resources\SatsAssetLookupResource;
use Illuminate\Http\Request;
use Illuminate\Http\JsonResponse;

class SatsIntegrationController extends Controller
{
    use ApiResponse;

    /**
     * GET /api/integrations/sats/ploting-devices
     */
    public function plotingDevices(Request $request): JsonResponse
    {
        $categoryId = \Illuminate\Support\Facades\Cache::remember(
            'category:cat-tas:id',
            86400,
            fn() => \App\Models\Category::where('code', 'CAT-TAS')->value('id')
        );

        $query = \App\Models\MasterAsset::where('category_id', $categoryId)
            ->with(['containedAssets' => function ($q) {
                $q->select('id', 'parent_id', 'asset_code', 'asset_name', 'condition_status');
            }]);

        if ($request->filled('store_id')) {
            $query->where('store_id', $request->store_id);
        }

        if ($request->filled('search')) {
            $search = $request->search;
            $query->where(function ($q) use ($search) {
                $q->where('asset_code', 'like', "%{$search}%")
                  ->orWhere('asset_name', 'like', "%{$search}%")
                  ->orWhere('store_name', 'like', "%{$search}%");
            });
        }

        $perPage = $request->get('per_page', 15);
        $bags = $query->paginate($perPage);

        $transformedItems = $bags->map(function ($bag) {
            $logicalStatus = 'available';
            if ($bag->condition_status === 'under_maintenance') {
                $logicalStatus = 'maintenance';
            } elseif ($bag->status === 'borrowed') {
                $logicalStatus = 'borrowed';
            } elseif ($bag->status === 'disposed') {
                $logicalStatus = 'lost';
            }

            return [
                'barcode'    => $bag->asset_code,
                'name'       => $bag->asset_name,
                'store_name' => $bag->store_name ?? '-',
                'status'     => $logicalStatus,
                'assets'     => $bag->containedAssets->map(function ($child) {
                    return [
                        'asset_code' => $child->asset_code,
                        'asset_name' => $child->asset_name,
                        'condition'  => $child->condition_status ?? '-',
                    ];
                })->values()->toArray(),
            ];
        });

        $paginated = [
            'current_page' => $bags->currentPage(),
            'data'         => $transformedItems,
            'first_page_url' => $bags->url(1),
            'from'         => $bags->firstItem(),
            'last_page'    => $bags->lastPage(),
            'last_page_url' => $bags->url($bags->lastPage()),
            'links'        => $bags->linkCollection(),
            'next_page_url' => $bags->nextPageUrl(),
            'path'         => $bags->path(),
            'per_page'     => $bags->perPage(),
            'prev_page_url' => $bags->previousPageUrl(),
            'to'           => $bags->lastItem(),
            'total'        => $bags->total(),
        ];

        return $this->successResponse($paginated, 'Ploting devices retrieved successfully.');
    }

    /**
     * GET /api/integrations/sats/ploting-devices/scan/{asset_code}
     */
    public function scanPlotingDevice(Request $request, $assetCode): JsonResponse
    {
        $originalResponse = app(PlotingDeviceController::class)->scan($assetCode);
        if ($originalResponse->getStatusCode() !== 200) {
            return $originalResponse;
        }

        $originalData = $originalResponse->getData(true);

        $bagData = (object) [
            'asset_code'      => $originalData['asset_code'] ?? '',
            'asset_name'      => $originalData['nama_tas'] ?? '',
            'store_name'      => $originalData['nama_store'] ?? '-',
            'containedAssets' => collect($originalData['detail_asset'] ?? [])->map(fn($child) => (object) [
                'asset_code'       => $child['asset_code'] ?? '',
                'asset_name'       => $child['asset_name'] ?? '',
                'condition_status' => $child['condition'] ?? '-',
            ]),
        ];

        $resource = new SatsBagDetailResource($bagData);

        return $this->successResponse($resource->toArray($request), 'Ploting device details scanned successfully.');
    }

    /**
     * GET /api/integrations/sats/stores
     */
    public function stores(Request $request): JsonResponse
    {
        $originalResponse = app(PlotingDeviceController::class)->storeOptions();
        if ($originalResponse->getStatusCode() !== 200) {
            return $originalResponse;
        }

        $originalData = $originalResponse->getData(true);
        $options = $originalData['data'] ?? [];

        $transformed = collect($options)->map(function ($store) use ($request) {
            $resource = new SatsStoreResource($store);
            return $resource->toArray($request);
        })->toArray();

        return $this->successResponse($transformed, 'Stores retrieved successfully.');
    }

    /**
     * GET /api/integrations/sats/store-packages/{store_code}
     */
    public function storePackage(Request $request, $storeCode): JsonResponse
    {
        $originalResponse = app(StorePackageController::class)->show($storeCode);
        if ($originalResponse->getStatusCode() !== 200) {
            return $originalResponse;
        }

        $originalData = $originalResponse->getData(true);
        $packageData = $originalData['data'] ?? [];

        $resource = new SatsStorePackageResource($packageData);

        return $this->successResponse($resource->toArray($request), 'Store package details retrieved successfully.');
    }

    /**
     * GET /api/integrations/sats/assets/lookup/{asset_code}
     */
    public function assetLookup(Request $request, $assetCode): JsonResponse
    {
        $asset = MasterAsset::where('asset_code', $assetCode)->with('category:id,code')->first();
        if (!$asset) {
            return $this->notFoundResponse('Aset tidak ditemukan.');
        }

        $isPackage = ($asset->category && $asset->category->code === 'CAT-TAS');

        $resource = new SatsAssetLookupResource((object) [
            'asset_code'       => $asset->asset_code,
            'asset_name'       => $asset->asset_name,
            'asset_type'       => $isPackage ? 'package' : 'individual',
            'status'           => $asset->status,
            'condition_status' => $asset->condition_status ?? '-',
        ]);

        return $this->successResponse($resource->toArray($request), 'Aset berhasil di-lookup.');
    }
}
