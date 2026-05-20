<?php

namespace App\Http\Controllers;

use App\Models\User;
use App\Traits\ApiResponse;
use Illuminate\Http\Request;
use Illuminate\Support\Facades\Hash;

class AuthController extends Controller
{
    use ApiResponse;

    // ✅ REGISTER
    public function register(Request $request)
    {
        $validated = $request->validate([
            'name'     => 'required|string|max:255',
            'email'    => 'required|email|unique:users,email',
            'password' => 'required|string|min:8|confirmed',
        ]);

        $user = User::create([
            'name'     => $validated['name'],
            'email'    => $validated['email'],
            'password' => Hash::make($validated['password']),
        ]);

        $token = $user->createToken('it-asset-token')->plainTextToken;

        // 🔥 LOG REGISTER
        activity()
            ->causedBy($user)
            ->withProperties([
                'ip' => $request->ip(),
                'browser' => $request->userAgent()
            ])
            ->log('User berhasil registrasi');

        return $this->createdResponse([
            'user'  => $user,
            'token' => $token,
        ], 'Registrasi berhasil');
    }

    // ✅ LOGIN
    public function login(Request $request)
    {
        $request->validate([
            'email'    => 'required|email',
            'password' => 'required',
        ]);

        $user = User::where('email', $request->email)->first();

        if (!$user || !Hash::check($request->password, $user->password)) {
            return $this->errorResponse('Email atau password salah', 401);
        }

        // hapus token lama (biar 1 device 1 token)
        $user->tokens()->delete();

        $token = $user->createToken('it-asset-token')->plainTextToken;

        // 🔥 LOG LOGIN
        activity()
            ->causedBy($user)
            ->withProperties([
                'ip' => $request->ip(),
                'browser' => $request->userAgent()
            ])
            ->log('User berhasil login');

        return $this->successResponse([
            'user'  => $user,
            'token' => $token,
        ], 'Login berhasil');
    }

    // ✅ LOGOUT
    public function logout(Request $request)
    {
        $user = $request->user();

        // 🔥 LOG LOGOUT
        activity()
            ->causedBy($user)
            ->withProperties([
                'ip' => $request->ip(),
                'browser' => $request->userAgent()
            ])
            ->log('User berhasil logout');

        $request->user()->currentAccessToken()->delete();

        return $this->successResponse(null, 'Logout berhasil');
    }

    // ✅ GET PROFILE
    public function me(Request $request)
    {
        return $this->successResponse($request->user(), 'Data user berhasil diambil');
    }
}