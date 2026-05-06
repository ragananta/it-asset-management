<!DOCTYPE html>
<html>
<head>
    <meta charset="utf-8">
    <title>Asset Management Report</title>

    <style>
        body {
            font-family: DejaVu Sans;
            font-size: 12px;
        }

        .header {
            text-align: center;
            margin-bottom: 10px;
        }

        .header h2 {
            margin: 0;
        }

        .header p {
            margin: 2px;
            font-size: 11px;
        }

        .summary {
            margin-top: 10px;
            margin-bottom: 10px;
        }

        .summary p {
            margin: 2px;
        }

        hr {
            margin: 10px 0;
        }

        table {
            width: 100%;
            border-collapse: collapse;
            margin-top: 10px;
        }

        table, th, td {
            border: 1px solid black;
        }

        th {
            background: #eeeeee;
            text-align: center;
        }

        td {
            padding: 6px;
        }

        .text-center {
            text-align: center;
        }
    </style>
</head>
<body>

<!-- HEADER -->
<div class="header">
    <h2>IT Asset Management System</h2>
    <p><strong>Asset Management Report</strong></p>
    <p>Generated at: {{ now() }}</p>
</div>

<hr>

<!-- SUMMARY -->
<div class="summary">
    <p>Total Assets: {{ count($assets) }}</p>
</div>

<!-- TABLE -->
<table>
    <thead>
        <tr>
            <th>No</th>
            <th>Asset Name</th>
            <th>Category</th>
            <th>Vendor</th>
            <th>Location</th>
            <th>Status</th>
        </tr>
    </thead>
    <tbody>
        @forelse($assets as $index => $asset)
        <tr>
            <td class="text-center">{{ $index + 1 }}</td>
            <td>{{ $asset->asset_name }}</td>
            <td>{{ $asset->category->category_name ?? '-' }}</td>
            <td>{{ $asset->vendor->vendor_name ?? '-' }}</td>
            <td>{{ $asset->location->location_name ?? '-' }}</td>
            <td class="text-center">{{ $asset->lifecycle_status ?? '-' }}</td>
        </tr>
        @empty
        <tr>
            <td colspan="6" class="text-center">No data available</td>
        </tr>
        @endforelse
    </tbody>
</table>

</body>
</html>