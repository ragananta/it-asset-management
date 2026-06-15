<?php

namespace App\Models;

use Illuminate\Database\Eloquent\Factories\HasFactory;
use Illuminate\Database\Eloquent\Model;
use Illuminate\Database\Eloquent\SoftDeletes;

class AssetProperty extends Model
{
    use HasFactory, SoftDeletes;

    protected $table = 'asset_properties';

    protected $fillable = [
        'asset_id',
        'property_name',
        'value',
        'note',
    ];

    public function asset()
    {
        return $this->belongsTo(MasterAsset::class, 'asset_id');
    }
}