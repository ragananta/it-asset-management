<?php

namespace App\Http\Controllers;

use App\Models\MasterAsset;
use App\Models\Category;
use App\Models\User;
use App\Models\Log;
use App\Models\AuditLog;
use App\Models\AssetAssignment;
use App\Models\MaintenanceLog;
use App\Exports\AssetsExport;
use App\Services\AssetCodeGenerator;
use App\Traits\ApiResponse;
use App\Http\Requests\MasterAssetRequest;
use Illuminate\Http\Request;
use Illuminate\Support\Facades\Cache;
use Illuminate\Support\Str;
use Maatwebsite\Excel\Facades\Excel;

class MasterAssetController extends Controller
{
    use ApiResponse;

    public function generateCode(int $categoryId, AssetCodeGenerator $generator)
    {
        try {
            return response()->json([
                'code' => $generator->generateForCategory($categoryId),
            ]);
        } catch (\Exception $e) {
            return $this->errorResponse($e->getMessage(), 404);
        }
    }

    public function lookup($assetCode)
    {
        try {
            $asset = MasterAsset::where('asset_code', $assetCode)
                ->with('category:id,code')
                ->first();

            if (!$asset) {
                return $this->notFoundResponse('Aset tidak ditemukan');
            }

            $isPackage = ($asset->category && $asset->category->code === 'CAT-TAS');
            $redirectUrl = $isPackage ? "/ploting-devices/{$asset->id}" : "/assets/{$asset->id}";

            return $this->successResponse([
                'id'           => $asset->id,
                'asset_code'   => $asset->asset_code,
                'asset_type'   => $isPackage ? 'package' : 'individual',
                'redirect_url' => $redirectUrl,
            ], 'Aset berhasil di-lookup');
        } catch (\Exception $e) {
            return $this->errorResponse('Terjadi kesalahan: ' . $e->getMessage(), 500);
        }
    }

