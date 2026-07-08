<?php

namespace App\Models;

use Illuminate\Database\Eloquent\Factories\HasFactory;
use Illuminate\Database\Eloquent\Model;

class StoreAssetMapping extends Model
{
    use HasFactory;

    protected $table = 'store_asset_mappings';

    protected $fillable = [
        'store_id',
        'store_code',
        'store_name',
        'asset_id',
        'created_by',
        'updated_by',
    ];

    protected static function booted()
    {
        $clearCache = function () {
            \Illuminate\Support\Facades\Cache::forget('dashboard:index');
            
            $assetKeys = \Illuminate\Support\Facades\Cache::get('assets:cache_keys', []);
            foreach ($assetKeys as $key) {
                \Illuminate\Support\Facades\Cache::forget($key);
            }
            \Illuminate\Support\Facades\Cache::forget('assets:cache_keys');
        };

        static::saved($clearCache);
        static::deleted($clearCache);
    }

    public function asset()
    {
        return $this->belongsTo(MasterAsset::class, 'asset_id');
    }
}
