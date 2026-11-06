import AdminNav from "@/components/AdminNav";

export const dynamic = "force-dynamic";
export const metadata = { title: "Admin" };

export default function AdminLayout({ children }: { children: React.ReactNode }) {
  return (
    <main className="page wrap" style={{ maxWidth: 1240 }}>
      <AdminNav />
      {children}
    </main>
  );
}
