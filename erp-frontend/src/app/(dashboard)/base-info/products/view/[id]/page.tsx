import { ProductForm } from "@/modules/base-info/products/components/ProductForm";

interface ViewProductPageProps {
  params: { id: string };
}

export default function ViewProductPage({ params }: ViewProductPageProps) {
  // تبدیل id به عدد (در صورت نیاز)
  return <ProductForm mode="view" id={Number(params.id)} />;
}
