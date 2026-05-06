<?php

use Illuminate\Support\Facades\Route;
use App\Http\Controllers\ImportExcelController;


Route::get('/', function () {
    return view('welcome');
});
