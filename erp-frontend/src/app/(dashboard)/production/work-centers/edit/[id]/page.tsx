"use client";

import { use } from "react";
import WorkCenterForm from "@/components/production/WorkCenterForm";

interface PageProps {
  params: Promise<{ id: string }>;
}

export default function EditWorkCenterPage({ params }: PageProps) {
  const { id } = use(params);
  return <WorkCenterForm mode="edit" id={Number(id)} />;
}
