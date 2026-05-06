<?php

namespace App\Http\Controllers;

use App\Models\Asset;
use App\Models\Category;
use App\Models\Vendor;
use App\Models\Location; // 🔥 TAMBAH
use App\Models\MasterUser;
use Carbon\Carbon;

class DashboardController extends Controller
{
    public function index()
    {
        // 🔢 TOTAL DATA (MASTER)
        $totalAssets = Asset::count();
        $totalCategories = Category::count();
        $totalVendors = Vendor::count();
        $totalUsers = MasterUser::count();
        $totalLocations = Location::count(); // 🔥 TAMBAH

        // 📊 ASSET PER CATEGORY
        $assetsByCategory = Asset::with('category')
            ->get()
            ->groupBy(fn($item) => $item->category->category_name ?? 'Unknown')
            ->map(fn($items) => count($items));

        // 📊 ASSET PER CONDITION
        $assetsByCondition = Asset::select('condition_status')
            ->get()
            ->groupBy('condition_status')
            ->map(fn($items) => count($items));

        // 🗺️ ASSET PER LOCATION
        $assetsByLocation = Asset::with('location')
            ->get()
            ->groupBy(fn($item) => $item->location->location_name ?? 'Unknown')
            ->map(fn($items) => count($items));

        // 🔔 ASSET HAMPIR EXPIRED (30 HARI)
        $expiringAssets = Asset::whereNotNull('warranty_expiry')
            ->whereBetween('warranty_expiry', [
                Carbon::now(),
                Carbon::now()->addDays(30)
            ])
            ->get()
            ->map(function ($asset) {

                $daysRemaining = Carbon::now()->diffInDays($asset->warranty_expiry, false);

                $asset->days_remaining = $daysRemaining;

                // 🔥 STATUS LABEL
                if ($daysRemaining <= 7) {
                    $asset->status_label = 'critical';
                } elseif ($daysRemaining <= 30) {
                    $asset->status_label = 'warning';
                } else {
                    $asset->status_label = 'safe';
                }

                return $asset;
            })
            ->sortBy('warranty_expiry')
            ->values();

        // 📊 RECENT ASSETS (RELATION INCLUDED 🔥)
        $recentAssets = Asset::with(['category', 'vendor', 'user'])
            ->latest()
            ->take(5)
            ->get();

        return response()->json([
            'message' => 'Dashboard data',
            'data' => [

                // 🔷 SUMMARY (MASTER DATA)
                'summary' => [
                    'assets' => $totalAssets,
                    'categories' => $totalCategories,
                    'vendors' => $totalVendors,
                    'users' => $totalUsers,
                    'locations' => $totalLocations, // 🔥 TAMBAH
                ],

                // 🔷 CHART DATA
                'charts' => [
                    'assets_by_category' => $assetsByCategory,
                    'assets_by_condition' => $assetsByCondition,
                    'assets_by_location' => $assetsByLocation,
                ],

                // 🔷 INSIGHT DATA
                'insights' => [
                    'expiring_assets_count' => $expiringAssets->count(),
                    'expiring_assets' => $expiringAssets,
                    'recent_assets' => $recentAssets,
                ]
            ]
        ]);
    }
}