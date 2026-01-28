import { Sparkles, Scissors, Palette, Zap, Eye } from "lucide-react";
import { SelectedSpecialty } from "@/pages/Index";

interface ServiceLink {
  id: SelectedSpecialty;
  label: string;
  icon: React.ReactNode;
}

const serviceLinks: ServiceLink[] = [
  {
    id: "nails",
    label: "Nail's",
    icon: <Sparkles className="w-6 h-6" />,
  },
  {
    id: "threading",
    label: "Threading",
    icon: <Scissors className="w-6 h-6" />,
  },
  {
    id: "makeup",
    label: "Maquilhagem",
    icon: <Palette className="w-6 h-6" />,
  },
  {
    id: "laser",
    label: "Depilação a Laser",
    icon: <Zap className="w-6 h-6" />,
  },
  {
    id: "lashes",
    label: "Pestanas",
    icon: <Eye className="w-6 h-6" />,
  },
];

interface ServiceNavigationProps {
  selectedSpecialty: SelectedSpecialty;
  onSelectSpecialty: (specialty: SelectedSpecialty) => void;
}

const ServiceNavigation = ({ selectedSpecialty, onSelectSpecialty }: ServiceNavigationProps) => {
  const handleClick = (id: SelectedSpecialty) => {
    if (selectedSpecialty === id) {
      onSelectSpecialty(null); // Toggle off if clicking same specialty
    } else {
      onSelectSpecialty(id);
    }
  };

  return (
    <section className="py-12 px-4 bg-secondary/30">
      <div className="container mx-auto">
        <p className="text-center text-muted-foreground font-body mb-6">
          Selecione uma especialidade para ver os serviços disponíveis
        </p>
        <div className="flex flex-wrap justify-center gap-4 md:gap-8">
          {serviceLinks.map((link) => {
            const isSelected = selectedSpecialty === link.id;
            return (
              <button
                key={link.id}
                onClick={() => handleClick(link.id)}
                className={`group flex flex-col items-center gap-2 p-4 rounded-xl border transition-all duration-300 min-w-[120px] ${
                  isSelected 
                    ? "bg-primary border-primary shadow-lg shadow-primary/20" 
                    : "bg-card border-border/50 hover:border-primary/50 hover:shadow-lg hover:shadow-primary/10"
                }`}
              >
                <div className={`p-3 rounded-full transition-colors duration-300 ${
                  isSelected 
                    ? "bg-primary-foreground/20 text-primary-foreground" 
                    : "bg-primary/10 text-primary group-hover:bg-primary group-hover:text-primary-foreground"
                }`}>
                  {link.icon}
                </div>
                <span className={`font-display font-medium text-sm text-center ${
                  isSelected ? "text-primary-foreground" : "text-foreground"
                }`}>
                  {link.label}
                </span>
              </button>
            );
          })}
        </div>
      </div>
    </section>
  );
};

export default ServiceNavigation;
