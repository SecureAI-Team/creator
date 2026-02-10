import { Hero } from "@/components/landing/hero";
import { Features } from "@/components/landing/features";
import { Platforms } from "@/components/landing/platforms";
import { Tools } from "@/components/landing/tools";
import { Pricing } from "@/components/landing/pricing";

export default function LandingPage() {
  return (
    <>
      <Hero />
      <Features />
      <Platforms />
      <Tools />
      <Pricing />
    </>
  );
}
