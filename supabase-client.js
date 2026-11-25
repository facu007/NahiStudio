/**
 * MICA LASH ART — CLIENTE SUPABASE UNIVERSAL & BACKEND BRIDGE
 * Compatible con modo Supabase en la nube y modo local / offline automático.
 */

(function (window) {
  'use strict';

  // Configuración predeterminada (se puede sobrescribir con /api/config o window.MICA_CONFIG)
  const defaultConfig = {
    supabaseUrl: '',
    supabaseAnonKey: '',
    isConfigured: false
  };

  const STORAGE_KEYS = {
    TOKEN: 'nahi_token',
    REFRESH: 'nahi_refresh',
    USER: 'nahi_current_user',
    LOCAL_TURNOS: 'nahi_studio_turnos',
    DELETED_TURNOS: 'nahi_deleted_turnos',
    LOCAL_USERS: 'nahi_users_db',
    GALLERY: 'nahi_gallery_photos_v4',
    PUBLISHED_SCHEDULES: 'nahi_published_schedules',
    SITE_CONTENT: 'nahi_site_content',
    PAYMENT_INFO: 'nahi_payment_info'
  };

  // Seña obligatoria para reservar (porcentaje del precio del servicio)
  const DEPOSIT_PERCENTAGE = 20;

  // Datos de transferencia por defecto (editables desde el Panel Admin > Turnos > Datos para la seña)
  const DEFAULT_PAYMENT_INFO = {
    alias: '',
    cbu: '',
    holder: 'Nahiara Ciamprone',
    bank: '',
    whatsapp: ''
  };

  // Servicios oficiales por defecto (garantiza funcionamiento sin demoras)
  const FALLBACK_SERVICES = [
  {
    "id": "22222222-2222-2222-2222-222222222201",
    "name": "Esculpidas & Nail Art Editorial",
    "slug": "esculpidas-nail-art",
    "badge": "01 — NAIL ART",
    "desc": "Construcción escultural a medida con diseño personalizado: efectos cromo, relieve 3D, perlas, gothic lettering o french editorial.",
    "duration": 120,
    "durationLabel": "120 min",
    "price": 28000,
    "deposit": 5600,
    "icon": "💎",
    "category": "nails",
    "isActive": true,
    "sortOrder": 1
  },
  {
    "id": "22222222-2222-2222-2222-222222222202",
    "name": "Kapping / Capping Gel + Diseño",
    "slug": "kapping-gel-diseno",
    "badge": "01 — NAIL ART",
    "desc": "Baño de gel fortificador sobre el largo de tu uña natural para máxima resistencia, nivelación perfecta y nail art a elección.",
    "duration": 90,
    "durationLabel": "90 min",
    "price": 24000,
    "deposit": 4800,
    "icon": "✨",
    "category": "nails",
    "isActive": true,
    "sortOrder": 2
  },
  {
    "id": "22222222-2222-2222-2222-222222222203",
    "name": "Esmaltado Semipermanente + Nail Art",
    "slug": "semipermanente-nail-art",
    "badge": "01 — NAIL ART",
    "desc": "Manicuría combinada de alta precisión con esmaltado de larga duración, french, glitter reflectivo o detalles cromados.",
    "duration": 75,
    "durationLabel": "75 min",
    "price": 20000,
    "deposit": 4000,
    "icon": "🖤",
    "category": "nails",
    "isActive": true,
    "sortOrder": 3
  },
  {
    "id": "22222222-2222-2222-2222-222222222204",
    "name": "Service / Mantenimiento Nail Art",
    "slug": "service-mantenimiento-nails",
    "badge": "01 — NAIL ART",
    "desc": "Balance de estructura, retiro de crecimiento y renovación completa del diseño (recomendado cada 21 días).",
    "duration": 90,
    "durationLabel": "90 min",
    "price": 22000,
    "deposit": 4400,
    "icon": "🔄",
    "category": "nails",
    "isActive": true,
    "sortOrder": 4
  },
  {
    "id": "22222222-2222-2222-2222-222222222205",
    "name": "Tattoo Fine Line / Mini & Flash",
    "slug": "tattoo-fine-line-flash",
    "badge": "02 — TATTOO ART",
    "desc": "Tatuajes delicados de trazo fino, caligrafía, botánicos, micro-tattoos o diseños seleccionados del Flash Book del estudio.",
    "duration": 90,
    "durationLabel": "60-90 min",
    "price": 35000,
    "deposit": 7000,
    "icon": "🖋️",
    "category": "tattoo",
    "isActive": true,
    "sortOrder": 5
  },
  {
    "id": "22222222-2222-2222-2222-222222222206",
    "name": "Tattoo Blackwork & Diseño Custom",
    "slug": "tattoo-blackwork-custom",
    "badge": "02 — TATTOO ART",
    "desc": "Sesión de tatuaje personalizado en tinta negra, puntillismo, lettering experimental u ornamental a medida.",
    "duration": 150,
    "durationLabel": "120-180 min",
    "price": 55000,
    "deposit": 11000,
    "icon": "🩸",
    "category": "tattoo",
    "isActive": true,
    "sortOrder": 6
  }
];

  class MicaBackendManager {
    constructor() {
      this.config = { ...defaultConfig };
      this.sbClient = null;
      this.apiBase = '';
      this.hasNodeBackend = false;
      this.initialized = false;
      this.initPromise = null;

      // Namespaces para acceso intuitivo (ej: MicaBackend.auth.login, MicaBackend.admin.getAppointments)
      this.auth = {
        login: this.login.bind(this),
        register: this.register.bind(this),
        logout: this.logout.bind(this),
        getUser: this.getCurrentUser.bind(this)
      };
      this.turnos = {
        getServices: this.getServices.bind(this),
        getAvailableSlots: this.getAvailableSlots.bind(this),
        createAppointment: this.createAppointment.bind(this),
        getMyAppointments: this.getMyAppointments.bind(this),
        cancelAppointment: this.cancelAppointment.bind(this),
        deleteAppointment: this.deleteAppointment.bind(this),
        deleteCancelledAppointments: this.deleteCancelledAppointments.bind(this)
      };
      this.admin = {
        getAppointments: this.getAdminAppointments.bind(this),
        updateAppointmentStatus: this.updateAppointmentStatus.bind(this),
        deleteAppointment: this.deleteAppointment.bind(this),
        deleteCancelledAppointments: this.deleteCancelledAppointments.bind(this)
      };
      this.payments = {
        depositPercentage: DEPOSIT_PERCENTAGE,
        calcDeposit: this.calcDeposit.bind(this),
        getInfo: this.getPaymentInfo.bind(this),
        saveInfo: this.savePaymentInfo.bind(this),
        uploadReceipt: this.uploadDepositReceipt.bind(this),
        getReceiptUrl: this.getDepositReceiptUrl.bind(this)
      };
      this.gallery = {
        getPhotos: this.getGalleryPhotos.bind(this),
        addPhoto: this.addGalleryPhoto.bind(this),
        updatePhoto: this.updateGalleryPhoto.bind(this),
        deletePhoto: this.deleteGalleryPhoto.bind(this),
        uploadImage: this.uploadGalleryImage.bind(this),
        resetToDefaults: this.resetGalleryDefaults.bind(this)
      };
      this.instagram = {
        getDaySlots: this.getInstagramDaySlots.bind(this),
        getSchedule: this.getWeeklySchedule.bind(this),
        saveSchedule: this.saveWeeklySchedule.bind(this),
        getPublishedDays: this.getPublishedDays.bind(this),
        getPublishedDay: this.getPublishedDay.bind(this),
        publishDaySlots: this.publishDaySlots.bind(this),
        toggleSlotCrossedOut: this.toggleSlotCrossedOut.bind(this),
        unpublishDay: this.unpublishDay.bind(this)
      };
      this.schedules = {
        getPublishedDays: this.getPublishedDays.bind(this),
        getPublishedDay: this.getPublishedDay.bind(this),
        publishDaySlots: this.publishDaySlots.bind(this),
        toggleSlotCrossedOut: this.toggleSlotCrossedOut.bind(this),
        unpublishDay: this.unpublishDay.bind(this)
      };
      this.emails = {
        getSettings: this.getEmailSettings.bind(this),
        saveTemplates: this.saveEmailTemplates.bind(this),
        saveProvider: this.saveEmailProvider.bind(this),
        preview: this.previewEmailTemplate.bind(this),
        sendTest: this.sendTestEmail.bind(this),
        resendForAppointment: this.resendAppointmentEmail.bind(this)
      };
      this.content = {
        getDefaults: this.getDefaultSiteContent.bind(this),
        getAll: this.getSiteContent.bind(this),
        saveAll: this.saveSiteContent.bind(this),
        saveSection: this.saveSiteSection.bind(this),
        resetDefaults: this.resetSiteContent.bind(this)
      };
    }

    async init() {
      if (this.initPromise) return this.initPromise;
      this.initPromise = this._loadConfigAndInit();
      return this.initPromise;
    }

    async _loadConfigAndInit() {
      try {
        // 1. Auto-descubrimiento inteligente del servidor Node / Vercel Serverless (evita 404 en GitHub Pages)
        const host = (window.location && window.location.hostname) ? window.location.hostname.toLowerCase() : '';
        const port = (window.location && window.location.port) ? String(window.location.port) : '';
        const proto = (window.location && window.location.protocol) ? window.location.protocol : '';
        const isStaticOnlyHost = host.endsWith('.github.io');

        const candidateBases = [];
        if (window.MICA_API_URL) {
          candidateBases.push(String(window.MICA_API_URL).replace(/\/+$/, ''));
        } else if (host === 'localhost' || host === '127.0.0.1' || proto === 'file:') {
          if (port === '3456') {
            candidateBases.push('');
          } else {
            // Abierto desde Live Server (:5500, etc.) o file:// -> probar relativo y backend en :3456
            if (proto !== 'file:') candidateBases.push('');
            candidateBases.push('http://localhost:3456');
          }
        } else if (!isStaticOnlyHost) {
          candidateBases.push('');
        }

        for (const base of candidateBases) {
          const res = await fetch(`${base}/api/config`).catch(() => null);
          if (res && res.ok) {
            const ctype = (res.headers.get('content-type') || '').toLowerCase();
            if (ctype.includes('application/json')) {
              const apiConfig = await res.json().catch(() => null);
              if (apiConfig) {
                this.apiBase = base;
                this.hasNodeBackend = true;
                if (apiConfig.supabaseUrl && apiConfig.supabaseAnonKey) {
                  this.config.supabaseUrl = apiConfig.supabaseUrl;
                  this.config.supabaseAnonKey = apiConfig.supabaseAnonKey;
                  this.config.isConfigured = true;
                }
                break;
              }
            }
          }
        }

        // 2. Fallback a window.MICA_CONFIG si fue definido manualmente
        if (!this.config.isConfigured && window.MICA_CONFIG && window.MICA_CONFIG.supabaseUrl) {
          this.config.supabaseUrl = window.MICA_CONFIG.supabaseUrl;
          this.config.supabaseAnonKey = window.MICA_CONFIG.supabaseAnonKey;
          this.config.isConfigured = true;
        }

        // 3. Fallback a localStorage por si el usuario guardó credenciales desde UI
        if (!this.config.isConfigured) {
          const localUrl = localStorage.getItem('mica_supabase_url');
          const localKey = localStorage.getItem('mica_supabase_key');
          if (localUrl && localKey) {
            this.config.supabaseUrl = localUrl;
            this.config.supabaseAnonKey = localKey;
            this.config.isConfigured = true;
          }
        }

        // 4. Si hay credenciales y está disponible supabase-js, instanciar cliente
        if (this.config.isConfigured && window.supabase && window.supabase.createClient) {
          this.sbClient = window.supabase.createClient(this.config.supabaseUrl, this.config.supabaseAnonKey);
        }

        // 5. Mantener la sesión iniciada entre visitas (renueva el token vencido con el refresh_token)
        await this._refreshSessionIfNeeded();
        this._scheduleSessionRefresh();

        this.initialized = true;
        this._updateUIStatusBadge();
        return this.getStatus();
      } catch (e) {
        console.warn('MicaBackend init warning:', e);
        this.initialized = true;
        return this.getStatus();
      }
    }

    async _apiFetch(path, options = {}) {
      if (!this.hasNodeBackend) return null;
      return fetch(`${this.apiBase}${path}`, options);
    }

    getStatus() {
      return {
        isConfigured: !!(this.config.supabaseUrl && this.config.supabaseAnonKey),
        hasNodeBackend: this.hasNodeBackend,
        apiBase: this.apiBase,
        mode: this.config.isConfigured ? 'supabase' : 'local',
        supabaseUrl: this.config.supabaseUrl || null,
        user: this.getCurrentUser()
      };
    }

    _updateUIStatusBadge() {
      const badge = document.getElementById('supabase-status-badge');
      if (!badge) return;

      const status = this.getStatus();
      if (status.isConfigured) {
        badge.innerHTML = `
          <span class="inline-flex items-center gap-1.5 px-3 py-1 rounded-full bg-[#25D366]/20 border border-[#25D366]/40 text-[#25D366] text-xs font-semibold">
            <span class="w-2 h-2 rounded-full bg-[#25D366] animate-pulse"></span>
            Supabase Conectado
          </span>
        `;
      } else {
        badge.innerHTML = `
          <span class="inline-flex items-center gap-1.5 px-3 py-1 rounded-full bg-amber-500/20 border border-amber-500/40 text-amber-300 text-xs font-semibold" title="Los turnos y usuarios se guardan en el navegador. Podés configurar tu URL y clave de Supabase en el archivo .env">
            <span class="w-2 h-2 rounded-full bg-amber-400"></span>
            Modo Local / Demo
          </span>
        `;
      }
    }

    // =========================================================================
    // AUTENTICACIÓN (LOGIN / REGISTRO / PERFIL)
    // =========================================================================
    async register({ name, phone, email, password }) {
      await this.init();

      if (this.config.isConfigured) {
        // Enviar a Supabase Auth
        try {
          const authUrl = `${this.config.supabaseUrl}/auth/v1/signup`;
          const res = await fetch(authUrl, {
            method: 'POST',
            headers: {
              apikey: this.config.supabaseAnonKey,
              'Content-Type': 'application/json'
            },
            body: JSON.stringify({
              email,
              password,
              data: { full_name: name, phone: phone || '' }
            })
          });

          const data = await res.json();
          if (!res.ok) throw new Error(data.error_description || data.msg || data.message || 'Error al registrar');

          if (data.access_token) {
            localStorage.setItem(STORAGE_KEYS.TOKEN, data.access_token);
            if (data.refresh_token) localStorage.setItem(STORAGE_KEYS.REFRESH, data.refresh_token);
          }

          const userObj = {
            id: data.user ? data.user.id : 'usr_' + Date.now(),
            name: name,
            email: email,
            phone: phone || '',
            role: 'client'
          };
          localStorage.setItem(STORAGE_KEYS.USER, JSON.stringify(userObj));
          return { success: true, user: userObj, mode: 'supabase' };
        } catch (err) {
          console.warn('Supabase register error, falling back to local storage:', err);
          // Fallback a almacenamiento local para no bloquear la experiencia de usuario
          return this._localRegister({ name, phone, email, password });
        }
      } else {
        return this._localRegister({ name, phone, email, password });
      }
    }

    _localRegister({ name, phone, email, password }) {
      const usersStr = localStorage.getItem(STORAGE_KEYS.LOCAL_USERS) || '[]';
      const users = JSON.parse(usersStr);

      const existing = users.find(u => u.email.toLowerCase() === email.toLowerCase());
      if (existing) {
        throw new Error('Ya existe una cuenta con este correo. Podés iniciar sesión.');
      }

      const newUser = {
        id: 'usr_' + Date.now(),
        name,
        phone: phone || '',
        email,
        password,
        role: email.includes('admin') || (email.includes('nahi') || email.includes('mica')) ? 'admin' : 'client',
        createdAt: new Date().toISOString()
      };

      users.push(newUser);
      localStorage.setItem(STORAGE_KEYS.LOCAL_USERS, JSON.stringify(users));

      const sessionUser = {
        id: newUser.id,
        name: newUser.name,
        phone: newUser.phone,
        email: newUser.email,
        role: newUser.role
      };

      localStorage.setItem(STORAGE_KEYS.USER, JSON.stringify(sessionUser));
      localStorage.setItem(STORAGE_KEYS.TOKEN, 'demo_token_' + newUser.id);

      return { success: true, user: sessionUser, mode: 'local' };
    }

    async login(email, password) {
      await this.init();

      if (this.config.isConfigured) {
        let res;
        try {
          const authUrl = `${this.config.supabaseUrl}/auth/v1/token?grant_type=password`;
          res = await fetch(authUrl, {
            method: 'POST',
            headers: {
              apikey: this.config.supabaseAnonKey,
              'Content-Type': 'application/json'
            },
            body: JSON.stringify({ email, password })
          });
        } catch (networkErr) {
          console.warn('Supabase unreachable, trying local storage:', networkErr);
          return this._localLogin(email, password);
        }

        const data = await res.json().catch(() => ({}));
        if (!res.ok) {
          const rawMsg = data.error_description || data.msg || data.message || '';
          if (rawMsg.toLowerCase().includes('invalid login credentials')) {
            throw new Error('Email o contraseña incorrectos.');
          }
          throw new Error(rawMsg || 'Credenciales inválidas');
        }

        localStorage.setItem(STORAGE_KEYS.TOKEN, data.access_token);
        if (data.refresh_token) localStorage.setItem(STORAGE_KEYS.REFRESH, data.refresh_token);

        // Consultar rol desde app_metadata firmado por Supabase Auth (y fallback a profiles)
        let resolvedRole = data.user?.app_metadata?.role || null;
        if (!resolvedRole) {
          try {
            const profRes = await fetch(`${this.config.supabaseUrl}/rest/v1/profiles?id=eq.${data.user.id}&select=role,full_name,phone`, {
              headers: {
                apikey: this.config.supabaseAnonKey,
                Authorization: `Bearer ${data.access_token}`
              }
            });
            if (profRes.ok) {
              const profData = await profRes.json();
              if (Array.isArray(profData) && profData[0]?.role) {
                resolvedRole = profData[0].role;
              }
            }
          } catch (e) {}
        }

        if (!resolvedRole) {
          resolvedRole = (data.user.email.toLowerCase() === 'admin@gmail.com') ? 'admin' : 'client';
        }

        const fullName = data.user?.user_metadata?.full_name || data.user?.user_metadata?.name || email.split('@')[0];
        const phone = data.user?.user_metadata?.phone || '';

        const userObj = {
          id: data.user.id,
          name: fullName,
          email: data.user.email,
          phone: phone,
          role: resolvedRole
        };

        localStorage.setItem(STORAGE_KEYS.USER, JSON.stringify(userObj));
        return { success: true, user: userObj, mode: 'supabase' };
      } else {
        return this._localLogin(email, password);
      }
    }

    _localLogin(email, password) {
      const usersStr = localStorage.getItem(STORAGE_KEYS.LOCAL_USERS) || '[]';
      const users = JSON.parse(usersStr);

      const found = users.find(u => u.email.toLowerCase() === email.toLowerCase());
      if (found) {
        if (found.password && found.password !== password) {
          throw new Error('Contraseña incorrecta.');
        }
        const sessionUser = {
          id: found.id,
          name: found.name,
          phone: found.phone,
          email: found.email,
          role: found.role || 'client'
        };
        localStorage.setItem(STORAGE_KEYS.USER, JSON.stringify(sessionUser));
        localStorage.setItem(STORAGE_KEYS.TOKEN, 'demo_token_' + found.id);
        return { success: true, user: sessionUser, mode: 'local' };
      }

      // Si no existe, permitir inicio con credenciales demo
      const demoUser = {
        id: 'usr_guest_' + Date.now(),
        name: email.split('@')[0],
        email: email,
        phone: '',
        role: email.includes('admin') || (email.includes('nahi') || email.includes('mica')) ? 'admin' : 'client'
      };
      localStorage.setItem(STORAGE_KEYS.USER, JSON.stringify(demoUser));
      localStorage.setItem(STORAGE_KEYS.TOKEN, 'demo_token_' + demoUser.id);
      return { success: true, user: demoUser, mode: 'local' };
    }

    logout() {
      localStorage.removeItem(STORAGE_KEYS.TOKEN);
      localStorage.removeItem(STORAGE_KEYS.REFRESH);
      localStorage.removeItem(STORAGE_KEYS.USER);
      return true;
    }

    getCurrentUser() {
      try {
        const u = localStorage.getItem(STORAGE_KEYS.USER);
        return u ? JSON.parse(u) : null;
      } catch (e) {
        return null;
      }
    }

    _getValidJwtToken() {
      const token = localStorage.getItem(STORAGE_KEYS.TOKEN);
      if (token && token.split('.').length === 3 && !token.startsWith('demo_token_')) {
        // Un JWT vencido provoca 401 en todas las consultas: mejor usar la anon key hasta renovarlo
        const exp = this._getJwtExp(token);
        if (exp && exp * 1000 <= Date.now()) return null;
        return token;
      }
      return null;
    }

    _getJwtExp(token) {
      try {
        const payload = token.split('.')[1].replace(/-/g, '+').replace(/_/g, '/');
        const json = JSON.parse(atob(payload.padEnd(payload.length + (4 - payload.length % 4) % 4, '=')));
        return Number(json.exp) || null;
      } catch (e) {
        return null;
      }
    }

    // Renueva el access_token (dura 1 hora) usando el refresh_token guardado,
    // así la sesión queda iniciada aunque la clienta/admin cierre y vuelva a entrar.
    async _refreshSessionIfNeeded(force = false) {
      if (!this.config.isConfigured) return false;
      const token = localStorage.getItem(STORAGE_KEYS.TOKEN);
      const refresh = localStorage.getItem(STORAGE_KEYS.REFRESH);
      if (!refresh || !token || token.startsWith('demo_token_')) return false;

      const exp = this._getJwtExp(token);
      const msLeft = exp ? exp * 1000 - Date.now() : 0;
      if (!force && msLeft > 5 * 60 * 1000) return true; // todavía le quedan más de 5 minutos

      if (this._refreshPromise) return this._refreshPromise;
      this._refreshPromise = (async () => {
        try {
          const res = await fetch(`${this.config.supabaseUrl}/auth/v1/token?grant_type=refresh_token`, {
            method: 'POST',
            headers: { apikey: this.config.supabaseAnonKey, 'Content-Type': 'application/json' },
            body: JSON.stringify({ refresh_token: refresh })
          });
          const data = await res.json().catch(() => ({}));
          if (res.ok && data.access_token) {
            localStorage.setItem(STORAGE_KEYS.TOKEN, data.access_token);
            if (data.refresh_token) localStorage.setItem(STORAGE_KEYS.REFRESH, data.refresh_token);
            return true;
          }
          // Refresh token inválido o revocado: la sesión terminó de verdad
          if (res.status === 400 || res.status === 401) {
            this.logout();
          }
          return false;
        } catch (e) {
          // Sin conexión: conservar la sesión y reintentar más tarde
          return false;
        } finally {
          this._refreshPromise = null;
        }
      })();
      return this._refreshPromise;
    }

    _scheduleSessionRefresh() {
      if (this._sessionTimerStarted || typeof window === 'undefined') return;
      this._sessionTimerStarted = true;
      // Revisar cada 4 minutos y al volver a la pestaña
      setInterval(() => { this._refreshSessionIfNeeded(); }, 4 * 60 * 1000);
      document.addEventListener('visibilitychange', () => {
        if (document.visibilityState === 'visible') this._refreshSessionIfNeeded();
      });
    }

    _getAuthBearer() {
      return this._getValidJwtToken() || this.config.supabaseAnonKey;
    }

    // =========================================================================
    // SERVICIOS & DISPONIBILIDAD
    // =========================================================================
    async getServices() {
      await this.init();

      // 1. Consultar primero el contenido editable del sitio (garantiza que los cambios del Admin se reflejen al instante)
      try {
        const siteContent = await this.getSiteContent();
        if (siteContent && Array.isArray(siteContent.services) && siteContent.services.length > 0) {
          return siteContent.services
            .filter(s => s.isActive !== false)
            .map(s => ({
              id: s.id,
              name: s.name,
              slug: s.slug || '',
              badge: s.badge || '',
              desc: s.desc || s.description || '',
              duration: Number(s.duration || s.duration_minutes) || 90,
              durationLabel: s.durationLabel || `${Number(s.duration || s.duration_minutes) || 90} min`,
              price: Number(s.price !== undefined ? s.price : s.price_ars) || 0,
              deposit: Number(s.deposit !== undefined ? s.deposit : s.deposit_ars) || this.calcDeposit(s.price || s.price_ars || 0),
              icon: s.icon || '✨',
              category: s.category || 'extensiones'
            }));
        }
      } catch (e) {}

      // 2. Consultar /api/services en el servidor backend
      try {
        const apiRes = await this._apiFetch('/api/services');
        if (apiRes && apiRes.ok) {
          const apiData = await apiRes.json();
          if (apiData && Array.isArray(apiData.services) && apiData.services.length > 0) {
            return apiData.services.map(s => ({
              id: s.id,
              name: s.name,
              slug: s.slug,
              badge: s.badge || '',
              desc: s.description || s.desc || '',
              duration: s.duration_minutes || s.duration || 90,
              durationLabel: s.durationLabel || `${s.duration_minutes || s.duration || 90} min`,
              price: Number(s.price_ars || s.price) || 0,
              deposit: Number(s.deposit_ars || s.deposit) || 0,
              icon: s.icon || '✨',
              category: s.category || 'extensiones'
            }));
          }
        }
      } catch (e) {}

      if (this.config.isConfigured) {
        try {
          const res = await fetch(`${this.config.supabaseUrl}/rest/v1/services?is_active=eq.true&order=sort_order.asc`, {
            headers: {
              apikey: this.config.supabaseAnonKey,
              Authorization: `Bearer ${this.config.supabaseAnonKey}`
            }
          });
          if (res.ok) {
            const data = await res.json();
            if (Array.isArray(data) && data.length > 0) {
              return data.map(s => ({
                id: s.id,
                name: s.name,
                slug: s.slug,
                badge: s.badge || '',
                desc: s.description || '',
                duration: s.duration_minutes || 90,
                durationLabel: `${s.duration_minutes || 90} min`,
                price: Number(s.price_ars) || 0,
                deposit: Number(s.deposit_ars) || 0,
                icon: s.icon || '✨',
                category: s.category || 'extensiones'
              }));
            }
          }
        } catch (e) {
          console.warn('Error fetching services from Supabase, using fallback:', e);
        }
      }

      return FALLBACK_SERVICES;
    }

    async getAvailableSlots(dateStr, serviceId) {
      await this.init();

      // 1. Consultar primero al backend /api/turnos/availability (incluye horarios subidos y tachados por el Admin)
      try {
        const apiRes = await this._apiFetch(`/api/turnos/availability?date=${encodeURIComponent(dateStr)}`);
        if (apiRes && apiRes.ok) {
          const apiData = await apiRes.json();
          if (apiData && Array.isArray(apiData.slots)) {
            return apiData.slots;
          }
        }
      } catch (e) {}

      // 2. Verificar si existen horarios publicados en Supabase settings o localStorage (para modo estático/nube)
      const pubDay = await this._getStaticPublishedDay(dateStr);
      const baseTimes = (pubDay && Array.isArray(pubDay.slots) && pubDay.slots.length > 0)
        ? pubDay.slots.map(s => String(s.time || '').slice(0, 5))
        : ['10:00', '11:30', '14:00', '15:30', '17:00', '18:30'];

      const crossedSet = new Set(
        (pubDay && Array.isArray(pubDay.slots) ? pubDay.slots : [])
          .filter(s => s && s.crossedOut)
          .map(s => String(s.time || '').slice(0, 5))
      );

      if (this.config.isConfigured) {
        try {
          // Consultar horarios ocupados mediante función RPC segura (sin exponer datos personales)
          const rpcRes = await fetch(`${this.config.supabaseUrl}/rest/v1/rpc/get_booked_slots`, {
            method: 'POST',
            headers: {
              apikey: this.config.supabaseAnonKey,
              Authorization: `Bearer ${this.config.supabaseAnonKey}`,
              'Content-Type': 'application/json'
            },
            body: JSON.stringify({ p_date: dateStr })
          });
          if (rpcRes.ok) {
            const booked = await rpcRes.json();
            if (Array.isArray(booked)) {
              const bookedTimes = booked.map(b => (b.start_time || '').slice(0, 5));
              return baseTimes.map(time => ({
                time,
                crossedOut: crossedSet.has(time),
                autoBooked: bookedTimes.includes(time),
                available: !crossedSet.has(time) && !bookedTimes.includes(time)
              }));
            }
          }

          // Fallback directo si la tabla tiene política de lectura activa
          const res = await fetch(`${this.config.supabaseUrl}/rest/v1/appointments?appointment_date=eq.${dateStr}&status=neq.cancelled&select=start_time`, {
            headers: {
              apikey: this.config.supabaseAnonKey,
              Authorization: `Bearer ${this.config.supabaseAnonKey}`
            }
          });
          if (res.ok) {
            const booked = await res.json();
            const bookedTimes = booked.map(b => b.start_time.slice(0, 5));
            return baseTimes.map(time => ({
              time,
              crossedOut: crossedSet.has(time),
              autoBooked: bookedTimes.includes(time),
              available: !crossedSet.has(time) && !bookedTimes.includes(time)
            }));
          }
        } catch (e) {
          console.warn('Error fetching slots from Supabase, using local calculation:', e);
        }
      }

      // En modo local, verificar citas guardadas en localStorage
      const localTurnos = this.getStoredTurnos();
      const bookedLocal = localTurnos
        .filter(t => t.date === dateStr && t.status !== 'cancelled')
        .map(t => t.time);

      return baseTimes.map(time => ({
        time,
        crossedOut: crossedSet.has(time),
        autoBooked: bookedLocal.includes(time),
        available: !crossedSet.has(time) && !bookedLocal.includes(time)
      }));
    }

    // =========================================================================
    // CREAR TURNO / RESERVA
    // =========================================================================
    async createAppointment(bookingData) {
      await this.init();

      const newId = 'turn_' + Date.now();
      const currentUser = this.getCurrentUser();

      const normalizedBooking = {
        id: newId,
        service: bookingData.service,
        serviceId: bookingData.serviceId || (bookingData.service ? bookingData.service.id : null),
        date: bookingData.date,
        time: bookingData.time,
        endTime: bookingData.endTime || '',
        price: bookingData.price || (bookingData.service ? bookingData.service.price : 0),
        professional: 'Nahiara Ciamprone',
        clientName: bookingData.name,
        clientPhone: bookingData.phone,
        clientEmail: bookingData.email || (currentUser ? currentUser.email : ''),
        clientNotes: bookingData.notes || '',
        depositArs: Number(bookingData.depositArs) || 0,
        depositReceipt: bookingData.depositReceipt || null,
        paymentMethod: bookingData.depositReceipt ? 'transferencia' : 'efectivo',
        status: 'pending',
        createdAt: new Date().toISOString()
      };

      // Guardar siempre en local storage para disponibilidad offline inmediata
      this._saveLocalTurno(normalizedBooking);

      // 1. Enviar al servidor backend /api/turnos (persiste directo en Supabase con service_role)
      let backendReached = false;
      try {
        const apiRes = await this._apiFetch('/api/turnos', {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({
            serviceId: normalizedBooking.serviceId,
            serviceName: normalizedBooking.service ? normalizedBooking.service.name : '',
            date: normalizedBooking.date,
            time: normalizedBooking.time,
            endTime: normalizedBooking.endTime,
            price: normalizedBooking.price,
            name: normalizedBooking.clientName,
            phone: normalizedBooking.clientPhone,
            email: normalizedBooking.clientEmail,
            notes: normalizedBooking.clientNotes,
            depositArs: normalizedBooking.depositArs,
            depositReceipt: normalizedBooking.depositReceipt
          })
        });
        if (apiRes) {
          backendReached = true;
          const apiData = await apiRes.json().catch(() => ({}));
          if (apiRes.ok && apiData && apiData.appointment && apiData.appointment.id) {
            normalizedBooking.supabaseId = apiData.appointment.id;
            this._updateLocalTurno(normalizedBooking);
            return {
              success: true,
              appointment: normalizedBooking,
              emailNotification: apiData.emailNotification || null
            };
          }
          if (apiRes.status === 409 || apiRes.status === 400) {
            const turnos = this.getStoredTurnos().filter(t => t.id !== normalizedBooking.id);
            localStorage.setItem(STORAGE_KEYS.LOCAL_TURNOS, JSON.stringify(turnos));
            throw new Error(apiData.error || 'Ese horario ya no está disponible.');
          }
        }
      } catch (e) {
        if (backendReached) throw e;
      }

      // 2. Fallback directo a Supabase si no hay backend Node corriendo
      if (this.config.isConfigured) {
        try {
          const generatedUuid = (window.crypto && window.crypto.randomUUID) ? window.crypto.randomUUID() : undefined;
          const hasValidJwt = !!this._getValidJwtToken();
          const svcName = normalizedBooking.service ? normalizedBooking.service.name : '';
          const fullNotes = svcName
            ? (normalizedBooking.clientNotes ? `Tratamiento: ${svcName}\n${normalizedBooking.clientNotes}` : `Tratamiento: ${svcName}`)
            : normalizedBooking.clientNotes;
          const payload = {
            ...(generatedUuid ? { id: generatedUuid } : {}),
            professional_id: '11111111-1111-1111-1111-111111111111',
            service_id: normalizedBooking.serviceId || '22222222-2222-2222-2222-222222222202',
            appointment_date: normalizedBooking.date,
            start_time: normalizedBooking.time.length === 5 ? normalizedBooking.time + ':00' : normalizedBooking.time,
            end_time: (normalizedBooking.endTime || '16:00').slice(0, 5) + ':00',
            price_ars: normalizedBooking.price,
            client_name: normalizedBooking.clientName,
            client_phone: normalizedBooking.clientPhone,
            client_email: normalizedBooking.clientEmail,
            client_notes: fullNotes,
            deposit_ars: normalizedBooking.depositArs,
            deposit_receipt_url: normalizedBooking.depositReceipt,
            payment_method: normalizedBooking.paymentMethod,
            payment_status: 'pending',
            status: 'pending'
          };

          const postAppointment = (body) => fetch(`${this.config.supabaseUrl}/rest/v1/appointments`, {
            method: 'POST',
            headers: {
              apikey: this.config.supabaseAnonKey,
              Authorization: `Bearer ${this.config.supabaseAnonKey}`,
              'Content-Type': 'application/json',
              Prefer: 'return=minimal'
            },
            body: JSON.stringify(body)
          });

          let res = await postAppointment(payload);

          // Si todavía no se ejecutó add-deposit-sena.sql (falta la columna del comprobante),
          // guardar igual el turno dejando los datos de la seña en las notas
          if (!res.ok && normalizedBooking.depositReceipt) {
            const errData = await res.clone().json().catch(() => ({}));
            if (errData.code === 'PGRST204' || /deposit_receipt_url/.test(errData.message || '')) {
              const { deposit_receipt_url, ...legacyPayload } = payload;
              legacyPayload.client_notes = `${fullNotes || ''}\n[Seña $${normalizedBooking.depositArs} - comprobante: ${normalizedBooking.depositReceipt}]`.trim();
              res = await postAppointment(legacyPayload);
            }
          }

          if (res.ok) {
            if (generatedUuid) {
              normalizedBooking.supabaseId = generatedUuid;
            }
            this._updateLocalTurno(normalizedBooking);
          }
        } catch (e) {
          console.warn('Could not save appointment to Supabase, persisted locally:', e);
        }
      }

      return {
        success: true,
        appointment: normalizedBooking
      };
    }

    // =========================================================================
    // CONSULTAR Y CANCELAR TURNOS
    // =========================================================================
    async getMyAppointments() {
      await this.init();
      const currentUser = this.getCurrentUser();
      const deletedSet = new Set(this._getDeletedTurnoIds());
      const localTurnos = this.getStoredTurnos().filter(t => !deletedSet.has(t.id) && !deletedSet.has(t.supabaseId));

      if (currentUser && currentUser.email) {
        try {
          const apiRes = await this._apiFetch(`/api/turnos?email=${encodeURIComponent(currentUser.email)}`);
          if (apiRes && apiRes.ok) {
            const apiData = await apiRes.json();
            if (Array.isArray(apiData.appointments) && apiData.appointments.length > 0) {
              return apiData.appointments
                .filter(row => !deletedSet.has(row.id))
                .map(row => {
                  const rawNotes = row.client_notes || row.notes || '';
                  const resolvedSvcName = (row.services && row.services.name)
                    || row.service_name
                    || (rawNotes.includes('Tratamiento:') ? rawNotes.split('Tratamiento:')[1].split('\n')[0].trim() : 'Tratamiento de Pestañas');
                  return {
                    id: row.id,
                    date: row.appointment_date || row.date,
                    time: ((row.start_time || row.time) + '').slice(0, 5),
                    endTime: ((row.end_time || row.endTime || '16:00') + '').slice(0, 5),
                    price: Number(row.price_ars || row.price) || 0,
                    status: row.status,
                    clientName: row.client_name || row.name,
                    clientPhone: row.client_phone || row.phone,
                    clientNotes: rawNotes,
                    professional: 'Nahiara Ciamprone',
                    service: {
                      name: resolvedSvcName,
                      price: Number(row.price_ars || row.price) || 0
                    }
                  };
                });
            }
          }
        } catch (e) {}
      }

      if (this.config.isConfigured && currentUser && currentUser.email) {
        try {
          const res = await fetch(`${this.config.supabaseUrl}/rest/v1/appointments?client_email=eq.${encodeURIComponent(currentUser.email)}&order=appointment_date.desc,start_time.asc`, {
            headers: {
              apikey: this.config.supabaseAnonKey,
              Authorization: `Bearer ${this._getAuthBearer()}`
            }
          });

          if (res.ok) {
            const data = await res.json();
            if (Array.isArray(data) && data.length > 0) {
              return data
                .filter(row => !deletedSet.has(row.id))
                .map(row => {
                  const rawNotes = row.client_notes || '';
                  const resolvedSvcName = rawNotes.includes('Tratamiento:')
                    ? rawNotes.split('Tratamiento:')[1].split('\n')[0].trim()
                    : 'Tratamiento de Pestañas';
                  return {
                    id: row.id,
                    date: row.appointment_date,
                    time: row.start_time.slice(0, 5),
                    endTime: row.end_time.slice(0, 5),
                    price: Number(row.price_ars),
                    status: row.status,
                    clientName: row.client_name,
                    clientPhone: row.client_phone,
                    clientNotes: rawNotes,
                    professional: 'Nahiara Ciamprone',
                    service: {
                      name: resolvedSvcName,
                      price: Number(row.price_ars)
                    }
                  };
                });
            }
          }
        } catch (e) {
          console.warn('Error fetching appointments from Supabase:', e);
        }
      }

      return localTurnos;
    }

    async cancelAppointment(appointmentId) {
      await this.init();

      // Actualizar en localStorage y resolver el ID real en Supabase si se pasó el ID local
      const turnos = this.getStoredTurnos();
      const found = turnos.find(t => t.id === appointmentId || t.supabaseId === appointmentId);
      const targetId = (found && found.supabaseId) ? found.supabaseId : appointmentId;
      if (found) {
        found.status = 'cancelled';
        localStorage.setItem(STORAGE_KEYS.LOCAL_TURNOS, JSON.stringify(turnos));
      }

      // 1. Cancelar mediante servidor backend /api/turnos/:id (dispara email personalizado de cancelación)
      try {
        const apiRes = await this._apiFetch(`/api/turnos/${encodeURIComponent(targetId)}`, {
          method: 'PATCH',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({ status: 'cancelled', cancelledBy: 'client' })
        });
        if (apiRes && apiRes.ok) {
          const data = await apiRes.json().catch(() => ({}));
          return { success: true, emailNotification: data.emailNotification || null };
        }
      } catch (e) {}

      // 2. Fallback directo si está en Supabase
      if (this.config.isConfigured) {
        try {
          await fetch(`${this.config.supabaseUrl}/rest/v1/appointments?id=eq.${encodeURIComponent(targetId)}`, {
            method: 'PATCH',
            headers: {
              apikey: this.config.supabaseAnonKey,
              Authorization: `Bearer ${this._getAuthBearer()}`,
              'Content-Type': 'application/json'
            },
            body: JSON.stringify({ status: 'cancelled' })
          });
        } catch (e) {
          console.warn('Error cancelling on Supabase:', e);
        }
      }

      return true;
    }

    // =========================================================================
    // ADMINISTRACIÓN (PANEL DE CONTROL)
    // =========================================================================
    async getAdminAppointments(filter = 'all') {
      await this.init();
      const deletedSet = new Set(this._getDeletedTurnoIds());

      // 1. Consultar servidor backend /api/turnos (usa SUPABASE_SERVICE_ROLE_KEY)
      try {
        const apiRes = await this._apiFetch(`/api/turnos?status=${filter}`);
        if (apiRes && apiRes.ok) {
          const apiData = await apiRes.json();
          if (Array.isArray(apiData.appointments)) {
            return apiData.appointments
              .filter(r => !deletedSet.has(r.id))
              .map(r => {
                const rawNotes = r.client_notes || r.notes || '';
                const svcName = (r.services && r.services.name)
                  || r.service_name
                  || (rawNotes.includes('Tratamiento:') ? rawNotes.split('Tratamiento:')[1].split('\n')[0].trim() : 'Tratamiento de Pestañas');
                return {
                  id: r.id,
                  date: r.appointment_date || r.date,
                  time: ((r.start_time || r.time) + '').slice(0, 5),
                  clientName: r.client_name || r.name || 'Clienta',
                  clientPhone: r.client_phone || r.phone || '',
                  clientEmail: r.client_email || r.email || '',
                  price: Number(r.price_ars || r.price) || 0,
                  status: r.status || 'pending',
                  service: { name: svcName },
                  clientNotes: rawNotes,
                  notes: rawNotes,
                  depositArs: Number(r.deposit_ars) || 0,
                  depositReceipt: r.deposit_receipt_url || null,
                  paymentStatus: r.payment_status || 'pending',
                  createdAt: r.created_at
                };
              });
          }
        }
      } catch (e) {}

      // 2. Fallback directo a Supabase REST
      if (this.config.isConfigured) {
        try {
          let url = `${this.config.supabaseUrl}/rest/v1/appointments?order=appointment_date.desc,start_time.asc`;
          if (filter !== 'all') {
            url += `&status=eq.${filter}`;
          }

          const res = await fetch(url, {
            headers: {
              apikey: this.config.supabaseAnonKey,
              Authorization: `Bearer ${this._getAuthBearer()}`
            }
          });

          if (res.ok) {
            const data = await res.json();
            return data
              .filter(r => !deletedSet.has(r.id))
              .map(r => ({
                id: r.id,
                date: r.appointment_date,
                time: r.start_time.slice(0, 5),
                clientName: r.client_name,
                clientPhone: r.client_phone,
                clientEmail: r.client_email,
                price: Number(r.price_ars),
                status: r.status,
                clientNotes: r.client_notes,
                notes: r.client_notes,
                depositArs: Number(r.deposit_ars) || 0,
                depositReceipt: r.deposit_receipt_url || null,
                paymentStatus: r.payment_status || 'pending',
                createdAt: r.created_at
              }));
          }
        } catch (e) {
          console.warn('Admin fetch error:', e);
        }
      }

      // 3. Fallback a localStorage
      let turnos = this.getStoredTurnos().filter(t => !deletedSet.has(t.id) && !deletedSet.has(t.supabaseId));
      if (filter !== 'all') {
        turnos = turnos.filter(t => t.status === filter);
      }
      return turnos;
    }

    async updateAppointmentStatus(appointmentId, newStatus, options = {}) {
      await this.init();

      const turnos = this.getStoredTurnos();
      const t = turnos.find(x => x.id === appointmentId || x.supabaseId === appointmentId);
      if (t) {
        t.status = newStatus;
        localStorage.setItem(STORAGE_KEYS.LOCAL_TURNOS, JSON.stringify(turnos));
      }

      // 1. Actualizar mediante backend /api/turnos/:id (dispara email personalizado si se cancela)
      try {
        const apiRes = await this._apiFetch(`/api/turnos/${encodeURIComponent(appointmentId)}`, {
          method: 'PATCH',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({
            status: newStatus,
            cancelledBy: options.cancelledBy || 'admin',
            cancelReason: options.cancelReason || ''
          })
        });
        if (apiRes && apiRes.ok) {
          const data = await apiRes.json().catch(() => ({}));
          return { success: true, emailNotification: data.emailNotification || null };
        }
      } catch (e) {}

      // 2. Fallback directo a Supabase REST
      if (this.config.isConfigured) {
        try {
          await fetch(`${this.config.supabaseUrl}/rest/v1/appointments?id=eq.${appointmentId}`, {
            method: 'PATCH',
            headers: {
              apikey: this.config.supabaseAnonKey,
              Authorization: `Bearer ${this._getAuthBearer()}`,
              'Content-Type': 'application/json'
            },
            body: JSON.stringify(newStatus === 'confirmed'
              ? { status: newStatus, payment_status: 'partial' } // Confirmar = seña recibida
              : { status: newStatus })
          });
        } catch (e) {
          console.warn('Status update error in Supabase:', e);
        }
      }

      return true;
    }

    async deleteAppointment(appointmentId) {
      await this.init();
      if (!appointmentId) return { success: false };

      const turnos = this.getStoredTurnos();
      const found = turnos.find(t => t.id === appointmentId || t.supabaseId === appointmentId);
      const targetId = (found && found.supabaseId) ? found.supabaseId : appointmentId;

      const remaining = turnos.filter(t => t.id !== appointmentId && t.supabaseId !== appointmentId && t.id !== targetId);
      localStorage.setItem(STORAGE_KEYS.LOCAL_TURNOS, JSON.stringify(remaining));
      this._markTurnoDeleted(appointmentId);
      if (targetId && targetId !== appointmentId) {
        this._markTurnoDeleted(targetId);
      }

      // 1. Eliminar en servidor backend /api/turnos/:id
      try {
        const apiRes = await this._apiFetch(`/api/turnos/${encodeURIComponent(targetId)}`, {
          method: 'DELETE'
        });
        if (apiRes && apiRes.ok) {
          return { success: true, id: targetId };
        }
      } catch (e) {}

      // 2. Eliminar directamente en Supabase REST
      if (this.config.isConfigured) {
        try {
          await fetch(`${this.config.supabaseUrl}/rest/v1/appointments?id=eq.${encodeURIComponent(targetId)}`, {
            method: 'DELETE',
            headers: {
              apikey: this.config.supabaseAnonKey,
              Authorization: `Bearer ${this._getAuthBearer()}`
            }
          });
        } catch (e) {
          console.warn('Error deleting appointment on Supabase:', e);
        }
      }

      return { success: true, id: targetId };
    }

    async deleteCancelledAppointments(knownCancelledIds = []) {
      await this.init();

      const turnos = this.getStoredTurnos();
      const cancelledLocal = turnos.filter(t => t.status === 'cancelled');
      cancelledLocal.forEach(t => {
        if (t.id) this._markTurnoDeleted(t.id);
        if (t.supabaseId) this._markTurnoDeleted(t.supabaseId);
      });
      if (Array.isArray(knownCancelledIds)) {
        knownCancelledIds.forEach(id => {
          if (id) this._markTurnoDeleted(id);
        });
      }
      const remaining = turnos.filter(t => t.status !== 'cancelled');
      localStorage.setItem(STORAGE_KEYS.LOCAL_TURNOS, JSON.stringify(remaining));

      let deletedCount = cancelledLocal.length;

      // 1. Eliminar todos los cancelados en servidor backend
      try {
        const apiRes = await this._apiFetch('/api/turnos/cancelled', {
          method: 'DELETE'
        });
        if (apiRes && apiRes.ok) {
          const data = await apiRes.json().catch(() => ({}));
          if (typeof data.deletedCount === 'number') {
            deletedCount = Math.max(deletedCount, data.deletedCount);
          }
          return { success: true, deletedCount };
        }
      } catch (e) {}

      // 2. Eliminar directamente en Supabase REST
      if (this.config.isConfigured) {
        try {
          await fetch(`${this.config.supabaseUrl}/rest/v1/appointments?status=eq.cancelled`, {
            method: 'DELETE',
            headers: {
              apikey: this.config.supabaseAnonKey,
              Authorization: `Bearer ${this._getAuthBearer()}`
            }
          });
        } catch (e) {
          console.warn('Error bulk-deleting cancelled appointments on Supabase:', e);
        }
      }

      return { success: true, deletedCount };
    }

    // Helpers locales
    _getDeletedTurnoIds() {
      try {
        const raw = localStorage.getItem(STORAGE_KEYS.DELETED_TURNOS);
        const parsed = raw ? JSON.parse(raw) : [];
        return Array.isArray(parsed) ? parsed : [];
      } catch (e) {
        return [];
      }
    }

    _markTurnoDeleted(id) {
      if (!id) return;
      try {
        const current = this._getDeletedTurnoIds();
        if (!current.includes(id)) {
          current.push(id);
          localStorage.setItem(STORAGE_KEYS.DELETED_TURNOS, JSON.stringify(current));
        }
      } catch (e) {}
    }

    getStoredTurnos() {
      try {
        const raw = localStorage.getItem(STORAGE_KEYS.LOCAL_TURNOS);
        return raw ? JSON.parse(raw) : [];
      } catch (e) {
        return [];
      }
    }

    _saveLocalTurno(turno) {
      const turnos = this.getStoredTurnos();
      turnos.unshift(turno);
      localStorage.setItem(STORAGE_KEYS.LOCAL_TURNOS, JSON.stringify(turnos));
    }

    _updateLocalTurno(turno) {
      const turnos = this.getStoredTurnos();
      const idx = turnos.findIndex(t => t.id === turno.id);
      if (idx !== -1) {
        turnos[idx] = turno;
        localStorage.setItem(STORAGE_KEYS.LOCAL_TURNOS, JSON.stringify(turnos));
      }
    }

    // =========================================================================
    // MÉTODOS DE GESTIÓN DE FOTOS DE EJEMPLO & GALERÍA (ADMIN & FRONTEND)
    // =========================================================================

    _getDefaultGalleryPhotos() {
      return [
      {
            "id": "nahi_nail_1",
            "title": "Crimson French & Tattoo",
            "badge": "Cara A · Nail Art de Autor",
            "category": "nails",
            "description": "Almendradas con french rojo carmesí profundo en diálogo con tatuaje ornamental de muñeca.",
            "imageUrl": "fotos/imgi_25_539976307_17854872333514079_3988514524600607766_n.webp?v=2",
            "mediaType": "image",
            "isFeatured": true,
            "isHero": true,
            "sortOrder": 1
      },
      {
            "id": "nahi_nail_2",
            "title": "Sculpted 3D & Perlas",
            "badge": "Cara A · Relieve Escultórico",
            "category": "nails",
            "description": "Diseño escultórico con volumen metálico dorado, perlas y detalles marinos sobre base lechosa.",
            "imageUrl": "fotos/imgi_22_504060229_17842497063514079_4107614235171648365_n.webp?v=2",
            "mediaType": "image",
            "isFeatured": true,
            "isHero": true,
            "sortOrder": 2
      },
      {
            "id": "nahi_nail_3",
            "title": "Reflective Obsidian Glitter",
            "badge": "Cara A · Destello Reflectivo",
            "category": "nails",
            "description": "Glitter reflectivo oscuro con destellos plateados en forma almendra.",
            "imageUrl": "fotos/imgi_6_928715819_1678752167229555_3258636658814047340_n.jpg?v=2",
            "mediaType": "image",
            "isFeatured": true,
            "isHero": true,
            "sortOrder": 3
      },
      {
            "id": "nahi_nail_4",
            "title": "Chrome Animal Print Coffin",
            "badge": "Cara A · Estructura Coffin",
            "category": "nails",
            "description": "Base metálica champagne con diseño animal print en negro intenso sobre estructura coffin.",
            "imageUrl": "fotos/imgi_9_857436431_17930539812514079_2849828327181330972_n.jpg?v=2",
            "mediaType": "image",
            "isFeatured": true,
            "isHero": false,
            "sortOrder": 4
      },
      {
            "id": "nahi_nail_5",
            "title": "Editorial French & Red",
            "badge": "Cara A · French Clásico",
            "category": "nails",
            "description": "French clásico reinterpretado con líneas orgánicas y acento rojo carmesí.",
            "imageUrl": "fotos/imgi_31_628792993_17875531770514079_7101006345959160330_n.webp?v=2",
            "mediaType": "image",
            "isFeatured": true,
            "isHero": false,
            "sortOrder": 5
      },
      {
            "id": "nahi_nail_6",
            "title": "Gothic Chrome & Studs",
            "badge": "Cara A · Nail Art de Autor",
            "category": "nails",
            "description": "Nail art negro profundo con lettering gótico, tachas metálicas y líneas cromadas.",
            "imageUrl": "fotos/imgi_13_861911954_1131761712629862_1954115592653772609_n.jpg?v=2",
            "mediaType": "image",
            "isFeatured": true,
            "isHero": false,
            "sortOrder": 6
      },
      {
            "id": "nahi_tattoo_1",
            "title": "Cupido Blackwork & Puntillismo",
            "badge": "Cara B · Blackwork",
            "category": "tattoo",
            "description": "Cupido clásico en clave blackwork con sombreado de arrastre y puntillismo de alta definición.",
            "imageUrl": "fotos/imgi_28_771909433_18096793385269189_6790519837572543665_n.jpg?v=2",
            "mediaType": "image",
            "isFeatured": true,
            "isHero": true,
            "sortOrder": 7
      },
      {
            "id": "nahi_tattoo_2",
            "title": "León Oriental Fu Dog & Geometría",
            "badge": "Cara B · Proyecto a Medida",
            "category": "tattoo",
            "description": "Pieza de pecho a gran escala: guardián oriental con líneas sólidas y esfera de geometría sagrada.",
            "imageUrl": "fotos/imgi_18_831313350_18104431136269189_151488612152529768_n.jpg?v=2",
            "mediaType": "image",
            "isFeatured": true,
            "isHero": true,
            "sortOrder": 8
      },
      {
            "id": "nahi_tattoo_3",
            "title": "Lettering Distorsión — Viejo Karma",
            "badge": "Cara B · Lettering",
            "category": "tattoo",
            "description": "Tipografía experimental con efecto onda y firma caligráfica en tinta negra intensa.",
            "imageUrl": "fotos/imgi_11_902024821_18111104054269189_4890881016085880301_n.jpg?v=2",
            "mediaType": "image",
            "isFeatured": true,
            "isHero": true,
            "sortOrder": 9
      },
      {
            "id": "nahi_tattoo_4",
            "title": "Fine Line & Caligrafía Infinito",
            "badge": "Cara B · Fine Line",
            "category": "tattoo",
            "description": "Trazo fino caligráfico con destellos astrales, micro-luna y línea ornamental.",
            "imageUrl": "fotos/imgi_15_846504117_18106174985269189_2305949659410720467_n.jpg?v=2",
            "mediaType": "image",
            "isFeatured": true,
            "isHero": false,
            "sortOrder": 10
      },
      {
            "id": "nahi_tattoo_5",
            "title": "Femme Spots — Botánico Ornamental",
            "badge": "Cara B · Botánico",
            "category": "tattoo",
            "description": "Diseño botánico simétrico de trazo delicado adaptado a la anatomía del esternón.",
            "imageUrl": "fotos/imgi_10_832478316_1138317815289557_8357992302156346057_n.jpg?v=2",
            "mediaType": "image",
            "isFeatured": true,
            "isHero": false,
            "sortOrder": 11
      }
];
    }

    _safeSetLocalGallery(list) {
      if (!Array.isArray(list)) return;
      try {
        localStorage.setItem(STORAGE_KEYS.GALLERY, JSON.stringify(list));
      } catch (quotaErr) {
        try {
          // Si alguna imagen antigua en Base64 superó la cuota del navegador, conservar URLs livianas y la última foto subida
          const slim = list.filter((p, idx) => {
            const u = String(p && p.imageUrl ? p.imageUrl : '');
            return !u.startsWith('data:image/') || u.length < 350000 || idx === list.length - 1;
          });
          localStorage.setItem(STORAGE_KEYS.GALLERY, JSON.stringify(slim));
        } catch (_) {
          // No bloquear el guardado principal si el caché de localStorage está lleno
        }
      }
    }

    async _compressImageFile(file, maxDim = 1400, quality = 0.84) {
      return new Promise((resolve, reject) => {
        const fallbackReader = () => {
          const reader = new FileReader();
          reader.onload = () => resolve({ dataUrl: reader.result, blob: file });
          reader.onerror = err => reject(err);
          reader.readAsDataURL(file);
        };

        if (typeof document === 'undefined' || typeof Image === 'undefined') {
          return fallbackReader();
        }

        const objUrl = (window.URL && window.URL.createObjectURL) ? window.URL.createObjectURL(file) : null;
        if (!objUrl) return fallbackReader();

        const img = new Image();
        img.onload = () => {
          try {
            window.URL.revokeObjectURL(objUrl);
            let width = img.naturalWidth || img.width;
            let height = img.naturalHeight || img.height;

            if (!width || !height) return fallbackReader();

            if (width > maxDim || height > maxDim) {
              const ratio = Math.min(maxDim / width, maxDim / height);
              width = Math.round(width * ratio);
              height = Math.round(height * ratio);
            }

            const canvas = document.createElement('canvas');
            canvas.width = width;
            canvas.height = height;
            const ctx = canvas.getContext('2d');
            if (!ctx) return fallbackReader();

            ctx.fillStyle = '#0d0a0f';
            ctx.fillRect(0, 0, width, height);
            ctx.drawImage(img, 0, 0, width, height);

            const dataUrl = canvas.toDataURL('image/jpeg', quality);
            if (canvas.toBlob) {
              canvas.toBlob((blob) => {
                resolve({ dataUrl, blob: blob || file });
              }, 'image/jpeg', quality);
            } else {
              resolve({ dataUrl, blob: file });
            }
          } catch (e) {
            fallbackReader();
          }
        };
        img.onerror = () => {
          try { window.URL.revokeObjectURL(objUrl); } catch (_) {}
          fallbackReader();
        };
        img.src = objUrl;
      });
    }

    _isValidStudioGalleryList(list) {
      if (!Array.isArray(list) || list.length === 0) return false;
      return !list.some(p => {
        const u = String(p && p.imageUrl ? p.imageUrl : '');
        return !u || u.startsWith('images/ej-') || u.startsWith('images/mica-');
      });
    }

    async getGalleryPhotos() {
      await this.init();

      // 1. Intentar desde backend server /api/gallery
      try {
        const res = await this._apiFetch('/api/gallery');
        if (res && res.ok) {
          const data = await res.json();
          if (data && this._isValidStudioGalleryList(data.photos)) {
            this._safeSetLocalGallery(data.photos);
            return data.photos;
          }
        }
      } catch (e) {
        // Fallback a Supabase o localStorage
      }

      // 2. Intentar Supabase directamente si configurado
      if (this.config.isConfigured) {
        try {
          const res = await fetch(`${this.config.supabaseUrl}/rest/v1/gallery_photos?select=*&order=sort_order.asc`, {
            headers: {
              apikey: this.config.supabaseAnonKey,
              Authorization: `Bearer ${this.config.supabaseAnonKey}`
            }
          });
          if (res.ok) {
            const data = await res.json();
            if (Array.isArray(data) && data.length > 0) {
              const mapped = data.map(r => ({
                id: r.id,
                title: r.title,
                badge: r.badge,
                category: r.category,
                description: r.description,
                imageUrl: r.image_url,
                isFeatured: r.is_featured,
                isHero: r.is_hero,
                sortOrder: r.sort_order
              }));
              if (this._isValidStudioGalleryList(mapped)) {
                this._safeSetLocalGallery(mapped);
                return mapped;
              }
            }
          }
        } catch (e) {
          console.warn('Error fetching gallery from Supabase:', e);
        }
      }

      // 3. Fallback a LocalStorage (validando que las rutas sean válidas de Nahi Studio)
      try {
        const local = localStorage.getItem(STORAGE_KEYS.GALLERY);
        if (local) {
          const parsed = JSON.parse(local);
          if (this._isValidStudioGalleryList(parsed)) {
            return parsed;
          }
        }
      } catch (e) {}

      // 3b. Intentar cargar gallery-data.json estático (ideal para Vercel / GitHub Pages)
      try {
        const staticRes = await fetch('gallery-data.json').catch(() => null);
        if (staticRes && staticRes.ok) {
          const staticPhotos = await staticRes.json().catch(() => null);
          if (this._isValidStudioGalleryList(staticPhotos)) {
            this._safeSetLocalGallery(staticPhotos);
            return staticPhotos;
          }
        }
      } catch (e) {}

      // 4. Default fotos de la carpeta fotos/ de Nahi Studio
      const def = this._getDefaultGalleryPhotos();
      this._safeSetLocalGallery(def);
      return def;
    }

    async addGalleryPhoto(photoData) {
      await this.init();

      // 1. Intentar backend /api/gallery
      try {
        const res = await this._apiFetch('/api/gallery', {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify(photoData)
        });
        if (res && res.ok) {
          const data = await res.json();
          if (data && data.photo) {
            const current = await this.getGalleryPhotos();
            if (!current.some(p => String(p.id) === String(data.photo.id))) {
              current.push(data.photo);
              this._safeSetLocalGallery(current);
            }
            return data.photo;
          }
        }
      } catch (e) {
        console.warn('Backend addGalleryPhoto error, falling back:', e);
      }

      // 2. Fallback Supabase
      if (this.config.isConfigured) {
        try {
          const res = await fetch(`${this.config.supabaseUrl}/rest/v1/gallery_photos`, {
            method: 'POST',
            headers: {
              apikey: this.config.supabaseAnonKey,
              Authorization: `Bearer ${this._getAuthBearer()}`,
              'Content-Type': 'application/json',
              Prefer: 'return=representation'
            },
            body: JSON.stringify({
              title: photoData.title,
              badge: photoData.badge || 'Look Más Pedido',
              category: photoData.category || 'volumen',
              description: photoData.description || '',
              image_url: photoData.imageUrl,
              is_featured: !!photoData.isFeatured,
              is_hero: !!photoData.isHero,
              sort_order: photoData.sortOrder || 99
            })
          });
          if (res.ok) {
            const createdArr = await res.json();
            if (Array.isArray(createdArr) && createdArr.length > 0) {
              const r = createdArr[0];
              const mapped = {
                id: r.id,
                title: r.title,
                badge: r.badge,
                category: r.category,
                description: r.description,
                imageUrl: r.image_url,
                isFeatured: r.is_featured,
                isHero: r.is_hero,
                sortOrder: r.sort_order
              };
              const current = await this.getGalleryPhotos();
              current.push(mapped);
              this._safeSetLocalGallery(current);
              return mapped;
            }
          }
        } catch (e) {
          console.warn('Supabase addGalleryPhoto error:', e);
        }
      }

      // 3. Fallback Local seguro (sin error de cuota)
      const localPhoto = {
        id: 'photo_' + Date.now(),
        ...photoData
      };
      const current = await this.getGalleryPhotos();
      current.push(localPhoto);
      this._safeSetLocalGallery(current);
      return localPhoto;
    }

    async updateGalleryPhoto(id, photoData) {
      await this.init();

      // 1. Backend /api/gallery/:id
      try {
        const res = await this._apiFetch(`/api/gallery/${encodeURIComponent(id)}`, {
          method: 'PUT',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify(photoData)
        });
        if (res && res.ok) {
          const data = await res.json();
          if (data && data.photo) {
            this._updateLocalGalleryItem(data.photo);
            return data.photo;
          }
        }
      } catch (e) {
        console.warn('Backend updateGalleryPhoto error:', e);
      }

      // 2. Supabase
      if (this.config.isConfigured) {
        try {
          const updateObj = {};
          if (photoData.title !== undefined) updateObj.title = photoData.title;
          if (photoData.badge !== undefined) updateObj.badge = photoData.badge;
          if (photoData.category !== undefined) updateObj.category = photoData.category;
          if (photoData.description !== undefined) updateObj.description = photoData.description;
          if (photoData.imageUrl !== undefined) updateObj.image_url = photoData.imageUrl;
          if (photoData.isFeatured !== undefined) updateObj.is_featured = photoData.isFeatured;
          if (photoData.isHero !== undefined) updateObj.is_hero = photoData.isHero;
          if (photoData.sortOrder !== undefined) updateObj.sort_order = photoData.sortOrder;

          await fetch(`${this.config.supabaseUrl}/rest/v1/gallery_photos?id=eq.${encodeURIComponent(id)}`, {
            method: 'PATCH',
            headers: {
              apikey: this.config.supabaseAnonKey,
              Authorization: `Bearer ${this._getAuthBearer()}`,
              'Content-Type': 'application/json'
            },
            body: JSON.stringify(updateObj)
          });
        } catch (e) {
          console.warn('Supabase updateGalleryPhoto error:', e);
        }
      }

      // 3. Local update
      const updated = { ...photoData, id };
      this._updateLocalGalleryItem(updated);
      return updated;
    }

    async deleteGalleryPhoto(id) {
      await this.init();

      // 1. Backend /api/gallery/:id
      try {
        await this._apiFetch(`/api/gallery/${encodeURIComponent(id)}`, { method: 'DELETE' });
      } catch (e) {
        console.warn('Backend deleteGalleryPhoto error:', e);
      }

      // 2. Supabase
      if (this.config.isConfigured) {
        try {
          await fetch(`${this.config.supabaseUrl}/rest/v1/gallery_photos?id=eq.${encodeURIComponent(id)}`, {
            method: 'DELETE',
            headers: {
              apikey: this.config.supabaseAnonKey,
              Authorization: `Bearer ${this._getAuthBearer()}`
            }
          });
        } catch (e) {
          console.warn('Supabase deleteGalleryPhoto error:', e);
        }
      }

      // 3. Local delete
      try {
        const raw = localStorage.getItem(STORAGE_KEYS.GALLERY);
        if (raw) {
          const list = JSON.parse(raw).filter(p => String(p.id) !== String(id));
          this._safeSetLocalGallery(list);
        }
      } catch (e) {}

      return true;
    }

    async resetGalleryDefaults() {
      await this.init();
      try {
        await this._apiFetch('/api/gallery/reset', { method: 'POST' });
      } catch (e) {}

      const def = this._getDefaultGalleryPhotos();
      this._safeSetLocalGallery(def);
      return def;
    }

    async uploadGalleryImage(file) {
      if (!file) throw new Error('No se seleccionó ningún archivo de imagen.');
      await this.init();

      // Optimizar tamaño y resolución en el cliente (evita demoras y errores de cuota)
      const { dataUrl, blob } = await this._compressImageFile(file, 1400, 0.84);
      const cleanName = (file.name || 'foto.jpg')
        .replace(/\.[^.]+$/, '')
        .toLowerCase()
        .replace(/[^a-z0-9_-]/g, '-')
        .slice(0, 40) || 'foto';
      const uploadFilename = `${cleanName}.jpg`;

      // 1. Subir a través del backend Node (guarda en Supabase Storage + respaldo local)
      try {
        const res = await this._apiFetch('/api/gallery/upload', {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({
            filename: uploadFilename,
            data: dataUrl
          })
        });

        if (res && res.ok) {
          const data = await res.json();
          if (data && data.url) {
            // Si devolvió ruta relativa desde otro puerto local (ej: Live Server :5500), anteponer apiBase
            if (this.apiBase && !data.url.startsWith('http') && !data.url.startsWith('data:')) {
              return `${this.apiBase}/${data.url.replace(/^\/+/, '')}`;
            }
            return data.url;
          }
        }
      } catch (e) {
        console.warn('Upload endpoint warning, trying cloud/compressed fallback:', e);
      }

      // 2. Intento directo a Supabase Storage si no hay servidor Node activo
      if (!this.hasNodeBackend && this.config.isConfigured && blob) {
        try {
          const storageFile = `ej-${Date.now()}-${uploadFilename}`;
          const upRes = await fetch(`${this.config.supabaseUrl}/storage/v1/object/gallery/${storageFile}`, {
            method: 'POST',
            headers: {
              apikey: this.config.supabaseAnonKey,
              Authorization: `Bearer ${this._getAuthBearer()}`,
              'Content-Type': 'image/jpeg',
              'x-upsert': 'true'
            },
            body: blob
          });
          if (upRes.ok) {
            return `${this.config.supabaseUrl}/storage/v1/object/public/gallery/${storageFile}`;
          }
        } catch (_) {}
      }

      // 3. Fallback a Data URL JPEG optimizado (~120 KB)
      return dataUrl;
    }

    // =========================================================================
    // SEÑA DEL 20% (TRANSFERENCIA + COMPROBANTE)
    // =========================================================================
    calcDeposit(price) {
      const pct = DEPOSIT_PERCENTAGE / 100;
      // Redondeo a múltiplos de $100 para que sea cómodo transferir
      return Math.ceil(((Number(price) || 0) * pct) / 100) * 100;
    }

    async getPaymentInfo() {
      await this.init();
      // 1. Intentar desde backend /api/payment-info
      try {
        const apiRes = await this._apiFetch('/api/payment-info');
        if (apiRes && apiRes.ok) {
          const data = await apiRes.json();
          if (data && data.paymentInfo) {
            const merged = { ...DEFAULT_PAYMENT_INFO, ...data.paymentInfo };
            try { localStorage.setItem(STORAGE_KEYS.PAYMENT_INFO, JSON.stringify(merged)); } catch (_) {}
            return merged;
          }
        }
      } catch (e) {}

      // 2. Intentar desde Supabase REST
      if (this.config.isConfigured) {
        try {
          const res = await fetch(`${this.config.supabaseUrl}/rest/v1/settings?key=eq.payment_info&select=value`, {
            headers: { apikey: this.config.supabaseAnonKey, Authorization: `Bearer ${this.config.supabaseAnonKey}` }
          });
          if (res.ok) {
            const rows = await res.json();
            if (Array.isArray(rows) && rows[0] && rows[0].value) {
              const merged = { ...DEFAULT_PAYMENT_INFO, ...rows[0].value };
              try { localStorage.setItem(STORAGE_KEYS.PAYMENT_INFO, JSON.stringify(merged)); } catch (_) {}
              return merged;
            }
          }
        } catch (e) {}
      }

      // 3. Fallback a localStorage
      try {
        const localRaw = localStorage.getItem(STORAGE_KEYS.PAYMENT_INFO);
        if (localRaw) {
          const parsed = JSON.parse(localRaw);
          if (parsed && typeof parsed === 'object') {
            return { ...DEFAULT_PAYMENT_INFO, ...parsed };
          }
        }
      } catch (e) {}

      return { ...DEFAULT_PAYMENT_INFO };
    }

    async savePaymentInfo(info) {
      await this.init();
      await this._refreshSessionIfNeeded();
      const clean = {
        alias: String(info.alias || '').trim(),
        cbu: String(info.cbu || '').trim(),
        holder: String(info.holder || '').trim(),
        bank: String(info.bank || '').trim(),
        whatsapp: String(info.whatsapp || '').trim()
      };

      // Guardar siempre en localStorage como respaldo inmediato
      try {
        localStorage.setItem(STORAGE_KEYS.PAYMENT_INFO, JSON.stringify(clean));
      } catch (_) {}

      // 1. Intentar guardar a través del backend /api/payment-info (usa SUPABASE_SERVICE_ROLE_KEY si está en servidor/Vercel)
      try {
        const apiRes = await this._apiFetch('/api/payment-info', {
          method: 'PUT',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify(clean)
        });
        if (apiRes && apiRes.ok) {
          return clean;
        }
      } catch (e) {}

      // 2. Fallback directo a Supabase REST
      if (this.config.isConfigured) {
        try {
          const res = await fetch(`${this.config.supabaseUrl}/rest/v1/settings?on_conflict=key`, {
            method: 'POST',
            headers: {
              apikey: this.config.supabaseAnonKey,
              Authorization: `Bearer ${this._getAuthBearer()}`,
              'Content-Type': 'application/json',
              Prefer: 'resolution=merge-duplicates,return=minimal'
            },
            body: JSON.stringify({ key: 'payment_info', value: clean, description: 'Datos de transferencia para la seña' })
          });
          if (!res.ok) {
            console.warn('Supabase settings payment_info direct save warning:', res.status);
          }
        } catch (e) {
          console.warn('Supabase settings payment_info error:', e);
        }
      }

      return clean;
    }

    // Sube el comprobante de la seña al bucket privado 'receipts' y devuelve su ruta
    async uploadDepositReceipt(file, dateStr) {
      if (!file) throw new Error('Adjuntá el comprobante de la transferencia de la seña.');
      await this.init();

      const isPdf = (file.type || '').includes('pdf') || /\.pdf$/i.test(file.name || '');
      let blob = file;
      let dataUrl = null;
      let contentType = file.type || (isPdf ? 'application/pdf' : 'image/jpeg');
      let ext = isPdf ? 'pdf' : ((file.name || '').split('.').pop() || 'jpg').toLowerCase();

      if (!isPdf) {
        try {
          const compressed = await this._compressImageFile(file, 1600, 0.85);
          if (compressed && compressed.dataUrl && compressed.dataUrl.startsWith('data:image/jpeg')) {
            blob = compressed.blob;
            dataUrl = compressed.dataUrl;
            contentType = 'image/jpeg';
            ext = 'jpg';
          }
        } catch (e) {}
      }

      if (blob.size > 8 * 1024 * 1024) {
        throw new Error('El comprobante es muy pesado (máximo 8 MB). Probá con una captura de pantalla.');
      }

      const uid = (window.crypto && window.crypto.randomUUID) ? window.crypto.randomUUID() : String(Date.now()) + Math.random().toString(36).slice(2);
      const folder = /^\d{4}-\d{2}-\d{2}$/.test(dateStr || '') ? dateStr : 'sin-fecha';
      const path = `${folder}/${uid}.${ext}`;

      // 1. Subida directa a Supabase Storage
      if (this.config.isConfigured) {
        try {
          const res = await fetch(`${this.config.supabaseUrl}/storage/v1/object/receipts/${path}`, {
            method: 'POST',
            headers: {
              apikey: this.config.supabaseAnonKey,
              Authorization: `Bearer ${this._getAuthBearer()}`,
              'Content-Type': contentType
            },
            body: blob
          });
          if (res.ok) return path;
          const errData = await res.json().catch(() => ({}));
          console.warn('Receipt direct upload warning:', errData);
        } catch (e) {
          console.warn('Receipt direct upload error:', e);
        }
      }

      // 2. A través del servidor Node (service_role) si está disponible
      try {
        if (!dataUrl) {
          dataUrl = await new Promise((resolve, reject) => {
            const reader = new FileReader();
            reader.onload = () => resolve(reader.result);
            reader.onerror = reject;
            reader.readAsDataURL(blob);
          });
        }
        const res = await this._apiFetch('/api/receipts/upload', {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({ path, data: dataUrl, contentType })
        });
        if (res && res.ok) {
          const data = await res.json();
          if (data && data.path) return data.path;
        }
      } catch (e) {
        console.warn('Receipt backend upload error:', e);
      }

      throw new Error('No se pudo subir el comprobante. Revisá tu conexión e intentá de nuevo.');
    }

    // URL temporal (1 hora) para que la admin vea el comprobante privado
    async getDepositReceiptUrl(path) {
      if (!path) return null;
      if (/^https?:|^data:/.test(path)) return path;
      await this.init();
      await this._refreshSessionIfNeeded();

      try {
        const res = await this._apiFetch(`/api/receipts/signed?path=${encodeURIComponent(path)}`);
        if (res && res.ok) {
          const data = await res.json();
          if (data && data.url) return data.url;
        }
      } catch (e) {}

      if (this.config.isConfigured) {
        const res = await fetch(`${this.config.supabaseUrl}/storage/v1/object/sign/receipts/${path}`, {
          method: 'POST',
          headers: {
            apikey: this.config.supabaseAnonKey,
            Authorization: `Bearer ${this._getAuthBearer()}`,
            'Content-Type': 'application/json'
          },
          body: JSON.stringify({ expiresIn: 3600 })
        });
        if (res.ok) {
          const data = await res.json();
          const signed = data.signedURL || data.signedUrl;
          if (signed) return `${this.config.supabaseUrl}/storage/v1${signed.startsWith('/') ? '' : '/'}${signed}`;
        }
      }
      throw new Error('No se pudo abrir el comprobante. Cerrá sesión y volvé a ingresar como admin.');
    }

    _updateLocalGalleryItem(item) {
      try {
        const raw = localStorage.getItem(STORAGE_KEYS.GALLERY);
        if (raw) {
          const list = JSON.parse(raw);
          const idx = list.findIndex(p => String(p.id) === String(item.id));
          if (idx !== -1) {
            list[idx] = { ...list[idx], ...item };
            this._safeSetLocalGallery(list);
          }
        }
      } catch (e) {}
    }

    // =========================================================================
    // GENERADOR DE HISTORIAS INSTAGRAM & HORARIOS (ESTILO PROYECTO VASCA)
    // =========================================================================
    async getWeeklySchedule() {
      await this.init();
      try {
        const res = await this._apiFetch('/api/schedule');
        if (res && res.ok) {
          const data = await res.json();
          if (Array.isArray(data.schedule)) return data.schedule;
        }
      } catch (e) {}

      if (this.config.isConfigured) {
        try {
          const res = await fetch(`${this.config.supabaseUrl}/rest/v1/weekly_schedule?professional_id=eq.11111111-1111-1111-1111-111111111111&order=day_of_week.asc`, {
            headers: {
              apikey: this.config.supabaseAnonKey,
              Authorization: `Bearer ${this.config.supabaseAnonKey}`
            }
          });
          if (res.ok) return await res.json();
        } catch (e) {}
      }

      try {
        const saved = localStorage.getItem('mica_weekly_schedule');
        if (saved) return JSON.parse(saved);
      } catch (e) {}
      return [];
    }

    async saveWeeklySchedule(days) {
      await this.init();
      const res = await this._apiFetch('/api/schedule', {
        method: 'PUT',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ days })
      });
      if (res) {
        if (!res.ok) {
          const err = await res.json().catch(() => ({}));
          throw new Error(err.error || 'No se pudieron guardar los horarios.');
        }
        return await res.json();
      }
      localStorage.setItem('mica_weekly_schedule', JSON.stringify(days));
      return { success: true, schedule: days };
    }

    async getInstagramDaySlots(dateStr, interval = '60', forceGenerate = false) {
      await this.init();
      if (!dateStr) return { slots: [], isPublished: false, isBlocked: false, noSchedule: false };

      try {
        const fg = forceGenerate ? '&forceGenerate=1' : '';
        const res = await this._apiFetch(`/api/instagram/slots?date=${encodeURIComponent(dateStr)}&interval=${encodeURIComponent(interval)}${fg}`);
        if (res && res.ok) {
          return await res.json();
        }
      } catch (e) {}

      // Fallback si se ejecuta sin servidor Node
      const slotsResp = await this.getAvailableSlots(dateStr);
      const pubDay = await this._getStaticPublishedDay(dateStr);
      return {
        slots: slotsResp.map(s => ({
          time: s.time,
          crossedOut: !!s.crossedOut,
          autoBooked: !!s.autoBooked,
          isBooked: !s.available
        })),
        isPublished: !!(pubDay && pubDay.published !== false),
        isBlocked: false,
        noSchedule: new Date(`${dateStr}T12:00:00`).getDay() === 0
      };
    }

    // =========================================================================
    // SUBIR HORARIOS Y TACHAR TURNOS EN VIVO (ADMIN + CARTELERA WEB)
    // =========================================================================
    _getLocalPublishedMap() {
      try {
        const raw = localStorage.getItem(STORAGE_KEYS.PUBLISHED_SCHEDULES);
        if (raw) {
          const parsed = JSON.parse(raw);
          if (parsed && parsed.days) return parsed;
        }
      } catch (e) {}
      return { days: {} };
    }

    _saveLocalPublishedMap(mapObj) {
      try {
        localStorage.setItem(STORAGE_KEYS.PUBLISHED_SCHEDULES, JSON.stringify(mapObj));
      } catch (e) {}
    }

    async _getStaticPublishedMap() {
      if (this.config.isConfigured) {
        try {
          const res = await fetch(`${this.config.supabaseUrl}/rest/v1/settings?key=eq.published_schedules&select=value`, {
            headers: {
              apikey: this.config.supabaseAnonKey,
              Authorization: `Bearer ${this.config.supabaseAnonKey}`
            }
          });
          if (res.ok) {
            const rows = await res.json();
            if (Array.isArray(rows) && rows[0] && rows[0].value && rows[0].value.days) {
              this._saveLocalPublishedMap(rows[0].value);
              return rows[0].value;
            }
          }
        } catch (e) {}
      }
      return this._getLocalPublishedMap();
    }

    async _getStaticPublishedDay(dateStr) {
      const mapObj = await this._getStaticPublishedMap();
      const d = mapObj && mapObj.days && mapObj.days[dateStr];
      if (d && d.published !== false) return d;
      return null;
    }

    async _upsertSupabasePublishedMap(mapObj) {
      this._saveLocalPublishedMap(mapObj);
      if (!this.config.isConfigured) return;
      try {
        await fetch(`${this.config.supabaseUrl}/rest/v1/settings?on_conflict=key`, {
          method: 'POST',
          headers: {
            apikey: this.config.supabaseAnonKey,
            Authorization: `Bearer ${this._getAuthBearer()}`,
            'Content-Type': 'application/json',
            Prefer: 'resolution=merge-duplicates'
          },
          body: JSON.stringify({
            key: 'published_schedules',
            value: mapObj,
            description: 'Horarios publicados por el admin con control de tachado en tiempo real'
          })
        });
      } catch (e) {
        console.warn('Supabase settings upsert fallback warning:', e);
      }
    }

    async getPublishedDays(upcomingOnly = true) {
      await this.init();
      try {
        const res = await this._apiFetch(`/api/published-schedules?upcoming=${upcomingOnly ? 'true' : 'false'}`);
        if (res && res.ok) {
          const data = await res.json();
          if (data && Array.isArray(data.days)) return data.days;
        }
      } catch (e) {}

      // Fallback estático / Supabase REST
      const mapObj = await this._getStaticPublishedMap();
      const allDays = (mapObj && mapObj.days) || {};
      const now = new Date();
      const todayStr = `${now.getFullYear()}-${String(now.getMonth() + 1).padStart(2, '0')}-${String(now.getDate()).padStart(2, '0')}`;
      const dates = Object.keys(allDays)
        .filter(d => allDays[d] && allDays[d].published !== false && Array.isArray(allDays[d].slots) && allDays[d].slots.length > 0)
        .filter(d => !upcomingOnly || d >= todayStr)
        .sort();

      const results = [];
      for (const d of dates) {
        const avail = await this.getAvailableSlots(d);
        results.push({
          date: d,
          isPublished: true,
          updatedAt: allDays[d].updatedAt || null,
          slots: avail.map(s => ({
            time: s.time,
            crossedOut: !!s.crossedOut,
            autoBooked: !!s.autoBooked,
            isBooked: !s.available
          }))
        });
      }
      return results;
    }

    async getPublishedDay(dateStr) {
      await this.init();
      try {
        const res = await this._apiFetch(`/api/published-schedules?date=${encodeURIComponent(dateStr)}`);
        if (res && res.ok) return await res.json();
      } catch (e) {}

      const d = await this._getStaticPublishedDay(dateStr);
      if (!d) return { date: dateStr, isPublished: false, slots: [] };
      const avail = await this.getAvailableSlots(dateStr);
      return {
        date: dateStr,
        isPublished: true,
        updatedAt: d.updatedAt || null,
        slots: avail.map(s => ({
          time: s.time,
          crossedOut: !!s.crossedOut,
          autoBooked: !!s.autoBooked,
          isBooked: !s.available
        }))
      };
    }

    async publishDaySlots(dateStr, slots) {
      await this.init();
      try {
        const res = await this._apiFetch('/api/published-schedules', {
          method: 'PUT',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({ date: dateStr, slots })
        });
        if (res && res.ok) {
          const data = await res.json();
          // Sincronizar copia local también
          const localMap = this._getLocalPublishedMap();
          localMap.days[dateStr] = {
            date: dateStr,
            published: true,
            updatedAt: data.updatedAt || new Date().toISOString(),
            slots: (data.slots || slots).map(s => ({ time: s.time, crossedOut: !!s.crossedOut }))
          };
          this._saveLocalPublishedMap(localMap);
          return data;
        }
      } catch (e) {}

      // Fallback estático / Supabase directo
      const mapObj = await this._getStaticPublishedMap();
      if (!mapObj.days) mapObj.days = {};
      const cleanSlots = (slots || []).map(s => ({
        time: String(s.time || s).slice(0, 5),
        crossedOut: Boolean(s && s.crossedOut)
      })).sort((a, b) => a.time.localeCompare(b.time));

      mapObj.days[dateStr] = {
        date: dateStr,
        published: true,
        updatedAt: new Date().toISOString(),
        slots: cleanSlots
      };
      await this._upsertSupabasePublishedMap(mapObj);
      return await this.getPublishedDay(dateStr);
    }

    async toggleSlotCrossedOut(dateStr, timeStr, crossedOut, fallbackSlots = []) {
      await this.init();
      try {
        const res = await this._apiFetch('/api/published-schedules/toggle', {
          method: 'PATCH',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({ date: dateStr, time: timeStr, crossedOut, fallbackSlots })
        });
        if (res && res.ok) {
          const data = await res.json();
          const localMap = this._getLocalPublishedMap();
          localMap.days[dateStr] = {
            date: dateStr,
            published: true,
            updatedAt: data.updatedAt || new Date().toISOString(),
            slots: (data.slots || []).map(s => ({ time: s.time, crossedOut: !!s.crossedOut }))
          };
          this._saveLocalPublishedMap(localMap);
          return data;
        }
      } catch (e) {}

      // Fallback estático / Supabase directo
      const mapObj = await this._getStaticPublishedMap();
      if (!mapObj.days) mapObj.days = {};
      if (!mapObj.days[dateStr] || !Array.isArray(mapObj.days[dateStr].slots)) {
        mapObj.days[dateStr] = {
          date: dateStr,
          published: true,
          updatedAt: new Date().toISOString(),
          slots: fallbackSlots.map(s => ({ time: String(s.time || s).slice(0, 5), crossedOut: !!s.crossedOut }))
        };
      }
      const found = mapObj.days[dateStr].slots.find(s => s.time === timeStr);
      if (found) {
        found.crossedOut = typeof crossedOut === 'boolean' ? crossedOut : !found.crossedOut;
      } else {
        mapObj.days[dateStr].slots.push({ time: timeStr, crossedOut: typeof crossedOut === 'boolean' ? crossedOut : true });
        mapObj.days[dateStr].slots.sort((a, b) => a.time.localeCompare(b.time));
      }
      mapObj.days[dateStr].updatedAt = new Date().toISOString();
      await this._upsertSupabasePublishedMap(mapObj);
      return await this.getPublishedDay(dateStr);
    }

    async unpublishDay(dateStr) {
      await this.init();
      try {
        const res = await this._apiFetch(`/api/published-schedules?date=${encodeURIComponent(dateStr)}`, {
          method: 'DELETE'
        });
        if (res && res.ok) {
          const localMap = this._getLocalPublishedMap();
          if (localMap.days) delete localMap.days[dateStr];
          this._saveLocalPublishedMap(localMap);
          return true;
        }
      } catch (e) {}

      const mapObj = await this._getStaticPublishedMap();
      if (mapObj.days && mapObj.days[dateStr]) {
        delete mapObj.days[dateStr];
        await this._upsertSupabasePublishedMap(mapObj);
      }
      return true;
    }

    // =========================================================================
    // EMAILS PERSONALIZADOS DE RESERVA Y CANCELACIÓN
    // =========================================================================
    _getDefaultEmailTemplates() {
      try {
        const raw = localStorage.getItem('mica_email_templates');
        if (raw) return JSON.parse(raw);
      } catch (_) {}
      return {
        studioLocation: 'Zona Hospital Penna - Villa Cerrito, Bahía Blanca',
        notifyAdmin: true,
        booking: {
          enabled: true,
          subject: '✨ ¡Tu turno está confirmado, {{primer_nombre}}! — Nahi Studio',
          heading: '¡Te esperamos, {{primer_nombre}}! ♡',
          intro: 'Tu reserva para {{servicio}} quedó agendada con éxito. Acá tenés todos los detalles de tu cita:',
          tips: '• Asistí con los ojos limpios y sin máscara de pestañas ni delineador.\n• Tolerancia máxima de espera: 15 minutos.\n• Si necesitás reprogramar o cancelar, avisame con al menos 24 hs de anticipación.',
          footerNote: '¡Gracias por confiar tu mirada a Nahi Studio!'
        },
        cancellation: {
          enabled: true,
          subject: '🌸 Tu turno fue cancelado, {{primer_nombre}} — Nahi Studio',
          heading: 'Turno cancelado, {{primer_nombre}}',
          intro: 'Te confirmamos que tu turno para {{servicio}} del día {{fecha}} a las {{hora}} hs fue cancelado.',
          rebookMessage: '¡Cuando quieras volver a agendar tu mirada, vas a poder elegir un nuevo horario disponible desde nuestra web! ♡',
          footerNote: 'Nahi Studio • Estudio de Miradas en Bahía Blanca'
        }
      };
    }

    async getEmailSettings() {
      await this.init();
      const res = await this._apiFetch('/api/email/settings');
      if (res && res.ok) {
        return await res.json();
      }
      return {
        templates: this._getDefaultEmailTemplates(),
        provider: {
          configured: false,
          mode: 'static',
          label: 'Modo Estático (Iniciá node server.js para envío SMTP)'
        },
        logs: []
      };
    }

    async saveEmailTemplates(templates) {
      await this.init();
      try {
        localStorage.setItem('mica_email_templates', JSON.stringify(templates));
      } catch (_) {}
      const res = await this._apiFetch('/api/email/templates', {
        method: 'PUT',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ templates })
      });
      if (!res) return { success: true, templates };
      const data = await res.json().catch(() => ({}));
      if (!res.ok) throw new Error(data.error || 'Error guardando plantillas de email');
      return data;
    }

    async saveEmailProvider(providerConfig) {
      await this.init();
      const res = await this._apiFetch('/api/email/provider', {
        method: 'PUT',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(providerConfig)
      });
      if (!res) throw new Error('Iniciá el servidor local (node server.js) para configurar las credenciales SMTP.');
      const data = await res.json().catch(() => ({}));
      if (!res.ok) throw new Error(data.error || 'Error guardando credenciales SMTP');
      return data;
    }

    async previewEmailTemplate(type, templates) {
      await this.init();
      const res = await this._apiFetch('/api/email/preview', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ type, templates })
      });
      if (res && res.ok) {
        return await res.json();
      }
      // Vista previa instantánea en el cliente si server.js no está corriendo
      const t = templates || this._getDefaultEmailTemplates();
      const cfg = (type === 'cancellation' ? t.cancellation : t.booking) || {};
      const vars = {
        nombre: 'Valentina Gómez',
        primer_nombre: 'Valentina',
        servicio: 'Volumen Híbrido Glam',
        fecha: 'Viernes 14 de Noviembre',
        hora: '15:30',
        precio: '$34.000',
        ubicacion: t.studioLocation || 'Bahía Blanca',
        motivo: 'Reprogramación solicitada'
      };
      const rep = (s) => String(s || '').replace(/\{\{\s*([a-zA-Z0-9_]+)\s*\}\}/g, (_, k) => vars[k] || '');
      const subject = rep(cfg.subject);
      const heading = rep(cfg.heading);
      const intro = rep(cfg.intro);
      return {
        subject,
        html: `<div style="background:#0d0a0f;color:#f8eef6;font-family:sans-serif;padding:28px;border-radius:18px;border:1px solid #ff3e9655;"><h2 style="color:#ffaed8;margin-top:0;">${heading}</h2><p style="line-height:1.6;color:#d8c4d6;">${intro}</p><div style="background:#19121d;padding:16px;border-radius:12px;margin:16px 0;font-size:14px;"><p><strong>Tratamiento:</strong> ${vars.servicio}</p><p><strong>Fecha:</strong> ${vars.fecha} — ${vars.hora} hs</p><p><strong>Ubicación:</strong> ${vars.ubicacion}</p></div></div>`
      };
    }

    async sendTestEmail(to, type = 'booking') {
      await this.init();
      const res = await this._apiFetch('/api/email/test', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ to, type })
      });
      if (!res) throw new Error('Iniciá el servidor (node server.js) para enviar correos de prueba.');
      const data = await res.json().catch(() => ({}));
      if (!res.ok || data.success === false) {
        throw new Error(data.error || 'Error enviando correo de prueba');
      }
      return data;
    }

    async resendAppointmentEmail(appointmentId, type) {
      await this.init();
      const res = await this._apiFetch(`/api/turnos/${encodeURIComponent(appointmentId)}/resend-email`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ type })
      });
      if (!res) throw new Error('Iniciá el servidor (node server.js) para reenviar correos.');
      const data = await res.json().catch(() => ({}));
      if (!res.ok) throw new Error(data.error || 'No se pudo reenviar el correo');
      return data;
    }

    // =========================================================================
    // CONTENIDO EDITABLE DEL SITIO WEB (PRECIOS, SERVICIOS, PROMOS, CURSOS, SECCIONES)
    // =========================================================================
    getDefaultSiteContent() {
      return {
      "services": [
            {
                  "id": "22222222-2222-2222-2222-222222222201",
                  "name": "Esculpidas & Nail Art Editorial",
                  "slug": "esculpidas-nail-art",
                  "badge": "01 — NAIL ART",
                  "desc": "Construcción escultural a medida con diseño personalizado: efectos cromo, relieve 3D, perlas, gothic lettering o french editorial.",
                  "duration": 120,
                  "durationLabel": "120 min",
                  "price": 28000,
                  "deposit": 5600,
                  "icon": "💎",
                  "category": "nails",
                  "isActive": true,
                  "sortOrder": 1
            },
            {
                  "id": "22222222-2222-2222-2222-222222222202",
                  "name": "Kapping / Capping Gel + Diseño",
                  "slug": "kapping-gel-diseno",
                  "badge": "01 — NAIL ART",
                  "desc": "Baño de gel fortificador sobre el largo de tu uña natural para máxima resistencia, nivelación perfecta y nail art a elección.",
                  "duration": 90,
                  "durationLabel": "90 min",
                  "price": 24000,
                  "deposit": 4800,
                  "icon": "✨",
                  "category": "nails",
                  "isActive": true,
                  "sortOrder": 2
            },
            {
                  "id": "22222222-2222-2222-2222-222222222203",
                  "name": "Esmaltado Semipermanente + Nail Art",
                  "slug": "semipermanente-nail-art",
                  "badge": "01 — NAIL ART",
                  "desc": "Manicuría combinada de alta precisión con esmaltado de larga duración, french, glitter reflectivo o detalles cromados.",
                  "duration": 75,
                  "durationLabel": "75 min",
                  "price": 20000,
                  "deposit": 4000,
                  "icon": "🖤",
                  "category": "nails",
                  "isActive": true,
                  "sortOrder": 3
            },
            {
                  "id": "22222222-2222-2222-2222-222222222204",
                  "name": "Service / Mantenimiento Nail Art",
                  "slug": "service-mantenimiento-nails",
                  "badge": "01 — NAIL ART",
                  "desc": "Balance de estructura, retiro de crecimiento y renovación completa del diseño (recomendado cada 21 días).",
                  "duration": 90,
                  "durationLabel": "90 min",
                  "price": 22000,
                  "deposit": 4400,
                  "icon": "🔄",
                  "category": "nails",
                  "isActive": true,
                  "sortOrder": 4
            },
            {
                  "id": "22222222-2222-2222-2222-222222222205",
                  "name": "Tattoo Fine Line / Mini & Flash",
                  "slug": "tattoo-fine-line-flash",
                  "badge": "02 — TATTOO ART",
                  "desc": "Tatuajes delicados de trazo fino, caligrafía, botánicos, micro-tattoos o diseños seleccionados del Flash Book del estudio.",
                  "duration": 90,
                  "durationLabel": "60-90 min",
                  "price": 35000,
                  "deposit": 7000,
                  "icon": "🖋️",
                  "category": "tattoo",
                  "isActive": true,
                  "sortOrder": 5
            },
            {
                  "id": "22222222-2222-2222-2222-222222222206",
                  "name": "Tattoo Blackwork & Diseño Custom",
                  "slug": "tattoo-blackwork-custom",
                  "badge": "02 — TATTOO ART",
                  "desc": "Sesión de tatuaje personalizado en tinta negra, puntillismo, lettering experimental u ornamental a medida.",
                  "duration": 150,
                  "durationLabel": "120-180 min",
                  "price": 55000,
                  "deposit": 11000,
                  "icon": "🩸",
                  "category": "tattoo",
                  "isActive": true,
                  "sortOrder": 6
            }
      ],
      "promosSection": {
            "pill": "TWO SIDES • PACKS & EXPERIENCIAS",
            "title": "Combiná tus dos caras en el estudio",
            "subtitle": "Propuestas pensadas para llevar la experiencia completa de Nail Art y Tattoo Art en Espacio Muna.",
            "bannerTag": "Agenda Online 24/7",
            "bannerTitle": "Reservá tu Horario en Tiempo Real",
            "bannerSubtitle": "Espacio Muna — Nahi Ciamprone Studio",
            "bannerBtnText": "Abrir Agenda Online",
            "items": [
                  {
                        "id": "promo_1",
                        "badge": "01 — Cara Nails",
                        "duration": "120 min",
                        "title": "Full Set Esculpidas + Chrome / 3D",
                        "desc": "Estructura completa a medida con relieve 3D, perlas o efecto cromado editorial.",
                        "priceLabel": "Valor Sesión",
                        "price": 28000,
                        "ribbonText": "Belleza, precisión y arquitectura escultural",
                        "btnText": "Reservar Nails",
                        "serviceLink": "esculpidas",
                        "isVip": false,
                        "vipBadge": ""
                  },
                  {
                        "id": "promo_2",
                        "badge": "01 + 02 — Dual Identity",
                        "duration": "180 min",
                        "title": "Experiencia Dual: Nails + Mini Tattoo",
                        "desc": "Las dos caras de Nahi Studio en una misma cita: set de Nail Art + tatuaje fine-line o pieza flash.",
                        "priceLabel": "Pack Especial Dual",
                        "price": 52000,
                        "ribbonText": "Two Sides. One Identity.",
                        "btnText": "Reservar Pack Dual",
                        "serviceLink": "tattoo",
                        "isVip": true,
                        "vipBadge": "★ TWO SIDES VIP ★"
                  },
                  {
                        "id": "promo_3",
                        "badge": "02 — Cara Tattoo",
                        "duration": "90 min",
                        "title": "Flash Tattoo Session",
                        "desc": "Elegí tu pieza del Flash Book disponible con diseño exclusivo en tinta negra y trazo fino.",
                        "priceLabel": "Desde",
                        "price": 35000,
                        "ribbonText": "Tinta, carácter y expresión",
                        "btnText": "Reservar Tattoo",
                        "serviceLink": "flash",
                        "isVip": false,
                        "vipBadge": ""
                  }
            ]
      },
      "coursesSection": {
            "pill": "NAHI STUDIO • WORKSHOPS & FORMACIÓN",
            "title": "Talleres & Perfeccionamiento",
            "subtitle": "Formación personalizada en técnicas de Nail Art editorial, estructura y expresión artística.",
            "trustBadges": [
                  {
                        "icon": "💎",
                        "title": "Práctica Real",
                        "subtitle": "Acompañamiento 1 a 1 en estudio"
                  },
                  {
                        "icon": "🖤",
                        "title": "Materiales Incluidos",
                        "subtitle": "Todo listo para trabajar en clase"
                  },
                  {
                        "icon": "📜",
                        "title": "Certificado",
                        "subtitle": "Diploma de asistencia Nahi Studio"
                  },
                  {
                        "icon": "💬",
                        "title": "Seguimiento",
                        "subtitle": "Consultas post-taller directas"
                  }
            ],
            "courses": [
                  {
                        "id": "33333333-3333-3333-3333-333333333301",
                        "slug": "workshop-nail-art-3d-chrome",
                        "badge": "01 — NAIL ART WORKSHOP",
                        "duration": "1 Jornada Intensiva",
                        "title": "Workshop: Nail Art Editorial, Cromo & 3D",
                        "subtitle": "Diseño avanzado • Relieves, encapsulados, efectos metálicos y trazos",
                        "desc": "Dominá las técnicas de diseño que definen la identidad visual de Nahi Studio: manejo de geles 3D, polvos cromados sin manchas, french orgánico y composición.",
                        "syllabus": [
                              "Preparación de superficie para cromos espejo y efectos metálicos",
                              "Volumen 3D, relieves orgánicos y adherencia de perlas/tachas",
                              "Trazos finos, lettering gótico y equilibrio visual del set",
                              "Fotografía editorial de manos con luz dramática"
                        ],
                        "priceLabel": "Inversión",
                        "price": 65000,
                        "priceNote": "Cupos personalizados • Materiales incluidos",
                        "modalityFilter": "presencial",
                        "btnText": "Consultar por WhatsApp",
                        "whatsappText": "Hola Nahi! Quiero info del Workshop de Nail Art Editorial, Cromo & 3D",
                        "isActive": true,
                        "sortOrder": 1
                  }
            ]
      },
      "hero": {
            "statusPill": "NAHI CIAMPRONE STUDIO • ESPACIO MUNA",
            "scriptTitle": "Two Sides. One Identity.",
            "mainTitleLine1": "TWO SIDES.",
            "mainTitleHighlight": "ONE IDENTITY.",
            "ribbonTop": "RESERVÁ TU TURNO EN",
            "ribbonBrand": "NAHI STUDIO",
            "description": "Dos formas de expresión. Una misma esencia. Precisión escultural en uñas y carácter en tinta negra, unificados bajo una sola mirada artística.",
            "primaryBtnText": "01 — Explorar Nail Art",
            "secondaryBtnText": "02 — Explorar Tattoo Art",
            "guarantees": [
                  "01 — Nail Art Editorial",
                  "02 — Blackwork & Fine Line",
                  "Espacio Muna"
            ],
            "styles": [
                  {
                        "id": "nails-crimson",
                        "name": "01 · Crimson French",
                        "badge": "01 / NAIL ART",
                        "title": "Crimson French & Tattoo",
                        "detail": "Almendradas con french rojo carmesí profundo en diálogo con tatuaje ornamental",
                        "price": "$24.000",
                        "time": "90 min",
                        "img": "fotos/imgi_25_539976307_17854872333514079_3988514524600607766_n.webp"
                  },
                  {
                        "id": "nails-3d",
                        "name": "01 · Sculpted 3D",
                        "badge": "01 / NAIL ART",
                        "title": "Sculpted 3D & Pearl",
                        "detail": "Volumen metálico dorado, perlas y relieve escultórico hecho a mano",
                        "price": "$28.000",
                        "time": "120 min",
                        "img": "fotos/imgi_22_504060229_17842497063514079_4107614235171648365_n.webp"
                  },
                  {
                        "id": "tattoo-cupido",
                        "name": "02 · Cupido Tattoo",
                        "badge": "02 / TATTOO ART",
                        "title": "Cupido Blackwork",
                        "detail": "Tatuaje en tinta negra con puntillismo fino y contraste clásico",
                        "price": "$45.000",
                        "time": "120 min",
                        "img": "fotos/imgi_28_771909433_18096793385269189_6790519837572543665_n.jpg"
                  },
                  {
                        "id": "tattoo-fudog",
                        "name": "02 · Oriental Custom",
                        "badge": "02 / TATTOO ART",
                        "title": "León Fu Dog & Geometría",
                        "detail": "Línea sólida y geometría sagrada en proyecto personalizado a gran escala",
                        "price": "$55.000",
                        "time": "150 min",
                        "img": "fotos/imgi_18_831313350_18104431136269189_151488612152529768_n.jpg"
                  }
            ]
      },
      "servicesSection": {
            "pill": "01 — NAIL ART",
            "title": "Arquitectura, cromo & detalle editorial.",
            "subtitle": "Trabajos reales de Nahi Ciamprone. Tocá cualquier fotografía para ampliarla en detalle.",
            "ctaCardTitle": "¿Querés ver todos los horarios disponibles?",
            "ctaCardDesc": "Abriremos nuestro turnero online en tiempo real para que elijas día y horario.",
            "ctaCardBtn": "Abrir Turnero Online"
      },
      "gallerySection": {
            "pill": "02 — TATTOO ART",
            "title": "Flash book, tinta & proyectos a medida.",
            "subtitle": "Blackwork, fine line, caligrafía y diseños personalizados. Tocá cualquier pieza para verla en detalle o consultar.",
            "instagramBtnText": "Ver más trabajos en Instagram @nahi.ciamprone"
      },
      "about": {
            "photoUrl": "fotos/imgi_14_851843619_18118320313897879_5122667710876184401_n.jpg",
            "photoTopBadge": "NAIL ARTIST & TATTOO ARTIST",
            "photoCardName": "Nahiara Ciamprone",
            "photoCardRole": "NAHI STUDIO • ESPACIO MUNA",
            "photoCardSub": "Two Sides. One Identity.",
            "stat1Value": "CARA 01",
            "stat1Label": "Nail Art Editorial & 3D",
            "stat2Value": "CARA 02",
            "stat2Label": "Blackwork & Fine Line Tattoo",
            "headerPill": "SOBRE LA ARTISTA",
            "headline": "ONE ARTIST. TWO EXPRESSIONS.",
            "subheadline": "Dos disciplinas, un mismo pulso estético en Espacio Muna.",
            "introParagraph1": "Soy Nahiara Ciamprone, creadora de NAHI STUDIO. Mi trabajo habita el cruce entre dos mundos que comparten la misma obsesión por el trazo, la forma y la identidad: el Nail Art escultural y el Tattoo Art.",
            "introParagraph2": "En Espacio Muna diseño tanto estructuras en uñas con relieves 3D, cromos metálicos y estética editorial, como tatuajes en tinta negra, fine-line, lettering experimental y piezas custom pensadas para acompañar el cuerpo.",
            "boxTitle": "Las Dos Caras de Nahi Studio",
            "specialties": [
                  {
                        "icon": "💎",
                        "text": "Cara 01 — Nail Art: Esculpidas, Relieve 3D, Chrome & Editorial French"
                  },
                  {
                        "icon": "✨",
                        "text": "Cara 01 — Kapping Gel & Semipermanente con diseño de autor"
                  },
                  {
                        "icon": "🖋️",
                        "text": "Cara 02 — Tattoo Art: Fine Line, Botánicos & Micro-Tattoos"
                  },
                  {
                        "icon": "🩸",
                        "text": "Cara 02 — Blackwork, Puntillismo de arrastre & Lettering"
                  },
                  {
                        "icon": "📖",
                        "text": "Flash Book con diseños propios listos para tatuar"
                  },
                  {
                        "icon": "🖤",
                        "text": "Atención personalizada con turno previo en Espacio Muna"
                  }
            ],
            "quote": "\"TWO SIDES. ONE SOUL. ENDLESS WAYS TO CREATE.\"",
            "closingParagraph1": "Cara A — Nails: Belleza, precisión, creatividad y detalle.",
            "closingParagraph2": "Cara B — Tattoos: Tinta, personalidad, expresión y carácter.",
            "closingSignature": "NAHIARA CIAMPRONE — ESPACIO MUNA"
      },
      "bookingSection": {
            "pill": "AGENDA ONLINE EN TIEMPO REAL",
            "title": "Reservá tu Turno o Sesión",
            "subtitle": "Elegí tu servicio de Nail Art o sesión de Tattoo Art, seleccioná fecha en el calendario interactivo y asegurá tu horario.",
            "primaryBtnText": "Abrir Turnero Online",
            "secondaryBtnText": "Panel Admin",
            "features": [
                  {
                        "icon": "🗓️",
                        "title": "Calendario en Vivo",
                        "desc": "Horarios reales actualizados por Nahi."
                  },
                  {
                        "icon": "💎",
                        "title": "01 · Nail Art",
                        "desc": "Esculpidas, Kapping, Semipermanente y 3D."
                  },
                  {
                        "icon": "🖋️",
                        "title": "02 · Tattoo Art",
                        "desc": "Sesiones Flash, Fine Line y Blackwork."
                  }
            ],
            "turnosPageRibbon": "AGENDA ONLINE • NAHI STUDIO",
            "turnosPageTitle": "Reservar Turno",
            "turnosPageSubtitle": "Elegí tu servicio de Nail Art o Tattoo Art, seleccioná fecha en el calendario y asegurá tu horario en tiempo real.",
            "turnosHoursNote": "Atención en Espacio Muna con turno previo"
      },
      "location": {
            "pill": "UBICACIÓN & CONTACTO",
            "title": "Espacio Muna",
            "subtitle": "Atención personalizada con turno previo para Nail Art y Tattoo Art.",
            "addressTitle": "Estudio",
            "addressText": "Espacio Muna",
            "addressNote": "Dirección exacta enviada al confirmar tu turno por WhatsApp",
            "hoursTitle": "Horarios",
            "hoursLine1": "Con Turno Previo",
            "hoursLine2": "Consultá disponibilidad en la agenda online o por WhatsApp",
            "studioPhotoUrl": "fotos/imgi_14_851843619_18118320313897879_5122667710876184401_n.jpg",
            "whatsappNumber": "",
            "instagramHandle": "@nahi.ciamprone",
            "instagramUrl": "https://www.instagram.com/nahi.ciamprone/",
            "brandName": "NAHI STUDIO",
            "footerSubtitle": "TWO SIDES. ONE SOUL. ENDLESS WAYS TO CREATE.",
            "footerCopyright": "© 2026 NAHI STUDIO — NAHI CIAMPRONE. TODOS LOS DERECHOS RESERVADOS."
      },
      "faqs": {
            "pill": "INFORMACIÓN ÚTIL",
            "title": "Preguntas Frecuentes",
            "subtitle": "Todo lo que necesitás saber antes de tu turno de Nail Art o sesión de Tattoo.",
            "items": [
                  {
                        "id": "faq_1",
                        "question": "¿Cómo reservo un turno de Nail Art?",
                        "answer": "Podés reservar directamente desde el Turnero Online eligiendo fecha y horario disponible, o enviando tu solicitud por WhatsApp desde la sección 01 — Nail Art."
                  },
                  {
                        "id": "faq_2",
                        "question": "¿Cómo cotizo un tatuaje o reservo un diseño del Flash Book?",
                        "answer": "En la sección 02 — Tattoo Art podés tocar cualquier pieza para verla en detalle y usar el formulario 'Contame tu idea' indicando zona del cuerpo, tamaño aproximado en cm y tu idea o referencia."
                  },
                  {
                        "id": "faq_3",
                        "question": "¿Dónde se encuentra el estudio?",
                        "answer": "Atiendo en Espacio Muna con cita previa. Al confirmar tu reserva recibís todos los detalles de llegada y preparación."
                  }
            ]
      }
};
    }

    _mergeSiteContent(baseObj, overrideObj) {
      const defaults = baseObj || this.getDefaultSiteContent();
      if (!overrideObj || typeof overrideObj !== 'object') return defaults;
      return {
        ...defaults,
        ...overrideObj,
        services: Array.isArray(overrideObj.services) && overrideObj.services.length > 0 ? overrideObj.services : defaults.services,
        promosSection: {
          ...defaults.promosSection,
          ...(overrideObj.promosSection || {}),
          items: Array.isArray(overrideObj.promosSection?.items) ? overrideObj.promosSection.items : defaults.promosSection.items
        },
        coursesSection: {
          ...defaults.coursesSection,
          ...(overrideObj.coursesSection || {}),
          trustBadges: Array.isArray(overrideObj.coursesSection?.trustBadges) ? overrideObj.coursesSection.trustBadges : defaults.coursesSection.trustBadges,
          courses: Array.isArray(overrideObj.coursesSection?.courses) ? overrideObj.coursesSection.courses : defaults.coursesSection.courses
        },
        hero: {
          ...defaults.hero,
          ...(overrideObj.hero || {}),
          guarantees: Array.isArray(overrideObj.hero?.guarantees) ? overrideObj.hero.guarantees : defaults.hero.guarantees,
          styles: Array.isArray(overrideObj.hero?.styles) && overrideObj.hero.styles.length > 0 ? overrideObj.hero.styles : defaults.hero.styles
        },
        servicesSection: { ...defaults.servicesSection, ...(overrideObj.servicesSection || {}) },
        gallerySection: { ...defaults.gallerySection, ...(overrideObj.gallerySection || {}) },
        about: {
          ...defaults.about,
          ...(overrideObj.about || {}),
          specialties: Array.isArray(overrideObj.about?.specialties) ? overrideObj.about.specialties : defaults.about.specialties
        },
        bookingSection: {
          ...defaults.bookingSection,
          ...(overrideObj.bookingSection || {}),
          features: Array.isArray(overrideObj.bookingSection?.features) ? overrideObj.bookingSection.features : defaults.bookingSection.features
        },
        location: { ...defaults.location, ...(overrideObj.location || {}) },
        faqs: {
          ...defaults.faqs,
          ...(overrideObj.faqs || {}),
          items: Array.isArray(overrideObj.faqs?.items) ? overrideObj.faqs.items : defaults.faqs.items
        }
      };
    }

    _loadLocalSiteContent() {
      const defaults = this.getDefaultSiteContent();
      try {
        const raw = localStorage.getItem(STORAGE_KEYS.SITE_CONTENT);
        if (raw) {
          const parsed = JSON.parse(raw);
          return this._mergeSiteContent(defaults, parsed);
        }
      } catch (e) {}
      return defaults;
    }

    _saveLocalSiteContent(contentObj) {
      try {
        localStorage.setItem(STORAGE_KEYS.SITE_CONTENT, JSON.stringify(contentObj));
      } catch (e) {}
    }

    async getSiteContent(forceRefresh = false) {
      await this.init();
      if (!forceRefresh && this._cachedSiteContent) {
        return this._cachedSiteContent;
      }

      const defaults = this.getDefaultSiteContent();

      // 1. Intentar desde el servidor Node (/api/site-content)
      try {
        const res = await this._apiFetch('/api/site-content');
        if (res && res.ok) {
          const data = await res.json();
          if (data && data.content) {
            const merged = this._mergeSiteContent(defaults, data.content);
            this._cachedSiteContent = merged;
            this._saveLocalSiteContent(merged);
            return merged;
          }
        }
      } catch (e) {}

      // 2. Intentar directamente en Supabase (tabla settings, key='site_content')
      if (this.config.isConfigured) {
        try {
          const res = await fetch(`${this.config.supabaseUrl}/rest/v1/settings?key=eq.site_content&select=value`, {
            headers: {
              apikey: this.config.supabaseAnonKey,
              Authorization: `Bearer ${this.config.supabaseAnonKey}`
            }
          });
          if (res.ok) {
            const rows = await res.json();
            if (Array.isArray(rows) && rows[0] && rows[0].value && typeof rows[0].value === 'object') {
              const merged = this._mergeSiteContent(defaults, rows[0].value);
              this._cachedSiteContent = merged;
              this._saveLocalSiteContent(merged);
              return merged;
            }
          }
        } catch (e) {
          console.warn('Error leyendo site_content en Supabase:', e);
        }
      }

      // 3. Intentar leer site-content.json estático si no hay localStorage previo
      try {
        const hasLocal = localStorage.getItem(STORAGE_KEYS.SITE_CONTENT);
        if (hasLocal) {
          const localMerged = this._loadLocalSiteContent();
          this._cachedSiteContent = localMerged;
          return localMerged;
        }
        const staticRes = await fetch('site-content.json').catch(() => null);
        if (staticRes && staticRes.ok) {
          const staticJson = await staticRes.json().catch(() => null);
          if (staticJson) {
            const merged = this._mergeSiteContent(defaults, staticJson);
            this._cachedSiteContent = merged;
            this._saveLocalSiteContent(merged);
            return merged;
          }
        }
      } catch (e) {}

      const fallback = this._loadLocalSiteContent();
      this._cachedSiteContent = fallback;
      return fallback;
    }

    async saveSiteContent(partialOrFullContent) {
      await this.init();
      const current = await this.getSiteContent(false);
      const merged = this._mergeSiteContent(current, partialOrFullContent);
      merged.updatedAt = new Date().toISOString();

      this._cachedSiteContent = merged;
      this._saveLocalSiteContent(merged);

      // 1. Guardar en el servidor Node si está activo
      try {
        const res = await this._apiFetch('/api/site-content', {
          method: 'PUT',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({ content: merged })
        });
        if (res && res.ok) {
          const data = await res.json();
          if (data && data.content) {
            this._cachedSiteContent = data.content;
            this._saveLocalSiteContent(data.content);
            return { success: true, content: data.content, mode: 'backend' };
          }
        }
      } catch (e) {
        console.warn('Aviso guardando site-content en servidor local:', e);
      }

      // 2. Guardar directamente en Supabase REST (para GitHub Pages / modo cloud directo)
      if (this.config.isConfigured) {
        await this._refreshSessionIfNeeded();
        const bearer = this._getAuthBearer();
        try {
          const res = await fetch(`${this.config.supabaseUrl}/rest/v1/settings?on_conflict=key`, {
            method: 'POST',
            headers: {
              apikey: this.config.supabaseAnonKey,
              Authorization: `Bearer ${bearer}`,
              'Content-Type': 'application/json',
              Prefer: 'resolution=merge-duplicates,return=representation'
            },
            body: JSON.stringify({
              key: 'site_content',
              value: merged,
              description: 'Contenido editable completo del sitio web, precios, cursos, promos y secciones'
            })
          });
          if (!res.ok) {
            const errTxt = await res.text().catch(() => '');
            console.warn('Aviso guardando settings.site_content en Supabase:', errTxt);
          }

          // Sincronizar también la tabla services si se actualizaron servicios (para integridad de foreign keys en appointments)
          if (Array.isArray(partialOrFullContent.services) && merged.services.length > 0) {
            const mapCat = (c) => {
              const lc = String(c || '').toLowerCase();
              if (lc === 'lifting') return 'lifting';
              if (lc === 'cejas') return 'cejas';
              if (lc === 'combo') return 'combo';
              return 'extensiones';
            };
            const serviceRows = merged.services.map((s, idx) => {
              const validUuid = /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i.test(String(s.id || ''))
                ? s.id
                : (window.crypto && window.crypto.randomUUID ? window.crypto.randomUUID() : `22222222-2222-2222-2222-${String(Date.now() + idx).slice(-12).padStart(12, '0')}`);
              s.id = validUuid;
              const slugBase = String(s.slug || s.name || `servicio-${idx + 1}`)
                .toLowerCase()
                .normalize('NFD').replace(/[\u0300-\u036f]/g, '')
                .replace(/[^a-z0-9]+/g, '-')
                .replace(/^-+|-+$/g, '') || `servicio-${idx + 1}`;
              return {
                id: validUuid,
                name: s.name || 'Servicio',
                slug: `${slugBase}-${validUuid.slice(-4)}`,
                badge: s.badge || '',
                description: s.desc || s.description || '',
                duration_minutes: Number(s.duration || s.duration_minutes) || 90,
                price_ars: Number(s.price) || 0,
                deposit_ars: Number(s.deposit) || this.calcDeposit(s.price || 0),
                icon: s.icon || '✨',
                category: mapCat(s.category),
                is_active: s.isActive !== false,
                sort_order: Number(s.sortOrder) || (idx + 1)
              };
            });
            await fetch(`${this.config.supabaseUrl}/rest/v1/services?on_conflict=id`, {
              method: 'POST',
              headers: {
                apikey: this.config.supabaseAnonKey,
                Authorization: `Bearer ${bearer}`,
                'Content-Type': 'application/json',
                Prefer: 'resolution=merge-duplicates'
              },
              body: JSON.stringify(serviceRows)
            }).catch(() => {});
          }
        } catch (e) {
          console.warn('Error sincronizando site_content en Supabase:', e);
        }
      }

      return { success: true, content: merged, mode: this.config.isConfigured ? 'supabase' : 'local' };
    }

    async saveSiteSection(sectionKey, sectionValue) {
      if (!sectionKey) throw new Error('Se requiere sectionKey');
      return this.saveSiteContent({ [sectionKey]: sectionValue });
    }

    async resetSiteContent(sectionKey = null) {
      await this.init();
      const defaults = this.getDefaultSiteContent();

      try {
        const res = await this._apiFetch('/api/site-content/reset', {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({ section: sectionKey })
        });
        if (res && res.ok) {
          const data = await res.json();
          if (data && data.content) {
            this._cachedSiteContent = data.content;
            this._saveLocalSiteContent(data.content);
            return { success: true, content: data.content };
          }
        }
      } catch (e) {}

      if (sectionKey && defaults[sectionKey] !== undefined) {
        return this.saveSiteContent({ [sectionKey]: defaults[sectionKey] });
      }
      this._cachedSiteContent = defaults;
      this._saveLocalSiteContent(defaults);
      return this.saveSiteContent(defaults);
    }
  }

  // Exportar instancia global única
  window.MicaBackend = new MicaBackendManager();
  window.NahiBackend = window.MicaBackend;

  // Auto-inicializar cuando el DOM esté listo
  if (document.readyState === 'loading') {
    document.addEventListener('DOMContentLoaded', () => window.MicaBackend.init());
  } else {
    window.MicaBackend.init();
  }

})(window);
