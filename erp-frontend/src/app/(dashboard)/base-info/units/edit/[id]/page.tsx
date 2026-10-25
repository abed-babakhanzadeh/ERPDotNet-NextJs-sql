"use client";

import { use } from "react";
import UnitForm from "@/components/base-info/unit/UnitForm";

interface PageProps {
  params: Promise<{ id: string }>;
}

export default function EditUnitPage({ params }: PageProps) {
  const { id } = use(params);
  return <UnitForm mode="edit" id={Number(id)} />;
}
