import { Header } from "@/components/landing/header";
import { Footer } from "@/components/landing/footer";

export default function MarketingLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  return (
    <div className="flex min-h-screen flex-col bg-white text-gray-900" style={{ colorScheme: "light" }}>
      <Header />
      <main className="flex-1">{children}</main>
      <Footer />
    </div>
  );
}
