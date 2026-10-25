"use client";

import { use } from "react";
import CostCenterForm from "@/components/base-info/cost-center/CostCenterForm";

interface PageProps {
  params: Promise<{ id: string }>;
}

export default function EditCostCenterPage({ params }: PageProps) {
  const { id } = use(params);
  return <CostCenterForm mode="edit" id={Number(id)} />;
}
