<?php

namespace App\Models;

use Illuminate\Database\Eloquent\Factories\HasFactory;
use Illuminate\Database\Eloquent\Model;
use Illuminate\Database\Eloquent\SoftDeletes;
use Spatie\Activitylog\Traits\LogsActivity;
use Spatie\Activitylog\LogOptions;

class MasterAsset extends Model
{
    use HasFactory, SoftDeletes, LogsActivity;

    protected $table = 'master_assets';

    protected $fillable = [
    'asset_code',
    'asset_name',
    'category_id',
    'location_id',
    'store_id',
    'store_name',
    'assigned_user_id',
    'brand',
    'model',
    'serial_number',
    'vendor',
    'purchase_date',
    'purchase_price',
    'warranty_expired',
    'condition_status',
    'status',        // ← tambah ini
    'note',
];

    protected $casts = [
        'purchase_date'   => 'date',
        'warranty_expired' => 'date',
        'purchase_price'  => 'decimal:2',
    ];

    protected static function booted()
    {
        $clearCache = function () {
            \Illuminate\Support\Facades\Cache::forget('dashboard:index');
            
            $keys = \Illuminate\Support\Facades\Cache::get('assets:cache_keys', []);
            foreach ($keys as $key) {
                \Illuminate\Support\Facades\Cache::forget($key);
            }
            \Illuminate\Support\Facades\Cache::forget('assets:cache_keys');

            $optKeys = \Illuminate\Support\Facades\Cache::get('assets:option_keys', []);
            foreach ($optKeys as $key) {
                \Illuminate\Support\Facades\Cache::forget($key);
            }
            \Illuminate\Support\Facades\Cache::forget('assets:option_keys');
        };

        static::saved($clearCache);
        static::deleted($clearCache);
        static::restored($clearCache);
    }

    public function getActivitylogOptions(): LogOptions
    {
        return LogOptions::defaults()
            ->logFillable()
            ->logOnlyDirty()
            ->setDescriptionForEvent(fn(string $eventName) => "Asset has been {$eventName}");
    }

    // Relationships
    public function category()
    {
        return $this->belongsTo(Category::class, 'category_id');
    }

    public function location()
    {
        return $this->belongsTo(Location::class, 'location_id');
    }

    public function assignedUser()
    {
        return $this->belongsTo(User::class, 'assigned_user_id');
    }

    public function properties()
    {
        return $this->hasMany(AssetProperty::class, 'asset_id');
    }

    public function maintenanceLogs()
    {
        return $this->hasMany(MaintenanceLog::class, 'asset_id');
    }

    public function auditLogs()
    {
        return $this->hasMany(AuditLog::class, 'asset_id');
    }

    public function assignments()
    {
        return $this->hasMany(AssetAssignment::class, 'asset_id');
    }

    public function activeAssignment()
    {
        return $this->hasOne(AssetAssignment::class, 'asset_id')->whereNull('return_date');
    }

    public function containedAssets()
    {
        return $this->belongsToMany(MasterAsset::class, 'asset_containers', 'container_asset_id', 'contained_asset_id')
            ->withTimestamps();
    }

    public function containerAsset()
    {
        return $this->hasOne(AssetContainer::class, 'contained_asset_id');
    }

    public function storeAssetMapping()
    {
        return $this->hasOne(StoreAssetMapping::class, 'asset_id');
    }
}