    public function index(Request $request)
    {
        try {
            // mode=options untuk dropdown di frontend
            if ($request->get('mode') === 'options') {
                $cacheKey = 'assets:options:' . md5($request->fullUrl());
                $data = Cache::remember($cacheKey, now()->addMinutes(5), function () use ($cacheKey, $request) {
                    $keys = Cache::get('assets:option_keys', []);
                    if (!in_array($cacheKey, $keys)) {
                        $keys[] = $cacheKey;
                        Cache::put('assets:option_keys', $keys, now()->addHours(24));
                    }
                    $query = MasterAsset::query()
                        ->select(['id', 'asset_name', 'asset_code', 'status', 'deleted_at'])
                        ->where('status', '!=', 'disposed');

                    if ($request->filled('status')) {
                        $query->where('status', $request->status);
                    }

                    return $query->orderBy('asset_name')->limit(500)->get();
                });
                return $this->successResponse($data, 'Opsi aset berhasil diambil');
            }

            $cacheKey = 'assets:index:' . md5($request->fullUrl());

            $data = Cache::remember($cacheKey, 60, function () use ($cacheKey, $request) {
                // Track cache key untuk keperluan clear spesifik
                $keys = Cache::get('assets:cache_keys', []);
                if (!in_array($cacheKey, $keys)) {
                    $keys[] = $cacheKey;
                    Cache::put('assets:cache_keys', $keys, now()->addHours(1));
                }

                $query = MasterAsset::with([
                    'category:id,name',
                    'containerAsset:id,container_asset_id,contained_asset_id',
                    'containerAsset.containerAsset:id,asset_code,asset_name',
                    'activeAssignment:id,asset_id,user_name',
                    'storeAssetMapping:id,asset_id,store_code,store_name',
                ])->select([
                    'id',
                    'asset_code',
                    'asset_name',
                    'category_id',
                    'brand',
                    'model',
                    'serial_number',
                    'condition_status',
                    'status',
                    'created_at',
                    'deleted_at',
                ]);

                if ($request->filled('search')) {
                    $search = $request->search;
                    $query->where(function ($q) use ($search) {
                        $q->where('asset_code', 'like', "%{$search}%")
                          ->orWhere('asset_name', 'like', "%{$search}%")
                          ->orWhere('brand', 'like', "%{$search}%")
                          ->orWhere('serial_number', 'like', "%{$search}%");
                    });
                }

                if ($request->filled('category_id')) {
                    $query->where('category_id', $request->integer('category_id'));
                }

                if ($request->filled('condition_status')) {
                    $query->where('condition_status', $request->condition_status);
                }

                if ($request->filled('status')) {
                    $query->where('status', $request->status);
                }

                if ($request->filled('location_id')) {
                    $query->where('location_id', $request->integer('location_id'));
                }

                // Sorting Database dinamis dengan whitelist untuk keamanan
                $sortBy = $request->get('sort_by', 'created_at');
                $sortOrder = strtolower($request->get('sort_order', 'desc')) === 'asc' ? 'asc' : 'desc';
                $allowedSorts = ['asset_code', 'asset_name', 'brand', 'model', 'serial_number', 'condition_status', 'status', 'created_at', 'updated_at'];
                if (in_array($sortBy, $allowedSorts)) {
                    $query->orderBy($sortBy, $sortOrder);
                } else {
                    $query->orderBy('created_at', 'desc');
                }

                $perPage = min($request->integer('per_page', 10), 1000);

                $paginated = $request->boolean('simple')
                    ? $query->simplePaginate($perPage)
                    : $query->paginate($perPage);

                $paginated->through(function ($asset) {
                    $containerAsset = $asset->containerAsset;
                    if ($containerAsset && $containerAsset->containerAsset) {
                        $parent = $containerAsset->containerAsset;
                        $asset->setAttribute('parent_package', [
                            'asset_code' => $parent->asset_code,
                            'asset_name' => $parent->asset_name,
                        ]);
                    } else {
                        $asset->setAttribute('parent_package', null);
                    }

                    $active = $asset->activeAssignment;
                    $assignedTo = $active ? $active->user_name : null;

                    $asset->setAttribute('assigned_to', $assignedTo);
                    $asset->setAttribute('assignment_source', 'direct');
                    $asset->setAttribute('current_holder', $assignedTo);

                    $mapping = $asset->storeAssetMapping;
                    if ($mapping) {
                        $asset->setAttribute('store_package', [
                            'store_code' => $mapping->store_code,
                            'store_name' => $mapping->store_name,
                        ]);
                    } else {
                        $asset->setAttribute('store_package', null);
                    }

                    // Unset relation models that are only used for calculations to avoid heavy payload serialization
                    $asset->unsetRelation('containerAsset');
                    $asset->unsetRelation('activeAssignment');
                    $asset->unsetRelation('storeAssetMapping');

                    return $asset;
                });

                return $paginated;
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
                'containerAsset.containerAsset.activeAssignment',
                'activeAssignment',
            ])->find($id);

            if (!$asset) {
                return $this->notFoundResponse('Aset tidak ditemukan');
            }

            $containerAsset = $asset->containerAsset;
            if ($containerAsset && $containerAsset->containerAsset) {
                $parent = $containerAsset->containerAsset;
                $asset->setAttribute('parent_package', [
                    'asset_code' => $parent->asset_code,
                    'asset_name' => $parent->asset_name,
                ]);
            } else {
                $asset->setAttribute('parent_package', null);
            }

            $active = $asset->activeAssignment;
            $assignedTo = $active ? $active->user_name : null;

            $asset->setAttribute('assigned_to', $assignedTo);
            $asset->setAttribute('assignment_source', 'direct');
            $asset->setAttribute('current_holder', $assignedTo);

            return $this->successResponse($asset, 'Detail aset berhasil diambil');

        } catch (\Exception $e) {
            return $this->errorResponse('Terjadi kesalahan: ' . $e->getMessage(), 500);
        }
    }

