<?php

namespace App\Http\Middleware;

use Closure;
use Illuminate\Http\Request;
use Symfony\Component\HttpFoundation\Response;
use Illuminate\Support\Facades\Log;
use Illuminate\Support\Str;

class LogSatsRequest
{
    /**
     * Handle an incoming request.
     */
    public function handle(Request $request, Closure $next): Response
    {
        $startTime = microtime(true);
        $requestUuid = (string) Str::uuid();

        $request->attributes->set('request_uuid', $requestUuid);

        $response = $next($request);

        $executionTime = round((microtime(true) - $startTime) * 1000, 2);

        $logData = [
            'timestamp'      => now()->toIso8601String(),
            'request_uuid'   => $requestUuid,
            'method'         => $request->method(),
            'endpoint'       => $request->fullUrl(),
            'client_ip'      => $request->ip(),
            'http_status'    => $response->getStatusCode(),
            'execution_time' => "{$executionTime}ms",
        ];

        Log::info('SATS Request Logged', $logData);

        return $response;
    }
}
