<?php

namespace App\Models;

use Illuminate\Database\Eloquent\Factories\HasFactory;
use Illuminate\Database\Eloquent\Model;
use Illuminate\Database\Eloquent\SoftDeletes;

class AuditLog extends Model
{
    use HasFactory, SoftDeletes;

    protected $table = 'audit_logs';

    protected $fillable = [
        'asset_id',
        'action',
        'description',
        'pic',
    ];

    public function asset()
    {
        return $this->belongsTo(MasterAsset::class, 'asset_id');
    }
}