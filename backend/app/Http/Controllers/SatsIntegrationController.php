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
        $originalResponse = app(PlotingDeviceController::class)->index($request);
        if ($originalResponse->getStatusCode() !== 200) {
            return $originalResponse;
        }

        $originalData = $originalResponse->getData(true);
        $paginated = $originalData['data'] ?? [];
        $items = $paginated['data'] ?? [];

        $transformedItems = collect($items)->map(function ($item) use ($request) {
            $resource = new SatsBagsResource((object) [
                'asset_code'       => $item['code'] ?? '',
                'asset_name'       => $item['name'] ?? '',
                'store_name'       => $item['store_name'] ?? '-',
                'status'           => $item['status'] ?? 'available',
                'condition_status' => null, // logical status already resolved
            ]);
            return $resource->toArray($request);
        })->toArray();

        $paginated['data'] = $transformedItems;

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
