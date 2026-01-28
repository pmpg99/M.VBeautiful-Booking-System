import { Instagram } from "lucide-react";
import { Link } from "react-router-dom";

const Footer = () => {
  return (
    <footer className="bg-muted py-12 px-4">
      <div className="container mx-auto">
        <div className="grid grid-cols-1 md:grid-cols-3 gap-8">
          {/* Brand */}
          <div className="text-center md:text-left">
            <h3 className="font-display text-2xl font-semibold text-foreground mb-2">
              M.VBeautiful
            </h3>
            <p className="text-muted-foreground font-body text-sm">
              by Marta Vilela
            </p>
            <p className="text-muted-foreground font-body text-sm mt-4">
              Especialista em Nail Art e Estética
            </p>
          </div>

          {/* Contact */}
          <div className="text-center">
            <h4 className="font-display text-lg font-semibold text-foreground mb-4">
              Contacto
            </h4>
            <div className="space-y-2">
              <a 
                href="https://www.instagram.com/m.vbeautiful"
                target="_blank"
                rel="noopener noreferrer"
                className="flex items-center justify-center md:justify-start gap-2 text-muted-foreground hover:text-primary transition-colors font-body text-sm"
              >
                <Instagram size={16} />
                @m.vbeautiful
              </a>
            </div>
          </div>

          {/* Hours */}
          <div className="text-center md:text-right">
            <h4 className="font-display text-lg font-semibold text-foreground mb-4">
              Horário
            </h4>
            <div className="space-y-1 font-body text-sm text-muted-foreground">
              <p>Segunda a Sábado: 10h - 18h30</p>
              <p>Domingo: Encerrado</p>
              <p className="mt-2 text-xs">Depilação Laser: Último fim de semana do mês (9h-19h)</p>
            </div>
          </div>
        </div>

        <div className="border-t border-border mt-8 pt-8 text-center space-y-3">
          <div className="flex justify-center gap-6 text-xs">
            <Link 
              to="/politica-privacidade" 
              className="text-muted-foreground hover:text-primary transition-colors"
            >
              Política de Privacidade
            </Link>
            <Link 
              to="/termos-servico" 
              className="text-muted-foreground hover:text-primary transition-colors"
            >
              Termos de Serviço
            </Link>
          </div>
          <p className="text-muted-foreground font-body text-xs">
            © {new Date().getFullYear()} M.VBeautiful by Marta Vilela. Todos os direitos reservados.
          </p>
        </div>
      </div>
    </footer>
  );
};

export default Footer;
