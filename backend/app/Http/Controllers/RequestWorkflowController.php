<?php

namespace App\Http\Controllers;

use App\Models\Vendor;
use Illuminate\Http\Request;

class VendorController extends Controller
{
    public function index()
    {
        return response()->json(Vendor::all());
    }

    public function store(Request $request)
    {
        $request->validate([
            'vendor_name' => 'required|string|max:255'
        ]);

        $vendor = Vendor::create($request->all());

        return response()->json($vendor, 201);
    }
}