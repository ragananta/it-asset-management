<?php

namespace App\Models;

use Illuminate\Database\Eloquent\Factories\HasFactory;
use Illuminate\Database\Eloquent\Model;
use Spatie\Activitylog\Traits\LogsActivity;
use Spatie\Activitylog\LogOptions;

class Location extends Model
{
    use HasFactory, LogsActivity;

    protected $fillable = [
        'name',
        'code',
        'building',
        'floor',
        'room',
        'address',
        'is_active',
    ];

    protected $casts = [
        'is_active' => 'boolean',
    ];

    public function getActivitylogOptions(): LogOptions
    {
        return LogOptions::defaults()
            ->logFillable()
            ->logOnlyDirty()
            ->setDescriptionForEvent(fn(string $eventName) => "Location has been {$eventName}");
    }

    protected static function booted()
    {
        $clearCache = function () {
            $keys = \Illuminate\Support\Facades\Cache::get('locations:cache_keys', []);
            foreach ($keys as $key) {
                \Illuminate\Support\Facades\Cache::forget($key);
            }
            \Illuminate\Support\Facades\Cache::forget('locations:cache_keys');
        };

        static::saved($clearCache);
        static::deleted($clearCache);
    }

    // Relationships
    public function assets()
    {
        return $this->hasMany(MasterAsset::class, 'location_id');
    }
}