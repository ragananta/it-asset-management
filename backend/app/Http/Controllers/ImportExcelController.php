<?php

namespace App\Http\Controllers;

use Illuminate\Http\Request;
use Maatwebsite\Excel\Facades\Excel;
use App\Imports\AssetsImport;

class ImportExcelController extends Controller
{
    public function importAssets(Request $request)
    {
        $request->validate([
            'file' => 'required|mimes:xlsx,xls,csv'
        ]);

        Excel::import(new AssetsImport, $request->file('file'));

        return response()->json([
            'message' => 'Asset imported successfully'
        ]);
    }
}