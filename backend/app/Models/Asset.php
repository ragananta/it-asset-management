<?php

namespace App\Models;

use Illuminate\Database\Eloquent\Model;
use App\Models\Category;
use App\Models\Vendor;
use App\Models\Location;
use App\Models\MaintenanceLog;
use App\Models\MasterUser;

class Asset extends Model
{
    protected $table = 'master_assets';

    protected $fillable = [
        'asset_code',
        'asset_name',
        'category_id',
        'vendor_id',
        'location_id',
        'assigned_user_id', // 🔥 WAJIB TAMBAH

        'brand',
        'model',
        'serial_number',

        'purchase_date',
        'purchase_price',
        'current_value',
        'depreciation_value',

        'warranty_expiry',

        'condition_status',
        'lifecycle_status',

        'notes'
    ];

    /**
     * RELATIONS
     */

    public function category()
    {
        return $this->belongsTo(Category::class, 'category_id');
    }

    public function vendor()
    {
        return $this->belongsTo(Vendor::class, 'vendor_id');
    }

    public function location()
    {
        return $this->belongsTo(Location::class, 'location_id');
    }

    // 🔥 TAMBAHAN (PENTING)
    public function user()
    {
        return $this->belongsTo(MasterUser::class, 'assigned_user_id');
    }

    public function maintenanceLogs()
    {
        return $this->hasMany(MaintenanceLog::class, 'asset_id');
    }
}