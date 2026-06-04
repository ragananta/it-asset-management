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
            $data = Cache::remember($cacheKey, now()->addSeconds(10), function () use ($query, $perPage, $request) {
                $query->orderBy('created_at', 'desc');

                return $request->boolean('simple')
                    ? $query->simplePaginate($perPage)
                    : $query->paginate($perPage);
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

    public function timeline(Request $request, $id)
    {
        try {
            $asset = MasterAsset::with(['category', 'assignedUser'])->find($id);

            if (!$asset) {
                return $this->notFoundResponse('Aset tidak ditemukan');
            }

            $type = $request->get('type', 'all');
            $search = Str::lower((string) $request->get('search', ''));
            $sort = strtolower($request->get('sort', 'desc')) === 'asc' ? 'asc' : 'desc';
            $perPage = min(max((int) $request->get('per_page', 20), 1), 100);
            $page = max((int) $request->get('page', 1), 1);

            $events = collect();

            $events->push([
                'id' => "asset-created-{$asset->id}",
                'event_type' => 'asset_created',
                'category' => 'asset_in',
                'category_label' => 'Asset Masuk',
                'title' => 'Asset Masuk ke IT',
                'description' => "{$asset->asset_name} ({$asset->asset_code}) terdaftar di sistem",
                'created_at' => optional($asset->created_at)->toISOString(),
                'details' => [
                    'Kode Aset' => $asset->asset_code,
                    'Nama Aset' => $asset->asset_name,
                    'Kategori' => $asset->category?->name,
                    'Tanggal Beli' => optional($asset->purchase_date)->format('d M Y'),
                    'Harga' => $asset->purchase_price !== null ? 'Rp' . number_format((float) $asset->purchase_price, 0, ',', '.') : null,
                ],
            ]);

            AssetAssignment::where('asset_id', $asset->id)->get()->each(function ($assignment) use ($events) {
                $events->push([
                    'id' => "asset-assigned-{$assignment->id}",
                    'event_type' => 'asset_assigned',
                    'category' => 'assignment',
                    'category_label' => 'Assignment',
                    'title' => "Dipinjam oleh {$assignment->user_name}",
                    'description' => $assignment->note,
                    'created_at' => optional($assignment->created_at)->toISOString(),
                    'details' => [
                        'User' => $assignment->user_name,
                        'Telepon' => $assignment->phone,
                        'Tanggal Pinjam' => optional($assignment->assign_date)->format('d M Y'),
                        'Catatan' => $assignment->note,
                    ],
                ]);

                if ($assignment->return_date) {
                    $events->push([
                        'id' => "asset-returned-{$assignment->id}",
                        'event_type' => 'asset_returned',
                        'category' => 'returned',
                        'category_label' => 'Pengembalian',
                        'title' => "Dikembalikan oleh {$assignment->user_name}",
                        'description' => $assignment->note,
                        'created_at' => optional($assignment->updated_at ?? $assignment->created_at)->toISOString(),
                        'details' => [
                            'User' => $assignment->user_name,
                            'Tanggal Pinjam' => optional($assignment->assign_date)->format('d M Y'),
                            'Tanggal Kembali' => optional($assignment->return_date)->format('d M Y'),
                            'Catatan' => $assignment->note,
                        ],
                    ]);
                }
            });

            MaintenanceLog::where('asset_id', $asset->id)->get()->each(function ($maintenance) use ($events) {
                $isCompleted = $maintenance->status === 'completed';
                $events->push([
                    'id' => "maintenance-{$maintenance->id}",
                    'event_type' => $isCompleted ? 'maintenance_completed' : 'maintenance_started',
                    'category' => 'maintenance',
                    'category_label' => 'Maintenance',
                    'title' => $isCompleted ? 'Maintenance Selesai' : 'Maintenance Dimulai',
                    'description' => $maintenance->description,
                    'created_at' => optional($maintenance->created_at)->toISOString(),
                    'details' => [
                        'Teknisi' => $maintenance->pic,
                        'Catatan' => $maintenance->description,
                        'Biaya' => $maintenance->cost !== null ? 'Rp' . number_format((float) $maintenance->cost, 0, ',', '.') : null,
                        'Tanggal Maintenance' => optional($maintenance->date)->format('d M Y'),
                        'Status' => $isCompleted ? 'Selesai' : 'Berlangsung',
                    ],
                ]);
            });

            AuditLog::where('asset_id', $asset->id)->get()->each(function ($audit) use ($events) {
                $events->push([
                    'id' => "audit-{$audit->id}",
                    'event_type' => 'audit_log',
                    'category' => 'audit',
                    'category_label' => 'Audit Log',
                    'title' => 'Audit Log',
                    'description' => $audit->description,
                    'created_at' => optional($audit->created_at)->toISOString(),
                    'details' => [
                        'Aksi' => $audit->action,
                        'PIC' => $audit->pic,
                        'Catatan' => $audit->description,
                    ],
                ]);
            });

            Log::where(function ($query) use ($asset) {
                $query->where('description', 'like', "%{$asset->asset_name}%")
                    ->orWhere('description', 'like', "%{$asset->asset_code}%");
            })->get()->each(function ($log) use ($events) {
                $isDataChange = Str::contains($log->activity, 'update');
                $isStatusChange = Str::contains(Str::lower($log->description), ['status', 'kondisi', 'condition']);

                if (!$isDataChange && !$isStatusChange) {
                    return;
                }

                $events->push([
                    'id' => "log-{$log->id}",
                    'event_type' => $isDataChange ? 'asset_updated' : 'status_changed',
                    'category' => $isDataChange ? 'data_change' : 'status_change',
                    'category_label' => $isDataChange ? 'Perubahan Data' : 'Status Perubahan',
                    'title' => $isDataChange ? 'Perubahan Data' : 'Status Perubahan',
                    'description' => $log->description,
                    'created_at' => optional($log->created_at)->toISOString(),
                    'details' => [
                        'Aktivitas' => $log->activity,
                        'Deskripsi' => $log->description,
                        'IP Address' => $log->ip_address,
                    ],
                ]);
            });

            $filtered = $events
                ->filter(fn($event) => $type === 'all' || $event['category'] === $type)
                ->filter(function ($event) use ($search) {
                    if ($search === '') return true;
                    return Str::contains(Str::lower(json_encode($event)), $search);
                })
                ->sortBy('created_at', SORT_REGULAR, $sort === 'desc')
                ->values();

            $total = $filtered->count();
            $paged = $filtered->forPage($page, $perPage)->values();

            $yearGroups = $paged
                ->groupBy(fn($event) => (int) date('Y', strtotime($event['created_at'])))
                ->map(function ($yearEvents, $year) {
                    return [
                        'year' => (int) $year,
                        'months' => $yearEvents
                            ->groupBy(fn($event) => date('n', strtotime($event['created_at'])))
                            ->map(function ($monthEvents, $monthNumber) {
                                $monthNames = [
                                    1 => 'Januari',
                                    2 => 'Februari',
                                    3 => 'Maret',
                                    4 => 'April',
                                    5 => 'Mei',
                                    6 => 'Juni',
                                    7 => 'Juli',
                                    8 => 'Agustus',
                                    9 => 'September',
                                    10 => 'Oktober',
                                    11 => 'November',
                                    12 => 'Desember',
                                ];

                                return [
                                    'month' => $monthNames[(int) $monthNumber] ?? '-',
                                    'month_number' => (int) $monthNumber,
                                    'events' => $monthEvents->values(),
                                ];
                            })
                            ->sortByDesc('month_number')
                            ->values(),
                    ];
                })
                ->sortByDesc('year')
                ->values();

            return $this->successResponse([
                'year_groups' => $yearGroups,
                'meta' => [
                    'page' => $page,
                    'per_page' => $perPage,
                    'total' => $total,
                    'last_page' => (int) ceil($total / $perPage),
                    'sort' => $sort,
                    'type' => $type,
                    'search' => $search,
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
            Cache::flush();

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
            Cache::flush();

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
            Cache::flush();

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
