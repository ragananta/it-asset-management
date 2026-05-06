<?php

namespace App\Models;

use Illuminate\Database\Eloquent\Model;
use App\Models\Asset;

class MaintenanceLog extends Model
{
    protected $table = 'maintenance_logs';

    protected $fillable = [
        'asset_id',
        'maintenance_date',
        'maintenance_type',
        'description',
        'cost',
        'technician',
        'status'
    ];

    public function asset()
    {
        return $this->belongsTo(Asset::class, 'asset_id');
    }
}