<?php

namespace App\Http\Controllers;

use App\Services\FonnteService;
use App\Traits\ApiResponse;
use Illuminate\Http\Request;

class FonnteController extends Controller
{
    use ApiResponse;

    protected FonnteService $fonnteService;

    public function __construct(FonnteService $fonnteService)
    {
        $this->fonnteService = $fonnteService;
    }

    /**
     * POST /api/fonnte/send
     */
    public function send(Request $request)
    {
        $request->validate([
            'target'  => 'required|string',
            'message' => 'required|string',
        ]);

        try {
            $this->fonnteService->send(
                $request->input('target'),
                $request->input('message')
            );

            return $this->successResponse(null, 'Pesan Fonnte berhasil dikirim');
        } catch (\Exception $e) {
            return $this->errorResponse('Gagal mengirim pesan Fonnte: ' . $e->getMessage(), 500);
        }
    }
}
