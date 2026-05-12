<?php

namespace App\Models;

use Illuminate\Database\Eloquent\Factories\HasFactory;
use Illuminate\Database\Eloquent\Model;

class AssetProperty extends Model
{
    use HasFactory;

    protected $table = 'asset_properties';

    protected $fillable = [
        'asset_id',
        'property_name',
        'value',
        'note',
    ];

    // Relationships
    public function asset()
    {
        return $this->belongsTo(MasterAsset::class, 'asset_id');
    }
}