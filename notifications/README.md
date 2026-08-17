# Notificaciones push

El Worker envía tres tipos de aviso, siempre con la hora de `Europe/Madrid`:

- A las 09:00: tareas cuya fecha es hoy.
- A las 22:00: tareas cuya fecha es mañana y, si las hay, las que siguen
  pendientes de hoy.
- Al instante: a los otros miembros que hayan activado avisos cuando alguien crea una tarea pendiente desde una tarea a demanda.
- Al instante: a los otros miembros que hayan activado avisos cuando alguien
  marca una tarea como hecha.

## Configuración inicial

1. Ejecuta [`supabase/push-notifications.sql`](../supabase/push-notifications.sql) en el SQL Editor de Supabase.
2. Genera una sola pareja de claves VAPID y guárdala en un lugar seguro:

   ```powershell
   npx web-push generate-vapid-keys
   ```

3. Copia `notifications/.dev.vars.example` a `notifications/.dev.vars` para desarrollo local. No subas ese archivo a Git.
4. Inicia sesión en Cloudflare y despliega el Worker:

   ```powershell
   npm run notifications:deploy
   ```

5. En Cloudflare, añade como secretos del Worker `SUPABASE_SERVICE_ROLE_KEY`, `VAPID_PRIVATE_KEY` y `VAPID_SUBJECT`. Añade también `SUPABASE_URL`, `SUPABASE_ANON_KEY`, `VAPID_PUBLIC_KEY` y `ALLOWED_ORIGIN` (la URL exacta de la aplicación de Cloudflare Pages). La campana guarda y borra suscripciones con la sesión normal del usuario; la service role queda para los avisos programados y para enviar avisos a otros miembros.
6. En las variables de entorno del proyecto de Cloudflare Pages, añade:

   ```text
   VITE_NOTIFICATIONS_API_URL=https://tareas-casa-notifications.<tu-subdominio>.workers.dev
   VITE_VAPID_PUBLIC_KEY=<la clave VAPID pública generada>
   ```

7. Vuelve a desplegar Pages. Cada persona verá **Activar avisos** al iniciar sesión y deberá aceptarlos en su dispositivo.

El cron del Worker se ejecuta cada hora en UTC y calcula dentro del Worker la hora local de Madrid, por lo que mantiene las 09:00 y las 22:00 al cambiar entre horario de invierno y verano.
