import { Button } from "@/components/ui/button";
import { Card, CardContent, CardFooter, CardHeader } from "@/components/ui/card";
import { ChevronRight } from "lucide-react";

interface ServiceCardProps {
  title: string;
  description?: string;
  price: string;
  duration: string;
  onBook: () => void;
  hasOptions?: boolean;
}

const ServiceCard = ({ title, description, price, duration, onBook, hasOptions }: ServiceCardProps) => {
  return (
    <Card className="group overflow-hidden border-border/50 hover:border-primary/30 transition-all duration-300 hover:shadow-xl hover:shadow-primary/5">
      <CardHeader className="pb-2">
        <h3 className="font-display text-2xl font-semibold text-foreground group-hover:text-primary transition-colors">
          {title}
        </h3>
      </CardHeader>
      <CardContent className="space-y-3">
        {description && (
          <p className="text-muted-foreground font-body text-sm leading-relaxed">
            {description}
          </p>
        )}
        <div className="flex items-center justify-between text-sm">
          <span className="font-body font-medium text-foreground">{price}</span>
          <span className="text-muted-foreground font-body">{duration}</span>
        </div>
      </CardContent>
      <CardFooter>
        <Button 
          onClick={onBook}
          className="w-full bg-primary hover:bg-primary/90 text-primary-foreground font-body"
        >
          {hasOptions ? (
            <>
              Ver Opções
              <ChevronRight className="h-4 w-4 ml-1" />
            </>
          ) : (
            "Marcar Agora"
          )}
        </Button>
      </CardFooter>
    </Card>
  );
};

export default ServiceCard;
