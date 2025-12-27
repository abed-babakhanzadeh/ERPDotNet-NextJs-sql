import { ProductForm } from "@/modules/base-info/products/components/ProductForm";
export default function EditPage({ params }: { params: { id: string } }) {
  // نکته: در نکست 13+ params پرامیس نیست اما در نسخه های جدیدتر ممکن است باشد
  // اگر ارور داد await کنید
  return <ProductForm mode="edit" id={Number(params.id)} />;
}
