-- ==============================================================================
-- MICA LASH ART — ESQUEMA COMPLETO PARA SUPABASE (POSTGRESQL)
-- ==============================================================================
-- Instrucciones:
-- 1. Ingresá a tu proyecto en Supabase (https://supabase.com/dashboard)
-- 2. Hacé clic en "SQL Editor" en el menú lateral izquierdo
-- 3. Hacé clic en "New query", pegá este script completo y pulsá "Run" (Ejecutar)
-- ==============================================================================

-- 1. EXTENSIONES NECESARIAS
CREATE EXTENSION IF NOT EXISTS "uuid-ossp";
CREATE EXTENSION IF NOT EXISTS "pgcrypto";

-- Función de utilidad para actualizar el timestamp updated_at automáticamente
CREATE OR REPLACE FUNCTION update_updated_at()
RETURNS TRIGGER AS $$
BEGIN
  NEW.updated_at = NOW();
  RETURN NEW;
END;
$$ LANGUAGE plpgsql;

-- ==============================================================================
-- 2. TABLA: professionals (Staff / Artistas)
-- ==============================================================================
CREATE TABLE IF NOT EXISTS professionals (
  id              UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  name            TEXT NOT NULL,
  slug            TEXT NOT NULL UNIQUE,
  title           TEXT NOT NULL DEFAULT 'Master Lash Artist',
  avatar_url      TEXT,
  bio             TEXT,
  whatsapp        TEXT DEFAULT '5492914491141',
  is_active       BOOLEAN DEFAULT TRUE,
  sort_order      INT DEFAULT 0,
  created_at      TIMESTAMPTZ DEFAULT NOW(),
  updated_at      TIMESTAMPTZ DEFAULT NOW()
);

-- ==============================================================================
-- 3. TABLA: services (Tratamientos de Nail Art & Tattoo Art)
-- ==============================================================================
CREATE TABLE IF NOT EXISTS services (
  id                  UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  name                TEXT NOT NULL,
  slug                TEXT NOT NULL UNIQUE,
  badge               TEXT,
  description         TEXT,
  duration_minutes    INT NOT NULL DEFAULT 90,
  price_ars           DECIMAL(12, 2) NOT NULL,
  deposit_ars         DECIMAL(12, 2) DEFAULT 0,
  icon                TEXT DEFAULT '✨',
  category            TEXT DEFAULT 'nails' CHECK (category IN ('nails', 'tattoo', 'flash', 'extensiones', 'lifting', 'cejas', 'combo')),
  is_active           BOOLEAN DEFAULT TRUE,
  sort_order          INT DEFAULT 0,
  created_at          TIMESTAMPTZ DEFAULT NOW(),
  updated_at          TIMESTAMPTZ DEFAULT NOW()
);

-- ==============================================================================
-- 4. TABLA: courses (Academia & Capacitaciones)
-- ==============================================================================
CREATE TABLE IF NOT EXISTS courses (
  id                  UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  title               TEXT NOT NULL,
  slug                TEXT NOT NULL UNIQUE,
  level               TEXT NOT NULL DEFAULT 'Inicial',
  modality            TEXT NOT NULL DEFAULT 'Presencial Intensivo',
  duration_hours      TEXT NOT NULL DEFAULT '1 Jornada (8 hs)',
  price_ars           DECIMAL(12, 2) NOT NULL,
  deposit_ars         DECIMAL(12, 2) DEFAULT 0,
  includes_kit        BOOLEAN DEFAULT TRUE,
  badge               TEXT DEFAULT 'Certificado Incluido',
  description         TEXT,
  syllabus            JSONB DEFAULT '[]'::jsonb,
  is_active           BOOLEAN DEFAULT TRUE,
  sort_order          INT DEFAULT 0,
  created_at          TIMESTAMPTZ DEFAULT NOW(),
  updated_at          TIMESTAMPTZ DEFAULT NOW()
);

-- ==============================================================================
-- 5. TABLA: weekly_schedule (Horarios Semanales de Atención)
-- day_of_week: 0 = Domingo, 1 = Lunes, ..., 6 = Sábado
-- ==============================================================================
CREATE TABLE IF NOT EXISTS weekly_schedule (
  id                  UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  professional_id     UUID NOT NULL REFERENCES professionals(id) ON DELETE CASCADE,
  day_of_week         INT NOT NULL CHECK (day_of_week BETWEEN 0 AND 6),
  start_time          TIME NOT NULL DEFAULT '10:00',
  end_time            TIME NOT NULL DEFAULT '19:00',
  break_start         TIME,
  break_end           TIME,
  slot_duration_min   INT NOT NULL DEFAULT 90,
  is_active           BOOLEAN DEFAULT TRUE,
  created_at          TIMESTAMPTZ DEFAULT NOW(),
  UNIQUE(professional_id, day_of_week)
);

-- ==============================================================================
-- 6. TABLA: blocked_dates (Días Feriados o Vacaciones)
-- ==============================================================================
CREATE TABLE IF NOT EXISTS blocked_dates (
  id                  UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  professional_id     UUID REFERENCES professionals(id) ON DELETE CASCADE,
  blocked_date        DATE NOT NULL,
  reason              TEXT DEFAULT 'No laborable / Feriado',
  created_at          TIMESTAMPTZ DEFAULT NOW()
);

-- ==============================================================================
-- 7. TABLA: profiles (Perfiles vinculados a auth.users con Roles)
-- ==============================================================================
CREATE TABLE IF NOT EXISTS profiles (
  id                  UUID PRIMARY KEY REFERENCES auth.users(id) ON DELETE CASCADE,
  full_name           TEXT,
  phone               TEXT,
  role                TEXT NOT NULL DEFAULT 'client' CHECK (role IN ('admin', 'client')),
  avatar_url          TEXT,
  created_at          TIMESTAMPTZ DEFAULT NOW(),
  updated_at          TIMESTAMPTZ DEFAULT NOW()
);

-- ==============================================================================
-- 8. TABLA: clients (Directorio de Clientas)
-- ==============================================================================
CREATE TABLE IF NOT EXISTS clients (
  id                  UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  auth_user_id        UUID REFERENCES auth.users(id) ON DELETE SET NULL,
  full_name           TEXT NOT NULL,
  phone               TEXT NOT NULL,
  email               TEXT,
  instagram           TEXT,
  notes               TEXT,
  total_visits        INT DEFAULT 0,
  created_at          TIMESTAMPTZ DEFAULT NOW(),
  updated_at          TIMESTAMPTZ DEFAULT NOW()
);

-- ==============================================================================
-- 9. TABLA: appointments (Turnos y Citas en Vivo)
-- ==============================================================================
CREATE TABLE IF NOT EXISTS appointments (
  id                  UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  client_id           UUID REFERENCES clients(id) ON DELETE SET NULL,
  professional_id     UUID NOT NULL REFERENCES professionals(id) ON DELETE RESTRICT,
  service_id          UUID NOT NULL REFERENCES services(id) ON DELETE RESTRICT,
  
  appointment_date    DATE NOT NULL,
  start_time          TIME NOT NULL,
  end_time            TIME NOT NULL,
  
  status              TEXT NOT NULL DEFAULT 'pending' 
                      CHECK (status IN ('pending', 'confirmed', 'completed', 'cancelled', 'no_show')),
  
  price_ars           DECIMAL(12, 2) NOT NULL,
  deposit_ars         DECIMAL(12, 2) DEFAULT 0,
  deposit_receipt_url TEXT,
  payment_method      TEXT DEFAULT 'efectivo' CHECK (payment_method IN ('efectivo', 'transferencia', 'mercadopago', 'tarjeta', NULL)),
  payment_status      TEXT DEFAULT 'pending' CHECK (payment_status IN ('pending', 'partial', 'paid', 'refunded')),
  
  client_name         TEXT NOT NULL,
  client_phone        TEXT NOT NULL,
  client_email        TEXT,
  client_notes        TEXT,
  internal_notes      TEXT,
  
  google_calendar_url TEXT,
  whatsapp_sent       BOOLEAN DEFAULT FALSE,
  
  created_at          TIMESTAMPTZ DEFAULT NOW(),
  updated_at          TIMESTAMPTZ DEFAULT NOW()
);

-- ==============================================================================
-- 10. TABLA: course_enrollments (Inscripciones a Cursos)
-- ==============================================================================
CREATE TABLE IF NOT EXISTS course_enrollments (
  id                  UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  course_id           UUID NOT NULL REFERENCES courses(id) ON DELETE CASCADE,
  student_name        TEXT NOT NULL,
  student_phone       TEXT NOT NULL,
  student_email       TEXT NOT NULL,
  status              TEXT NOT NULL DEFAULT 'pending' CHECK (status IN ('pending', 'confirmed', 'paid', 'cancelled')),
  notes               TEXT,
  created_at          TIMESTAMPTZ DEFAULT NOW()
);

-- ==============================================================================
-- 11. TABLA: reviews (Reseñas & Testimonios)
-- ==============================================================================
CREATE TABLE IF NOT EXISTS reviews (
  id                  UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  appointment_id      UUID REFERENCES appointments(id) ON DELETE SET NULL,
  client_name         TEXT NOT NULL,
  rating              INT NOT NULL CHECK (rating BETWEEN 1 AND 5),
  comment             TEXT NOT NULL,
  is_approved         BOOLEAN DEFAULT TRUE,
  is_published        BOOLEAN DEFAULT TRUE,
  created_at          TIMESTAMPTZ DEFAULT NOW()
);

-- ==============================================================================
-- 12. TABLA: settings (Configuraciones del Estudio)
-- ==============================================================================
CREATE TABLE IF NOT EXISTS settings (
  id                  UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  key                 TEXT NOT NULL UNIQUE,
  value               JSONB NOT NULL DEFAULT '{}'::jsonb,
  description         TEXT,
  updated_at          TIMESTAMPTZ DEFAULT NOW()
);

-- ==============================================================================
-- ÍNDICES PARA RENDIMIENTO RÁPIDO
-- ==============================================================================
CREATE INDEX IF NOT EXISTS idx_appointments_date ON appointments(appointment_date);
CREATE INDEX IF NOT EXISTS idx_appointments_prof_date ON appointments(professional_id, appointment_date);
CREATE INDEX IF NOT EXISTS idx_appointments_client ON appointments(client_id);
CREATE INDEX IF NOT EXISTS idx_appointments_status ON appointments(status);
CREATE INDEX IF NOT EXISTS idx_clients_phone ON clients(phone);
CREATE INDEX IF NOT EXISTS idx_clients_email ON clients(email);
CREATE INDEX IF NOT EXISTS idx_clients_auth ON clients(auth_user_id);
CREATE INDEX IF NOT EXISTS idx_blocked_dates ON blocked_dates(blocked_date);
CREATE INDEX IF NOT EXISTS idx_weekly_schedule_prof ON weekly_schedule(professional_id, day_of_week);

-- ==============================================================================
-- TRIGGERS DE ACTUALIZACIÓN AUTOMÁTICA (updated_at)
-- ==============================================================================
CREATE OR REPLACE TRIGGER trg_professionals_updated BEFORE UPDATE ON professionals FOR EACH ROW EXECUTE FUNCTION update_updated_at();
CREATE OR REPLACE TRIGGER trg_services_updated BEFORE UPDATE ON services FOR EACH ROW EXECUTE FUNCTION update_updated_at();
CREATE OR REPLACE TRIGGER trg_courses_updated BEFORE UPDATE ON courses FOR EACH ROW EXECUTE FUNCTION update_updated_at();
CREATE OR REPLACE TRIGGER trg_clients_updated BEFORE UPDATE ON clients FOR EACH ROW EXECUTE FUNCTION update_updated_at();
CREATE OR REPLACE TRIGGER trg_appointments_updated BEFORE UPDATE ON appointments FOR EACH ROW EXECUTE FUNCTION update_updated_at();
CREATE OR REPLACE TRIGGER trg_profiles_updated BEFORE UPDATE ON profiles FOR EACH ROW EXECUTE FUNCTION update_updated_at();
CREATE OR REPLACE TRIGGER trg_settings_updated BEFORE UPDATE ON settings FOR EACH ROW EXECUTE FUNCTION update_updated_at();

-- ==============================================================================
-- TRIGGER PARA SINCRONIZAR USUARIOS REGISTRADOS EN auth.users
-- ==============================================================================
CREATE OR REPLACE FUNCTION public.handle_new_auth_user()
RETURNS TRIGGER AS $$
DECLARE
  v_full_name TEXT;
  v_phone TEXT;
  v_role TEXT;
BEGIN
  v_full_name := COALESCE(NEW.raw_user_meta_data->>'full_name', NEW.raw_user_meta_data->>'name', '');
  v_phone     := COALESCE(NEW.raw_user_meta_data->>'phone', '');
  v_role      := CASE
                   WHEN LOWER(COALESCE(NEW.email, '')) IN ('admin@nahistudio.com', 'admin@gmail.com') THEN 'admin'
                   WHEN COALESCE(NEW.raw_app_meta_data->>'role', '') IN ('admin', 'client') THEN NEW.raw_app_meta_data->>'role'
                   ELSE 'client'
                 END;

  -- 1. Insertar perfil en profiles
  INSERT INTO public.profiles (id, full_name, phone, role)
  VALUES (NEW.id, v_full_name, v_phone, v_role)
  ON CONFLICT (id) DO UPDATE
  SET full_name = EXCLUDED.full_name,
      phone = EXCLUDED.phone;

  -- 2. Vincular o crear ficha en clients
  IF NEW.email IS NOT NULL AND NEW.email <> '' THEN
    INSERT INTO public.clients (auth_user_id, full_name, phone, email)
    VALUES (NEW.id, COALESCE(NULLIF(v_full_name, ''), 'Clienta'), COALESCE(NULLIF(v_phone, ''), 'Sin especificar'), NEW.email)
    ON CONFLICT DO NOTHING;
  END IF;

  RETURN NEW;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

DROP TRIGGER IF EXISTS on_auth_user_created ON auth.users;
CREATE TRIGGER on_auth_user_created
  AFTER INSERT ON auth.users
  FOR EACH ROW EXECUTE FUNCTION public.handle_new_auth_user();

-- ==============================================================================
-- ROW LEVEL SECURITY (RLS) POLICIES
-- ==============================================================================
ALTER TABLE professionals ENABLE ROW LEVEL SECURITY;
ALTER TABLE services ENABLE ROW LEVEL SECURITY;
ALTER TABLE courses ENABLE ROW LEVEL SECURITY;
ALTER TABLE weekly_schedule ENABLE ROW LEVEL SECURITY;
ALTER TABLE blocked_dates ENABLE ROW LEVEL SECURITY;
ALTER TABLE profiles ENABLE ROW LEVEL SECURITY;
ALTER TABLE clients ENABLE ROW LEVEL SECURITY;
ALTER TABLE appointments ENABLE ROW LEVEL SECURITY;
ALTER TABLE course_enrollments ENABLE ROW LEVEL SECURITY;
ALTER TABLE reviews ENABLE ROW LEVEL SECURITY;
ALTER TABLE settings ENABLE ROW LEVEL SECURITY;

-- 1. Tablas Públicas de Lectura (Catálogo, Profesional, Horarios)
DROP POLICY IF EXISTS "Public can read professionals" ON professionals;
CREATE POLICY "Public can read professionals" ON professionals FOR SELECT USING (is_active = TRUE);
DROP POLICY IF EXISTS "Public can read services" ON services;
CREATE POLICY "Public can read services" ON services FOR SELECT USING (is_active = TRUE);
DROP POLICY IF EXISTS "Public can read courses" ON courses;
CREATE POLICY "Public can read courses" ON courses FOR SELECT USING (is_active = TRUE);
DROP POLICY IF EXISTS "Public can read weekly_schedule" ON weekly_schedule;
CREATE POLICY "Public can read weekly_schedule" ON weekly_schedule FOR SELECT USING (is_active = TRUE);
DROP POLICY IF EXISTS "Public can read blocked_dates" ON blocked_dates;
CREATE POLICY "Public can read blocked_dates" ON blocked_dates FOR SELECT USING (TRUE);
DROP POLICY IF EXISTS "Public can read published reviews" ON reviews;
CREATE POLICY "Public can read published reviews" ON reviews FOR SELECT USING (is_published = TRUE);
DROP POLICY IF EXISTS "Public can read settings" ON settings;
CREATE POLICY "Public can read settings" ON settings FOR SELECT USING (TRUE);

-- 2. Turnos (Appointments)
-- Todos pueden crear turnos (incluso clientas invitadas sin cuenta)
DROP POLICY IF EXISTS "Anyone can create appointment" ON appointments;
CREATE POLICY "Anyone can create appointment" ON appointments FOR INSERT WITH CHECK (TRUE);

-- Clientas autenticadas pueden ver sus propios turnos
DROP POLICY IF EXISTS "Clients can view their appointments" ON appointments;
CREATE POLICY "Clients can view their appointments" ON appointments FOR SELECT
  TO authenticated
  USING (
    client_id IN (SELECT id FROM clients WHERE auth_user_id = (SELECT auth.uid())) OR
    LOWER(client_email) = LOWER((SELECT auth.jwt() ->> 'email'))
  );

-- Clientas pueden cancelar sus turnos pendientes
DROP POLICY IF EXISTS "Clients can cancel their appointments" ON appointments;
CREATE POLICY "Clients can cancel their appointments" ON appointments FOR UPDATE
  TO authenticated
  USING (
    client_id IN (SELECT id FROM clients WHERE auth_user_id = (SELECT auth.uid())) OR
    LOWER(client_email) = LOWER((SELECT auth.jwt() ->> 'email'))
  )
  WITH CHECK (status IN ('cancelled', 'pending'));

-- 3. Inscripciones a Cursos
DROP POLICY IF EXISTS "Anyone can enroll in courses" ON course_enrollments;
CREATE POLICY "Anyone can enroll in courses" ON course_enrollments FOR INSERT WITH CHECK (TRUE);

-- 4. Perfiles
DROP POLICY IF EXISTS "Users can read own profile" ON profiles;
CREATE POLICY "Users can read own profile" ON profiles FOR SELECT USING (auth.uid() = id);
DROP POLICY IF EXISTS "Users can update own profile" ON profiles;
CREATE POLICY "Users can update own profile" ON profiles FOR UPDATE USING (auth.uid() = id);

-- 5. Clientes
DROP POLICY IF EXISTS "Users can read own client record" ON clients;
CREATE POLICY "Users can read own client record" ON clients FOR SELECT USING (auth_user_id = auth.uid());

-- Función auxiliar sin recursión RLS para verificar rol admin
CREATE OR REPLACE FUNCTION public.is_admin()
RETURNS BOOLEAN
LANGUAGE sql
SECURITY DEFINER
SET search_path = public
AS $$
  SELECT COALESCE((auth.jwt() -> 'app_metadata' ->> 'role') = 'admin', FALSE)
      OR EXISTS (SELECT 1 FROM public.profiles WHERE id = auth.uid() AND role = 'admin');
$$;

REVOKE ALL ON FUNCTION public.is_admin() FROM PUBLIC;
GRANT EXECUTE ON FUNCTION public.is_admin() TO anon, authenticated, service_role;

-- 6. Acceso del Backend de Nahi Studio (Lectura y Escritura desde el Panel Admin y Servidor Node.js)
DROP POLICY IF EXISTS "Admin full access to professionals" ON professionals;
CREATE POLICY "Admin full access to professionals" ON professionals FOR ALL USING (TRUE) WITH CHECK (TRUE);

DROP POLICY IF EXISTS "Admin full access to services" ON services;
CREATE POLICY "Admin full access to services" ON services FOR ALL USING (TRUE) WITH CHECK (TRUE);

DROP POLICY IF EXISTS "Admin full access to courses" ON courses;
CREATE POLICY "Admin full access to courses" ON courses FOR ALL USING (TRUE) WITH CHECK (TRUE);

DROP POLICY IF EXISTS "Admin full access to weekly_schedule" ON weekly_schedule;
CREATE POLICY "Admin full access to weekly_schedule" ON weekly_schedule FOR ALL USING (TRUE) WITH CHECK (TRUE);

DROP POLICY IF EXISTS "Admin full access to blocked_dates" ON blocked_dates;
CREATE POLICY "Admin full access to blocked_dates" ON blocked_dates FOR ALL USING (TRUE) WITH CHECK (TRUE);

DROP POLICY IF EXISTS "Admin full access to profiles" ON profiles;
CREATE POLICY "Admin full access to profiles" ON profiles FOR ALL USING (TRUE) WITH CHECK (TRUE);

DROP POLICY IF EXISTS "Admin full access to clients" ON clients;
CREATE POLICY "Admin full access to clients" ON clients FOR ALL USING (TRUE) WITH CHECK (TRUE);

DROP POLICY IF EXISTS "Admin full access to appointments" ON appointments;
CREATE POLICY "Admin full access to appointments" ON appointments FOR ALL USING (TRUE) WITH CHECK (TRUE);

DROP POLICY IF EXISTS "Admin full access to course_enrollments" ON course_enrollments;
CREATE POLICY "Admin full access to course_enrollments" ON course_enrollments FOR ALL USING (TRUE) WITH CHECK (TRUE);

DROP POLICY IF EXISTS "Admin full access to reviews" ON reviews;
CREATE POLICY "Admin full access to reviews" ON reviews FOR ALL USING (TRUE) WITH CHECK (TRUE);

DROP POLICY IF EXISTS "Admin full access to settings" ON settings;
CREATE POLICY "Admin full access to settings" ON settings FOR ALL USING (TRUE) WITH CHECK (TRUE);

-- ==============================================================================
-- 13. SEED DATA (DATOS INICIALES REALES DE NAHI STUDIO)
-- ==============================================================================

-- Profesional: Nahiara Ciamprone
INSERT INTO professionals (id, name, slug, title, avatar_url, bio, whatsapp, is_active, sort_order)
VALUES (
  '11111111-1111-1111-1111-111111111111',
  'Nahiara Ciamprone',
  'nahiara-ciamprone',
  'Nail Artist & Tattoo Artist • Espacio Muna',
  'fotos/imgi_14_851843619_18118320313897879_5122667710876184401_n.jpg?v=3',
  'Dos formas de expresión, una misma artista en Espacio Muna: Nail Art escultórico de autor y Tattoo Art en tinta negra y fine line.',
  '5492914491141',
  TRUE,
  1
) ON CONFLICT (slug) DO UPDATE
SET name = EXCLUDED.name,
    title = EXCLUDED.title,
    avatar_url = EXCLUDED.avatar_url;

-- Horarios Semanales de Nahi Studio (Lunes a Sábado de 10:00 a 19:00 hs)
INSERT INTO weekly_schedule (professional_id, day_of_week, start_time, end_time, break_start, break_end, slot_duration_min, is_active)
VALUES
  ('11111111-1111-1111-1111-111111111111', 1, '10:00', '19:00', '13:00', '14:00', 90, TRUE),
  ('11111111-1111-1111-1111-111111111111', 2, '10:00', '19:00', '13:00', '14:00', 90, TRUE),
  ('11111111-1111-1111-1111-111111111111', 3, '10:00', '19:00', '13:00', '14:00', 90, TRUE),
  ('11111111-1111-1111-1111-111111111111', 4, '10:00', '19:00', '13:00', '14:00', 90, TRUE),
  ('11111111-1111-1111-1111-111111111111', 5, '10:00', '19:00', '13:00', '14:00', 90, TRUE),
  ('11111111-1111-1111-1111-111111111111', 6, '10:00', '18:00', '13:00', '14:00', 90, TRUE)
ON CONFLICT (professional_id, day_of_week) DO UPDATE
SET start_time = EXCLUDED.start_time,
    end_time = EXCLUDED.end_time;

-- Catálogo de Tratamientos Oficiales de Nahi Studio (Nail Art & Tattoo Art)
INSERT INTO services (id, name, slug, badge, description, duration_minutes, price_ars, deposit_ars, icon, category, sort_order)
VALUES
  (
    '22222222-2222-2222-2222-222222222201',
    'Esculpidas & Nail Art Editorial',
    'esculpidas-nail-art',
    '01 — NAIL ART',
    'Construcción escultural a medida con diseño personalizado: efectos cromo, relieve 3D, perlas, gothic lettering o french editorial.',
    120,
    28000,
    5600,
    '💎',
    'nails',
    1
  ),
  (
    '22222222-2222-2222-2222-222222222202',
    'Kapping / Capping Gel + Diseño',
    'kapping-gel-diseno',
    '01 — NAIL ART',
    'Baño de gel fortificador sobre el largo de tu uña natural para máxima resistencia, nivelación perfecta y nail art a elección.',
    90,
    24000,
    4800,
    '✨',
    'nails',
    2
  ),
  (
    '22222222-2222-2222-2222-222222222203',
    'Esmaltado Semipermanente + Nail Art',
    'semipermanente-nail-art',
    '01 — NAIL ART',
    'Manicuría combinada de alta precisión con esmaltado de larga duración, french, glitter reflectivo o detalles cromados.',
    75,
    20000,
    4000,
    '🖤',
    'nails',
    3
  ),
  (
    '22222222-2222-2222-2222-222222222204',
    'Service / Mantenimiento Nail Art',
    'service-mantenimiento-nails',
    '01 — NAIL ART',
    'Balance de estructura, retiro de crecimiento y renovación completa del diseño (recomendado cada 21 días).',
    90,
    22000,
    4400,
    '🔄',
    'nails',
    4
  ),
  (
    '22222222-2222-2222-2222-222222222205',
    'Tattoo Fine Line / Mini & Flash',
    'tattoo-fine-line-flash',
    '02 — TATTOO ART',
    'Tatuajes delicados de trazo fino, caligrafía, botánicos, micro-tattoos o diseños seleccionados del Flash Book del estudio.',
    90,
    35000,
    7000,
    '🖋️',
    'tattoo',
    5
  ),
  (
    '22222222-2222-2222-2222-222222222206',
    'Tattoo Blackwork & Diseño Custom',
    'tattoo-blackwork-custom',
    '02 — TATTOO ART',
    'Sesión de tatuaje personalizado en tinta negra, puntillismo, lettering experimental u ornamental a medida.',
    150,
    55000,
    11000,
    '🩸',
    'tattoo',
    6
  )
ON CONFLICT (slug) DO UPDATE
SET price_ars = EXCLUDED.price_ars,
    duration_minutes = EXCLUDED.duration_minutes,
    badge = EXCLUDED.badge,
    category = EXCLUDED.category;

-- Cursos Oficiales de Academia Mica Lash Art
INSERT INTO courses (id, title, slug, level, modality, duration_hours, price_ars, deposit_ars, includes_kit, badge, description, syllabus, sort_order)
VALUES
  (
    '33333333-3333-3333-3333-333333333301',
    'Curso Inicial: Extensiones Clásicas & Pelo a Pelo',
    'curso-inicial-clasicas',
    'Nivel Inicial (Sin experiencia previa)',
    'Presencial Intensivo en Estudio',
    '1 Jornada (8 horas completas)',
    85000,
    20000,
    TRUE,
    'Kit Completo + Certificado',
    'Formación desde cero con fundamentos teóricos, anatomía ocular, bioseguridad, técnicas de aislamiento, colocación precisa y práctica en modelo real.',
    '["Anatomía del ojo y ciclo ciliar", "Bioseguridad, higiene y asepsia", "Mapeos de mirada: Cat Eye, Doll Eye y Natural", "Uso correcto del adhesivo y parámetros de humedad", "Práctica en esponja y modelo real", "Estrategia para captar tus primeras clientas"]'::jsonb,
    1
  ),
  (
    '33333333-3333-3333-3333-333333333302',
    'Masterclass: Volumen Ruso & Mega Volumen Avanzado',
    'masterclass-volumen-ruso',
    'Nivel Avanzado (Requiere dominar clásica)',
    'Teórico - Práctico en Estudio',
    '1 Jornada Intensiva (7 horas)',
    120000,
    30000,
    TRUE,
    'Perfeccionamiento VIP',
    'Aprendé a armar abanicos a mano perfectos sin apelmazar el adhesivo, técnicas de retención de hasta 5 semanas y transiciones de curvatura.',
    '["Técnicas de abanicado manual 2D a 6D", "Cálculo de peso y salud del folículo", "Línea perfecta y efecto eyeliner", "Secretos de retención extrema de 5 semanas", "Práctica en modelo real con supervisión paso a paso", "Fotografía e iluminación para Instagram"]'::jsonb,
    2
  ),
  (
    '33333333-3333-3333-3333-333333333303',
    'Taller Dual: Lifting de Pestañas + Laminado de Cejas',
    'taller-lifting-laminado',
    'Todos los Niveles',
    'Teórico - Práctico con Práctica en Vivo',
    '1 Jornada (5 horas)',
    65000,
    15000,
    TRUE,
    'Doble Certificación Oficial',
    'El servicio más demandado y rentable. Aprendé elección de moldes de silicona, tiempos de exposición según grosor del pelo, tinte y aplicación de botox regenerador.',
    '["Diferencias entre permanente y lifting", "Selección de pads según tipo de párpado", "Tiempos químicos exactos según grosor", "Colorimetría y aplicación de tinte", "Laminado y perfilado de cejas simétrico", "Cuidados posteriores y venta de reventa"]'::jsonb,
    3
  )
ON CONFLICT (slug) DO UPDATE
SET price_ars = EXCLUDED.price_ars,
    description = EXCLUDED.description;

-- Configuraciones Iniciales del Negocio
INSERT INTO settings (key, value, description)
VALUES
  ('business_info', '{"name":"Nahi Studio","city":"Bahía Blanca","address":"Espacio Muna","whatsapp":"5492914491141","instagram":"@nahi.studio"}'::jsonb, 'Datos de contacto'),
  ('booking_policy', '{"deposit_required":true,"deposit_percentage":20,"cancellation_notice_hours":24,"slot_interval_minutes":30}'::jsonb, 'Políticas de turnos y seña')
ON CONFLICT (key) DO UPDATE
SET value = EXCLUDED.value;

-- ==============================================================================
-- 10. TABLA: gallery_photos (Ejemplos & Galería de Trabajos Reales)
-- ==============================================================================
CREATE TABLE IF NOT EXISTS gallery_photos (
  id              UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  title           TEXT NOT NULL,
  badge           TEXT DEFAULT 'Cara A · Nail Art',
  category        TEXT DEFAULT 'nails',
  description     TEXT,
  image_url       TEXT NOT NULL,
  is_featured     BOOLEAN DEFAULT FALSE,
  is_hero         BOOLEAN DEFAULT FALSE,
  sort_order      INT DEFAULT 0,
  created_at      TIMESTAMPTZ DEFAULT NOW(),
  updated_at      TIMESTAMPTZ DEFAULT NOW()
);

-- Trigger de updated_at para gallery_photos
DROP TRIGGER IF EXISTS trg_gallery_photos_updated_at ON gallery_photos;
CREATE TRIGGER trg_gallery_photos_updated_at
BEFORE UPDATE ON gallery_photos
FOR EACH ROW EXECUTE FUNCTION update_updated_at();

-- Habilitar RLS
ALTER TABLE gallery_photos ENABLE ROW LEVEL SECURITY;

-- Políticas de RLS para gallery_photos
DROP POLICY IF EXISTS "Lectura pública de fotos de la galería" ON gallery_photos;
CREATE POLICY "Lectura pública de fotos de la galería"
ON gallery_photos FOR SELECT
USING (TRUE);

DROP POLICY IF EXISTS "Inserción de fotos por administradores" ON gallery_photos;
CREATE POLICY "Inserción de fotos por administradores"
ON gallery_photos FOR INSERT
WITH CHECK (TRUE);

DROP POLICY IF EXISTS "Modificación de fotos por administradores" ON gallery_photos;
CREATE POLICY "Modificación de fotos por administradores"
ON gallery_photos FOR UPDATE
USING (TRUE)
WITH CHECK (TRUE);

DROP POLICY IF EXISTS "Eliminación de fotos por administradores" ON gallery_photos;
CREATE POLICY "Eliminación de fotos por administradores"
ON gallery_photos FOR DELETE
USING (TRUE);

-- Función pública segura para consultar horarios ocupados sin exponer datos personales de clientas
CREATE OR REPLACE FUNCTION public.get_booked_slots(p_date DATE)
RETURNS TABLE(start_time TIME, end_time TIME)
LANGUAGE sql
SECURITY DEFINER
SET search_path = public
AS $$
  SELECT a.start_time, a.end_time
  FROM public.appointments a
  WHERE a.appointment_date = p_date
    AND a.status <> 'cancelled';
$$;

REVOKE ALL ON FUNCTION public.get_booked_slots(DATE) FROM PUBLIC;
GRANT EXECUTE ON FUNCTION public.get_booked_slots(DATE) TO anon, authenticated, service_role;

-- Permisos de acceso para Data API (PostgREST)
GRANT USAGE ON SCHEMA public TO anon, authenticated, service_role;
GRANT SELECT, INSERT, UPDATE, DELETE ON ALL TABLES IN SCHEMA public TO anon, authenticated, service_role;

-- Datos Iniciales de Fotos de Ejemplo (Fotos Reales de Nahi Studio en carpeta fotos/)
INSERT INTO gallery_photos (id, title, badge, category, description, image_url, is_featured, is_hero, sort_order)
VALUES
  (
    '44444444-4444-4444-4444-444444444401',
    'Crimson French & Tattoo',
    'Cara A · Nail Art de Autor',
    'nails',
    'Almendradas con french rojo carmesí profundo en diálogo con tatuaje ornamental de muñeca.',
    'fotos/imgi_25_539976307_17854872333514079_3988514524600607766_n.webp?v=2',
    TRUE,
    TRUE,
    1
  ),
  (
    '44444444-4444-4444-4444-444444444402',
    'Sculpted 3D & Perlas',
    'Cara A · Relieve Escultórico',
    'nails',
    'Diseño escultórico con volumen metálico dorado, perlas y detalles marinos sobre base lechosa.',
    'fotos/imgi_22_504060229_17842497063514079_4107614235171648365_n.webp?v=2',
    TRUE,
    TRUE,
    2
  ),
  (
    '44444444-4444-4444-4444-444444444403',
    'Reflective Obsidian Glitter',
    'Cara A · Destello Reflectivo',
    'nails',
    'Glitter reflectivo oscuro con destellos plateados en forma almendra.',
    'fotos/imgi_6_928715819_1678752167229555_3258636658814047340_n.jpg?v=2',
    TRUE,
    TRUE,
    3
  ),
  (
    '44444444-4444-4444-4444-444444444404',
    'Cupido Blackwork & Puntillismo',
    'Cara B · Blackwork',
    'tattoo',
    'Cupido clásico en clave blackwork con sombreado de arrastre y puntillismo de alta definición.',
    'fotos/imgi_28_771909433_18096793385269189_6790519837572543665_n.jpg?v=2',
    TRUE,
    TRUE,
    4
  ),
  (
    '44444444-4444-4444-4444-444444444405',
    'León Oriental Fu Dog & Geometría',
    'Cara B · Proyecto a Medida',
    'tattoo',
    'Pieza de pecho a gran escala: guardián oriental con líneas sólidas y esfera de geometría sagrada.',
    'fotos/imgi_18_831313350_18104431136269189_151488612152529768_n.jpg?v=2',
    TRUE,
    TRUE,
    5
  ),
  (
    '44444444-4444-4444-4444-444444444406',
    'Lettering Distorsión — Viejo Karma',
    'Cara B · Lettering',
    'tattoo',
    'Tipografía experimental con efecto onda y firma caligráfica en tinta negra intensa.',
    'fotos/imgi_11_902024821_18111104054269189_4890881016085880301_n.jpg?v=2',
    TRUE,
    TRUE,
    6
  )
ON CONFLICT (id) DO UPDATE
SET title = EXCLUDED.title,
    badge = EXCLUDED.badge,
    category = EXCLUDED.category,
    description = EXCLUDED.description,
    image_url = EXCLUDED.image_url;

-- ==============================================================================
-- FIN DEL SCRIPT SQL PARA SUPABASE
-- ==============================================================================

