<?php

namespace App\Http\Controllers;

use App\Models\MasterAsset;
use App\Models\AssetContainer;
use App\Models\Log;
use App\Http\Requests\PlotingDeviceRequest;
use App\Traits\ApiResponse;
use Illuminate\Http\Request;
use Illuminate\Support\Str;
use Illuminate\Support\Facades\DB;
use Illuminate\Support\Facades\Cache;

use App\Services\StoreService;

class PlotingDeviceController extends Controller
{
    use ApiResponse;

    protected StoreService $storeService;

    public function __construct(StoreService $storeService)
    {
        $this->storeService = $storeService;
    }

    public function storeOptions()
    {
        try {
            $options = $this->storeService->getStoreOptions();
            return $this->successResponse($options, 'Store options berhasil diambil');
        } catch (\Exception $e) {
            return $this->errorResponse('Gagal mengambil store options: ' . $e->getMessage(), 500);
        }
    }

    public function scan($assetCode)
    {
        try {
            $asset = MasterAsset::where('asset_code', $assetCode)->first();

            if (!$asset) {
                return response()->json([
                    'message' => 'Asset Package tidak ditemukan.'
                ], 404);
            }

            // Load category
            $asset->load('category');

            if (!$asset->category || $asset->category->code !== 'CAT-TAS') {
                return response()->json([
                    'message' => 'Asset bukan Asset Package.'
                ], 400);
            }

            // Eager load child assets and their categories to prevent N+1 query performance issues
            $asset->load(['containedAssets.category']);

            $detailAsset = $asset->containedAssets->map(function ($child) {
                return [
                    'asset_code' => $child->asset_code,
                    'asset_name' => $child->asset_name,
                    'category'   => $child->category?->name ?? '-',
                    'condition'  => $child->condition_status ?? '-',
                ];
            })->values()->toArray();

            $data = [
                'id_tas'       => $asset->id,
                'asset_code'   => $asset->asset_code,
                'nama_tas'     => $asset->asset_name,
                'nama_store'   => $asset->store_name ?? '-',
                'status'       => $asset->status,
                'total_asset'  => count($detailAsset),
                'detail_asset' => $detailAsset,
            ];

            return response()->json($data, 200);
        } catch (\Exception $e) {
            return response()->json([
                'message' => 'Terjadi kesalahan: ' . $e->getMessage()
            ], 500);
        }
    }

    public function index(Request $request)
    {
        try {
            $categoryId = Cache::remember(
                'category:cat-tas:id',
                86400,
                fn() => \App\Models\Category::where('code', 'CAT-TAS')->value('id')
            );

            $query = MasterAsset::where('category_id', $categoryId)->withCount('containedAssets');

            if ($request->filled('store_id')) {
                $query->where('store_id', $request->store_id);
            }

            if ($request->filled('search')) {
                $search = $request->search;
                $query->where(function ($q) use ($search) {
                    $q->where('asset_code', 'like', "%{$search}%")
                      ->orWhere('asset_name', 'like', "%{$search}%")
                      ->orWhere('brand', 'like', "%{$search}%")
                      ->orWhere('model', 'like', "%{$search}%");
                });
            }

            if ($request->filled('status')) {
                $status = $request->status;
                if ($status === 'available') {
                    $query->where('status', 'active')->where('condition_status', '!=', 'under_maintenance');
                } elseif ($status === 'borrowed') {
                    $query->where('status', 'borrowed');
                } elseif ($status === 'maintenance') {
                    $query->where('condition_status', 'under_maintenance');
                } elseif ($status === 'lost') {
                    $query->where('status', 'disposed');
                }
            }

            $sortBy = $request->get('sort_by', 'created_at');
            $sortOrder = strtolower($request->get('sort_order', 'desc')) === 'asc' ? 'asc' : 'desc';
            $allowedSorts = ['asset_code', 'asset_name', 'status', 'created_at'];

            // Map sort_by from code/name to database columns if needed
            if ($sortBy === 'code') {
                $sortBy = 'asset_code';
            } elseif ($sortBy === 'name') {
                $sortBy = 'asset_name';
            }

            if (in_array($sortBy, $allowedSorts)) {
                $query->orderBy($sortBy, $sortOrder);
            } else {
                $query->orderBy('created_at', 'desc');
            }

            $perPage = min((int) $request->get('per_page', 15), 100);
            
            $data = $query->paginate($perPage)->through(function ($asset) {
                $logicalStatus = 'available';
                if ($asset->condition_status === 'under_maintenance') {
                    $logicalStatus = 'maintenance';
                } elseif ($asset->status === 'borrowed') {
                    $logicalStatus = 'borrowed';
                } elseif ($asset->status === 'disposed') {
                    $logicalStatus = 'lost';
                }

                return [
                    'id'           => $asset->id,
                    'code'         => $asset->asset_code,
                    'name'         => $asset->asset_name,
                    'store_id'     => $asset->store_id,
                    'store_name'   => $asset->store_name ?? '-',
                    'status'       => $logicalStatus,
                    'assets_count' => $asset->contained_assets_count,
                    'created_at'   => $asset->created_at->toISOString(),
                ];
            });

            return $this->successResponse($data, 'Data ploting device berhasil diambil');
        } catch (\Exception $e) {
            return $this->errorResponse('Terjadi kesalahan: ' . $e->getMessage(), 500);
        }
    }

