import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";
import { Card, CardContent } from "@/components/ui/card";
import { ServiceOption } from "@/hooks/useServices";

interface ServiceOptionsModalProps {
  isOpen: boolean;
  onClose: () => void;
  serviceName: string;
  options: ServiceOption[];
  onSelectOption: (option: ServiceOption) => void;
  formatPrice: (price: number) => string;
  formatDuration: (minutes: number) => string;
}

const ServiceOptionsModal = ({
  isOpen,
  onClose,
  serviceName,
  options,
  onSelectOption,
  formatPrice,
  formatDuration,
}: ServiceOptionsModalProps) => {
  return (
    <Dialog open={isOpen} onOpenChange={(open) => !open && onClose()}>
      <DialogContent className="max-w-md">
        <DialogHeader>
          <DialogTitle className="text-xl font-display text-center">
            Escolha uma opção para {serviceName}
          </DialogTitle>
        </DialogHeader>
        
        <div className="space-y-3 max-h-[60vh] overflow-y-auto py-4">
          {options.map((option) => (
            <Card 
              key={option.id}
              className="cursor-pointer hover:border-primary/50 transition-all duration-200 hover:shadow-md"
              onClick={() => onSelectOption(option)}
            >
              <CardContent className="p-4">
                <div className="flex items-center justify-between">
                  <div className="flex-1">
                    <h4 className="font-medium text-foreground">{option.name}</h4>
                    {option.description && (
                      <p className="text-sm text-muted-foreground mt-1">
                        {option.description}
                      </p>
                    )}
                  </div>
                  <div className="text-right ml-4">
                    <p className="font-semibold text-primary">{formatPrice(option.price)}</p>
                    <p className="text-sm text-muted-foreground">{formatDuration(option.duration_minutes)}</p>
                  </div>
                </div>
                <Button className="w-full mt-3" size="sm">
                  Selecionar
                </Button>
              </CardContent>
            </Card>
          ))}
        </div>
      </DialogContent>
    </Dialog>
  );
};

export default ServiceOptionsModal;
