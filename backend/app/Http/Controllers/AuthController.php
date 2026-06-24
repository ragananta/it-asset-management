<?php

namespace App\Http\Controllers;

use App\Models\User;
use App\Models\Log;
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

        // ✅ LOG REGISTER — pakai tabel logs (konsisten dengan controller lain)
        Log::create([
            'user_id'     => $user->id,
            'activity'    => 'register',
            'description' => "User baru '{$user->name}' berhasil registrasi",
            'ip_address'  => $request->ip(),
            'user_agent'  => $request->userAgent(),
        ]);

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

        // Generate token baru tanpa menghapus token aktif lain
        $token = $user->createToken('it-asset-token')->plainTextToken;

        // ✅ LOG LOGIN — pakai tabel logs
        Log::create([
            'user_id'     => $user->id,
            'activity'    => 'login',
            'description' => "User '{$user->name}' berhasil login",
            'ip_address'  => $request->ip(),
            'user_agent'  => $request->userAgent(),
        ]);

        return $this->successResponse([
            'user'  => $user,
            'token' => $token,
        ], 'Login berhasil');
    }

    // ✅ LOGOUT
    public function logout(Request $request)
    {
        $user = $request->user();

        // ✅ LOG LOGOUT — pakai tabel logs
        Log::create([
            'user_id'     => $user->id,
            'activity'    => 'logout',
            'description' => "User '{$user->name}' berhasil logout",
            'ip_address'  => $request->ip(),
            'user_agent'  => $request->userAgent(),
        ]);

        $request->user()->currentAccessToken()->delete();

        return $this->successResponse(null, 'Logout berhasil');
    }

    // ✅ GET PROFILE
    public function me(Request $request)
    {
        return $this->successResponse($request->user(), 'Data user berhasil diambil');
    }
}