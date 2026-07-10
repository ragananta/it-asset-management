import React from "react";

interface EmptyStateProps {
  title: string;
  description?: string;
  icon?: React.ReactNode;
  variant?: "table" | "page";
}

export default function EmptyState({
  title,
  description,
  icon,
  variant = "page",
}: EmptyStateProps) {
  const isTable = variant === "table";

  return (
    <div className={`flex flex-col items-center justify-center text-center ${
      isTable ? "py-10 px-4 bg-white" : "py-16 px-6 bg-white rounded-2xl border border-gray-100 shadow-sm"
    }`}>
      {icon && (
        <div className={`rounded-full bg-slate-50 flex items-center justify-center text-slate-400 ${
          isTable ? "w-10 h-10 mb-2" : "w-16 h-16 mb-4"
        }`}>
          {React.isValidElement(icon) ? (
            React.cloneElement(icon as React.ReactElement<any>, {
              className: isTable ? "w-5 h-5 text-slate-400" : "w-8 h-8 text-slate-400",
            })
          ) : (
            icon
          )}
        </div>
      )}
      <h3 className={`font-semibold text-slate-700 ${isTable ? "text-xs" : "text-sm"}`}>{title}</h3>
      {description && (
        <p className={`text-slate-400 max-w-xs mt-1 ${isTable ? "text-[11px]" : "text-xs"}`}>{description}</p>
      )}
    </div>
  );
}
