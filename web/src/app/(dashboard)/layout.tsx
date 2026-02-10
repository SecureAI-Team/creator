import { Sidebar } from "@/components/dashboard/sidebar";
import { Providers } from "@/components/providers";

export default function DashboardLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  return (
    <Providers>
      <div className="flex min-h-screen bg-gray-50" style={{ colorScheme: "light" }}>
        <Sidebar />
        <main className="flex-1 overflow-auto">
          <div className="p-6 lg:p-8 max-w-7xl">{children}</div>
        </main>
      </div>
    </Providers>
  );
}
