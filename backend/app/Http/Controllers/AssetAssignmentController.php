<?php

namespace App\Http\Controllers;

use App\Models\AssetAssignment;
use App\Models\MasterAsset;
use App\Models\Log;
use App\Exports\AssignmentExport;
use App\Traits\ApiResponse;
use App\Http\Requests\AssetAssignmentRequest;
use App\Services\FonnteService;
use App\Jobs\SendFonnteNotification;
use Illuminate\Http\Request;
use Illuminate\Support\Facades\Cache;
use Maatwebsite\Excel\Facades\Excel;

class AssetAssignmentController extends Controller
{
    use ApiResponse;

    protected FonnteService $fonnte;

    public function __construct(FonnteService $fonnte)
    {
        $this->fonnte = $fonnte;
    }

    public function index(Request $request)
    {
        try {
            $query = AssetAssignment::with('asset:id,asset_name,asset_code')
                ->select([
                    'id',
                    'asset_id',
                    'user_name',
                    'phone',
                    'assign_date',
                    'return_date',
                    'note',
                    'created_at',
                    'deleted_at',
                ]);

            if ($request->filled('asset_id')) {
                $query->where('asset_id', $request->asset_id);
            }

            if ($request->filled('search')) {
                $search = $request->search;
                $query->where(function ($q) use ($search) {
                    $q->where('user_name', 'like', "%{$search}%");
                });
            }

            if ($request->filled('is_active')) {
                if ($request->is_active === '1') {
                    $query->whereNull('return_date');
                } elseif ($request->is_active === '0') {
                    $query->whereNotNull('return_date');
                }
            } elseif ($request->filled('active') && $request->boolean('active')) {
                $query->whereNull('return_date');
            }

            $query->orderBy('created_at', 'desc');

            $perPage  = min((int) $request->get('per_page', 15), 100);
            $cacheKey = 'assignments:index:' . md5($request->fullUrl());

            $data = Cache::remember($cacheKey, now()->addSeconds(10), function () use ($cacheKey, $query, $perPage) {
                $keys = Cache::get('assignments:cache_keys', []);
                if (!in_array($cacheKey, $keys)) {
                    $keys[] = $cacheKey;
                    Cache::put('assignments:cache_keys', $keys, now()->addHours(1));
                }
                return $query->paginate($perPage);
            });

            return $this->successResponse($data, 'Data penugasan aset berhasil diambil');

        } catch (\Exception $e) {
            return $this->errorResponse('Terjadi kesalahan: ' . $e->getMessage(), 500);
        }
    }

    public function show($id)
    {
        try {
            $assignment = AssetAssignment::with('asset.category')->find($id);

            if (!$assignment) {
                return $this->notFoundResponse('Penugasan aset tidak ditemukan');
            }

            return $this->successResponse($assignment, 'Data penugasan aset berhasil diambil');
        } catch (\Exception $e) {
            return $this->errorResponse('Terjadi kesalahan: ' . $e->getMessage(), 500);
        }
    }

    public function store(AssetAssignmentRequest $request)
    {
        try {
            $asset = MasterAsset::find($request->asset_id);
            if (!$asset) {
                return $this->notFoundResponse('Aset tidak ditemukan');
            }

            if ($asset->status === 'borrowed') {
                return $this->errorResponse('Aset sedang dipinjam dan tidak dapat dipinjam lagi', 422);
            }

            $assignment = AssetAssignment::create($request->validated());

            $asset->update(['status' => 'borrowed']);
            $this->clearAssignmentCache();

            $this->writeLog($request, 'create_data', "Aset '{$asset->asset_name}' ditugaskan kepada '{$assignment->user_name}'");

            if ($assignment->phone) {
                SendFonnteNotification::dispatch(
                    type:         'borrowed',
                    phone:        $assignment->phone,
                    borrowerName: $assignment->user_name,
                    assetName:    $asset->asset_name,
                    assignDate:   $assignment->assign_date,
                    returnDate:   $assignment->return_date,
                );
            }

            return $this->createdResponse($assignment->load('asset'), 'Penugasan aset berhasil ditambahkan');
        } catch (\Exception $e) {
            return $this->errorResponse('Terjadi kesalahan: ' . $e->getMessage(), 500);
        }
    }

    public function update(AssetAssignmentRequest $request, $id)
    {
        try {
            $assignment = AssetAssignment::with('asset')->find($id);

            if (!$assignment) {
                return $this->notFoundResponse('Penugasan aset tidak ditemukan');
            }

            $wasNotReturned = is_null($assignment->return_date);
            $nowReturned    = !empty($request->return_date);
            $assetName      = $assignment->asset?->asset_name ?? '-';

            $assetChanged = $request->asset_id && $request->asset_id != $assignment->asset_id;
            if ($assetChanged) {
                $newAsset = MasterAsset::find($request->asset_id);
                if ($newAsset && $newAsset->status === 'borrowed') {
                    return $this->errorResponse('Aset sedang dipinjam dan tidak dapat dipinjam lagi', 422);
                }
                $assignment->asset?->update(['status' => 'active']);
                $newAsset?->update(['status' => 'borrowed']);
            }

            $assignment->update($request->validated());

            if ($wasNotReturned && $nowReturned) {
                $assignment->asset?->update(['status' => 'active']);
            }
            $this->clearAssignmentCache();

            $this->writeLog($request, 'update_data', "Penugasan aset ID {$id} berhasil diperbarui");

            if ($wasNotReturned && $nowReturned && $assignment->phone) {
                SendFonnteNotification::dispatch(
                    type:         'returned',
                    phone:        $assignment->phone,
                    borrowerName: $assignment->user_name,
                    assetName:    $assetName,
                    assignDate:   $assignment->assign_date,
                    returnDate:   $request->return_date,
                );
            }

            return $this->successResponse($assignment->fresh()->load('asset'), 'Penugasan aset berhasil diperbarui');
        } catch (\Exception $e) {
            return $this->errorResponse('Terjadi kesalahan: ' . $e->getMessage(), 500);
        }
    }

    public function destroy(Request $request, $id)
    {
        try {
            $assignment = AssetAssignment::with('asset')->find($id);

            if (!$assignment) {
                return $this->notFoundResponse('Penugasan aset tidak ditemukan');
            }

            if (is_null($assignment->return_date)) {
                $assignment->asset?->update(['status' => 'active']);
            }

            $assignment->delete();
            $this->clearAssignmentCache();

            $this->writeLog($request, 'delete_data', "Penugasan aset ID {$id} berhasil dihapus");

            return $this->successResponse(null, 'Penugasan aset berhasil dihapus');
        } catch (\Exception $e) {
            return $this->errorResponse('Terjadi kesalahan: ' . $e->getMessage(), 500);
        }
    }

    public function export(Request $request)
    {
        $filename = 'data-peminjaman-' . now()->format('Ymd-His') . '.xlsx';
        return Excel::download(new AssignmentExport($request), $filename);
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

    private function clearAssignmentCache(): void
    {
        $keys = Cache::get('assignments:cache_keys', []);
        foreach ($keys as $key) {
            Cache::forget($key);
        }
        Cache::forget('assignments:cache_keys');
        Cache::forget('dashboard:index');

        // Also clear asset cache as assignment changes asset status
        $assetKeys = Cache::get('assets:cache_keys', []);
        foreach ($assetKeys as $key) {
            Cache::forget($key);
        }
        Cache::forget('assets:cache_keys');
    }
}
