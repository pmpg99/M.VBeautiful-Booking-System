import { useState, useEffect } from "react";
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Checkbox } from "@/components/ui/checkbox";
import { Separator } from "@/components/ui/separator";
import { useToast } from "@/hooks/use-toast";
import { useBusinessSettings } from "@/hooks/useBusinessSettings";
import { Clock, Calendar, Loader2, Save } from "lucide-react";
import GoogleCalendarSettings from "./GoogleCalendarSettings";

const DAYS_OF_WEEK = [
  { key: "sunday", label: "Domingo" },
  { key: "monday", label: "Segunda-feira" },
  { key: "tuesday", label: "Terça-feira" },
  { key: "wednesday", label: "Quarta-feira" },
  { key: "thursday", label: "Quinta-feira" },
  { key: "friday", label: "Sexta-feira" },
  { key: "saturday", label: "Sábado" },
];

const AdminSettings = () => {
  const { settings, loading, updateSetting, refetch } = useBusinessSettings();
  const { toast } = useToast();
  
  const [daysOff, setDaysOff] = useState<string[]>([]);
  const [workingStart, setWorkingStart] = useState("10:00");
  const [workingEnd, setWorkingEnd] = useState("18:30");
  const [laserStart, setLaserStart] = useState("09:00");
  const [laserEnd, setLaserEnd] = useState("19:00");
  const [isSaving, setIsSaving] = useState(false);

  useEffect(() => {
    if (!loading) {
      setDaysOff(settings.recurringDaysOff);
      setWorkingStart(settings.workingHours.start);
      setWorkingEnd(settings.workingHours.end);
      setLaserStart(settings.laserWorkingHours.start);
      setLaserEnd(settings.laserWorkingHours.end);
    }
  }, [loading, settings]);

  const handleDayToggle = (day: string) => {
    setDaysOff((prev) =>
      prev.includes(day) ? prev.filter((d) => d !== day) : [...prev, day]
    );
  };

  const handleSaveAll = async () => {
    setIsSaving(true);
    
    try {
      const results = await Promise.all([
        updateSetting("recurring_days_off", daysOff),
        updateSetting("working_hours", { start: workingStart, end: workingEnd }),
        updateSetting("laser_working_hours", { start: laserStart, end: laserEnd }),
      ]);

      if (results.every((r) => r)) {
        toast({
          title: "Sucesso",
          description: "Definições guardadas com sucesso!",
        });
        refetch();
      } else {
        toast({
          title: "Erro",
          description: "Algumas definições não foram guardadas.",
          variant: "destructive",
        });
      }
    } catch (err) {
      toast({
        title: "Erro",
        description: "Erro ao guardar definições.",
        variant: "destructive",
      });
    } finally {
      setIsSaving(false);
    }
  };

  if (loading) {
    return (
      <div className="flex items-center justify-center py-12">
        <Loader2 className="h-8 w-8 animate-spin text-muted-foreground" />
      </div>
    );
  }

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex items-center justify-between">
        <div>
          <h2 className="text-2xl font-display font-semibold">Definições</h2>
          <p className="text-muted-foreground">
            Configure os dias de folga e horários de funcionamento
          </p>
        </div>
        <Button onClick={handleSaveAll} disabled={isSaving}>
          {isSaving ? (
            <Loader2 className="h-4 w-4 mr-2 animate-spin" />
          ) : (
            <Save className="h-4 w-4 mr-2" />
          )}
          Guardar Alterações
        </Button>
      </div>

      <div className="grid gap-6 lg:grid-cols-2">
        {/* Dias de Folga Recorrentes */}
        <Card>
          <CardHeader>
            <CardTitle className="flex items-center gap-2 font-display">
              <Calendar className="h-5 w-5" />
              Dias de Folga Recorrentes
            </CardTitle>
            <CardDescription>
              Selecione os dias da semana em que não aceita marcações
            </CardDescription>
          </CardHeader>
          <CardContent>
            <div className="space-y-3">
              {DAYS_OF_WEEK.map((day) => (
                <div key={day.key} className="flex items-center space-x-3">
                  <Checkbox
                    id={day.key}
                    checked={daysOff.includes(day.key)}
                    onCheckedChange={() => handleDayToggle(day.key)}
                  />
                  <Label
                    htmlFor={day.key}
                    className="text-sm font-medium cursor-pointer"
                  >
                    {day.label}
                  </Label>
                </div>
              ))}
            </div>
          </CardContent>
        </Card>

        {/* Horários de Funcionamento */}
        <div className="space-y-6">
          {/* Horário Regular */}
          <Card>
            <CardHeader>
              <CardTitle className="flex items-center gap-2 font-display">
                <Clock className="h-5 w-5" />
                Horário Regular
              </CardTitle>
              <CardDescription>
                Horário de funcionamento para serviços normais
              </CardDescription>
            </CardHeader>
            <CardContent>
              <div className="grid grid-cols-2 gap-4">
                <div className="space-y-2">
                  <Label htmlFor="workingStart">Abertura</Label>
                  <Input
                    id="workingStart"
                    type="time"
                    value={workingStart}
                    onChange={(e) => setWorkingStart(e.target.value)}
                  />
                </div>
                <div className="space-y-2">
                  <Label htmlFor="workingEnd">Fecho</Label>
                  <Input
                    id="workingEnd"
                    type="time"
                    value={workingEnd}
                    onChange={(e) => setWorkingEnd(e.target.value)}
                  />
                </div>
              </div>
            </CardContent>
          </Card>

          {/* Horário Laser */}
          <Card>
            <CardHeader>
              <CardTitle className="flex items-center gap-2 font-display">
                <Clock className="h-5 w-5" />
                Horário Laser
              </CardTitle>
              <CardDescription>
                Horário para serviços de depilação a laser (último fim de semana do mês)
              </CardDescription>
            </CardHeader>
            <CardContent>
              <div className="grid grid-cols-2 gap-4">
                <div className="space-y-2">
                  <Label htmlFor="laserStart">Abertura</Label>
                  <Input
                    id="laserStart"
                    type="time"
                    value={laserStart}
                    onChange={(e) => setLaserStart(e.target.value)}
                  />
                </div>
                <div className="space-y-2">
                  <Label htmlFor="laserEnd">Fecho</Label>
                  <Input
                    id="laserEnd"
                    type="time"
                    value={laserEnd}
                    onChange={(e) => setLaserEnd(e.target.value)}
                  />
                </div>
              </div>
            </CardContent>
          </Card>
        </div>
      </div>

      <Separator />

      {/* Google Calendar Integration */}
      <GoogleCalendarSettings />
    </div>
  );
};

export default AdminSettings;