    public function show($id)
    {
        try {
            $cacheKey = "ploting-device:detail:{$id}";
            
            // Track the cache key
            $keys = Cache::get('assets:cache_keys', []);
            if (!in_array($cacheKey, $keys)) {
                $keys[] = $cacheKey;
                Cache::put('assets:cache_keys', $keys, 86400);
            }

            $data = Cache::remember($cacheKey, 600, function () use ($id) {
                $asset = MasterAsset::with([
                    'category',
                    'containedAssets.category',
                    'activeAssignment',
                    'maintenanceLogs' => fn($q) => $q->orderByDesc('date'),
                ])->find($id);

                if (!$asset || !$asset->category || $asset->category->code !== 'CAT-TAS') {
                    return null;
                }

                $logicalStatus = 'available';
                if ($asset->condition_status === 'under_maintenance') {
                    $logicalStatus = 'maintenance';
                } elseif ($asset->status === 'borrowed') {
                    $logicalStatus = 'borrowed';
                } elseif ($asset->status === 'disposed') {
                    $logicalStatus = 'lost';
                }

                // Fetch membership history (Spatie Activity Logs for ADD_ASSET and REMOVE_ASSET)
                $activities = \Spatie\Activitylog\Models\Activity::where('subject_type', MasterAsset::class)
                    ->where('subject_id', $id)
                    ->whereIn('event', ['ADD_ASSET', 'REMOVE_ASSET'])
                    ->orderBy('created_at', 'desc')
                    ->get();

                $membershipHistory = $activities->map(function ($act) {
                    return [
                        'event'      => $act->event,
                        'asset_code' => $act->properties['asset_code'] ?? '-',
                        'asset_name' => $act->properties['asset_name'] ?? '-',
                        'created_at' => $act->created_at->format('Y-m-d H:i:s'),
                    ];
                })->toArray();

                return [
                    'id'                => $asset->id,
                    'code'              => $asset->asset_code,
                    'name'              => $asset->asset_name,
                    'store_id'          => $asset->store_id,
                    'store_name'        => $asset->store_name ?? '-',
                    'description'       => $asset->note ?? '',
                    'status'            => $logicalStatus,
                    'borrowed_by'       => $asset->activeAssignment?->user_name,
                    'borrowed_at'       => $asset->activeAssignment?->assign_date?->toISOString(),
                    'created_at'        => $asset->created_at->toISOString(),
                    'assets'            => $asset->containedAssets->map(fn($a) => [
                        'id'               => $a->id,
                        'asset_code'       => $a->asset_code,
                        'asset_name'       => $a->asset_name,
                        'brand'            => $a->brand,
                        'model'            => $a->model,
                        'serial_number'    => $a->serial_number,
                        'condition_status' => $a->condition_status,
                        'status'           => $a->status,
                        'category'         => $a->category ? ['id' => $a->category->id, 'name' => $a->category->name] : null,
                    ])->toArray(),
                    'assignments'       => [],
                    'maintenance_logs'  => $asset->maintenanceLogs->map(fn($m) => [
                        'id'          => $m->id,
                        'date'        => $m->date instanceof \DateTimeInterface ? $m->date->format('Y-m-d') : $m->date,
                        'description' => $m->description,
                        'pic'         => $m->pic,
                        'status'      => $m->status,
                        'cost'        => $m->cost,
                    ])->toArray(),
                    'audit_logs'        => [],
                    'membership_history'=> $membershipHistory,
                ];
            });

            if (!$data) {
                return $this->notFoundResponse('Tas tidak ditemukan');
            }

            return $this->successResponse($data, 'Detail ploting device berhasil diambil');
        } catch (\Exception $e) {
            return $this->errorResponse('Terjadi kesalahan: ' . $e->getMessage(), 500);
        }
    }

