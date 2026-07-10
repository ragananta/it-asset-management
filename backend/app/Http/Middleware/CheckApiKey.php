<?php

namespace App\Http\Middleware;

use Closure;
use Illuminate\Http\Request;
use Symfony\Component\HttpFoundation\Response;

class CheckApiKey
{
    /**
     * Handle an incoming request.
     */
    public function handle(Request $request, Closure $next): Response
    {
        $apiKey = $request->header('X-API-KEY');
        $expectedKey = config('services.sats.api_key');

        if (!$apiKey) {
            return response()->json([
                'success' => false,
                'message' => 'API Key is missing.'
            ], 401);
        }

        if ($apiKey !== $expectedKey) {
            return response()->json([
                'success' => false,
                'message' => 'Invalid API Key.'
            ], 403);
        }

        return $next($request);
    }
}
