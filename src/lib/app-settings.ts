import { supabase } from "@/lib/supabase";

const SINGLETON_ID = "singleton";

export async function getAppSettings() {
  const { data, error } = await supabase
    .from("app_settings")
    .select("*")
    .eq("id", SINGLETON_ID)
    .single();

  if (!error && data) {
    return {
      id: data.id,
      max_analysis_plots: data.max_analysis_plots,
      max_web_searches: data.max_web_searches,
      custom_prompt: data.custom_prompt,
      updated_at: data.updated_at,
    };
  }

  // Create if doesn't exist
  const { data: newSettings } = await supabase
    .from("app_settings")
    .insert({ id: SINGLETON_ID })
    .select("*")
    .single();

  return newSettings;
}

export async function setMaxAnalysisPlots(maxAnalysisPlots: number) {
  const { data } = await supabase
    .from("app_settings")
    .upsert({ id: SINGLETON_ID, max_analysis_plots: maxAnalysisPlots })
    .select("*")
    .single();

  return data;
}

export async function setMaxWebSearches(maxWebSearches: number) {
  const { data } = await supabase
    .from("app_settings")
    .upsert({ id: SINGLETON_ID, max_web_searches: maxWebSearches })
    .select("*")
    .single();

  return data;
}

export async function setCustomPrompt(customPrompt: string | null) {
  const { data } = await supabase
    .from("app_settings")
    .upsert({ id: SINGLETON_ID, custom_prompt: customPrompt })
    .select("*")
    .single();

  return data;
}
