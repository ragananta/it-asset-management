<?php

namespace App\Http\Controllers;

use App\Models\Asset;
use Illuminate\Http\Request;

class AssetController extends Controller
{
    /**
     * GET /api/assets
     */
    public function index()
    {
        $assets = Asset::with([
            'category',
            'vendor',
            'location',
            'user'
        ])->latest()->get();

        return response()->json([
            'message' => 'List of assets',
            'data' => $assets
        ], 200);
    }

    /**
     * GET /api/assets/{id}
     */
    public function show($id)
    {
        $asset = Asset::with([
            'category',
            'vendor',
            'location',
            'user'
        ])->find($id);

        if (!$asset) {
            return response()->json([
                'message' => 'Asset not found'
            ], 404);
        }

        return response()->json([
            'message' => 'Detail asset',
            'data' => $asset
        ], 200);
    }

    /**
     * POST /api/assets
     */
    public function store(Request $request)
    {
        $request->validate([
            'asset_name' => 'required|string|max:255',

            'category_id' => 'required|exists:master_categories,id',
            'vendor_id' => 'required|exists:master_vendors,id',
            'location_id' => 'required|exists:master_locations,id',
            'assigned_user_id' => 'required|exists:master_users,id',

            'brand' => 'nullable|string|max:255',
            'model' => 'nullable|string|max:255',
            'serial_number' => 'nullable|string|max:255',

            'purchase_date' => 'nullable|date',
            'purchase_price' => 'nullable|numeric|min:0',
            'current_value' => 'nullable|numeric|min:0',

            'warranty_expiry' => 'nullable|date|after_or_equal:purchase_date',

            'condition_status' => 'nullable|string|max:255',
            'lifecycle_status' => 'nullable|string|max:255',
            'notes' => 'nullable|string',
        ]);

        // 🔥 VALIDASI HARGA
        if ($request->purchase_price && $request->current_value) {
            if ($request->current_value > $request->purchase_price) {
                return response()->json([
                    'message' => 'Current value cannot be greater than purchase price'
                ], 422);
            }
        }

        $purchase = $request->purchase_price;
        $current  = $request->current_value ?? $purchase;

        $depreciation = null;
        if ($purchase && $current) {
            $depreciation = $purchase - $current;
        }

        $asset = Asset::create([
            'asset_code' => 'AST-' . strtoupper(uniqid()),
            'asset_name' => $request->asset_name,

            'category_id' => $request->category_id,
            'vendor_id' => $request->vendor_id,
            'location_id' => $request->location_id,
            'assigned_user_id' => $request->assigned_user_id,

            'brand' => $request->brand,
            'model' => $request->model,
            'serial_number' => $request->serial_number,

            'purchase_date' => $request->purchase_date,
            'purchase_price' => $purchase,
            'current_value' => $current,
            'depreciation_value' => $depreciation,

            'warranty_expiry' => $request->warranty_expiry,

            'condition_status' => $request->condition_status ?? 'Good',
            'lifecycle_status' => $request->lifecycle_status ?? 'Active',

            'notes' => $request->notes,
        ]);

        return response()->json([
            'message' => 'Asset created successfully',
            'data' => $asset
        ], 201);
    }

    /**
     * PUT /api/assets/{id}
     */
    public function update(Request $request, $id)
    {
        $asset = Asset::find($id);

        if (!$asset) {
            return response()->json([
                'message' => 'Asset not found'
            ], 404);
        }

        $request->validate([
            'asset_name' => 'sometimes|string|max:255',

            'category_id' => 'nullable|exists:master_categories,id',
            'vendor_id' => 'nullable|exists:master_vendors,id',
            'location_id' => 'nullable|exists:master_locations,id',
            'assigned_user_id' => 'nullable|exists:master_users,id',

            'brand' => 'nullable|string|max:255',
            'model' => 'nullable|string|max:255',
            'serial_number' => 'nullable|string|max:255',

            'purchase_date' => 'nullable|date',
            'purchase_price' => 'nullable|numeric|min:0',
            'current_value' => 'nullable|numeric|min:0',

            'warranty_expiry' => 'nullable|date|after_or_equal:purchase_date',

            'condition_status' => 'nullable|string|max:255',
            'lifecycle_status' => 'nullable|string|max:255',
            'notes' => 'nullable|string',
        ]);

        $purchase = $request->purchase_price ?? $asset->purchase_price;
        $current  = $request->current_value ?? $asset->current_value;

        if ($purchase && $current && $current > $purchase) {
            return response()->json([
                'message' => 'Current value cannot be greater than purchase price'
            ], 422);
        }

        $asset->update([
            'asset_name' => $request->asset_name ?? $asset->asset_name,
            'category_id' => $request->category_id ?? $asset->category_id,
            'vendor_id' => $request->vendor_id ?? $asset->vendor_id,
            'location_id' => $request->location_id ?? $asset->location_id,
            'assigned_user_id' => $request->assigned_user_id ?? $asset->assigned_user_id,

            'brand' => $request->brand ?? $asset->brand,
            'model' => $request->model ?? $asset->model,
            'serial_number' => $request->serial_number ?? $asset->serial_number,

            'purchase_date' => $request->purchase_date ?? $asset->purchase_date,
            'purchase_price' => $purchase,
            'current_value' => $current,
            'depreciation_value' => $purchase && $current ? $purchase - $current : null,

            'warranty_expiry' => $request->warranty_expiry ?? $asset->warranty_expiry,

            'condition_status' => $request->condition_status ?? $asset->condition_status,
            'lifecycle_status' => $request->lifecycle_status ?? $asset->lifecycle_status,

            'notes' => $request->notes ?? $asset->notes,
        ]);

        return response()->json([
            'message' => 'Asset updated successfully',
            'data' => $asset
        ], 200);
    }

    /**
     * DELETE /api/assets/{id}
     */
    public function destroy($id)
    {
        $asset = Asset::find($id);

        if (!$asset) {
            return response()->json([
                'message' => 'Asset not found'
            ], 404);
        }

        $asset->delete();

        return response()->json([
            'message' => 'Asset deleted successfully'
        ], 200);
    }
}