    public function timeline(Request $request, $id)
    {
        try {
            $asset = MasterAsset::find($id);

            if (!$asset || !$asset->category || $asset->category->code !== 'CAT-TAS') {
                return $this->notFoundResponse('Tas tidak ditemukan');
            }

            $type    = $request->get('type', 'all');
            $search  = Str::lower((string) $request->get('search', ''));
            $sort    = strtolower($request->get('sort', 'desc')) === 'asc' ? 'asc' : 'desc';
            $perPage = min(max($request->integer('per_page', 20), 1), 100);
            $page    = max($request->integer('page', 1), 1);

            $events = collect();

            // 1. Tas Created
            $events->push([
                'id'             => "tas-created-{$asset->id}",
                'event_type'     => 'asset_created',
                'category'       => 'asset_in',
                'category_label' => 'Tas Masuk',
                'title'          => 'Tas Terdaftar',
                'description'    => "Tas {$asset->asset_name} ({$asset->asset_code}) terdaftar di sistem",
                'created_at'     => optional($asset->created_at)->toISOString(),
            ]);

            // 2. Tas Assignments
            $asset->assignments()->latest()->get()->each(function ($assign) use ($events) {
                $events->push([
                    'id'             => "tas-assigned-{$assign->id}",
                    'event_type'     => 'asset_assigned',
                    'category'       => 'assignment',
                    'category_label' => 'Peminjaman',
                    'title'          => "Tas dipinjam oleh {$assign->user_name}",
                    'description'    => $assign->note ?? 'Peminjaman Tas',
                    'created_at'     => optional($assign->created_at)->toISOString(),
                    'details'        => [
                        'User' => $assign->user_name,
                        'Tanggal Pinjam' => optional($assign->assign_date)->format('d M Y'),
                    ]
                ]);

                if ($assign->return_date) {
                    $events->push([
                        'id'             => "tas-returned-{$assign->id}",
                        'event_type'     => 'asset_returned',
                        'category'       => 'returned',
                        'category_label' => 'Pengembalian',
                        'title'          => "Tas dikembalikan oleh {$assign->user_name}",
                        'description'    => $assign->note ?? 'Pengembalian Tas',
                        'created_at'     => optional($assign->updated_at ?? $assign->created_at)->toISOString(),
                        'details'        => [
                            'User' => $assign->user_name,
                            'Tanggal Kembali' => optional($assign->return_date)->format('d M Y'),
                        ]
                    ]);
                }
            });

            // 3. Tas Maintenance
            $asset->maintenanceLogs()->latest()->get()->each(function ($maint) use ($events) {
                $isCompleted = $maint->status === 'completed';
                $events->push([
                    'id'             => "tas-maint-{$maint->id}",
                    'event_type'     => $isCompleted ? 'maintenance_completed' : 'maintenance_started',
                    'category'       => 'maintenance',
                    'category_label' => 'Maintenance Tas',
                    'title'          => $isCompleted ? 'Maintenance Tas Selesai' : 'Maintenance Tas Dimulai',
                    'description'    => $maint->description,
                    'created_at'     => optional($maint->created_at)->toISOString(),
                    'details'        => [
                        'Teknisi' => $maint->pic,
                        'Status' => $isCompleted ? 'Selesai' : 'Berlangsung',
                    ]
                ]);
            });

            // 4. Tas Audit Logs
            $asset->auditLogs()->latest()->get()->each(function ($audit) use ($events) {
                $events->push([
                    'id'             => "tas-audit-{$audit->id}",
                    'event_type'     => 'audit_log',
                    'category'       => 'audit',
                    'category_label' => 'Audit Log Tas',
                    'title'          => 'Audit Log Tas',
                    'description'    => $audit->description,
                    'created_at'     => optional($audit->created_at)->toISOString(),
                    'details'        => [
                        'Aksi' => $audit->action,
                        'PIC' => $audit->pic,
                    ]
                ]);
            });

            // 5. Children Assets' logs
            $childIds = $asset->containedAssets()->pluck('master_assets.id')->toArray();
            if (!empty($childIds)) {
                \App\Models\AuditLog::with('asset')
                    ->whereIn('asset_id', $childIds)
                    ->get()
                    ->each(function ($audit) use ($events) {
                        $events->push([
                            'id'             => "child-audit-{$audit->id}",
                            'event_type'     => 'audit_log',
                            'category'       => 'audit',
                            'category_label' => 'Audit Log Aset',
                            'title'          => "Aktivitas Aset: {$audit->asset?->asset_code}",
                            'description'    => "{$audit->asset?->asset_name}: {$audit->description}",
                            'created_at'     => optional($audit->created_at)->toISOString(),
                            'details'        => [
                                'Aset' => $audit->asset?->asset_code,
                                'Aksi' => $audit->action,
                                'PIC' => $audit->pic,
                            ]
                        ]);
                    });

                \App\Models\MaintenanceLog::with('asset')
                    ->whereIn('asset_id', $childIds)
                    ->get()
                    ->each(function ($maint) use ($events) {
                        $isCompleted = $maint->status === 'completed';
                        $events->push([
                            'id'             => "child-maint-{$maint->id}",
                            'event_type'     => $isCompleted ? 'maintenance_completed' : 'maintenance_started',
                            'category'       => 'maintenance',
                            'category_label' => 'Maintenance Aset',
                            'title'          => "Perbaikan Aset: {$maint->asset?->asset_code}",
                            'description'    => "{$maint->asset?->asset_name}: {$maint->description}",
                            'created_at'     => optional($maint->created_at)->toISOString(),
                            'details'        => [
                                'Aset' => $maint->asset?->asset_code,
                                'PIC' => $maint->pic,
                                'Status' => $isCompleted ? 'Selesai' : 'Berlangsung',
                            ]
                        ]);
                    });
            }

            $filtered = $events
                ->when($type !== 'all', fn($c) => $c->filter(fn($e) => $e['category'] === $type))
                ->when($search !== '', fn($c) => $c->filter(
                    fn($e) => Str::contains(Str::lower(json_encode($e)), $search)
                ))
                ->sortBy('created_at', SORT_REGULAR, $sort === 'desc')
                ->values();

            $total = $filtered->count();
            $paged = $filtered->forPage($page, $perPage)->values();

            $monthNames = [
                1 => 'Januari', 2 => 'Februari', 3 => 'Maret',
                4 => 'April',   5 => 'Mei',       6 => 'Juni',
                7 => 'Juli',    8 => 'Agustus',   9 => 'September',
                10 => 'Oktober',11 => 'November', 12 => 'Desember',
            ];

            $yearGroups = $paged
                ->groupBy(fn($e) => (int) date('Y', strtotime($e['created_at'])))
                ->map(fn($yearEvents, $year) => [
                    'year'   => (int) $year,
                    'months' => $yearEvents
                        ->groupBy(fn($e) => (int) date('n', strtotime($e['created_at'])))
                        ->map(fn($monthEvents, $monthNumber) => [
                            'month'        => $monthNames[$monthNumber] ?? '-',
                            'month_number' => $monthNumber,
                            'events'       => $monthEvents->values(),
                        ])
                        ->sortByDesc('month_number')
                        ->values(),
                ])
                ->sortByDesc('year')
                ->values();

            return $this->successResponse([
                'year_groups' => $yearGroups,
                'meta'        => [
                    'page'      => $page,
                    'per_page'  => $perPage,
                    'total'     => $total,
                    'last_page' => (int) ceil($total / $perPage),
                    'sort'      => $sort,
                    'type'      => $type,
                    'search'    => $search,
                ],
            ], 'Timeline package berhasil diambil');

        } catch (\Exception $e) {
            return $this->errorResponse('Terjadi kesalahan: ' . $e->getMessage(), 500);
        }
    }

