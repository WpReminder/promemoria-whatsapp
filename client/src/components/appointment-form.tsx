import { useForm } from "react-hook-form";
import { zodResolver } from "@hookform/resolvers/zod";
import { insertAppointmentSchema, type InsertAppointment } from "@shared/schema";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Calendar, Phone, User, Loader2 } from "lucide-react";
import { cn } from "@/lib/utils";

interface AppointmentFormProps {
  onSubmit: (data: InsertAppointment) => void;
  isPending: boolean;
}

export function AppointmentForm({ onSubmit, isPending }: AppointmentFormProps) {
  const {
    register,
    handleSubmit,
    formState: { errors },
    reset,
  } = useForm<InsertAppointment>({
    resolver: zodResolver(insertAppointmentSchema),
    defaultValues: {
      name: "",
      phone: "+39",
      datetime: "",
    },
  });

  const handleFormSubmit = (data: InsertAppointment) => {
    // Convert datetime-local to UTC ISO string on client side
    // This preserves user's local time intent correctly
    const localDate = new Date(data.datetime);
    const utcDatetime = localDate.toISOString();
    
    onSubmit({
      ...data,
      datetime: utcDatetime,
    });
    
    reset({
      name: "",
      phone: "+39",
      datetime: "",
    });
  };

  return (
    <form onSubmit={handleSubmit(handleFormSubmit)} className="space-y-4">
      {/* Name Input */}
      <div className="space-y-2">
        <Label htmlFor="name" className="text-sm font-medium text-foreground flex items-center gap-2">
          <User className="h-3.5 w-3.5 text-muted-foreground" />
          Nome Paziente
        </Label>
        <Input
          id="name"
          type="text"
          placeholder="Mario Rossi"
          data-testid="input-name"
          className={cn(
            "h-12 text-base",
            errors.name && "border-destructive focus-visible:ring-destructive"
          )}
          {...register("name")}
        />
        {errors.name && (
          <p className="text-xs text-destructive mt-1" data-testid="error-name">
            {errors.name.message}
          </p>
        )}
      </div>

      {/* Phone Input */}
      <div className="space-y-2">
        <Label htmlFor="phone" className="text-sm font-medium text-foreground flex items-center gap-2">
          <Phone className="h-3.5 w-3.5 text-muted-foreground" />
          Numero WhatsApp
        </Label>
        <Input
          id="phone"
          type="tel"
          placeholder="+393401234567"
          data-testid="input-phone"
          className={cn(
            "h-12 text-base",
            errors.phone && "border-destructive focus-visible:ring-destructive"
          )}
          {...register("phone")}
        />
        {errors.phone && (
          <p className="text-xs text-destructive mt-1" data-testid="error-phone">
            {errors.phone.message}
          </p>
        )}
        <p className="text-xs text-muted-foreground">Formato: +39XXXXXXXXX</p>
      </div>

      {/* DateTime Input */}
      <div className="space-y-2">
        <Label htmlFor="datetime" className="text-sm font-medium text-foreground flex items-center gap-2">
          <Calendar className="h-3.5 w-3.5 text-muted-foreground" />
          Data e Ora Appuntamento
        </Label>
        <Input
          id="datetime"
          type="datetime-local"
          data-testid="input-datetime"
          className={cn(
            "h-12 text-base",
            errors.datetime && "border-destructive focus-visible:ring-destructive"
          )}
          {...register("datetime")}
        />
        {errors.datetime && (
          <p className="text-xs text-destructive mt-1" data-testid="error-datetime">
            {errors.datetime.message}
          </p>
        )}
      </div>

      {/* Submit Button */}
      <Button
        type="submit"
        disabled={isPending}
        className="w-full h-12 text-sm font-medium"
        data-testid="button-submit"
      >
        {isPending ? (
          <>
            <Loader2 className="mr-2 h-4 w-4 animate-spin" />
            Salvando...
          </>
        ) : (
          "Crea Appuntamento"
        )}
      </Button>
    </form>
  );
}
