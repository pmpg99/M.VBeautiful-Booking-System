import { useState } from "react";
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import { ScrollArea } from "@/components/ui/scroll-area";
import { Loader2 } from "lucide-react";
import ServiceCard from "./ServiceCard";
import BookingCalendar from "./BookingCalendar";
import ServiceOptionsModal from "./ServiceOptionsModal";
import { SelectedSpecialty } from "@/pages/Index";
import { useServices, Service, ServiceOption } from "@/hooks/useServices";

// Map specialty to category slugs
const specialtyToCategorySlugs: Record<Exclude<SelectedSpecialty, null>, string[]> = {
  nails: ["nails"],
  threading: ["epilacao-linha"],
  makeup: ["maquilhagem"],
  laser: ["depilacao-a-laser"],
  lashes: ["pestanas"],
};

const specialtyLabels: Record<Exclude<SelectedSpecialty, null>, string> = {
  nails: "Nail's",
  threading: "Threading",
  makeup: "Maquilhagem",
  laser: "Depilação a Laser",
  lashes: "Pestanas",
};

// Booking data interface that can hold either a Service or a ServiceOption
interface BookingData {
  name: string;
  price: number;
  duration_minutes: number;
  category_id: string;
  responsible_admin_id?: string | null;
}

interface ServicesDialogProps {
  selectedSpecialty: SelectedSpecialty;
  onClose: () => void;
}

