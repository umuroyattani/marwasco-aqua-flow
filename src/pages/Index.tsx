import { Button } from "@/components/ui/button";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { useNavigate } from "react-router-dom";
import { Calendar, CreditCard, Clock, Shield } from "lucide-react";
import { Navigation } from "@/components/Navigation";
import marwascoLogo from "@/assets/marwasco-logo.jpg";

const Index = () => {
  const navigate = useNavigate();

  return (
    <div className="min-h-screen">
      <Navigation showAuthButtons={false} />
      
      {/* Hero Section */}
      <section className="relative bg-gradient-primary text-primary-foreground overflow-hidden">
        <div className="absolute inset-0 bg-[url('data:image/svg+xml;base64,PHN2ZyB3aWR0aD0iNjAiIGhlaWdodD0iNjAiIHZpZXdCb3g9IjAgMCA2MCA2MCIgeG1sbnM9Imh0dHA6Ly93d3cudzMub3JnLzIwMDAvc3ZnIj48ZyBmaWxsPSJub25lIiBmaWxsLXJ1bGU9ImV2ZW5vZGQiPjxnIGZpbGw9IiNmZmYiIGZpbGwtb3BhY2l0eT0iMC4xIj48cGF0aCBkPSJNMzYgMzRjMC0yIDIuMjEtMiAyLjIxLTJzMi4yMSAwIDIuMjEgMnYyYzAgMi0yLjIxIDItMi4yMSAycy0yLjIxIDAtMi4yMS0ydi0yeiIvPjwvZz48L2c+PC9zdmc+')] opacity-10"></div>
        <div className="container mx-auto px-4 py-20 relative z-10">
          <div className="max-w-3xl mx-auto text-center space-y-6">
            <div className="inline-flex items-center justify-center mb-4">
              <img 
                src={marwascoLogo} 
                alt="Marwasco Logo" 
                className="h-24 w-auto object-contain shadow-primary"
              />
            </div>
            <h1 className="text-4xl md:text-6xl font-bold leading-tight">
              Marwasco Water Tanker Booking
            </h1>
            <p className="text-xl md:text-2xl text-primary-foreground/90">
              Reliable water delivery service at your fingertips
            </p>
            <div className="flex flex-col sm:flex-row gap-4 justify-center pt-4">
              <Button
                size="lg"
                variant="secondary"
                onClick={() => navigate("/auth")}
                className="text-lg px-8"
              >
                Get Started
              </Button>
              <Button
                size="lg"
                variant="outline"
                onClick={() => navigate("/auth")}
                className="text-lg px-8 bg-transparent border-2 border-primary-foreground text-primary-foreground hover:bg-primary-foreground hover:text-primary"
              >
                Login
              </Button>
            </div>
          </div>
        </div>
      </section>

      {/* Features Section */}
      <section className="py-20 bg-background">
        <div className="container mx-auto px-4">
          <div className="text-center mb-12">
            <h2 className="text-3xl md:text-4xl font-bold mb-4">Why Choose Marwasco?</h2>
            <p className="text-muted-foreground text-lg">
              Fast, reliable, and convenient water delivery service
            </p>
          </div>

          <div className="grid md:grid-cols-3 gap-8 max-w-5xl mx-auto">
            <Card className="shadow-card border-2 hover:shadow-primary transition-shadow">
              <CardHeader>
                <Calendar className="h-10 w-10 text-primary mb-4" />
                <CardTitle>Easy Booking</CardTitle>
                <CardDescription>
                  Select your preferred date and time slot with our intuitive calendar system
                </CardDescription>
              </CardHeader>
            </Card>

            <Card className="shadow-card border-2 hover:shadow-primary transition-shadow">
              <CardHeader>
                <CreditCard className="h-10 w-10 text-primary mb-4" />
                <CardTitle>M-Pesa Payment</CardTitle>
                <CardDescription>
                  Secure and convenient payment through M-Pesa integration
                </CardDescription>
              </CardHeader>
            </Card>

            <Card className="shadow-card border-2 hover:shadow-primary transition-shadow">
              <CardHeader>
                <Clock className="h-10 w-10 text-primary mb-4" />
                <CardTitle>Real-time Updates</CardTitle>
                <CardDescription>
                  Receive instant notifications about your booking and delivery status
                </CardDescription>
              </CardHeader>
            </Card>
          </div>
        </div>
      </section>

      {/* How It Works Section */}
      <section className="py-20 bg-gradient-light">
        <div className="container mx-auto px-4">
          <div className="text-center mb-12">
            <h2 className="text-3xl md:text-4xl font-bold mb-4">How It Works</h2>
            <p className="text-muted-foreground text-lg">
              Get water delivered in three simple steps
            </p>
          </div>

          <div className="max-w-4xl mx-auto">
            <div className="grid md:grid-cols-3 gap-8">
              <div className="text-center space-y-4">
                <div className="bg-primary text-primary-foreground rounded-full w-16 h-16 flex items-center justify-center text-2xl font-bold mx-auto">
                  1
                </div>
                <h3 className="text-xl font-semibold">Register & Login</h3>
                <p className="text-muted-foreground">
                  Create your account with basic details
                </p>
              </div>

              <div className="text-center space-y-4">
                <div className="bg-primary text-primary-foreground rounded-full w-16 h-16 flex items-center justify-center text-2xl font-bold mx-auto">
                  2
                </div>
                <h3 className="text-xl font-semibold">Book & Pay</h3>
                <p className="text-muted-foreground">
                  Choose your slot and pay securely via M-Pesa
                </p>
              </div>

              <div className="text-center space-y-4">
                <div className="bg-primary text-primary-foreground rounded-full w-16 h-16 flex items-center justify-center text-2xl font-bold mx-auto">
                  3
                </div>
                <h3 className="text-xl font-semibold">Get Delivery</h3>
                <p className="text-muted-foreground">
                  Receive your water tanker at the scheduled time
                </p>
              </div>
            </div>
          </div>
        </div>
      </section>

      {/* Trust Section */}
      <section className="py-20 bg-background">
        <div className="container mx-auto px-4">
          <div className="max-w-3xl mx-auto text-center space-y-6">
            <Shield className="h-16 w-16 text-primary mx-auto" />
            <h2 className="text-3xl md:text-4xl font-bold">Trusted Water Service</h2>
            <p className="text-lg text-muted-foreground">
              Marwasco has been providing reliable water delivery services for years.
              Our commitment to quality and customer satisfaction makes us the preferred
              choice for water tanker bookings.
            </p>
            <Button size="lg" onClick={() => navigate("/auth")} className="mt-6">
              Book Your Water Tanker Now
            </Button>
          </div>
        </div>
      </section>

      {/* Footer */}
      <footer className="bg-primary text-primary-foreground py-8">
        <div className="container mx-auto px-4 text-center">
          <div className="flex items-center justify-center gap-3 mb-4">
            <img 
              src={marwascoLogo} 
              alt="Marwasco Logo" 
              className="h-10 w-auto object-contain"
            />
            <span className="font-bold text-xl">Marwasco</span>
          </div>
          <p className="text-primary-foreground/80">
            © 2025 Marwasco Water Services. All rights reserved.
          </p>
        </div>
      </footer>
    </div>
  );
};

export default Index;
