import { Hero } from "@/components/landing/hero";
import { Features } from "@/components/landing/features";
import { Platforms } from "@/components/landing/platforms";
import { Tools } from "@/components/landing/tools";
import { Pricing } from "@/components/landing/pricing";
import { Header } from "@/components/landing/header";
import { Footer } from "@/components/landing/footer";

export default function Home() {
  return (
    <div className="flex min-h-screen flex-col">
      <Header />
      <main className="flex-1">
        <Hero />
        <Features />
        <Platforms />
        <Tools />
        <Pricing />
      </main>
      <Footer />
    </div>
  );
}
