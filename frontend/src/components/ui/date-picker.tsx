import * as React from "react"
import { Calendar as CalendarIcon, ChevronLeft, ChevronRight, X } from "lucide-react"
import { cn } from "@/lib/utils"

export interface DatePickerProps {
  value?: string // format YYYY-MM-DD
  onChange: (value: string) => void
  placeholder?: string
  className?: string
  required?: boolean
  error?: boolean
  align?: "left" | "right"
}

export function DatePicker({
  value,
  onChange,
  placeholder = "Pilih tanggal...",
  className,
  error,
  align = "left",
}: DatePickerProps) {
  const [isOpen, setIsOpen] = React.useState(false)
  const containerRef = React.useRef<HTMLDivElement>(null)

  // Parse current date value
  const selectedDate = React.useMemo(() => {
    if (!value) return null
    const parsed = new Date(value)
    return isNaN(parsed.getTime()) ? null : parsed
  }, [value])

  // Track the month currently displayed in calendar view
  const [currentMonth, setCurrentMonth] = React.useState(() => {
    return selectedDate ? new Date(selectedDate.getFullYear(), selectedDate.getMonth(), 1) : new Date()
  })

  // Keep calendar view in sync when selected date changes externally
  React.useEffect(() => {
    if (selectedDate) {
      setCurrentMonth(new Date(selectedDate.getFullYear(), selectedDate.getMonth(), 1))
    }
  }, [selectedDate])

  // Close popup when clicking outside
  React.useEffect(() => {
    function handleClickOutside(event: MouseEvent) {
      if (containerRef.current && !containerRef.current.contains(event.target as Node)) {
        setIsOpen(false)
      }
    }
    document.addEventListener("mousedown", handleClickOutside)
    return () => document.removeEventListener("mousedown", handleClickOutside)
  }, [])

  // Date Calculations
  const year = currentMonth.getFullYear()
  const month = currentMonth.getMonth()

  const monthNames = [
    "Januari", "Februari", "Maret", "April", "Mei", "Juni",
    "Juli", "Agustus", "September", "Oktober", "November", "Desember"
  ]

  const daysInMonth = new Date(year, month + 1, 0).getDate()
  const startDayOfWeek = new Date(year, month, 1).getDay() // 0 = Sunday, 1 = Monday, etc.

  // Calendar cells: days of current month, previous month offsets, and next month offsets
  const cells = React.useMemo(() => {
    const tempCells: { date: Date; isCurrentMonth: boolean }[] = []

    // 1. Previous month offset days
    const prevMonthDays = new Date(year, month, 0).getDate()
    const offset = startDayOfWeek // Sunday start alignment
    for (let i = offset - 1; i >= 0; i--) {
      tempCells.push({
        date: new Date(year, month - 1, prevMonthDays - i),
        isCurrentMonth: false
      })
    }

    // 2. Current month days
    for (let i = 1; i <= daysInMonth; i++) {
      tempCells.push({
        date: new Date(year, month, i),
        isCurrentMonth: true
      })
    }

    // 3. Next month offset days to fill standard 6-week grid (42 days)
    const remaining = 42 - tempCells.length
    for (let i = 1; i <= remaining; i++) {
      tempCells.push({
        date: new Date(year, month + 1, i),
        isCurrentMonth: false
      })
    }

    return tempCells
  }, [year, month, startDayOfWeek, daysInMonth])

  // Format Helper
  const formatDateString = (date: Date) => {
    const y = date.getFullYear()
    const m = String(date.getMonth() + 1).padStart(2, "0")
    const d = String(date.getDate()).padStart(2, "0")
    return `${y}-${m}-${d}`
  }

  const handleSelectDate = (date: Date) => {
    onChange(formatDateString(date))
    setIsOpen(false)
  }

  const handleClear = () => {
    onChange("")
    setIsOpen(false)
  }

  const handleToday = () => {
    const today = new Date()
    onChange(formatDateString(today))
    setIsOpen(false)
  }

  const handlePrevMonth = (e: React.MouseEvent) => {
    e.preventDefault()
    e.stopPropagation()
    setCurrentMonth(new Date(year, month - 1, 1))
  }

  const handleNextMonth = (e: React.MouseEvent) => {
    e.preventDefault()
    e.stopPropagation()
    setCurrentMonth(new Date(year, month + 1, 1))
  }

  // Display value for input (DD/MM/YYYY)
  const displayValue = React.useMemo(() => {
    if (!selectedDate) return ""
    const d = String(selectedDate.getDate()).padStart(2, "0")
    const m = String(selectedDate.getMonth() + 1).padStart(2, "0")
    const y = selectedDate.getFullYear()
    return `${d}/${m}/${y}`
  }, [selectedDate])

  // Keyboard Navigation & Accessibility
  const handleKeyDown = (e: React.KeyboardEvent) => {
    if (e.key === "Escape") {
      setIsOpen(false)
    } else if (e.key === "Enter" && !isOpen) {
      setIsOpen(true)
      e.preventDefault()
    }
  }

  const isToday = (date: Date) => {
    const today = new Date()
    return date.getDate() === today.getDate() &&
      date.getMonth() === today.getMonth() &&
      date.getFullYear() === today.getFullYear()
  }

  const isSelected = (date: Date) => {
    if (!selectedDate) return false
    return date.getDate() === selectedDate.getDate() &&
      date.getMonth() === selectedDate.getMonth() &&
      date.getFullYear() === selectedDate.getFullYear()
  }

  return (
    <div className="relative w-full" ref={containerRef}>
      {/* Input Field wrapper */}
      <div className="relative flex items-center">
        <input
          type="text"
          readOnly
          placeholder={placeholder}
          value={displayValue}
          onClick={() => setIsOpen(!isOpen)}
          onKeyDown={handleKeyDown}
          className={cn(
            "w-full h-11 px-3.5 pr-10 text-sm bg-white border rounded-xl outline-none transition-all cursor-pointer placeholder:text-gray-400 select-none",
            error
              ? "border-red-400 focus:border-red-500 focus:ring-[3px] focus:ring-red-500/10"
              : "border-slate-200 focus:border-emerald-500 focus:ring-[3px] focus:ring-emerald-500/10 hover:border-slate-300",
            className
          )}
        />
        <div className="absolute right-3.5 flex items-center gap-1.5 pointer-events-none">
          {value && (
            <button
              type="button"
              onClick={(e) => {
                e.stopPropagation()
                handleClear()
              }}
              className="p-0.5 rounded-full text-gray-400 hover:text-gray-600 hover:bg-gray-100 pointer-events-auto transition"
            >
              <X className="w-3.5 h-3.5" />
            </button>
          )}
          <CalendarIcon className="w-5 h-5 text-slate-400" />
        </div>
      </div>

      {/* Floating Calendar Popup Container */}
      {isOpen && (
        <div
          className={cn(
            "absolute z-50 mt-2 w-[280px] bg-white border border-[#e2e8f0] rounded-2xl shadow-xl shadow-slate-200/50 p-3 select-none focus:outline-none transition-all duration-150 scale-100 opacity-100 animate-in fade-in zoom-in-95",
            align === "right" ? "right-0 origin-top-right" : "left-0 origin-top-left"
          )}
        >
          {/* Header Month Selector */}
          <div className="flex items-center justify-between mb-4">
            <span className="text-base font-bold text-slate-800">
              {monthNames[month]} {year}
            </span>
            <div className="flex items-center gap-1">
              <button
                type="button"
                onClick={handlePrevMonth}
                className="w-9 h-9 flex items-center justify-center rounded-full text-slate-600 hover:bg-slate-100 hover:text-slate-800 transition-colors duration-150 active:scale-95"
              >
                <ChevronLeft className="w-4.5 h-4.5" />
              </button>
              <button
                type="button"
                onClick={handleNextMonth}
                className="w-9 h-9 flex items-center justify-center rounded-full text-slate-600 hover:bg-slate-100 hover:text-slate-800 transition-colors duration-150 active:scale-95"
              >
                <ChevronRight className="w-4.5 h-4.5" />
              </button>
            </div>
          </div>

          {/* Week Labels grid */}
          <div className="grid grid-cols-7 gap-y-1 mb-2 text-center text-[10px] uppercase font-bold text-slate-400 tracking-wider">
            <span>Min</span>
            <span>Sen</span>
            <span>Sel</span>
            <span>Rab</span>
            <span>Kam</span>
            <span>Jum</span>
            <span>Sab</span>
          </div>

          {/* Days Grid */}
          <div className="grid grid-cols-7 gap-1 text-center">
            {cells.map(({ date, isCurrentMonth }, idx) => {
              const selected = isSelected(date)
              const today = isToday(date)

              return (
                <button
                  key={idx}
                  type="button"
                  onClick={() => handleSelectDate(date)}
                  className={cn(
                    "w-8 h-8 flex items-center justify-center text-[13px] font-medium rounded-lg transition-all duration-150 active:scale-90",
                    isCurrentMonth ? "text-slate-700" : "text-slate-300 opacity-60",
                    today && !selected && "border-2 border-[#10b981] text-[#10b981] font-semibold",
                    selected
                      ? "bg-[#10b981] text-white font-semibold shadow-sm shadow-emerald-500/25"
                      : "hover:bg-slate-100"
                  )}
                >
                  {date.getDate()}
                </button>
              )
            })}
          </div>

          {/* Footer Actions */}
          <div className="flex items-center justify-between mt-3 pt-3 border-t border-[#e2e8f0]">
            <button
              type="button"
              onClick={handleClear}
              className="px-3 py-1.5 text-xs font-semibold text-slate-500 hover:text-slate-800 hover:bg-slate-100 rounded-lg transition-all duration-150"
            >
              Clear
            </button>
            <button
              type="button"
              onClick={handleToday}
              className="px-3 py-1.5 text-xs font-semibold text-emerald-600 hover:text-emerald-700 hover:bg-slate-100 rounded-lg transition-all duration-150"
            >
              Today
            </button>
          </div>
        </div>
      )}
    </div>
  )
}
