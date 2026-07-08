<?php

namespace App\Models;

use Illuminate\Database\Eloquent\Factories\HasFactory;
use Illuminate\Database\Eloquent\Model;
use Illuminate\Database\Eloquent\SoftDeletes;
use Spatie\Activitylog\Traits\LogsActivity;
use Spatie\Activitylog\LogOptions;

class Category extends Model
{
    use HasFactory, SoftDeletes, LogsActivity;

    protected $fillable = [
        'name',
        'code',
        'description',
        'is_active',
    ];

    protected $casts = [
        'is_active' => 'boolean',
    ];

    protected static function booted()
    {
        $clearCache = function () {
            \Illuminate\Support\Facades\Cache::forget('dashboard:index');
            \Illuminate\Support\Facades\Cache::forget('category:cat-tas:id');
            
            $keys = \Illuminate\Support\Facades\Cache::get('categories:cache_keys', []);
            foreach ($keys as $key) {
                \Illuminate\Support\Facades\Cache::forget($key);
            }
            \Illuminate\Support\Facades\Cache::forget('categories:cache_keys');
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
            ->setDescriptionForEvent(fn(string $eventName) => "Category has been {$eventName}");
    }

    // Relationships
    public function assets()
    {
        return $this->hasMany(MasterAsset::class, 'category_id');
    }
}