    public function timeline(Request $request, $id)
    {
        try {
            $asset = MasterAsset::with(['category:id,name'])->find($id);

            if (!$asset) {
                return $this->notFoundResponse('Aset tidak ditemukan');
            }

            $type    = $request->get('type', 'all');
            $search  = Str::lower((string) $request->get('search', ''));
            $sort    = strtolower($request->get('sort', 'desc')) === 'asc' ? 'asc' : 'desc';
            $perPage = min(max($request->integer('per_page', 20), 1), 100);
            $page    = max($request->integer('page', 1), 1);

            $events = collect();

            // ── Asset Created ──────────────────────────────────────
            $events->push([
                'id'             => "asset-created-{$asset->id}",
                'event_type'     => 'asset_created',
                'category'       => 'asset_in',
                'category_label' => 'Asset Masuk',
                'title'          => 'Asset Masuk ke IT',
                'description'    => "{$asset->asset_name} ({$asset->asset_code}) terdaftar di sistem",
                'created_at'     => optional($asset->created_at)->toISOString(),
                'details'        => [
                    'Kode Aset'    => $asset->asset_code,
                    'Nama Aset'    => $asset->asset_name,
                    'Kategori'     => $asset->category?->name,
                    'Tanggal Beli' => optional($asset->purchase_date)->format('d M Y'),
                    'Harga'        => $asset->purchase_price !== null
                        ? 'Rp' . number_format((float) $asset->purchase_price, 0, ',', '.')
                        : null,
                ],
            ]);

            // ── Assignments ────────────────────────────────────────
            AssetAssignment::where('asset_id', $asset->id)
                ->latest()
                ->limit(100)
                ->get()
                ->each(function ($assignment) use ($events) {
                    $events->push([
                        'id'             => "asset-assigned-{$assignment->id}",
                        'event_type'     => 'asset_assigned',
                        'category'       => 'assignment',
                        'category_label' => 'Assignment',
                        'title'          => "Dipinjam oleh {$assignment->user_name}",
                        'description'    => $assignment->note,
                        'created_at'     => optional($assignment->created_at)->toISOString(),
                        'details'        => [
                            'User'           => $assignment->user_name,
                            'Telepon'        => $assignment->phone,
                            'Tanggal Pinjam' => optional($assignment->assign_date)->format('d M Y'),
                            'Catatan'        => $assignment->note,
                        ],
                    ]);

                    if ($assignment->return_date) {
                        $events->push([
                            'id'             => "asset-returned-{$assignment->id}",
                            'event_type'     => 'asset_returned',
                            'category'       => 'returned',
                            'category_label' => 'Pengembalian',
                            'title'          => "Dikembalikan oleh {$assignment->user_name}",
                            'description'    => $assignment->note,
                            'created_at'     => optional($assignment->updated_at ?? $assignment->created_at)->toISOString(),
                            'details'        => [
                                'User'           => $assignment->user_name,
                                'Tanggal Pinjam' => optional($assignment->assign_date)->format('d M Y'),
                                'Tanggal Kembali'=> optional($assignment->return_date)->format('d M Y'),
                                'Catatan'        => $assignment->note,
                            ],
                        ]);
                    }
                });

            // ── Maintenance Logs ───────────────────────────────────
            MaintenanceLog::where('asset_id', $asset->id)
                ->latest()
                ->limit(50)
                ->get()
                ->each(function ($maintenance) use ($events) {
                    $isCompleted = $maintenance->status === 'completed';
                    
                    // 1. Selalu tambahkan event "Maintenance Dimulai"
                    $events->push([
                        'id'             => "maintenance-start-{$maintenance->id}",
                        'event_type'     => 'maintenance_started',
                        'category'       => 'maintenance',
                        'category_label' => 'Maintenance',
                        'title'          => 'Maintenance Dimulai',
                        'description'    => $maintenance->description,
                        'created_at'     => optional($maintenance->created_at)->toISOString(),
                        'details'        => [
                            'Teknisi'             => $maintenance->pic,
                            'Catatan'             => $maintenance->description,
                            'Status'              => 'Berlangsung',
                        ],
                    ]);

                    // 2. Jika sudah selesai, tambahkan event "Maintenance Selesai"
                    if ($isCompleted) {
                        $events->push([
                            'id'             => "maintenance-end-{$maintenance->id}",
                            'event_type'     => 'maintenance_completed',
                            'category'       => 'maintenance',
                            'category_label' => 'Maintenance',
                            'title'          => 'Maintenance Selesai',
                            'description'    => $maintenance->description,
                            'created_at'     => optional($maintenance->updated_at ?? $maintenance->created_at)->toISOString(),
                            'details'        => [
                                'Teknisi'             => $maintenance->pic,
                                'Catatan'             => $maintenance->description,
                                'Biaya'               => $maintenance->cost !== null
                                    ? 'Rp' . number_format((float) $maintenance->cost, 0, ',', '.')
                                    : null,
                                'Tanggal Maintenance' => optional($maintenance->date)->format('d M Y'),
                                'Status'              => 'Selesai',
                            ],
                        ]);
                    }
                });

            // ── Audit Logs ─────────────────────────────────────────
            AuditLog::where('asset_id', $asset->id)
                ->latest()
                ->limit(50)
                ->get()
                ->each(function ($audit) use ($events) {
                    $events->push([
                        'id'             => "audit-{$audit->id}",
                        'event_type'     => 'audit_log',
                        'category'       => 'audit',
                        'category_label' => 'Audit Log',
                        'title'          => 'Audit Log',
                        'description'    => $audit->description,
                        'created_at'     => optional($audit->created_at)->toISOString(),
                        'details'        => [
                            'Aksi'    => $audit->action,
                            'PIC'     => $audit->pic,
                            'Catatan' => $audit->description,
                        ],
                    ]);
                });

            // ── Activity Logs ──────────────────────────────────────
            Log::where(function ($q) use ($asset) {
                    $q->where('description', 'like', "%{$asset->asset_name}%")
                      ->orWhere('description', 'like', "%{$asset->asset_code}%");
                })
                ->whereIn('activity', ['update_data', 'create_data'])
                ->latest()
                ->limit(50)
                ->get()
                ->each(function ($log) use ($events) {
                    $isDataChange   = Str::contains($log->activity, 'update');
                    $isStatusChange = Str::contains(Str::lower($log->description), ['status', 'kondisi', 'condition']);

                    if (!$isDataChange && !$isStatusChange) return;

                    $events->push([
                        'id'             => "log-{$log->id}",
                        'event_type'     => $isDataChange ? 'asset_updated' : 'status_changed',
                        'category'       => $isDataChange ? 'data_change' : 'status_change',
                        'category_label' => $isDataChange ? 'Perubahan Data' : 'Status Perubahan',
                        'title'          => $isDataChange ? 'Perubahan Data' : 'Status Perubahan',
                        'description'    => $log->description,
                        'created_at'     => optional($log->created_at)->toISOString(),
                        'details'        => [
                            'Aktivitas'  => $log->activity,
                            'Deskripsi'  => $log->description,
                            'IP Address' => $log->ip_address,
                        ],
                    ]);
                });

            // ── Filter, Sort & Paginate ────────────────────────────
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
            ], 'Timeline aset berhasil diambil');

        } catch (\Exception $e) {
            return $this->errorResponse('Terjadi kesalahan: ' . $e->getMessage(), 500);
        }
    }

    public function store(MasterAssetRequest $request, AssetCodeGenerator $generator)
    {
        try {
            $category = Category::findOrFail($request->category_id);

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
            $data['asset_code']       = $generator->generateForCategory((int) $category->id);
            $data['category_id']      = $category->id;
            $data['assigned_user_id'] = $userId;
            unset($data['category_name'], $data['user_name']);

            $asset = MasterAsset::create($data);
            $this->clearAssetCache();

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

    public function update(MasterAssetRequest $request, $id, AssetCodeGenerator $generator)
    {
        try {
            $asset = MasterAsset::find($id);

            if (!$asset) {
                return $this->notFoundResponse('Aset tidak ditemukan');
            }

            $data = $request->validated();
            unset($data['asset_code']);

            if ($request->filled('category_id') && (int) $request->category_id !== (int) $asset->category_id) {
                $data['asset_code'] = $generator->generateForCategory((int) $request->category_id);
            }
            unset($data['category_name']);

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
            $this->clearAssetCache();

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
            $this->clearAssetCache();

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

    private function clearAssetCache(): void
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