import { Badge } from "@/components/ui/badge";
import { Card } from "@/components/ui/card";
import { CalendarClock, Phone, User, CheckCircle2, Clock, Calendar } from "lucide-react";
import { format, parseISO, isPast } from "date-fns";
import { it } from "date-fns/locale";
import type { Appointment } from "@shared/schema";
import { Skeleton } from "@/components/ui/skeleton";

interface AppointmentListProps {
  appointments?: Appointment[];
  isLoading: boolean;
}

export function AppointmentList({ appointments, isLoading }: AppointmentListProps) {
  if (isLoading) {
    return (
      <div className="space-y-4">
        {[1, 2, 3].map((i) => (
          <Card key={i} className="p-4">
            <div className="space-y-3">
              <Skeleton className="h-5 w-3/4" />
              <Skeleton className="h-4 w-1/2" />
              <Skeleton className="h-4 w-2/3" />
            </div>
          </Card>
        ))}
      </div>
    );
  }

  if (!appointments || appointments.length === 0) {
    return (
      <div className="text-center py-12">
        <div className="inline-flex h-16 w-16 items-center justify-center rounded-full bg-muted/50 mb-4">
          <CalendarClock className="h-8 w-8 text-muted-foreground" />
        </div>
        <h3 className="text-base font-medium text-foreground mb-2" data-testid="text-empty-state">
          Nessun appuntamento
        </h3>
        <p className="text-sm text-muted-foreground max-w-xs mx-auto">
          Crea il tuo primo appuntamento compilando il modulo qui sopra
        </p>
      </div>
    );
  }

  // Filter future appointments and sort by date
  const futureAppointments = appointments
    .filter((apt) => !isPast(parseISO(apt.datetime)))
    .sort((a, b) => new Date(a.datetime).getTime() - new Date(b.datetime).getTime());

  if (futureAppointments.length === 0) {
    return (
      <div className="text-center py-12">
        <div className="inline-flex h-16 w-16 items-center justify-center rounded-full bg-muted/50 mb-4">
          <Calendar className="h-8 w-8 text-muted-foreground" />
        </div>
        <h3 className="text-base font-medium text-foreground mb-2">
          Nessun appuntamento futuro
        </h3>
        <p className="text-sm text-muted-foreground max-w-xs mx-auto">
          Gli appuntamenti passati non vengono mostrati
        </p>
      </div>
    );
  }

  return (
    <div className="space-y-4">
      {futureAppointments.map((appointment) => {
        const appointmentDate = parseISO(appointment.datetime);
        const formattedDate = format(appointmentDate, "EEEE d MMMM yyyy", { locale: it });
        const formattedTime = format(appointmentDate, "HH:mm");

        return (
          <Card
            key={appointment.id}
            className="p-4 hover-elevate transition-all duration-200"
            data-testid={`card-appointment-${appointment.id}`}
          >
            <div className="space-y-3">
              {/* Header with name and status */}
              <div className="flex items-start justify-between gap-3">
                <div className="flex items-center gap-2 flex-1 min-w-0">
                  <User className="h-4 w-4 text-muted-foreground flex-shrink-0" />
                  <h3 className="font-medium text-foreground truncate" data-testid={`text-name-${appointment.id}`}>
                    {appointment.name}
                  </h3>
                </div>
                <Badge
                  variant={appointment.reminderSent ? "default" : "secondary"}
                  className="flex-shrink-0"
                  data-testid={`badge-status-${appointment.id}`}
                >
                  {appointment.reminderSent ? (
                    <>
                      <CheckCircle2 className="h-3 w-3 mr-1" />
                      Inviato
                    </>
                  ) : (
                    <>
                      <Clock className="h-3 w-3 mr-1" />
                      In attesa
                    </>
                  )}
                </Badge>
              </div>

              {/* Phone */}
              <div className="flex items-center gap-2 text-sm text-muted-foreground">
                <Phone className="h-3.5 w-3.5 flex-shrink-0" />
                <span className="font-mono" data-testid={`text-phone-${appointment.id}`}>
                  {appointment.phone}
                </span>
              </div>

              {/* Date and Time */}
              <div className="flex items-center gap-2 text-sm">
                <CalendarClock className="h-3.5 w-3.5 text-muted-foreground flex-shrink-0" />
                <div>
                  <span className="text-foreground font-medium capitalize" data-testid={`text-date-${appointment.id}`}>
                    {formattedDate}
                  </span>
                  <span className="text-muted-foreground mx-2">alle</span>
                  <span className="text-foreground font-medium" data-testid={`text-time-${appointment.id}`}>
                    {formattedTime}
                  </span>
                </div>
              </div>
            </div>
          </Card>
        );
      })}
    </div>
  );
}
