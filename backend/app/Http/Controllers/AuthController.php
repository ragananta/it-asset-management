<?php

namespace App\Http\Controllers;

use Illuminate\Http\Request;
use App\Models\MasterUser;
use Illuminate\Support\Facades\Hash;

class AuthController extends Controller
{
    public function login(Request $request)
    {
        // ✅ VALIDASI
        $validated = $request->validate([
            'email' => 'required|email',
            'password' => 'required|string'
        ]);

        // ✅ TRIM INPUT (PENTING BANGET)
        $email = trim($validated['email']);
        $password = trim($validated['password']);

        // ✅ AMBIL USER
        $user = MasterUser::where('email', $email)->first();

        // ❌ USER TIDAK ADA
        if (!$user) {
            return response()->json([
                'message' => 'Email tidak terdaftar'
            ], 404);
        }

        // ❌ HANDLE PASSWORD RUSAK (NON-BCRYPT)
        if (!str_starts_with($user->password, '$2y$')) {
            return response()->json([
                'message' => 'Password belum terenkripsi (fix database)'
            ], 500);
        }

        // ❌ PASSWORD SALAH
        if (!Hash::check($password, $user->password)) {
            return response()->json([
                'message' => 'Password salah'
            ], 401);
        }

        // ❌ USER NONAKTIF
        if ($user->status !== 'Active') {
            return response()->json([
                'message' => 'Akun tidak aktif'
            ], 403);
        }

        // ✅ HAPUS TOKEN LAMA
        $user->tokens()->delete();

        // ✅ BUAT TOKEN
        $token = $user->createToken('auth_token')->plainTextToken;

        return response()->json([
            'message' => 'Login success',
            'token' => $token,
            'user' => $user
        ]);
    }

    public function me(Request $request)
    {
        return response()->json([
            'user' => $request->user()
        ]);
    }

    public function logout(Request $request)
    {
        $request->user()->currentAccessToken()->delete();

        return response()->json([
            'message' => 'Logout success'
        ]);
    }
}