    public function store(PlotingDeviceRequest $request)
    {
        DB::beginTransaction();
        try {
            $containerId = $request->container_asset_id;
            $assetIds = $request->input('asset_ids', []);

            // Resolve store name from POS API using StoreService
            $storeId = $request->input('store_id');
            $storeName = null;

            if ($storeId) {
                $storeName = $this->storeService->getStoreNameById((int) $storeId);
                if (!$storeName) {
                    return $this->errorResponse('Store tidak valid atau tidak ditemukan di POS API', 422);
                }
            }

            $tas = MasterAsset::find($containerId);
            if (!$tas) {
                return $this->notFoundResponse('Tas tidak ditemukan');
            }

            // Save store snapshot properties
            $tas->update([
                'store_id'   => $storeId ? (int) $storeId : null,
                'store_name' => $storeName,
            ]);

            // Delete existing mapping for this container Tas
            AssetContainer::where('container_asset_id', $containerId)->delete();

            // Pre-load all child assets in a single query to prevent N+1 query loops
            $children = MasterAsset::whereIn('id', $assetIds)->get()->keyBy('id');

            // Insert new mappings & write activity logs
            foreach ($assetIds as $assetId) {
                AssetContainer::create([
                    'container_asset_id' => $containerId,
                    'contained_asset_id' => $assetId,
                ]);

                $child = $children->get($assetId);
                if ($child) {
                    activity()
                        ->performedOn($tas)
                        ->event('ADD_ASSET')
                        ->withProperties([
                            'asset_id'   => $child->id,
                            'asset_code' => $child->asset_code,
                            'asset_name' => $child->asset_name,
                        ])
                        ->causedBy($request->user() ?? auth()->user())
                        ->log("Aset ditambahkan ke Tas");
                }
            }

            DB::commit();

            $this->clearCache();
            $tas = MasterAsset::with('containedAssets')->find($containerId);
            $this->writeLog($request, 'create_data', "Ploting Device mapping untuk Tas '{$tas->asset_name}' ({$tas->asset_code}) berhasil disimpan");

            return $this->createdResponse([
                'id'         => $tas->id,
                'code'       => $tas->asset_code,
                'name'       => $tas->asset_name,
                'store_id'   => $tas->store_id,
                'store_name' => $tas->store_name ?? '-',
                'assets'     => $tas->containedAssets,
            ], 'Ploting device berhasil ditambahkan');
        } catch (\Exception $e) {
            DB::rollBack();
            return $this->errorResponse('Terjadi kesalahan: ' . $e->getMessage(), 500);
        }
    }

