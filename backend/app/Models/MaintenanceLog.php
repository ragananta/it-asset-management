<?php

namespace App\Models;

use Illuminate\Database\Eloquent\Factories\HasFactory;
use Illuminate\Database\Eloquent\Model;
use Illuminate\Database\Eloquent\SoftDeletes;
use Spatie\Activitylog\Traits\LogsActivity;
use Spatie\Activitylog\LogOptions;

class MaintenanceLog extends Model
{
    use HasFactory, SoftDeletes, LogsActivity;

    protected $table = 'maintenance_logs';

    protected $fillable = [
        'asset_id',
        'date',
        'description',
        'cost',
        'pic',
        'status',
    ];

    protected $casts = [
        'date' => 'date',
        'cost' => 'decimal:2',
    ];

    public function getActivitylogOptions(): LogOptions
    {
        return LogOptions::defaults()
            ->logFillable()
            ->logOnlyDirty()
            ->setDescriptionForEvent(fn(string $eventName) => "Maintenance log has been {$eventName}");
    }

    protected static function booted()
    {
        $clearCache = function () {
            \Illuminate\Support\Facades\Cache::forget('dashboard:index');
            
            $keys = \Illuminate\Support\Facades\Cache::get('maintenance:cache_keys', []);
            foreach ($keys as $key) {
                \Illuminate\Support\Facades\Cache::forget($key);
            }
            \Illuminate\Support\Facades\Cache::forget('maintenance:cache_keys');

            $assetKeys = \Illuminate\Support\Facades\Cache::get('assets:cache_keys', []);
            foreach ($assetKeys as $key) {
                \Illuminate\Support\Facades\Cache::forget($key);
            }
            \Illuminate\Support\Facades\Cache::forget('assets:cache_keys');
        };

        static::saved($clearCache);
        static::deleted($clearCache);
        static::restored($clearCache);
    }

    public function asset()
    {
        return $this->belongsTo(MasterAsset::class, 'asset_id');
    }
}