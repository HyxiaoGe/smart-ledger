import * as React from "react"
import { X } from "lucide-react"
import { cn } from "@/lib/utils/helpers"
import { Input } from "./input"

export interface ClearableInputProps
  extends React.InputHTMLAttributes<HTMLInputElement> {
  onClear?: () => void;
}

const ClearableInput = React.forwardRef<HTMLInputElement, ClearableInputProps>(
  ({ className, value, onClear, ...props }, ref) => {
    const hasValue = value !== undefined && value !== null && value !== '';

    return (
      <div className="relative">
        <Input
          ref={ref}
          value={value}
          className={cn("pr-8", className)}
          {...props}
        />
        {hasValue && !props.disabled && (
          <button
            type="button"
            onClick={(e) => {
              e.preventDefault();
              e.stopPropagation();
              onClear?.();
            }}
            className="absolute right-2 top-1/2 -translate-y-1/2 h-5 w-5 rounded-full hover:bg-gray-100 flex items-center justify-center text-gray-400 hover:text-gray-600 transition-colors"
            tabIndex={-1}
          >
            <X className="h-3.5 w-3.5" />
          </button>
        )}
      </div>
    )
  }
)

ClearableInput.displayName = "ClearableInput"

export { ClearableInput }
