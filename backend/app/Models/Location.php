<?php

namespace App\Models;

use Illuminate\Database\Eloquent\Model;
use App\Models\Asset;

class Location extends Model
{
    protected $table = 'master_locations';

    protected $fillable = [
        'location_name'
    ];

    public function assets()
    {
        return $this->hasMany(Asset::class, 'location_id');
    }
}