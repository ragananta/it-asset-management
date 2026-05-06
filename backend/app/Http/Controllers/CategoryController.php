<?php

namespace App\Http\Controllers;

use App\Models\Category;
use Illuminate\Http\Request;

class CategoryController extends Controller
{
    // GET semua category
    public function index()
    {
        return response()->json([
            'message' => 'List of categories',
            'data' => Category::all()
        ]);
    }

    // POST tambah category
    public function store(Request $request)
    {
        $request->validate([
            'category_name' => 'required|string|max:255'
        ]);

        $category = Category::create($request->all());

        return response()->json([
            'message' => 'Category created successfully',
            'data' => $category
        ], 201);
    }

    // GET detail category
    public function show($id)
    {
        $category = Category::find($id);

        if (!$category) {
            return response()->json([
                'message' => 'Category not found'
            ], 404);
        }

        return response()->json([
            'message' => 'Category detail',
            'data' => $category
        ]);
    }

    // PUT update category
    public function update(Request $request, $id)
    {
        $category = Category::find($id);

        if (!$category) {
            return response()->json([
                'message' => 'Category not found'
            ], 404);
        }

        $request->validate([
            'category_name' => 'required|string|max:255'
        ]);

        $category->update($request->all());

        return response()->json([
            'message' => 'Category updated successfully',
            'data' => $category
        ]);
    }

    // DELETE category
    public function destroy($id)
    {
        $category = Category::find($id);

        if (!$category) {
            return response()->json([
                'message' => 'Category not found'
            ], 404);
        }

        $category->delete();

        return response()->json([
            'message' => 'Category deleted successfully'
        ]);
    }
}