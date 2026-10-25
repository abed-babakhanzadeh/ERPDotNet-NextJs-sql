"use client";

import { use } from "react";
import CompanyForm from "@/components/base-info/company/CompanyForm";

interface PageProps {
  params: Promise<{ id: string }>;
}

export default function EditCompanyPage({ params }: PageProps) {
  const { id } = use(params);
  return <CompanyForm mode="edit" id={Number(id)} />;
}
