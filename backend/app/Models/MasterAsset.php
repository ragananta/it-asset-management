<?php

namespace App\Models;

use Illuminate\Database\Eloquent\Factories\HasFactory;
use Illuminate\Database\Eloquent\Model;
use Spatie\Activitylog\Traits\LogsActivity;
use Spatie\Activitylog\LogOptions;

class MasterAsset extends Model
{
    use HasFactory, LogsActivity;

    protected $table = 'master_assets';

    protected $fillable = [
        'asset_code',
        'asset_name',
        'category_id',
        'location_id',
        'assigned_user_id',
        'brand',
        'model',
        'serial_number',
        'vendor',
        'purchase_date',
        'purchase_price',
        'warranty_expired',
        'condition_status',
        'note',
    ];

    protected $casts = [
        'purchase_date'   => 'date',
        'warranty_expired' => 'date',
        'purchase_price'  => 'decimal:2',
    ];

    public function getActivitylogOptions(): LogOptions
    {
        return LogOptions::defaults()
            ->logFillable()
            ->logOnlyDirty()
            ->setDescriptionForEvent(fn(string $eventName) => "Asset has been {$eventName}");
    }

    // Relationships
    public function category()
    {
        return $this->belongsTo(Category::class, 'category_id');
    }

    public function location()
    {
        return $this->belongsTo(Location::class, 'location_id');
    }

    public function assignedUser()
    {
        return $this->belongsTo(User::class, 'assigned_user_id');
    }

    public function properties()
    {
        return $this->hasMany(AssetProperty::class, 'asset_id');
    }

    public function maintenanceLogs()
    {
        return $this->hasMany(MaintenanceLog::class, 'asset_id');
    }

    public function auditLogs()
    {
        return $this->hasMany(AuditLog::class, 'asset_id');
    }

    public function assignments()
    {
        return $this->hasMany(AssetAssignment::class, 'asset_id');
    }
}