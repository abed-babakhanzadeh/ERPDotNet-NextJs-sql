"use client";

import { useEffect, useRef } from "react";

interface Props {
  checked: boolean;
  indeterminate?: boolean; // حالت خط تیره
  onChange: (e: React.ChangeEvent<HTMLInputElement>) => void;
  className?: string;
}

export default function IndeterminateCheckbox({ indeterminate = false, ...props }: Props) {
  const ref = useRef<HTMLInputElement>(null);

  useEffect(() => {
    if (ref.current) {
      ref.current.indeterminate = indeterminate;
    }
  }, [indeterminate]);

  return (
    <input
      type="checkbox"
      ref={ref}
      {...props}
      className={`w-4 h-4 rounded border-gray-300 text-blue-600 focus:ring-blue-500 cursor-pointer ${props.className}`}
    />
  );
}