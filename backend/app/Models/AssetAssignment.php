<?php

namespace App\Models;

use Illuminate\Database\Eloquent\Model;

class AssetAssignment extends Model
{
    protected $table = 'asset_assignments';

    protected $fillable = [
        'asset_id',
        'user_id',
        'assigned_date',
        'return_date',
        'status',
        'notes',
    ];

    public function asset()
    {
        return $this->belongsTo(Asset::class, 'asset_id');
    }

    public function user()
    {
        return $this->belongsTo(MasterUser::class, 'user_id');
    }
}