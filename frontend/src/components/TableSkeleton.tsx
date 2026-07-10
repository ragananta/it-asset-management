import React from "react";

interface TableSkeletonProps {
  columns: number;
  rows: number;
}

export default function TableSkeleton({ columns, rows }: TableSkeletonProps) {
  return (
    <>
      {Array.from({ length: rows }).map((_, rIdx) => (
        <tr key={rIdx} className="animate-pulse border-b border-slate-50 hover:bg-transparent">
          {Array.from({ length: columns }).map((_, cIdx) => (
            <td key={cIdx} className="px-5 py-4">
              <div className="h-4 bg-slate-100 rounded w-full" />
            </td>
          ))}
        </tr>
      ))}
    </>
  );
}