    public function update(PlotingDeviceRequest $request, $id)
    {
        DB::beginTransaction();
        try {
            $containerId = $id;
            $assetIds = $request->input('asset_ids', []);

            // Resolve store name from POS API using StoreService
            $storeId = $request->input('store_id');
            $storeName = null;

            if ($storeId) {
                $storeName = $this->storeService->getStoreNameById((int) $storeId);
                if (!$storeName) {
                    return $this->errorResponse('Store tidak valid atau tidak ditemukan di POS API', 422);
                }
            }

            $tas = MasterAsset::find($containerId);
            if (!$tas) {
                return $this->notFoundResponse('Tas tidak ditemukan');
            }

            // Get currently mapped asset IDs for this container Tas to compare changes
            $currentAssetIds = AssetContainer::where('container_asset_id', $containerId)
                ->pluck('contained_asset_id')
                ->toArray();

            // Determine added and removed assets
            $addedAssetIds = array_diff($assetIds, $currentAssetIds);
            $removedAssetIds = array_diff($currentAssetIds, $assetIds);

            // Save store snapshot properties
            $tas->update([
                'store_id'   => $storeId ? (int) $storeId : null,
                'store_name' => $storeName,
            ]);

            // Delete existing mappings
            AssetContainer::where('container_asset_id', $containerId)->delete();

            // Insert new mappings
            foreach ($assetIds as $assetId) {
                AssetContainer::create([
                    'container_asset_id' => $containerId,
                    'contained_asset_id' => $assetId,
                ]);
            }

            // Pre-load all affected assets at once to prevent N+1 query loops
            $affectedAssetIds = array_unique(array_merge($addedAssetIds, $removedAssetIds));
            $children = MasterAsset::whereIn('id', $affectedAssetIds)->get()->keyBy('id');

            // Write ADD_ASSET logs for added assets
            foreach ($addedAssetIds as $assetId) {
                $child = $children->get($assetId);
                if ($child) {
                    activity()
                        ->performedOn($tas)
                        ->event('ADD_ASSET')
                        ->withProperties([
                            'asset_id'   => $child->id,
                            'asset_code' => $child->asset_code,
                            'asset_name' => $child->asset_name,
                        ])
                        ->causedBy($request->user() ?? auth()->user())
                        ->log("Aset ditambahkan ke Tas");
                }
            }

            // Write REMOVE_ASSET logs for removed assets
            foreach ($removedAssetIds as $assetId) {
                $child = $children->get($assetId);
                if ($child) {
                    activity()
                        ->performedOn($tas)
                        ->event('REMOVE_ASSET')
                        ->withProperties([
                            'asset_id'   => $child->id,
                            'asset_code' => $child->asset_code,
                            'asset_name' => $child->asset_name,
                        ])
                        ->causedBy($request->user() ?? auth()->user())
                        ->log("Aset dilepas dari Tas");
                }
            }

            DB::commit();

            $this->clearCache();
            $tas = MasterAsset::with('containedAssets')->find($containerId);
            $this->writeLog($request, 'update_data', "Ploting Device mapping untuk Tas '{$tas->asset_name}' ({$tas->asset_code}) berhasil diperbarui");

            return $this->successResponse([
                'id'         => $tas->id,
                'code'       => $tas->asset_code,
                'name'       => $tas->asset_name,
                'store_id'   => $tas->store_id,
                'store_name' => $tas->store_name ?? '-',
                'assets'     => $tas->containedAssets,
            ], 'Ploting device berhasil diperbarui');
        } catch (\Exception $e) {
            DB::rollBack();
            return $this->errorResponse('Terjadi kesalahan: ' . $e->getMessage(), 500);
        }
    }

