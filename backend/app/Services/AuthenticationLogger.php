<?php

namespace App\Services;

use App\Models\Log;

class AuthenticationLogger
{
    /**
     * Log a successful login event.
     */
    public function logSuccessfulAuthentication($user, string $source, ?string $ipAddress = null, ?string $userAgent = null): void
    {
        Log::create([
            'user_id'     => $user->id,
            'activity'    => 'login',
            'description' => "User '{$user->name}' berhasil login (Source: {$source})",
            'ip_address'  => $ipAddress,
            'user_agent'  => $userAgent,
        ]);
    }

    /**
     * Log a failed login event.
     */
    public function logFailedAuthentication(string $email, string $source, ?string $ipAddress = null, ?string $userAgent = null): void
    {
        Log::create([
            'user_id'     => null,
            'activity'    => 'login_failed',
            'description' => "Login failed for email '{$email}' (Source: {$source})",
            'ip_address'  => $ipAddress,
            'user_agent'  => $userAgent,
        ]);
    }
}
