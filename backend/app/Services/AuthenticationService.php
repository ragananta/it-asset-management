<?php

namespace App\Services;

use App\Models\User;
use Illuminate\Support\Facades\Hash;

class AuthenticationService
{
    protected AuthenticationLogger $logger;

    /**
     * Create a new service instance.
     */
    public function __construct(AuthenticationLogger $logger)
    {
        $this->logger = $logger;
    }

    /**
     * Authenticate user credentials, manage tokens, log events, and return result.
     */
    public function authenticate(
        string $email,
        string $password,
        string $tokenName,
        string $source,
        ?string $ipAddress = null,
        ?string $userAgent = null
    ): array {
        $user = User::where('email', $email)->first();

        // Cek login lokal
        $localAuthSuccess = $user && Hash::check($password, $user->password);
        $salokaAuthSuccess = false;

        if (!$localAuthSuccess) {
            // Fallback: Cek ke API Saloka jika lokal gagal
            try {
                // Gunakan URL yang diberikan user (nanti bisa diganti dengan env('SALOKA_API_URL'))
                $salokaApiUrl = 'https://192.168.0.0/auth';
                
                $response = \Illuminate\Support\Facades\Http::timeout(5)->withOptions([
                    'verify' => false, // Abaikan SSL error untuk IP lokal
                ])->get($salokaApiUrl, [
                    'email' => $email,
                    'password' => $password,
                ]);

                if ($response->successful()) {
                    $salokaAuthSuccess = true;
                }
            } catch (\Exception $e) {
                // Gagal menghubungi API Saloka, abaikan
                \Illuminate\Support\Facades\Log::warning('Gagal menghubungi API Saloka: ' . $e->getMessage());
            }
        }

        if (!$localAuthSuccess && !$salokaAuthSuccess) {
            $this->logger->logFailedAuthentication($email, $source, $ipAddress, $userAgent);

            return [
                'success' => false,
                'message' => 'Email atau password salah',
            ];
        }

        // Jika berhasil lewat Saloka tapi user belum ada di database IT Asset, kita auto-register
        if ($salokaAuthSuccess && !$user) {
            $namePrefix = explode('@', $email)[0];
            $user = User::create([
                'name'     => ucfirst($namePrefix) . ' (Saloka)',
                'email'    => $email,
                'password' => Hash::make(str()->random(16)), // Password acak karena login utama via Saloka
            ]);
        }

        // Token Lifecycle: delete other tokens with the same name for this user
        $user->tokens()->where('name', $tokenName)->delete();

        // Create new token
        $token = $user->createToken($tokenName)->plainTextToken;

        // Log successful authentication
        $this->logger->logSuccessfulAuthentication($user, $source, $ipAddress, $userAgent);

        return [
            'success' => true,
            'user'    => $user,
            'token'   => $token,
        ];
    }
}
