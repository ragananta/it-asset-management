<?php

namespace App\Models;

use Illuminate\Foundation\Auth\User as Authenticatable;
use Laravel\Sanctum\HasApiTokens;
use Illuminate\Notifications\Notifiable;
use Illuminate\Support\Facades\Hash;

class MasterUser extends Authenticatable
{
    use HasApiTokens, Notifiable;

    protected $table = 'master_users';

    protected $fillable = [
        'employee_name',
        'email',
        'password',
        'status',
        'department_id',
        'role_id',
        'phone',
        'approval_role'
    ];

    protected $hidden = [
        'password',
        'remember_token'
    ];

    protected $casts = [
        'email_verified_at' => 'datetime',
    ];

    /**
     * 🔐 AUTO HASH PASSWORD (AMAN)
     */
    public function setPasswordAttribute($value)
    {
        if (!empty($value)) {
            $this->attributes['password'] = Hash::make($value);
        }
    }

    /**
     * 🧠 FORMAT NAMA USER
     */
    public function getEmployeeNameAttribute($value)
    {
        return ucwords($value);
    }
}