<?php

namespace App\Models;

use Illuminate\Database\Eloquent\Factories\HasFactory;
use Illuminate\Database\Eloquent\Model;
use Illuminate\Database\Eloquent\SoftDeletes;
use Spatie\Activitylog\Traits\LogsActivity;
use Spatie\Activitylog\LogOptions;

class AssetAssignment extends Model
{
    use HasFactory, SoftDeletes, LogsActivity;

    protected $table = 'asset_assignments';

    protected $fillable = [
        'asset_id',
        'user_name',
        'phone',
        'assign_date',
        'return_date',
        'note',
    ];

    protected $casts = [
        'assign_date' => 'date',
        'return_date' => 'date',
    ];

    public function getActivitylogOptions(): LogOptions
    {
        return LogOptions::defaults()
            ->logFillable()
            ->logOnlyDirty()
            ->setDescriptionForEvent(fn(string $eventName) => "Asset assignment has been {$eventName}");
    }

    public function asset()
    {
        return $this->belongsTo(MasterAsset::class, 'asset_id');
    }
}