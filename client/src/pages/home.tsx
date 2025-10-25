import { useQuery, useMutation } from "@tanstack/react-query";
import { queryClient, apiRequest } from "@/lib/queryClient";
import { AppointmentForm } from "@/components/appointment-form";
import { AppointmentList } from "@/components/appointment-list";
import { useToast } from "@/hooks/use-toast";
import { MessageSquare } from "lucide-react";
import type { Appointment, InsertAppointment } from "@shared/schema";

export default function Home() {
  const { toast } = useToast();

  // Fetch appointments
  const { data: appointments, isLoading } = useQuery<Appointment[]>({
    queryKey: ["/api/appointments"],
  });

  // Create appointment mutation
  const createMutation = useMutation({
    mutationFn: async (data: InsertAppointment) => {
      return await apiRequest("POST", "/api/appointments", data);
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["/api/appointments"] });
      toast({
        title: "Appuntamento creato!",
        description: "Il reminder verrà inviato automaticamente un'ora prima.",
      });
    },
    onError: (error: Error) => {
      toast({
        title: "Errore",
        description: error.message || "Impossibile creare l'appuntamento",
        variant: "destructive",
      });
    },
  });

  return (
    <div className="min-h-screen bg-background">
      {/* Header */}
      <header className="border-b bg-card/50 backdrop-blur-sm sticky top-0 z-10">
        <div className="max-w-md mx-auto px-6 py-4">
          <div className="flex items-center gap-3">
            <div className="h-10 w-10 rounded-lg bg-primary/10 flex items-center justify-center">
              <MessageSquare className="h-5 w-5 text-primary" />
            </div>
            <div>
              <h1 className="text-xl font-semibold text-foreground">WhatsApp Reminder</h1>
              <p className="text-xs text-muted-foreground">Gestione appuntamenti professionali</p>
            </div>
          </div>
        </div>
      </header>

      {/* Main Content */}
      <main className="max-w-md mx-auto px-6 py-8">
        {/* Appointment Form */}
        <section className="mb-12">
          <h2 className="text-base font-medium text-foreground mb-4">Nuovo Appuntamento</h2>
          <AppointmentForm
            onSubmit={(data) => createMutation.mutate(data)}
            isPending={createMutation.isPending}
          />
        </section>

        {/* Appointments List */}
        <section>
          <div className="flex items-center justify-between mb-4">
            <h2 className="text-base font-medium text-foreground">Prossimi Appuntamenti</h2>
            {appointments && appointments.length > 0 && (
              <span className="text-xs text-muted-foreground" data-testid="text-appointments-count">
                {appointments.length} {appointments.length === 1 ? 'appuntamento' : 'appuntamenti'}
              </span>
            )}
          </div>
          <AppointmentList appointments={appointments} isLoading={isLoading} />
        </section>
      </main>

      {/* Footer */}
      <footer className="border-t mt-12 py-6">
        <div className="max-w-md mx-auto px-6">
          <p className="text-xs text-center text-muted-foreground">
            I reminder vengono inviati automaticamente un'ora prima dell'appuntamento
          </p>
        </div>
      </footer>
    </div>
  );
}
