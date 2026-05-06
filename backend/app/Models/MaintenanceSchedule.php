<?php

namespace App\Models;

use Illuminate\Database\Eloquent\Model;

class MaintenanceSchedule extends Model
{
    protected $fillable = [
        'asset_id',
        'scheduled_date',
        'maintenance_type',
        'priority',
        'status',
        'notes'
    ];

    public function asset()
    {
        return $this->belongsTo(Asset::class, 'asset_id');
    }
}