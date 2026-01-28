import { useState, useEffect } from "react";
import { supabase } from "@/integrations/supabase/client";

export interface WorkingHours {
  start: string;
  end: string;
}

export interface BusinessSettings {
  recurringDaysOff: string[];
  workingHours: WorkingHours;
  laserWorkingHours: WorkingHours;
}

const defaultSettings: BusinessSettings = {
  recurringDaysOff: ["sunday", "monday"],
  workingHours: { start: "10:00", end: "18:30" },
  laserWorkingHours: { start: "09:00", end: "19:00" },
};

const dayNameToNumber: Record<string, number> = {
  sunday: 0,
  monday: 1,
  tuesday: 2,
  wednesday: 3,
  thursday: 4,
  friday: 5,
  saturday: 6,
};

export function useBusinessSettings() {
  const [settings, setSettings] = useState<BusinessSettings>(defaultSettings);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  const fetchSettings = async () => {
    try {
      setLoading(true);
      const { data, error: fetchError } = await supabase
        .from("business_settings")
        .select("setting_key, setting_value");

      if (fetchError) {
        console.error("Error fetching business settings:", fetchError);
        setError(fetchError.message);
        return;
      }

      if (data && data.length > 0) {
        const newSettings = { ...defaultSettings };
        
        data.forEach((row) => {
          if (row.setting_key === "recurring_days_off") {
            newSettings.recurringDaysOff = row.setting_value as unknown as string[];
          } else if (row.setting_key === "working_hours") {
            newSettings.workingHours = row.setting_value as unknown as WorkingHours;
          } else if (row.setting_key === "laser_working_hours") {
            newSettings.laserWorkingHours = row.setting_value as unknown as WorkingHours;
          }
        });
        
        setSettings(newSettings);
      }
    } catch (err) {
      console.error("Error in useBusinessSettings:", err);
      setError("Failed to load settings");
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchSettings();
  }, []);

  const updateSetting = async (key: string, value: any): Promise<boolean> => {
    try {
      const { error: updateError } = await supabase
        .from("business_settings")
        .update({ setting_value: value })
        .eq("setting_key", key);

      if (updateError) {
        console.error("Error updating setting:", updateError);
        return false;
      }

      await fetchSettings();
      return true;
    } catch (err) {
      console.error("Error updating setting:", err);
      return false;
    }
  };

  const isDayOff = (dayNumber: number): boolean => {
    const dayNames = Object.entries(dayNameToNumber);
    const dayName = dayNames.find(([_, num]) => num === dayNumber)?.[0];
    return dayName ? settings.recurringDaysOff.includes(dayName) : false;
  };

  const getDaysOffNumbers = (): number[] => {
    return settings.recurringDaysOff.map((day) => dayNameToNumber[day] ?? -1).filter((n) => n >= 0);
  };

  return {
    settings,
    loading,
    error,
    updateSetting,
    isDayOff,
    getDaysOffNumbers,
    refetch: fetchSettings,
  };
}
