<?php

namespace App\Http\Controllers;

use App\Models\MasterUser;
use Illuminate\Http\Request;

class MasterUserController extends Controller
{
    public function index()
    {
        return response()->json([
            'message' => 'List of users',
            'data' => MasterUser::all()
        ]);
    }

    public function store(Request $request)
    {
        $request->validate([
            'employee_name' => 'required|string|max:255',
            'email' => 'required|email'
        ]);

        $user = MasterUser::create($request->all());

        return response()->json([
            'message' => 'User created successfully',
            'data' => $user
        ], 201);
    }

    public function show($id)
    {
        $user = MasterUser::find($id);

        if (!$user) {
            return response()->json([
                'message' => 'User not found'
            ], 404);
        }

        return response()->json($user);
    }

    public function update(Request $request, $id)
    {
        $user = MasterUser::find($id);

        if (!$user) {
            return response()->json([
                'message' => 'User not found'
            ], 404);
        }

        $user->update($request->all());

        return response()->json([
            'message' => 'User updated successfully',
            'data' => $user
        ]);
    }

    public function destroy($id)
    {
        $user = MasterUser::find($id);

        if (!$user) {
            return response()->json([
                'message' => 'User not found'
            ], 404);
        }

        $user->delete();

        return response()->json([
            'message' => 'User deleted successfully'
        ]);
    }
}