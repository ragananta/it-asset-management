<?php

namespace App\Models;

use Illuminate\Database\Eloquent\Model;

class ApprovalRequest extends Model
{
    protected $fillable = [
        'user_id',
        'asset_id',
        'request_type',
        'request_description',
        'status',
        'request_date',
        'approval_notes',
        'approved_date',
    ];

    public function user()
    {
        return $this->belongsTo(MasterUser::class, 'user_id');
    }

    public function asset()
    {
        return $this->belongsTo(Asset::class, 'asset_id');
    }
}