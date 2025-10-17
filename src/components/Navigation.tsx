import { useState, useEffect } from "react";
import { Link, useNavigate, useLocation } from "react-router-dom";
import { Button } from "@/components/ui/button";
import { Sheet, SheetContent, SheetTrigger } from "@/components/ui/sheet";
import { Menu, LogOut, User, Calendar, Home } from "lucide-react";
import { supabase } from "@/integrations/supabase/client";
import { useToast } from "@/hooks/use-toast";
import marwascoLogo from "@/assets/marwasco-logo.jpg";

interface NavigationProps {
  showAuthButtons?: boolean;
}

export const Navigation = ({ showAuthButtons = true }: NavigationProps) => {
  const [open, setOpen] = useState(false);
  const navigate = useNavigate();
  const location = useLocation();
  const { toast } = useToast();
  const [isLoggedIn, setIsLoggedIn] = useState(false);
  const [user, setUser] = useState<any>(null);

  // Check if user is logged in
  useEffect(() => {
    supabase.auth.getSession().then(({ data: { session } }) => {
      setIsLoggedIn(!!session);
      setUser(session?.user || null);
    });

    const { data: { subscription } } = supabase.auth.onAuthStateChange((event, session) => {
      setIsLoggedIn(!!session);
      setUser(session?.user || null);
    });

    return () => subscription.unsubscribe();
  }, []);

  const handleLogout = async () => {
    await supabase.auth.signOut();
    toast({
      title: "Logged out",
      description: "You have been logged out successfully",
    });
    navigate("/");
    setOpen(false);
  };

  const navItems = [
    { path: "/", label: "Home", icon: Home, show: true },
    { path: "/booking", label: "Book Now", icon: Calendar, show: isLoggedIn },
    { path: "/profile", label: "My Profile", icon: User, show: isLoggedIn },
  ];

  const NavLinks = () => (
    <>
      {navItems.map(
        (item) =>
          item.show && (
            <Link
              key={item.path}
              to={item.path}
              onClick={() => setOpen(false)}
              className={`flex items-center gap-2 px-4 py-2 rounded-md transition-colors ${
                location.pathname === item.path
                  ? "bg-primary text-primary-foreground"
                  : "hover:bg-accent"
              }`}
            >
              <item.icon className="h-4 w-4" />
              <span>{item.label}</span>
            </Link>
          )
      )}
      {isLoggedIn && (
        <Button
          variant="outline"
          onClick={handleLogout}
          className="flex items-center gap-2 w-full"
        >
          <LogOut className="h-4 w-4" />
          Logout
        </Button>
      )}
    </>
  );

  return (
    <header className="bg-background border-b shadow-sm sticky top-0 z-50">
      <div className="container mx-auto px-4 py-4">
        <div className="flex items-center justify-between">
          {/* Logo */}
          <Link to="/" className="flex items-center gap-3 cursor-pointer">
            <img 
              src={marwascoLogo} 
              alt="Marwasco Logo" 
              className="h-12 w-auto object-contain"
            />
            <span className="font-bold text-xl text-foreground">Marwasco</span>
          </Link>

          {/* Desktop Navigation */}
          <nav className="hidden md:flex items-center gap-2">
            {isLoggedIn && (
              <>
                <Button variant="ghost" onClick={() => navigate("/booking")} className="text-foreground hover:text-primary">
                  Book Now
                </Button>
                <Button variant="ghost" onClick={() => navigate("/profile")} className="text-foreground hover:text-primary">
                  My Profile
                </Button>
                <Button variant="ghost" onClick={() => navigate("/reviews")} className="text-foreground hover:text-primary">
                  Reviews
                </Button>
                <Button variant="outline" onClick={handleLogout}>
                  Logout
                </Button>
              </>
            )}
            {!isLoggedIn && (
              <Button onClick={() => navigate("/auth")}>
                Login
              </Button>
            )}
          </nav>

          {/* Mobile Navigation */}
          <Sheet open={open} onOpenChange={setOpen}>
            <SheetTrigger asChild className="md:hidden">
              <Button variant="outline" size="icon">
                <Menu className="h-5 w-5" />
              </Button>
            </SheetTrigger>
            <SheetContent side="right" className="w-64">
              <div className="flex flex-col gap-4 mt-8">
                {isLoggedIn && (
                  <>
                    <Button variant="ghost" className="w-full justify-start" onClick={() => { navigate("/booking"); setOpen(false); }}>
                      Book Now
                    </Button>
                    <Button variant="ghost" className="w-full justify-start" onClick={() => { navigate("/profile"); setOpen(false); }}>
                      My Profile
                    </Button>
                    <Button variant="ghost" className="w-full justify-start" onClick={() => { navigate("/reviews"); setOpen(false); }}>
                      Reviews
                    </Button>
                    <Button variant="outline" className="w-full" onClick={handleLogout}>
                      Logout
                    </Button>
                  </>
                )}
                {!isLoggedIn && (
                  <Button className="w-full" onClick={() => { navigate("/auth"); setOpen(false); }}>
                    Login
                  </Button>
                )}
              </div>
            </SheetContent>
          </Sheet>
        </div>
      </div>
    </header>
  );
};
