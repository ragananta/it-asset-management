<?php

namespace App\Http\Controllers;

use App\Models\Vendor;
use Illuminate\Http\Request;

class VendorController extends Controller
{
    // GET semua vendor
    public function index()
    {
        return response()->json([
            'message' => 'List of vendors',
            'data' => Vendor::all()
        ]);
    }

    // POST tambah vendor
    public function store(Request $request)
    {
        $request->validate([
            'vendor_name' => 'required|string|max:255',
            'contact_person' => 'required|string|max:255',
            'phone' => 'required|string|max:20',

            'vendor_type' => 'nullable|string|max:255',
            'email' => 'nullable|email',
            'address' => 'nullable|string',
            'sla_contract' => 'nullable|string',
            'notes' => 'nullable|string',
        ]);

        $vendor = Vendor::create($request->all());

        return response()->json([
            'message' => 'Vendor created successfully',
            'data' => $vendor
        ], 201);
    }

    // GET detail vendor
    public function show($id)
    {
        $vendor = Vendor::find($id);

        if (!$vendor) {
            return response()->json([
                'message' => 'Vendor not found'
            ], 404);
        }

        return response()->json([
            'message' => 'Vendor detail',
            'data' => $vendor
        ]);
    }

    // PUT update vendor
    public function update(Request $request, $id)
    {
        $vendor = Vendor::find($id);

        if (!$vendor) {
            return response()->json([
                'message' => 'Vendor not found'
            ], 404);
        }

        $request->validate([
            'vendor_name' => 'sometimes|string|max:255',
            'contact_person' => 'sometimes|string|max:255',
            'phone' => 'sometimes|string|max:20',

            'vendor_type' => 'nullable|string|max:255',
            'email' => 'nullable|email',
            'address' => 'nullable|string',
            'sla_contract' => 'nullable|string',
            'notes' => 'nullable|string',
        ]);

        $vendor->update($request->all());

        return response()->json([
            'message' => 'Vendor updated successfully',
            'data' => $vendor
        ]);
    }

    // DELETE vendor
    public function destroy($id)
    {
        $vendor = Vendor::find($id);

        if (!$vendor) {
            return response()->json([
                'message' => 'Vendor not found'
            ], 404);
        }

        $vendor->delete();

        return response()->json([
            'message' => 'Vendor deleted successfully'
        ]);
    }
}