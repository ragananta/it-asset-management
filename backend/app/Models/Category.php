<?php

namespace App\Models;

use Illuminate\Database\Eloquent\Model;
use App\Models\Asset;

class Category extends Model
{
    protected $table = 'master_categories';

    protected $fillable = [
        'category_name',    
        'sub_category',
        'asset_type',
        'maintenance_rule'
    ];

    public function assets()
    {
        return $this->hasMany(Asset::class, 'category_id');
    }
}