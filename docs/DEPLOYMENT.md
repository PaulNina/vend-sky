# Guía de Despliegue — Sistema de Ventas Skyworth

## Requisitos previos

- Node.js 18+ y npm/bun
- Cuenta en [Supabase](https://supabase.com) (plan gratuito funciona)
- Supabase CLI instalado: `npm install -g supabase`
- Hosting para frontend (Vercel, Netlify, VPS con Nginx, etc.)
- Cuenta en [Resend](https://resend.com) para emails (opcional)

---

## Paso 1: Crear proyecto en Supabase

1. Ve a [supabase.com/dashboard](https://supabase.com/dashboard) y crea un nuevo proyecto
2. Anota:
   - **Project URL** → `VITE_SUPABASE_URL`
   - **anon/public key** → `VITE_SUPABASE_PUBLISHABLE_KEY`
   - **service_role key** → para Edge Functions (secreto)
   - **Project ID** → `VITE_SUPABASE_PROJECT_ID`

---

## Paso 2: Ejecutar el esquema de base de datos

1. Ve a **SQL Editor** en el dashboard de Supabase
2. Copia y pega el contenido de `docs/schema.sql`
3. Ejecuta el script completo

---

## Paso 3: Crear buckets de Storage

En el dashboard de Supabase → **Storage**:

| Bucket | Público | Descripción |
|--------|---------|-------------|
| `sale-attachments` | ✅ Sí | Fotos de notas, pólizas, tags |
| `vendor-qr` | ❌ No | QR de cobro de vendedores |
| `payment-proofs` | ❌ No | Comprobantes de pago |

Para los buckets privados, configura políticas de storage que permitan a usuarios autenticados subir y leer sus propios archivos.

---

## Paso 4: Configurar autenticación

En Supabase Dashboard → **Authentication → Settings**:

1. **Email Auth**: Habilitado
2. **Auto-confirm emails**: ✅ Habilitado (recomendado para este sistema)
3. **Site URL**: La URL de tu frontend desplegado

---

## Paso 5: Crear usuario administrador

1. En Supabase Dashboard → **Authentication → Users → Add User**
2. Email: `admin@skyworth.bo`, Password: `Admin123!`
3. Copia el UUID del usuario creado
4. En **SQL Editor**, ejecuta:

```sql
INSERT INTO public.user_profiles (user_id, email, full_name)
VALUES ('UUID_AQUI', 'admin@skyworth.bo', 'Administrador');

INSERT INTO public.user_roles (user_id, role)
VALUES ('UUID_AQUI', 'admin');
```

---

## Paso 6: Configurar Edge Functions

### 6.1 Inicializar Supabase CLI

```bash
supabase login
supabase link --project-ref TU_PROJECT_ID
```

### 6.2 Configurar secretos

```bash
supabase secrets set SUPABASE_URL=https://TU_PROYECTO.supabase.co
supabase secrets set SUPABASE_ANON_KEY=tu_anon_key
supabase secrets set SUPABASE_SERVICE_ROLE_KEY=tu_service_role_key
supabase secrets set RESEND_API_KEY=re_tu_api_key  # Opcional, para emails
```

### 6.3 Desplegar funciones

```bash
supabase functions deploy admin-delete-user
supabase functions deploy admin-reset-password
supabase functions deploy generate-settlement
supabase functions deploy notify-payment
supabase functions deploy run-system-processes
supabase functions deploy seed-demo-data
supabase functions deploy validate-sale-date
supabase functions deploy weekly-close
supabase functions deploy weekly-report
```

O todas a la vez:
```bash
supabase functions deploy
```

---

## Paso 7: Configurar y desplegar el frontend

### 7.1 Variables de entorno

```bash
cp .env.example .env
# Edita .env con tus valores reales
```

### 7.2 Build local

```bash
npm install
npm run build
# El output está en /dist
```

### 7.3 Opciones de hosting

#### Vercel
```bash
npm i -g vercel
vercel
# Configura las variables de entorno en el dashboard de Vercel
```

#### Netlify
- Sube el repo a GitHub
- Conecta el repo en Netlify
- Build command: `npm run build`
- Publish directory: `dist`
- Agrega variables de entorno en Site Settings

#### VPS con Nginx
```nginx
server {
    listen 80;
    server_name tu-dominio.com;
    root /var/www/skyworth/dist;
    index index.html;

    location / {
        try_files $uri $uri/ /index.html;
    }
}
```

---

## Paso 8: Verificación

1. Accede a tu URL desplegada
2. Inicia sesión con `admin@skyworth.bo` / `Admin123!`
3. Verifica que puedes ver el dashboard de admin
4. Prueba crear una campaña, productos y ciudades

---

## Estructura de Edge Functions

| Función | Descripción |
|---------|-------------|
| `admin-delete-user` | Eliminar usuario (requiere service_role) |
| `admin-reset-password` | Resetear contraseña de usuario |
| `generate-settlement` | Generar liquidación de comisiones |
| `notify-payment` | Enviar notificación de pago al vendedor |
| `run-system-processes` | Cierre automático de periodos |
| `seed-demo-data` | Datos de demostración |
| `validate-sale-date` | Validación AI de fecha en comprobantes |
| `weekly-close` | Cierre semanal de periodos |
| `weekly-report` | Generación y envío de reportes semanales |

---

## Notas importantes

- **Seguridad**: Nunca expongas la `service_role_key` en el frontend
- **CORS**: Si usas un dominio personalizado, configura CORS en Supabase Dashboard → API Settings
- **Emails**: Sin Resend API key, las notificaciones por email no funcionarán pero el sistema opera normalmente
- **Backup**: Configura backups automáticos desde el dashboard de Supabase (disponible en plan Pro)