const ServicesDialog = ({ selectedSpecialty, onClose }: ServicesDialogProps) => {
  const [isBookingOpen, setIsBookingOpen] = useState(false);
  const [selectedBookingData, setSelectedBookingData] = useState<BookingData | null>(null);
  const [optionsModalOpen, setOptionsModalOpen] = useState(false);
  const [selectedServiceForOptions, setSelectedServiceForOptions] = useState<Service | null>(null);
  
  const { categories, services, serviceOptions, isLoading, formatDuration, formatPrice, getOptionsByService } = useServices();

  const handleBook = (service: Service) => {
    // Check if service has Level 3 options
    if (service.has_options) {
      const options = getOptionsByService(service.id);
      if (options.length > 0) {
        setSelectedServiceForOptions(service);
        setOptionsModalOpen(true);
        return;
      }
    }
    
    // No options, book directly with service data
    setSelectedBookingData({
      name: service.name,
      price: service.price,
      duration_minutes: service.duration_minutes,
      category_id: service.category_id,
      responsible_admin_id: service.responsible_admin_id,
    });
    setIsBookingOpen(true);
  };

  const handleSelectOption = (option: ServiceOption) => {
    if (!selectedServiceForOptions) return;
    
    // Create booking data from the selected option
    setSelectedBookingData({
      name: `${selectedServiceForOptions.name} - ${option.name}`,
      price: option.price,
      duration_minutes: option.duration_minutes,
      category_id: selectedServiceForOptions.category_id,
      responsible_admin_id: selectedServiceForOptions.responsible_admin_id,
    });
    setOptionsModalOpen(false);
    setSelectedServiceForOptions(null);
    setIsBookingOpen(true);
  };

  // Get matching categories for this specialty - use exact slug matching only
  const matchingCategories = selectedSpecialty
    ? categories.filter((cat) =>
        specialtyToCategorySlugs[selectedSpecialty].includes(cat.slug)
      )
    : [];

  const isOpen = selectedSpecialty !== null;

  // Check if this is a laser category
  const isLaserCategory = (slug: string) => 
    slug.includes("laser");

  // Check if this is pestanas category
  const isPestanasCategory = (slug: string) => 
    slug.includes("pestanas");

  // Get display price for service card
  const getDisplayPrice = (service: Service): string => {
    if (service.has_options) {
      const options = getOptionsByService(service.id);
      if (options.length > 0) {
        const minPrice = Math.min(...options.map(o => o.price));
        return `desde ${formatPrice(minPrice)}`;
      }
    }
    return formatPrice(service.price);
  };

  // Get display duration for service card
  const getDisplayDuration = (service: Service): string => {
    if (service.has_options) {
      const options = getOptionsByService(service.id);
      if (options.length > 0) {
        const minDuration = Math.min(...options.map(o => o.duration_minutes));
        const maxDuration = Math.max(...options.map(o => o.duration_minutes));
        if (minDuration === maxDuration) {
          return formatDuration(minDuration);
        }
        return `${formatDuration(minDuration)} - ${formatDuration(maxDuration)}`;
      }
    }
    return formatDuration(service.duration_minutes);
  };

  return (
    <>
      <Dialog open={isOpen} onOpenChange={(open) => !open && onClose()}>
        <DialogContent className="max-w-4xl max-h-[85vh] p-0 bg-background border-border">
          <DialogHeader className="p-6 pb-0">
            <DialogTitle className="text-2xl font-display text-foreground">
              {selectedSpecialty && specialtyLabels[selectedSpecialty]}
            </DialogTitle>
          </DialogHeader>
          
          <ScrollArea className="max-h-[calc(85vh-100px)] px-6 pb-6">
            {isLoading ? (
              <div className="flex items-center justify-center py-12">
                <Loader2 className="h-8 w-8 animate-spin text-muted-foreground" />
              </div>
            ) : matchingCategories.length === 0 ? (
              <div className="text-center py-12 text-muted-foreground">
                <p>Nenhum serviço disponível nesta categoria.</p>
              </div>
            ) : (
              <div className="space-y-8 pt-4">
                {matchingCategories.map((category) => {
                  const categoryServices = services.filter(
                    (s) => s.category_id === category.id
                  );
                  
                  if (categoryServices.length === 0) return null;

                  return (
                    <div key={category.id}>
                      <h3 className="text-xl font-display font-semibold text-foreground mb-2">
                        {category.name}
                      </h3>
                      {isLaserCategory(category.slug) && (
                        <p className="text-sm text-muted-foreground mb-4">
                          Disponível apenas no último fim de semana de cada mês (Sábado e Domingo, 9h-19h)
                        </p>
                      )}
                      {isPestanasCategory(category.slug) && (
                        <p className="text-sm text-muted-foreground mb-4">
                          Serviço realizado pela profissional{" "}
                          <span className="font-medium text-foreground">
                            Joana Lindinho
                          </span>
                        </p>
                      )}
                      <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                        {categoryServices.map((service, index) => (
                          <div
                            key={service.id}
                            className="animate-fade-in-up"
                            style={{ animationDelay: `${index * 50}ms` }}
                          >
                            <ServiceCard
                              title={service.name}
                              description={service.description || undefined}
                              price={getDisplayPrice(service)}
                              duration={getDisplayDuration(service)}
                              onBook={() => handleBook(service)}
                              hasOptions={service.has_options}
                            />
                          </div>
                        ))}
                      </div>
                    </div>
                  );
                })}
              </div>
            )}
          </ScrollArea>
        </DialogContent>
      </Dialog>

      {/* Level 3 Options Modal */}
      {selectedServiceForOptions && (
        <ServiceOptionsModal
          isOpen={optionsModalOpen}
          onClose={() => {
            setOptionsModalOpen(false);
            setSelectedServiceForOptions(null);
          }}
          serviceName={selectedServiceForOptions.name}
          options={getOptionsByService(selectedServiceForOptions.id)}
          onSelectOption={handleSelectOption}
          formatPrice={formatPrice}
          formatDuration={formatDuration}
        />
      )}

      {/* Booking Calendar - now uses BookingData instead of Service */}
      <BookingCalendar
        isOpen={isBookingOpen}
        onClose={() => setIsBookingOpen(false)}
        bookingData={selectedBookingData}
      />
    </>
  );
};

export default ServicesDialog;
