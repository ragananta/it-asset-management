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

        if (!$user || !Hash::check($password, $user->password)) {
            $this->logger->logFailedAuthentication($email, $source, $ipAddress, $userAgent);

            return [
                'success' => false,
                'message' => 'Email atau password salah',
            ];
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
