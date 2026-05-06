<?php

namespace App\Http\Controllers;

use App\Models\Location;
use Illuminate\Http\Request;

class LocationController extends Controller
{
    // GET semua location
    public function index()
    {
        return response()->json([
            'message' => 'List of locations',
            'data' => Location::all()
        ]);
    }

    // POST tambah location
    public function store(Request $request)
    {
        $request->validate([
            'location_name' => 'required|string|max:255'
        ]);

        $location = Location::create($request->all());

        return response()->json([
            'message' => 'Location created successfully',
            'data' => $location
        ], 201);
    }

    // GET detail location
    public function show($id)
    {
        $location = Location::find($id);

        if (!$location) {
            return response()->json([
                'message' => 'Location not found'
            ], 404);
        }

        return response()->json([
            'message' => 'Location detail',
            'data' => $location
        ]);
    }

    // PUT update location
    public function update(Request $request, $id)
    {
        $location = Location::find($id);

        if (!$location) {
            return response()->json([
                'message' => 'Location not found'
            ], 404);
        }

        $request->validate([
            'location_name' => 'required|string|max:255'
        ]);

        $location->update($request->all());

        return response()->json([
            'message' => 'Location updated successfully',
            'data' => $location
        ]);
    }

    // DELETE location
    public function destroy($id)
    {
        $location = Location::find($id);

        if (!$location) {
            return response()->json([
                'message' => 'Location not found'
            ], 404);
        }

        $location->delete();

        return response()->json([
            'message' => 'Location deleted successfully'
        ]);
    }
}