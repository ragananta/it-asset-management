<?php

namespace App\Models;

use Illuminate\Database\Eloquent\Model;
use App\Models\Asset;

class Vendor extends Model
{
    protected $table = 'master_vendors';

    protected $fillable = [
        'vendor_name',
        'vendor_type',
        'contact_person',
        'phone',
        'email',
        'address',
        'sla_contract',
        'notes'
    ];

    public function assets()
    {
        return $this->hasMany(Asset::class, 'vendor_id');
    }
}