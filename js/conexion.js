
const URL_SUPABASE = "https://krmghszmfuqroitwbevt.supabase.co";
const CLAVE_PUBLICA = "sb_publishable_NV8iyA2bRC4yKoPVxHRgpw_D6ffiutF";

const db = window.supabase.createClient(
    URL_SUPABASE,
    CLAVE_PUBLICA
);
