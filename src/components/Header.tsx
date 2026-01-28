import logo from "@/assets/logo-mvbeautiful-new.jpeg";
import { Instagram, Settings, User, Download } from "lucide-react";
import { Link } from "react-router-dom";
import { Button } from "@/components/ui/button";
import { useEffect, useState } from "react";

const Header = () => {
  const [isMobile, setIsMobile] = useState(false);
  const [isInstalled, setIsInstalled] = useState(false);

  useEffect(() => {
    // Check if mobile
    const checkMobile = () => {
      const userAgent = navigator.userAgent.toLowerCase();
      setIsMobile(/iphone|ipad|ipod|android/.test(userAgent));
    };
    
    // Check if already installed as PWA
    if (window.matchMedia("(display-mode: standalone)").matches) {
      setIsInstalled(true);
    }
    
    checkMobile();
  }, []);

  return (
    <header className="w-full py-6 px-4 gradient-hero">
      <div className="container mx-auto flex flex-col items-center gap-4">
        {/* Top buttons */}
        <div className="w-full flex justify-between items-center">
          <div className="flex items-center gap-1">
            <Link to="/cliente">
              <Button variant="ghost" size="sm" className="text-muted-foreground hover:text-foreground">
                <User className="h-4 w-4 mr-1" />
                <span className="text-xs">Área Cliente</span>
              </Button>
            </Link>
            {isMobile && !isInstalled && (
              <Link to="/instalar">
                <Button variant="ghost" size="sm" className="text-muted-foreground hover:text-foreground">
                  <Download className="h-4 w-4 mr-1" />
                  <span className="text-xs">Instalar</span>
                </Button>
              </Link>
            )}
          </div>
          <Link to="/admin">
            <Button variant="ghost" size="sm" className="text-muted-foreground hover:text-foreground">
              <Settings className="h-4 w-4 mr-1" />
              <span className="text-xs">Admin</span>
            </Button>
          </Link>
        </div>

        <img 
          src={logo} 
          alt="M.VBeautiful by Marta Vilela" 
          className="w-48 md:w-64 h-auto object-contain rounded-xl shadow-lg animate-float"
        />
        <div className="text-center">
          <h1 className="text-4xl md:text-5xl font-display font-semibold text-foreground tracking-wide">
            M.VBeautiful
          </h1>
          <p className="text-muted-foreground font-body text-sm tracking-widest mt-1">
            by Marta Vilela
          </p>
        </div>
        <a
          href="https://www.instagram.com/m.vbeautiful"
          target="_blank"
          rel="noopener noreferrer"
          className="flex items-center gap-2 px-4 py-2 rounded-full bg-gradient-to-r from-secondary to-primary text-primary-foreground font-body text-sm font-medium hover:opacity-90 transition-opacity"
        >
          <Instagram size={18} />
          @m.vbeautiful
        </a>
      </div>
    </header>
  );
};

export default Header;