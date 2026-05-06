<?php

namespace App\Http\Controllers;

use App\Models\Notification;
use App\Models\Asset;
use Illuminate\Http\Request;
use Carbon\Carbon;

class NotificationController extends Controller
{
    /**
     * GET semua notification (optional filter user)
     * /api/notifications?user_id=1
     */
    public function index(Request $request)
    {
        $userId = $request->query('user_id');

        $notifications = Notification::with(['user', 'asset'])
            ->when($userId, fn($q) => $q->where('user_id', $userId))
            ->latest()
            ->get();

        return response()->json([
            'message' => 'List of notifications',
            'data' => $notifications
        ], 200);
    }

    /**
     * GET detail notification
     */
    public function show($id)
    {
        $notification = Notification::with(['user', 'asset'])->find($id);

        if (!$notification) {
            return response()->json([
                'message' => 'Notification not found'
            ], 404);
        }

        return response()->json([
            'message' => 'Notification detail',
            'data' => $notification
        ]);
    }

    /**
     * POST tambah notification manual
     */
    public function store(Request $request)
    {
        $request->validate([
            'user_id' => 'nullable|exists:master_users,id',
            'asset_id' => 'nullable|exists:master_assets,id',
            'title' => 'required|string|max:255',
            'message' => 'required|string',
            'type' => 'nullable|string|max:255',
            'status' => 'nullable|string|max:50',
        ]);

        $notification = Notification::create([
            'user_id' => $request->user_id,
            'asset_id' => $request->asset_id,
            'title' => $request->title,
            'message' => $request->message,
            'type' => $request->type,
            'status' => $request->status ?? 'Unread',
            'sent_at' => now(),
        ]);

        return response()->json([
            'message' => 'Notification created successfully',
            'data' => $notification
        ], 201);
    }

    /**
     * UPDATE notification (mark as read / edit)
     */
    public function update(Request $request, $id)
    {
        $notification = Notification::find($id);

        if (!$notification) {
            return response()->json([
                'message' => 'Notification not found'
            ], 404);
        }

        $request->validate([
            'status' => 'nullable|string|max:50',
        ]);

        $notification->update([
            'status' => $request->status ?? $notification->status,
        ]);

        return response()->json([
            'message' => 'Notification updated successfully',
            'data' => $notification
        ]);
    }

    /**
     * DELETE notification
     */
    public function destroy($id)
    {
        $notification = Notification::find($id);

        if (!$notification) {
            return response()->json([
                'message' => 'Notification not found'
            ], 404);
        }

        $notification->delete();

        return response()->json([
            'message' => 'Notification deleted successfully'
        ]);
    }

    /**
     * 🔢 UNREAD COUNT (per user)
     * /api/notifications/unread-count?user_id=1
     */
    public function unreadCount(Request $request)
    {
        $userId = $request->query('user_id');

        $count = Notification::when($userId, fn($q) => $q->where('user_id', $userId))
            ->where('status', 'Unread')
            ->count();

        return response()->json([
            'message' => 'Unread count',
            'data' => $count
        ]);
    }

    /**
     * ✔️ MARK 1 AS READ
     */
    public function markAsRead($id)
    {
        $notif = Notification::find($id);

        if (!$notif) {
            return response()->json([
                'message' => 'Notification not found'
            ], 404);
        }

        $notif->update(['status' => 'Read']);

        return response()->json([
            'message' => 'Notification marked as read',
            'data' => $notif
        ]);
    }

    /**
     * ✔️ MARK ALL AS READ (per user)
     * /api/notifications/read-all?user_id=1
     */
    public function markAllAsRead(Request $request)
    {
        $userId = $request->query('user_id');

        Notification::when($userId, fn($q) => $q->where('user_id', $userId))
            ->where('status', 'Unread')
            ->update(['status' => 'Read']);

        return response()->json([
            'message' => 'All notifications marked as read'
        ]);
    }

    /**
     * 🔔 AUTO CHECK WARRANTY (H-7)
     */
    public function checkWarranty()
    {
        $today = Carbon::now();
        $limit = Carbon::now()->addDays(7);

        $assets = Asset::whereNotNull('warranty_expiry')
            ->whereBetween('warranty_expiry', [$today, $limit])
            ->get();

        $created = [];

        foreach ($assets as $asset) {

            // hitung sisa hari
            $days = $today->diffInDays($asset->warranty_expiry, false);

            // anti duplicate per hari + asset
            $exists = Notification::where('asset_id', $asset->id)
                ->whereDate('created_at', $today->toDateString())
                ->exists();

            if ($exists) {
                continue;
            }

            $notif = Notification::create([
                'user_id' => $asset->assigned_user_id ?? 1,
                'asset_id' => $asset->id,
                'title' => 'Warranty Expiring Soon',
                'message' => "{$asset->asset_name} expires in {$days} days ({$asset->warranty_expiry})",
                'type' => 'Warranty',
                'status' => 'Unread',
                'sent_at' => now(),
            ]);

            $created[] = $notif;
        }

        return response()->json([
            'message' => 'Warranty check completed',
            'total_notifications' => count($created),
            'data' => $created
        ]);
    }
}