"use client";

import { use } from "react";
import FiscalYearForm from "@/components/base-info/fiscal-year/FiscalYearForm";

interface PageProps {
  params: Promise<{ id: string }>;
}

export default function EditFiscalYearPage({ params }: PageProps) {
  const { id } = use(params);
  return <FiscalYearForm mode="edit" id={Number(id)} />;
}