    public function destroy(Request $request, $id)
    {
        DB::beginTransaction();
        try {
            $tas = MasterAsset::find($id);
            if (!$tas) {
                DB::rollBack();
                return $this->notFoundResponse('Tas tidak ditemukan');
            }

            // Detach contained child assets from this container (never delete the assets themselves)
            AssetContainer::where('container_asset_id', $id)->delete();

            // Clear store assignment on this container asset
            $tas->update([
                'store_id' => null,
                'store_name' => null,
            ]);

            $this->clearCache();
            $this->writeLog($request, 'delete_data', "Ploting Device mapping untuk Tas '{$tas->asset_name}' ({$tas->asset_code}) berhasil dihapus");

            DB::commit();
            return $this->successResponse(null, 'Ploting device berhasil dihapus');
        } catch (\Exception $e) {
            DB::rollBack();
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

    private function clearCache(): void
    {
        $keys = Cache::get('assets:cache_keys', []);
        foreach ($keys as $key) {
            Cache::forget($key);
        }
        Cache::forget('assets:cache_keys');

        $optKeys = Cache::get('assets:option_keys', []);
        foreach ($optKeys as $key) {
            Cache::forget($key);
        }
        Cache::forget('assets:option_keys');

        Cache::forget('dashboard:index');
    }
}
