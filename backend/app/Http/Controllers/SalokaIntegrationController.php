<?php

namespace App\Http\Controllers;

use Illuminate\Http\Request;
use Illuminate\Http\JsonResponse;
use App\Services\AuthenticationService;
use App\Traits\ApiResponse;

class SalokaIntegrationController extends Controller
{
    use ApiResponse;

    protected AuthenticationService $authService;

    public function __construct(AuthenticationService $authService)
    {
        $this->authService = $authService;
    }

    /**
     * GET /api/auth/saloka
     * Endpoint API khusus dari mentor untuk login via Saloka
     */
    public function ssoLogin(Request $request): JsonResponse
    {
        $request->validate([
            'email'    => 'required|email',
            'password' => 'required',
        ]);

        // Autentikasi user
        $result = $this->authService->authenticate(
            $request->email,
            $request->password,
            'saloka-sso-token',
            'api_sso',
            $request->ip(),
            $request->userAgent()
        );

        if (!$result['success']) {
            return $this->errorResponse($result['message'], 401);
        }

        // Mengembalikan balasan JSON berisi token
        return $this->successResponse([
            'user'  => $result['user'],
            'token' => $result['token'],
        ], 'SSO Login berhasil');
    }
}
