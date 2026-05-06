<?php

namespace App\Models;

use Illuminate\Database\Eloquent\Model;

class AuditLog extends Model
{
    protected $fillable = [
        'user_id',
        'module',
        'action',
        'description',
        'activity_time',
    ];

    public function user()
    {
        return $this->belongsTo(MasterUser::class, 'user_id');
    }
}