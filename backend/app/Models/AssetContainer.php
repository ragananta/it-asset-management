<?php

namespace App\Models;

use Illuminate\Database\Eloquent\Factories\HasFactory;
use Illuminate\Database\Eloquent\Model;

class AssetContainer extends Model
{
    use HasFactory;

    protected $table = 'asset_containers';

    protected $fillable = [
        'container_asset_id',
        'contained_asset_id',
    ];

    public function containerAsset()
    {
        return $this->belongsTo(MasterAsset::class, 'container_asset_id');
    }

    public function containedAsset()
    {
        return $this->belongsTo(MasterAsset::class, 'contained_asset_id');
    }
}
