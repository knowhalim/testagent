"use client";

import React, { useState, useRef, useCallback } from "react";
import { cn } from "@/lib/utils";
import { Upload, X, FileText } from "lucide-react";

interface FileUploadProps {
  onFileSelect: (file: File) => void;
  onFileClear?: () => void;
  accept?: string;
  maxSizeMB?: number;
  className?: string;
  label?: string;
  hint?: string;
  error?: string;
  selectedFile?: File | null;
}

export function FileUpload({
  onFileSelect,
  onFileClear,
  accept,
  maxSizeMB = 10,
  className,
  label,
  hint,
  error,
  selectedFile,
}: FileUploadProps) {
  const [isDragging, setIsDragging] = useState(false);
  const [fileError, setFileError] = useState<string | null>(null);
  const inputRef = useRef<HTMLInputElement>(null);

  const validateAndSelect = useCallback(
    (file: File) => {
      setFileError(null);
      if (maxSizeMB && file.size > maxSizeMB * 1024 * 1024) {
        setFileError(`File must be under ${maxSizeMB}MB`);
        return;
      }
      onFileSelect(file);
    },
    [maxSizeMB, onFileSelect]
  );

  const handleDragOver = useCallback((e: React.DragEvent) => {
    e.preventDefault();
    setIsDragging(true);
  }, []);

  const handleDragLeave = useCallback((e: React.DragEvent) => {
    e.preventDefault();
    setIsDragging(false);
  }, []);

  const handleDrop = useCallback(
    (e: React.DragEvent) => {
      e.preventDefault();
      setIsDragging(false);
      const file = e.dataTransfer.files[0];
      if (file) validateAndSelect(file);
    },
    [validateAndSelect]
  );

  const handleChange = useCallback(
    (e: React.ChangeEvent<HTMLInputElement>) => {
      const file = e.target.files?.[0];
      if (file) validateAndSelect(file);
    },
    [validateAndSelect]
  );

  const handleClear = useCallback(() => {
    setFileError(null);
    if (inputRef.current) inputRef.current.value = "";
    onFileClear?.();
  }, [onFileClear]);

  const displayError = error || fileError;

  return (
    <div className={cn("w-full", className)}>
      {label && (
        <label className="block text-sm font-medium text-text-primary mb-1.5">
          {label}
        </label>
      )}

      {selectedFile ? (
        <div className="flex items-center gap-3 p-4 bg-surface-1 border border-border-subtle rounded-card">
          <FileText className="h-8 w-8 text-primary shrink-0" />
          <div className="flex-1 min-w-0">
            <p className="text-sm font-medium text-text-primary truncate">
              {selectedFile.name}
            </p>
            <p className="text-xs text-text-tertiary">
              {(selectedFile.size / 1024).toFixed(1)} KB
            </p>
          </div>
          <button
            type="button"
            onClick={handleClear}
            className="p-2 rounded-button text-text-tertiary hover:text-text-primary hover:bg-surface-2 transition-colors"
            aria-label="Remove file"
          >
            <X className="h-4 w-4" />
          </button>
        </div>
      ) : (
        <div
          onDragOver={handleDragOver}
          onDragLeave={handleDragLeave}
          onDrop={handleDrop}
          onClick={() => inputRef.current?.click()}
          className={cn(
            "flex flex-col items-center justify-center gap-3 p-8",
            "border-2 border-dashed rounded-card cursor-pointer",
            "transition-colors duration-200",
            isDragging
              ? "border-primary bg-primary/5"
              : "border-border-subtle hover:border-border-default hover:bg-surface-1/50",
            displayError && "border-danger"
          )}
        >
          <Upload
            className={cn(
              "h-8 w-8",
              isDragging ? "text-primary" : "text-text-tertiary"
            )}
          />
          <div className="text-center">
            <p className="text-sm text-text-primary">
              <span className="text-primary font-medium">Click to upload</span>{" "}
              or drag and drop
            </p>
            {hint && (
              <p className="text-xs text-text-tertiary mt-1">{hint}</p>
            )}
          </div>
          <input
            ref={inputRef}
            type="file"
            accept={accept}
            onChange={handleChange}
            className="hidden"
          />
        </div>
      )}

      {displayError && (
        <p className="mt-1.5 text-sm text-danger">{displayError}</p>
      )}
    </div>
  );
}
