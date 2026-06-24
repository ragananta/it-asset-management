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

    public function asset()
    {
        return $this->belongsTo(MasterAsset::class, 'asset_id');
    }
}
