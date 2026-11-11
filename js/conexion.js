// Configuración pública de Supabase.
// La publishable key puede estar en el código del navegador si RLS está bien configurado.
// Nunca coloques aquí una service_role key ni una clave secreta.
const URL_SUPABASE = "https://krmghszmfuqroitwbevt.supabase.co";
const CLAVE_PUBLICA = "sb_publishable_NV8iyA2bRC4yKoPVxHRgpw_D6ffiutF";

// Reemplaza este número por el WhatsApp del negocio, con código de país.
// Perú: 51 + número, sin +, espacios ni guiones.
const NUMERO_WHATSAPP = "51918871296";

const db = window.supabase.createClient(URL_SUPABASE, CLAVE_PUBLICA);
