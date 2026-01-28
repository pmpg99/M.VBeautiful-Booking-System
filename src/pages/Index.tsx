import { useState } from "react";
import { Helmet } from "react-helmet-async";
import Header from "@/components/Header";
import ServiceNavigation from "@/components/ServiceNavigation";
import ServicesDialog from "@/components/ServicesDialog";
import Footer from "@/components/Footer";

export type SelectedSpecialty = "nails" | "threading" | "makeup" | "laser" | "lashes" | null;

const Index = () => {
  const [selectedSpecialty, setSelectedSpecialty] = useState<SelectedSpecialty>(null);

  return (
    <>
      <Helmet>
        <title>M.VBeautiful by Marta Vilela | Nail Art & Estética</title>
        <meta 
          name="description" 
          content="M.VBeautiful - Serviços de nail art e estética por Marta Vilela. Marcações online para manicure, verniz gel, extensões e muito mais." 
        />
      </Helmet>
      
      <div className="min-h-screen flex flex-col">
        <Header />
        <main className="flex-1">
          <ServiceNavigation 
            selectedSpecialty={selectedSpecialty} 
            onSelectSpecialty={setSelectedSpecialty} 
          />
        </main>
        <Footer />
      </div>

      <ServicesDialog
        selectedSpecialty={selectedSpecialty}
        onClose={() => setSelectedSpecialty(null)}
      />
    </>
  );
};

export default Index;
