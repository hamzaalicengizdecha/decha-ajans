import { useState, useEffect } from "react";
import {
  MapPin, Share2, Globe, ShoppingBag,
  Mail, Send, CheckCircle, Lock, Settings,
  ChevronRight, Zap, MessageSquare, Rocket,
  Save, X, Eye, EyeOff, Home, Star,
  Shield, Key, Bell, User, Trash2, Plus, Sparkles,
  Target, BarChart, Search, Code, Smartphone, Layout,
  Palette, ShoppingCart, MessageCircle, Megaphone,
  Layers, Cpu, Database, Cloud, MousePointer,
  Briefcase, Award, TrendingUp, Monitor,
} from "https://esm.sh/lucide-react";

const SUPABASE_URL = "https://ymjgbsreczcjwmgujina.supabase.co";
const SUPABASE_ANON_KEY = "sb_publishable_picW1XWS2VCMK257F7mRtw_hlA2DemC";

const supabase = {
  from: (table) => ({
    select: async () => {
      try {
        const res = await fetch(`${SUPABASE_URL}/rest/v1/${table}?select=*`, {
          headers: {
            apikey: SUPABASE_ANON_KEY,
            Authorization: `Bearer ${SUPABASE_ANON_KEY}`,
          },
        });
        if (!res.ok) {
          const errBody = await res.text();
          console.error(`[Supabase SELECT] ${table} →`, res.status, errBody);
          throw new Error(`SELECT failed: ${res.status}`);
        }
        const data = await res.json();
        return { data, error: null };
      } catch (e) {
        return { data: null, error: e };
      }
    },

    // ── Düzeltilmiş upsert: gerçek hata mesajını konsola yazar ──────────────
    upsert: async (payload) => {
      try {
        const res = await fetch(
          `${SUPABASE_URL}/rest/v1/${table}`,
          {
            method: "POST",
            headers: {
              apikey: SUPABASE_ANON_KEY,
              Authorization: `Bearer ${SUPABASE_ANON_KEY}`,
              "Content-Type": "application/json",
              // on_conflict=id → id sütununa göre çakışma yönetimi
              Prefer: "return=minimal,resolution=merge-duplicates",
            },
            body: JSON.stringify(payload),
          }
        );

        if (!res.ok) {
          // HTTP 200/201/204 dışında bir durum kodu: gerçek mesajı yakala
          let errDetail = res.statusText;
          try {
            const body = await res.json();
            errDetail = body?.message || body?.error || JSON.stringify(body);
          } catch (_) {
            errDetail = await res.text().catch(() => res.statusText);
          }
          const err = new Error(`[Supabase UPSERT] ${table} → ${res.status}: ${errDetail}`);
          console.error(err.message);
          return { error: err };
        }

        return { error: null };
      } catch (e) {
        console.error(`[Supabase UPSERT] ${table} → Network/parse hatası:`, e);
        return { error: e };
      }
    },
  }),
};

// ─── Güvenlik: Input Sanitizer (XSS önleme) ──────────────────────────────────
const sanitize = (str) => {
  if (typeof str !== "string") return "";
  return str
    .replace(/&/g, "&amp;")
    .replace(/</g, "&lt;")
    .replace(/>/g, "&gt;")
    .replace(/"/g, "&quot;")
    .replace(/'/g, "&#x27;")
    .replace(/javascript:/gi, "")
    .replace(/on\w+\s*=/gi, "")
    .slice(0, 2000);
};

// ─── Güvenlik: SHA-256 Hash ───────────────────────────────────────────────────
const sha256 = async (str) => {
  const buf = await crypto.subtle.digest(
    "SHA-256",
    new TextEncoder().encode(str)
  );
  return Array.from(new Uint8Array(buf))
    .map((b) => b.toString(16).padStart(2, "0"))
    .join("");
};

const verifyPass = async (input, stored) => {
  const isHashed = /^[a-f0-9]{64}$/.test(stored);
  const inputHash = await sha256(input);
  if (isHashed) return inputHash === stored;
  return input === stored;
};

// ─── Güvenlik: Rate Limiter ───────────────────────────────────────────────────
const rateLimiter = (() => {
  let attempts = 0;
  let lockedUntil = 0;
  return {
    check() {
      if (Date.now() < lockedUntil) {
        const secs = Math.ceil((lockedUntil - Date.now()) / 1000);
        return { allowed: false, wait: secs };
      }
      return { allowed: true, wait: 0 };
    },
    fail() {
      attempts += 1;
      if (attempts >= 5) {
        lockedUntil = Date.now() + 30_000;
        attempts = 0;
      }
    },
    reset() {
      attempts = 0;
      lockedUntil = 0;
    },
  };
})();

// ─── Varsayılan veriler ───────────────────────────────────────────────────────
const DEFAULT_PASS = "decha2024";

const initData = {
  hero: {
    h1: "Görünür Ol,",
    h2: "Büyü, Kazan.",
    sub: "Google, sosyal medya ve e-ticaret platformlarında işletmenizi bir üst seviyeye taşıyoruz.",
  },
  services: [
    { id: 1, iconKey: "MapPin", tag: "SEO & Yerel Arama", title: "Google İşletme Kurulumu", desc: "SEO uyumlu Google İşletme profili ile müşterileriniz sizi anında bulsun. Yerel aramada rakiplerinizin önüne geçin." },
    { id: 2, iconKey: "Share2", tag: "İçerik & Büyüme", title: "Sosyal Medya Yönetimi", desc: "Instagram, TikTok ve Facebook'ta özgün içerik ve büyüme stratejileriyle markanızı dijital liderliğe taşıyoruz." },
    { id: 3, iconKey: "Globe", tag: "Tasarım & Geliştirme", title: "Web Site Kurulumu", desc: "Hızlı, mobil uyumlu ve dönüşüm odaklı web siteleri. Her ziyaretçiyi müşteriye dönüştürecek yapılar kuruyoruz." },
    { id: 4, iconKey: "ShoppingBag", tag: "E-Ticaret", title: "Platform Mağaza Kurulumu", desc: "Trendyol, Yemeksepeti ve Getir'de profesyonel mağaza kurulumu. İlk gün siparişlere hazır olun." },
  ],
  testimonials: [
    { id: 1, name: "Ahmet Yılmaz", role: "Restoran Sahibi", initials: "AY", text: "Decha ile Yemeksepeti mağazamı kurdum. 3 ayda siparişlerim 4 katına çıktı! Profesyonel ve hızlı bir ekip." },
    { id: 2, name: "Fatma Kaya", role: "Butik Sahibi", initials: "FK", text: "Google işletme kaydımız yapıldıktan sonra aramalardan gelen müşteri sayısı inanılmaz arttı. Çok memnunum." },
    { id: 3, name: "Mert Demir", role: "E-Ticaret Girişimcisi", initials: "MD", text: "Web sitesi ve sosyal medyamız çok profesyonel. Artık rakiplerimizden bir adım öndeyiz." },
  ],
};

const initSettings = {
  adminPass: DEFAULT_PASS,
  emailjsServiceId: "",
  emailjsTemplateId: "",
  emailjsPublicKey: "",
};

// ─── Tema & Düzen Varsayılanları ──────────────────────────────────────────────
const initTheme = {
  primary: "#a855f7",   // Ana mor
  secondary: "#6d28d9",   // Koyu mor
  accent: "#c084fc",   // Açık mor / vurgu
  bg: "#07070f",   // Sayfa arkaplanı
  cardBg: "rgba(255,255,255,0.025)",
  textMain: "#f8fafc",
  textMuted: "#475569",
};

const initSpacing = {
  sectionPaddingY: 110,   // px — bölümler arası dikey boşluk
  cardRadius: 20,    // px — kart border-radius
  buttonRadius: 14,    // px — buton border-radius
};

const initEmailTemplates = {
  adminSubject: "Yeni İletişim Formu Mesajı",
  adminBody: "Ad: {{from_name}}\nE-posta: {{from_email}}\n\nMesaj:\n{{message}}",
  userSubject: "Mesajınız Alındı — Decha",
  userBody: "Merhaba {{from_name}},\n\nMesajınızı aldık. En kısa sürede size dönüş yapacağız.\n\nDecha Ekibi",
};

// ─── Genişletilmiş İkon Haritası (25+ ikon) ──────────────────────────────────
const ICON_MAP = {
  // Orijinaller
  MapPin, Share2, Globe, ShoppingBag,
  // Dijital ajans ikonları
  Zap, Rocket, Target, BarChart, Search, Code, Smartphone, Layout,
  Palette, Shield, ShoppingCart, MessageCircle, Mail, Megaphone,
  Layers, Cpu, Database, Cloud, MousePointer,
  Briefcase, Award, TrendingUp, Monitor, Settings,
};

// İkon dropdown için etiketli liste
const ICON_OPTIONS = [
  { value: "MapPin", label: "📍 MapPin – SEO / Konum" },
  { value: "Search", label: "🔍 Search – Arama Motoru" },
  { value: "Target", label: "🎯 Target – Hedef Kitle" },
  { value: "TrendingUp", label: "📈 TrendingUp – Büyüme" },
  { value: "BarChart", label: "📊 BarChart – Analiz" },
  { value: "Share2", label: "📲 Share2 – Sosyal Medya" },
  { value: "MessageCircle", label: "💬 MessageCircle – Mesajlaşma" },
  { value: "Megaphone", label: "📢 Megaphone – Reklam" },
  { value: "Globe", label: "🌐 Globe – Web Site" },
  { value: "Monitor", label: "🖥️ Monitor – Ekran / UI" },
  { value: "Layout", label: "🗂️ Layout – Tasarım / UX" },
  { value: "Palette", label: "🎨 Palette – Grafik Tasarım" },
  { value: "Code", label: "💻 Code – Yazılım Geliştirme" },
  { value: "Smartphone", label: "📱 Smartphone – Mobil" },
  { value: "ShoppingCart", label: "🛒 ShoppingCart – E-Ticaret" },
  { value: "ShoppingBag", label: "🛍️ ShoppingBag – Mağaza" },
  { value: "Zap", label: "⚡ Zap – Hız / Performans" },
  { value: "Rocket", label: "🚀 Rocket – Büyüme / Launch" },
  { value: "Shield", label: "🛡️ Shield – Güvenlik / SSL" },
  { value: "Layers", label: "📦 Layers – Çok Katmanlı" },
  { value: "Cpu", label: "🤖 Cpu – Otomasyon / AI" },
  { value: "Database", label: "🗄️ Database – Veri" },
  { value: "Cloud", label: "☁️ Cloud – Bulut / Hosting" },
  { value: "MousePointer", label: "🖱️ MousePointer – Dönüşüm / CRO" },
  { value: "Mail", label: "✉️ Mail – E-posta Pazarlama" },
  { value: "Briefcase", label: "💼 Briefcase – Kurumsal" },
  { value: "Award", label: "🏆 Award – Ödül / Kalite" },
  { value: "Settings", label: "⚙️ Settings – Teknik Destek" },
];

// ─── Tipografik Logo Bileşeni ─────────────────────────────────────────────────
const Logo = ({ size = "md" }) => {
  const sizes = {
    sm: { fontSize: 18, letterSpacing: "-1.5px" },
    md: { fontSize: 26, letterSpacing: "-2px" },
    lg: { fontSize: 34, letterSpacing: "-3px" },
  };
  const { fontSize, letterSpacing } = sizes[size] || sizes.md;
  return (
    <span style={{
      fontFamily: "Syne, sans-serif",
      fontWeight: 900,
      fontSize,
      letterSpacing,
      background: "linear-gradient(135deg, #c084fc 0%, #a855f7 45%, #7c3aed 100%)",
      backgroundSize: "200% auto",
      WebkitBackgroundClip: "text",
      WebkitTextFillColor: "transparent",
      backgroundClip: "text",
      animation: "shimmer 4s linear infinite",
      display: "inline-block",
      userSelect: "none",
      filter: "drop-shadow(0 0 18px rgba(168,85,247,0.35))",
    }}>
      DECHA
    </span>
  );
};

// ─── Servis İkonu Bileşeni ────────────────────────────────────────────────────
const ServiceIcon = ({ iconKey, size = 36, color = "#a855f7" }) => {
  const Comp = ICON_MAP[iconKey] || Globe;
  return (
    <div style={{
      width: 64, height: 64, borderRadius: 18,
      background: "rgba(168,85,247,.08)",
      border: "1px solid rgba(168,85,247,.18)",
      display: "flex", alignItems: "center", justifyContent: "center",
      marginBottom: 22,
    }}>
      <Comp size={size} color={color} strokeWidth={1.4} />
    </div>
  );
};

// ─── Ana Bileşen ──────────────────────────────────────────────────────────────
export default function Decha() {
  const [data, setData] = useState(initData);
  const [settings, setSettings] = useState(initSettings);
  const [theme, setTheme] = useState(initTheme);
  const [spacing, setSpacing] = useState(initSpacing);
  const [emailTemplates, setEmailTemplates] = useState(initEmailTemplates);
  const [adminOpen, setAdminOpen] = useState(false);
  const [authed, setAuthed] = useState(false);
  const [pw, setPw] = useState("");
  const [pwErr, setPwErr] = useState(false);
  const [showPw, setShowPw] = useState(false);
  const [editData, setEditData] = useState(null);
  const [editSettings, setEditSettings] = useState(null);
  const [editTheme, setEditTheme] = useState(null);
  const [editSpacing, setEditSpacing] = useState(null);
  const [editEmailTemplates, setEditEmailTemplates] = useState(null);
  const [tab, setTab] = useState("hero");
  const [saved, setSaved] = useState(false);
  const [saveErr, setSaveErr] = useState(false);
  const [saveErrMsg, setSaveErrMsg] = useState("");
  const [form, setForm] = useState({ name: "", email: "", msg: "" });
  const [sending, setSending] = useState(false);
  const [sent, setSent] = useState(false);
  const [sendErr, setSendErr] = useState("");
  const [hovered, setHovered] = useState(null);
  const [scrolled, setScrolled] = useState(false);
  const [lockTimer, setLockTimer] = useState(0);
  const [dbReady, setDbReady] = useState(false);

  // ── Scroll listener ──
  useEffect(() => {
    const onScroll = () => setScrolled(window.scrollY > 50);
    window.addEventListener("scroll", onScroll);
    return () => window.removeEventListener("scroll", onScroll);
  }, []);

  // ── Supabase'den veri yükle ──
  useEffect(() => {
    (async () => {
      const { data: rows } = await supabase.from("decha_content").select();
      if (rows && rows.length > 0) {
        const row = rows[0];
        setData({
          hero: row.hero || initData.hero,
          services: row.services || initData.services,
          testimonials: row.testimonials || initData.testimonials,
        });
        if (row.theme) setTheme({ ...initTheme, ...row.theme });
        if (row.spacing) setSpacing({ ...initSpacing, ...row.spacing });
        if (row.emailTemplates) setEmailTemplates({ ...initEmailTemplates, ...row.emailTemplates });
        setDbReady(true);
      }
      const { data: sRows } = await supabase.from("decha_settings").select();
      if (sRows && sRows.length > 0) {
        setSettings({ ...initSettings, ...sRows[0] });
      }
    })();
  }, []);

  const scrollTo = (id) => document.getElementById(id)?.scrollIntoView({ behavior: "smooth" });

  // ── Admin girişi ──
  const login = async () => {
    const { allowed, wait } = rateLimiter.check();
    if (!allowed) {
      setLockTimer(wait);
      const iv = setInterval(() => {
        const { allowed: ok, wait: w } = rateLimiter.check();
        setLockTimer(w);
        if (ok) clearInterval(iv);
      }, 1000);
      return;
    }

    const correctPass = settings.adminPass || DEFAULT_PASS;
    const ok = await verifyPass(pw, correctPass);
    if (ok) {
      rateLimiter.reset();
      setAuthed(true);
      setEditData(JSON.parse(JSON.stringify(data)));
      setEditSettings(JSON.parse(JSON.stringify(settings)));
      setEditTheme(JSON.parse(JSON.stringify(theme)));
      setEditSpacing(JSON.parse(JSON.stringify(spacing)));
      setEditEmailTemplates(JSON.parse(JSON.stringify(emailTemplates)));
      setPwErr(false);
      setLockTimer(0);
    } else {
      rateLimiter.fail();
      setPwErr(true);
      const { wait: w } = rateLimiter.check();
      if (w > 0) setLockTimer(w);
    }
  };

  // ── Kaydet (geliştirilmiş hata yönetimiyle) ──
  const save = async () => {
    const cleanData = {
      hero: {
        h1: sanitize(editData.hero.h1),
        h2: sanitize(editData.hero.h2),
        sub: sanitize(editData.hero.sub),
      },
      services: editData.services.map(s => ({
        ...s,
        tag: sanitize(s.tag),
        title: sanitize(s.title),
        desc: sanitize(s.desc),
      })),
      testimonials: editData.testimonials.map(t => ({
        ...t,
        name: sanitize(t.name),
        role: sanitize(t.role),
        initials: sanitize(t.initials).slice(0, 2),
        text: sanitize(t.text),
      })),
      theme: editTheme,
      spacing: editSpacing,
      emailTemplates: editEmailTemplates,
    };

    let cleanSettings = { ...editSettings };
    if (editSettings.adminPass && !/^[a-f0-9]{64}$/.test(editSettings.adminPass)) {
      cleanSettings = { ...cleanSettings, adminPass: await sha256(editSettings.adminPass) };
    }

    // Yerel state güncelle
    const { theme: t, spacing: sp, emailTemplates: et, ...coreData } = cleanData;
    setData(coreData);
    setTheme(t);
    setSpacing(sp);
    setEmailTemplates(et);
    setSettings(cleanSettings);

    const { error: e1 } = await supabase
      .from("decha_content")
      .upsert({ id: 1, ...cleanData });

    const { error: e2 } = await supabase
      .from("decha_settings")
      .upsert({ id: 1, ...cleanSettings });

    if (e1 || e2) {
      const msg = (e1 || e2).message || "Bilinmeyen hata";
      setSaveErrMsg(msg);
      setSaveErr(true);
      setTimeout(() => { setSaveErr(false); setSaveErrMsg(""); }, 5000);
    } else {
      setSaved(true);
      setTimeout(() => setSaved(false), 3000);
    }
  };

  const closeAdmin = () => {
    setAdminOpen(false);
    setAuthed(false);
    setPw("");
    setPwErr(false);
    setShowPw(false);
  };

  // ── Hizmet güncelle ──
  const updSvc = (i, k, v) => {
    const s = [...editData.services];
    s[i] = { ...s[i], [k]: v };
    setEditData({ ...editData, services: s });
  };

  // ── Hizmet ekle ──
  const addSvc = () => {
    const newSvc = { id: Date.now(), iconKey: "Zap", tag: "", title: "Yeni Hizmet", desc: "" };
    setEditData({ ...editData, services: [...editData.services, newSvc] });
  };

  // ── Hizmet sil ──
  const delSvc = (i) => {
    const updated = editData.services.filter((_, idx) => idx !== i);
    setEditData({ ...editData, services: updated });
  };

  const updTest = (i, k, v) => {
    const t = [...editData.testimonials];
    t[i] = { ...t[i], [k]: v };
    setEditData({ ...editData, testimonials: t });
  };

  // ── EmailJS form gönder ──
  const sendForm = async () => {
    if (!form.name || !form.email || !form.msg) return;
    const safeName = sanitize(form.name);
    const safeEmail = sanitize(form.email);
    const safeMsg = sanitize(form.msg);
    if (!/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(safeEmail)) {
      setSendErr("Geçerli bir e-posta adresi girin.");
      return;
    }
    setSending(true);
    setSendErr("");
    try {
      const { emailjsServiceId, emailjsTemplateId, emailjsPublicKey } = settings;
      if (!emailjsServiceId || !emailjsTemplateId || !emailjsPublicKey) {
        throw new Error("EmailJS bilgileri admin panelinde yapılandırılmamış.");
      }
      if (!window.emailjs) {
        await new Promise((res, rej) => {
          const s = document.createElement("script");
          s.src = "https://cdn.jsdelivr.net/npm/@emailjs/browser@4/dist/email.min.js";
          s.onload = res;
          s.onerror = rej;
          document.head.appendChild(s);
        });
        window.emailjs.init(emailjsPublicKey);
      }
      await window.emailjs.send(emailjsServiceId, emailjsTemplateId, {
        from_name: safeName,
        from_email: safeEmail,
        message: safeMsg,
      });
      setSent(true);
    } catch (err) {
      setSendErr(err.message || "Gönderim sırasında bir hata oluştu.");
    } finally {
      setSending(false);
    }
  };

  // ── Stil yardımcıları ──
  const inp = {
    width: "100%", padding: "11px 14px", borderRadius: 8,
    background: "rgba(255,255,255,0.04)", border: "1px solid rgba(180,100,255,0.2)",
    color: "#e2e8f0", fontSize: 14, outline: "none", boxSizing: "border-box",
    fontFamily: "DM Sans, sans-serif", transition: "border-color 0.2s",
  };

  const card = (id) => ({
    background: "rgba(255,255,255,0.025)",
    border: `1px solid ${hovered === id ? "rgba(168,85,247,0.5)" : "rgba(168,85,247,0.1)"}`,
    borderRadius: 20, backdropFilter: "blur(16px)", padding: 32,
    transition: "all 0.4s cubic-bezier(0.34,1.3,0.64,1)",
    transform: hovered === id ? "translateY(-10px)" : "translateY(0)",
    boxShadow: hovered === id ? "0 32px 80px rgba(168,85,247,0.15)" : "0 2px 24px rgba(0,0,0,0.4)",
  });

  const TABS = [
    { key: "hero", label: "Hero Alanı", Icon: Home },
    { key: "services", label: "Hizmetler", Icon: Zap },
    { key: "testimonials", label: "Referanslar", Icon: MessageSquare },
    { key: "theme", label: "Renk & Tema", Icon: Palette },
    { key: "spacing", label: "Boşluk & Düzen", Icon: Layout },
    { key: "emailTemplates", label: "E-posta Şablonları", Icon: Mail },
    { key: "settings", label: "Genel Ayarlar", Icon: Settings },
  ];

  return (
    <>
      <style>{`
        @import url('https://fonts.googleapis.com/css2?family=Syne:wght@700;800;900&family=DM+Sans:wght@300;400;500;600&display=swap');
        *{margin:0;padding:0;box-sizing:border-box}
        html{scroll-behavior:smooth}
        body{background:#07070f}
        @keyframes orb1{0%,100%{transform:translate(0,0) scale(1)}40%{transform:translate(50px,-70px) scale(1.1)}70%{transform:translate(-30px,40px) scale(0.9)}}
        @keyframes orb2{0%,100%{transform:translate(0,0)}50%{transform:translate(-60px,50px) scale(1.15)}}
        @keyframes shimmer{0%{background-position:-300% center}100%{background-position:300% center}}
        @keyframes fadeUp{from{opacity:0;transform:translateY(28px)}to{opacity:1;transform:translateY(0)}}
        @keyframes pulse{0%,100%{opacity:.6}50%{opacity:1}}
        @keyframes marquee{0%{transform:translate3d(0,0,0)}100%{transform:translate3d(-50%,0,0)}}
        .marquee-track{display:flex;width:max-content;animation:marquee 32s linear infinite;will-change:transform;backface-visibility:hidden;-webkit-backface-visibility:hidden}
        .marquee-track:hover{animation-play-state:paused}
        .marquee-wrap{overflow:hidden;-webkit-mask:linear-gradient(90deg,transparent,#000 8%,#000 92%,transparent);mask:linear-gradient(90deg,transparent,#000 8%,#000 92%,transparent)}
        .tcard{flex-shrink:0;width:340px;margin-right:22px}
        .fu0{animation:fadeUp .7s .05s ease both}
        .fu1{animation:fadeUp .7s .2s ease both}
        .fu2{animation:fadeUp .7s .35s ease both}
        .fu3{animation:fadeUp .7s .5s ease both}
        .fu4{animation:fadeUp .7s .65s ease both}
        input:focus,textarea:focus{border-color:rgba(168,85,247,.65)!important;box-shadow:0 0 0 3px rgba(168,85,247,.12)!important}
        input::placeholder,textarea::placeholder{color:#334155}
        ::-webkit-scrollbar{width:5px}
        ::-webkit-scrollbar-track{background:#07070f}
        ::-webkit-scrollbar-thumb{background:rgba(168,85,247,.3);border-radius:3px}
        .cta{transition:all .3s cubic-bezier(.34,1.56,.64,1)!important}
        .cta:hover{transform:translateY(-3px) scale(1.03)!important;box-shadow:0 0 70px rgba(168,85,247,.55)!important}
        .nav-link{transition:color .2s!important}
        .nav-link:hover{color:#c084fc!important}
        .ghost:hover{background:rgba(168,85,247,.1)!important;border-color:#a855f7!important}
        .admin-foot:hover{color:#475569!important}
      `}</style>

      <div style={{ fontFamily: "DM Sans, sans-serif", background: theme.bg, color: theme.textMain, minHeight: "100vh", overflowX: "hidden" }}>

        {/* ── AMBIENT ORBS ── */}
        <div style={{ position: "fixed", inset: 0, pointerEvents: "none", zIndex: 0, overflow: "hidden" }}>
          <div style={{ position: "absolute", top: "12%", left: "5%", width: 560, height: 560, borderRadius: "50%", background: "radial-gradient(circle, rgba(109,40,217,.22) 0%, transparent 68%)", animation: "orb1 20s ease-in-out infinite" }} />
          <div style={{ position: "absolute", bottom: "15%", right: "5%", width: 440, height: 440, borderRadius: "50%", background: "radial-gradient(circle, rgba(192,132,252,.14) 0%, transparent 68%)", animation: "orb2 25s ease-in-out infinite" }} />
          <div style={{ position: "absolute", top: "55%", left: "38%", width: 320, height: 320, borderRadius: "50%", background: "radial-gradient(circle, rgba(139,92,246,.1) 0%, transparent 68%)", animation: "orb1 16s ease-in-out infinite reverse" }} />
        </div>

        {/* ── NAVBAR ── */}
        <nav style={{
          position: "fixed", top: 0, left: 0, right: 0, zIndex: 100,
          background: scrolled ? "rgba(7,7,15,.94)" : "transparent",
          backdropFilter: scrolled ? "blur(28px)" : "none",
          borderBottom: scrolled ? "1px solid rgba(168,85,247,.1)" : "none",
          padding: "0 48px", height: 68,
          display: "flex", alignItems: "center", justifyContent: "space-between",
          transition: "all .4s",
        }}>
          <div style={{ display: "flex", alignItems: "center" }}>
            <Logo size="md" />
          </div>
          <div style={{ display: "flex", gap: 36, alignItems: "center" }}>
            {[["Hizmetler", "services"], ["Referanslar", "testimonials"], ["İletişim", "contact"]].map(([l, id]) => (
              <button key={id} className="nav-link" onClick={() => scrollTo(id)} style={{ background: "none", border: "none", color: "#475569", cursor: "pointer", fontSize: 14, fontWeight: 500, fontFamily: "DM Sans, sans-serif" }}>{l}</button>
            ))}
            <button className="cta" onClick={() => scrollTo("contact")} style={{
              background: "linear-gradient(135deg,#6d28d9,#a855f7)", border: "none", color: "#fff",
              padding: "11px 26px", borderRadius: 11, fontSize: 14, fontWeight: 600, cursor: "pointer",
              fontFamily: "DM Sans, sans-serif", boxShadow: "0 0 30px rgba(168,85,247,.35)", letterSpacing: ".2px",
              display: "flex", alignItems: "center", gap: 6,
            }}>Teklif Al <ChevronRight size={15} strokeWidth={2.5} /></button>
          </div>
        </nav>

        {/* ── HERO ── */}
        <section id="hero" style={{ position: "relative", zIndex: 1, minHeight: "100vh", display: "flex", alignItems: "center", justifyContent: "center", padding: "100px 24px 60px", textAlign: "center" }}>
          <div style={{ maxWidth: 840 }}>
            <div className="fu0" style={{ display: "inline-flex", alignItems: "center", gap: 8, background: "rgba(168,85,247,.1)", border: "1px solid rgba(168,85,247,.28)", borderRadius: 100, padding: "8px 22px", marginBottom: 38, fontSize: 13, color: "#c084fc", fontWeight: 500 }}>
              <Rocket size={14} strokeWidth={1.5} style={{ animation: "pulse 2.2s ease-in-out infinite" }} /> Dijital Dönüşüm Ajansı
            </div>

            <h1 className="fu1" style={{ fontFamily: "Syne, sans-serif", fontSize: "clamp(52px,9.5vw,100px)", fontWeight: 900, lineHeight: 1.0, marginBottom: 28, letterSpacing: "-2px" }}>
              <span style={{ color: "#f8fafc", display: "block" }}>{data.hero.h1}</span>
              <span style={{ display: "block", background: "linear-gradient(135deg,#c084fc 0%,#a855f7 45%,#7c3aed 100%)", backgroundSize: "300% auto", WebkitBackgroundClip: "text", WebkitTextFillColor: "transparent", animation: "shimmer 5s linear infinite" }}>{data.hero.h2}</span>
            </h1>

            <p className="fu2" style={{ fontSize: "clamp(15px,2vw,19px)", color: "#475569", maxWidth: 600, margin: "0 auto 48px", lineHeight: 1.8 }}>{data.hero.sub}</p>

            <div className="fu3" style={{ display: "flex", gap: 14, justifyContent: "center", flexWrap: "wrap" }}>
              <button className="cta" onClick={() => scrollTo("contact")} style={{
                background: "linear-gradient(135deg,#6d28d9,#a855f7)", border: "none", color: "#fff",
                padding: "18px 44px", borderRadius: 14, fontSize: 16, fontWeight: 700, cursor: "pointer",
                fontFamily: "DM Sans, sans-serif", boxShadow: "0 0 56px rgba(168,85,247,.4)", letterSpacing: ".3px",
                display: "flex", alignItems: "center", gap: 8,
              }}>Ücretsiz Teklif Al <ChevronRight size={17} strokeWidth={2.5} /></button>
              <button className="ghost" onClick={() => scrollTo("services")} style={{
                background: "transparent", border: "1px solid rgba(168,85,247,.3)", color: "#c084fc",
                padding: "18px 44px", borderRadius: 14, fontSize: 16, fontWeight: 500, cursor: "pointer",
                fontFamily: "DM Sans, sans-serif", transition: "all .3s",
              }}>Hizmetleri Keşfet</button>
            </div>

            <div className="fu4" style={{ display: "flex", gap: 60, justifyContent: "center", marginTop: 76, flexWrap: "wrap" }}>
              {[["150+", "Mutlu Müşteri"], ["3x", "Ortalama Büyüme"], ["4", "Platform Uzmanlığı"]].map(([n, l]) => (
                <div key={l}>
                  <div style={{ fontFamily: "Syne, sans-serif", fontSize: 34, fontWeight: 800, color: "#a855f7", letterSpacing: "-1px" }}>{n}</div>
                  <div style={{ fontSize: 13, color: "#1e293b", marginTop: 5, fontWeight: 500 }}>{l}</div>
                </div>
              ))}
            </div>
          </div>
        </section>

        {/* ── SERVICES ── */}
        <section id="services" style={{ position: "relative", zIndex: 1, padding: `${spacing.sectionPaddingY}px 48px`, maxWidth: 1320, margin: "0 auto" }}>
          <div style={{ textAlign: "center", marginBottom: 70 }}>
            <div style={{ display: "inline-flex", alignItems: "center", gap: 8, background: "rgba(168,85,247,.1)", border: "1px solid rgba(168,85,247,.22)", borderRadius: 100, padding: "6px 18px", marginBottom: 18, fontSize: 13, color: "#c084fc" }}>
              <Zap size={13} strokeWidth={1.5} /> Hizmetlerimiz
            </div>
            <h2 style={{ fontFamily: "Syne, sans-serif", fontSize: "clamp(28px,5vw,50px)", fontWeight: 800, color: "#f8fafc", letterSpacing: "-1px" }}>İşletmenizi Dijitalde</h2>
            <p style={{ fontFamily: "Syne, sans-serif", fontSize: "clamp(22px,4vw,42px)", fontWeight: 800, color: "#a855f7", letterSpacing: "-1px" }}>Güçlendiriyoruz</p>
          </div>

          <div style={{ display: "grid", gridTemplateColumns: "repeat(auto-fit,minmax(270px,1fr))", gap: 24 }}>
            {data.services.map((svc, i) => (
              <div key={svc.id} onMouseEnter={() => setHovered(`s${i}`)} onMouseLeave={() => setHovered(null)} style={card(`s${i}`)}>
                <ServiceIcon iconKey={svc.iconKey} />
                <span style={{ fontSize: 11, fontWeight: 700, color: "#a855f7", textTransform: "uppercase", letterSpacing: "1.5px" }}>{svc.tag}</span>
                <h3 style={{ fontFamily: "Syne, sans-serif", fontSize: 19, fontWeight: 700, color: "#f8fafc", margin: "12px 0 14px", letterSpacing: "-.2px" }}>{svc.title}</h3>
                <p style={{ fontSize: 14, color: "#3d5068", lineHeight: 1.8 }}>{svc.desc}</p>
              </div>
            ))}
          </div>
        </section>

        {/* ── TESTIMONIALS ── */}
        <section id="testimonials" style={{ position: "relative", zIndex: 1, padding: `${spacing.sectionPaddingY}px 0`, background: "rgba(168,85,247,.015)", borderTop: "1px solid rgba(168,85,247,.07)", borderBottom: "1px solid rgba(168,85,247,.07)", overflow: "hidden" }}>
          <div style={{ textAlign: "center", marginBottom: 60, padding: "0 48px" }}>
            <div style={{ display: "inline-flex", alignItems: "center", gap: 8, background: "rgba(168,85,247,.1)", border: "1px solid rgba(168,85,247,.22)", borderRadius: 100, padding: "6px 18px", marginBottom: 18, fontSize: 13, color: "#c084fc" }}>
              <MessageSquare size={13} strokeWidth={1.5} /> Referanslar
            </div>
            <h2 style={{ fontFamily: "Syne, sans-serif", fontSize: "clamp(26px,4.5vw,46px)", fontWeight: 800, color: "#f8fafc", letterSpacing: "-1px" }}>Müşterilerimiz Ne Diyor?</h2>
          </div>

          {data.testimonials.length === 0 ? (
            <div style={{ textAlign: "center", padding: "40px 24px" }}>
              <div style={{ width: 80, height: 80, borderRadius: "50%", background: "rgba(168,85,247,.08)", border: "1px solid rgba(168,85,247,.18)", display: "flex", alignItems: "center", justifyContent: "center", margin: "0 auto 24px" }}>
                <Sparkles size={32} color="#a855f7" strokeWidth={1.2} style={{ animation: "pulse 2.5s ease-in-out infinite" }} />
              </div>
              <h3 style={{ fontFamily: "Syne, sans-serif", color: "#a855f7", fontSize: 22, fontWeight: 800, marginBottom: 10, letterSpacing: "-.5px" }}>Müşteri deneyimlerimiz yakında burada parlayacak...</h3>
              <p style={{ color: "#334155", fontSize: 15, lineHeight: 1.7, maxWidth: 480, margin: "0 auto" }}>Dijital dönüşüm sırası sizde! İlk referans sahibi olmak için hemen iletişime geçin.</p>
            </div>
          ) : (
            <div className="marquee-wrap">
              <div className="marquee-track">
                {[...data.testimonials, ...data.testimonials].map((t, i) => (
                  <div key={i} className="tcard" style={{ background: "rgba(255,255,255,0.025)", border: "1px solid rgba(168,85,247,0.12)", borderRadius: 20, backdropFilter: "blur(16px)", padding: 28, boxShadow: "0 2px 24px rgba(0,0,0,0.4)", transition: "border-color .3s" }}
                    onMouseEnter={e => e.currentTarget.style.borderColor = "rgba(168,85,247,0.5)"}
                    onMouseLeave={e => e.currentTarget.style.borderColor = "rgba(168,85,247,0.12)"}
                  >
                    <div style={{ display: "flex", gap: 3, marginBottom: 16 }}>
                      {[...Array(5)].map((_, si) => <Star key={si} size={13} fill="#a855f7" color="#a855f7" />)}
                    </div>
                    <p style={{ fontSize: 14, color: "#64748b", lineHeight: 1.85, fontStyle: "italic", marginBottom: 22 }}>"{t.text}"</p>
                    <div style={{ display: "flex", alignItems: "center", gap: 12 }}>
                      <div style={{ width: 42, height: 42, borderRadius: "50%", background: "linear-gradient(135deg,#6d28d9,#a855f7)", display: "flex", alignItems: "center", justifyContent: "center", fontSize: 12, fontWeight: 700, color: "#fff", flexShrink: 0, boxShadow: "0 0 14px rgba(168,85,247,.4)" }}>{t.initials}</div>
                      <div>
                        <div style={{ fontWeight: 600, fontSize: 14, color: "#f1f5f9" }}>{t.name}</div>
                        <div style={{ fontSize: 12, color: "#334155", marginTop: 2 }}>{t.role}</div>
                      </div>
                    </div>
                  </div>
                ))}
              </div>
            </div>
          )}
        </section>

        {/* ── CONTACT ── */}
        <section id="contact" style={{ position: "relative", zIndex: 1, padding: `${spacing.sectionPaddingY}px 24px`, maxWidth: 680, margin: "0 auto" }}>
          <div style={{ textAlign: "center", marginBottom: 56 }}>
            <div style={{ display: "inline-flex", alignItems: "center", gap: 8, background: "rgba(168,85,247,.1)", border: "1px solid rgba(168,85,247,.22)", borderRadius: 100, padding: "6px 18px", marginBottom: 18, fontSize: 13, color: "#c084fc" }}>
              <Mail size={13} strokeWidth={1.5} /> İletişim
            </div>
            <h2 style={{ fontFamily: "Syne, sans-serif", fontSize: "clamp(24px,4vw,42px)", fontWeight: 800, color: "#f8fafc", margin: "0 0 12px", letterSpacing: "-1px" }}>Ücretsiz Teklif Alın</h2>
            <p style={{ color: "#334155", fontSize: 16 }}>Formu doldurun, 24 saat içinde size dönelim.</p>
          </div>

          {sent ? (
            <div style={{ ...card("done"), padding: "60px 32px", textAlign: "center" }}>
              <CheckCircle size={64} color="#a855f7" strokeWidth={1.2} style={{ margin: "0 auto 22px", display: "block" }} />
              <h3 style={{ fontFamily: "Syne, sans-serif", color: "#a855f7", fontSize: 22, fontWeight: 800, marginBottom: 10 }}>Mesajınız Alındı!</h3>
              <p style={{ color: "#334155" }}>En kısa sürede sizinle iletişime geçeceğiz.</p>
            </div>
          ) : (
            <div style={{ background: "rgba(255,255,255,.02)", border: "1px solid rgba(168,85,247,.1)", borderRadius: 22, padding: 40, backdropFilter: "blur(16px)" }}>
              {[["Ad Soyad", "name", "text", "Adınızı girin"], ["E-posta", "email", "email", "ornek@email.com"]].map(([label, field, type, ph]) => (
                <div key={field} style={{ marginBottom: 20 }}>
                  <label style={{ display: "block", fontSize: 11, fontWeight: 700, color: "#a855f7", marginBottom: 8, textTransform: "uppercase", letterSpacing: ".8px" }}>{label}</label>
                  <input type={type} placeholder={ph} value={form[field]} onChange={e => setForm({ ...form, [field]: e.target.value })} style={inp} />
                </div>
              ))}
              <div style={{ marginBottom: 30 }}>
                <label style={{ display: "block", fontSize: 11, fontWeight: 700, color: "#a855f7", marginBottom: 8, textTransform: "uppercase", letterSpacing: ".8px" }}>Mesaj</label>
                <textarea placeholder="Hizmet ihtiyacınızı kısaca açıklayın..." value={form.msg} onChange={e => setForm({ ...form, msg: e.target.value })} rows={5} style={{ ...inp, resize: "vertical", lineHeight: 1.7 }} />
              </div>
              {sendErr && (
                <div style={{ background: "rgba(239,68,68,.08)", border: "1px solid rgba(239,68,68,.3)", borderRadius: 10, padding: "12px 16px", marginBottom: 18, color: "#f87171", fontSize: 13, display: "flex", alignItems: "center", gap: 8 }}>
                  <Bell size={14} /> {sendErr}
                </div>
              )}
              <button className="cta" onClick={sendForm} disabled={sending} style={{
                width: "100%", padding: 18, background: sending ? "rgba(168,85,247,.4)" : "linear-gradient(135deg,#6d28d9,#a855f7)",
                border: "none", color: "#fff", borderRadius: 13, fontSize: 16, fontWeight: 700,
                cursor: sending ? "not-allowed" : "pointer", fontFamily: "DM Sans, sans-serif",
                boxShadow: "0 0 44px rgba(168,85,247,.35)", letterSpacing: ".3px",
                display: "flex", alignItems: "center", justifyContent: "center", gap: 8,
              }}>
                {sending ? (<>Gönderiliyor <span style={{ display: "inline-block", animation: "pulse 1s infinite" }}>...</span></>) : (<>Teklif Gönder <Send size={16} strokeWidth={2} /></>)}
              </button>
            </div>
          )}
        </section>

        {/* ── FOOTER ── */}
        <footer style={{ position: "relative", zIndex: 1, borderTop: "1px solid rgba(168,85,247,.07)", padding: "36px 48px", display: "flex", justifyContent: "space-between", alignItems: "center", flexWrap: "wrap", gap: 14 }}>
          <div style={{ display: "flex", alignItems: "center" }}>
            <Logo size="sm" />
          </div>
          <p style={{ color: "#0f172a", fontSize: 13 }}>© 2024 Decha Digital Agency. Tüm hakları saklıdır.</p>
          <button className="admin-foot" onClick={() => setAdminOpen(true)} style={{ background: "none", border: "none", color: "#0f172a", fontSize: 12, cursor: "pointer", fontFamily: "DM Sans, sans-serif", padding: "6px 10px", borderRadius: 6, transition: "color .2s" }}>Admin</button>
        </footer>


        {/* ── ADMIN — Tam Ekran CMS ── */}
        {adminOpen && (
          <div style={{ position: "fixed", inset: 0, zIndex: 999, background: theme.bg }}>

            {!authed ? (
              /* ── Giriş ekranı ── */
              <div style={{ height: "100vh", display: "flex", alignItems: "center", justifyContent: "center", background: "rgba(0,0,0,.92)", backdropFilter: "blur(14px)" }}>
                <div style={{ background: "#0c0c1c", border: "1px solid rgba(168,85,247,.3)", borderRadius: 24, padding: "56px 48px", width: "100%", maxWidth: 400, textAlign: "center", boxShadow: "0 0 100px rgba(168,85,247,.18)" }}>
                  <div style={{ width: 64, height: 64, borderRadius: "50%", background: `linear-gradient(135deg,${theme.secondary},${theme.primary})`, display: "flex", alignItems: "center", justifyContent: "center", margin: "0 auto 26px" }}>
                    <Lock size={26} color="#fff" strokeWidth={1.5} />
                  </div>
                  <h3 style={{ fontFamily: "Syne, sans-serif", color: "#f8fafc", marginBottom: 8, fontSize: 24, fontWeight: 800 }}>Admin Girişi</h3>
                  <p style={{ color: "#334155", fontSize: 14, marginBottom: 34, lineHeight: 1.6 }}>Decha yönetim paneline erişmek için şifrenizi girin.</p>
                  <div style={{ position: "relative", marginBottom: pwErr ? 8 : 18 }}>
                    <input type={showPw ? "text" : "password"} placeholder="••••••••" value={pw}
                      onChange={e => { setPw(e.target.value); setPwErr(false); }}
                      onKeyDown={e => e.key === "Enter" && login()}
                      style={{ ...inp, textAlign: "center", fontSize: 20, letterSpacing: 6, border: `1px solid ${pwErr ? "#ef4444" : "rgba(168,85,247,.25)"}`, paddingRight: 44 }} />
                    <button onClick={() => setShowPw(v => !v)} style={{ position: "absolute", right: 14, top: "50%", transform: "translateY(-50%)", background: "none", border: "none", cursor: "pointer", color: "#475569", padding: 2 }}>
                      {showPw ? <EyeOff size={16} /> : <Eye size={16} />}
                    </button>
                  </div>
                  {pwErr && !lockTimer && <p style={{ color: "#ef4444", fontSize: 13, marginBottom: 16, display: "flex", alignItems: "center", justifyContent: "center", gap: 6 }}><X size={14} /> Yanlış şifre!</p>}
                  {lockTimer > 0 && (
                    <div style={{ background: "rgba(239,68,68,.08)", border: "1px solid rgba(239,68,68,.25)", borderRadius: 10, padding: "10px 14px", marginBottom: 16, color: "#f87171", fontSize: 13, display: "flex", alignItems: "center", justifyContent: "center", gap: 7 }}>
                      <Shield size={13} /> Çok fazla hatalı deneme. {lockTimer}s bekleyin.
                    </div>
                  )}
                  <button onClick={login} disabled={lockTimer > 0} style={{ width: "100%", padding: 15, background: lockTimer > 0 ? "rgba(168,85,247,.25)" : `linear-gradient(135deg,${theme.secondary},${theme.primary})`, border: "none", color: "#fff", borderRadius: 12, fontSize: 15, fontWeight: 700, cursor: lockTimer > 0 ? "not-allowed" : "pointer", fontFamily: "DM Sans, sans-serif" }}>
                    {lockTimer > 0 ? `Kilitli (${lockTimer}s)` : "Giriş Yap"}
                  </button>
                </div>
              </div>

            ) : (
              /* ── Tam Ekran Dashboard ── */
              <div style={{ display: "flex", height: "100vh", overflow: "hidden" }}>

                {/* ═══ SOL SIDEBAR ═══ */}
                <aside style={{ width: 260, flexShrink: 0, background: "#09090f", borderRight: "1px solid rgba(168,85,247,.12)", display: "flex", flexDirection: "column", height: "100vh", overflow: "hidden" }}>
                  <div style={{ padding: "24px 20px 18px", borderBottom: "1px solid rgba(168,85,247,.08)" }}>
                    <Logo size="sm" />
                    <p style={{ color: "#1e293b", fontSize: 11, marginTop: 4, fontWeight: 500, textTransform: "uppercase", letterSpacing: ".8px" }}>Yönetim Paneli</p>
                  </div>
                  <nav style={{ flex: 1, overflowY: "auto", padding: "12px 10px" }}>
                    {TABS.map(({ key, label, Icon }) => (
                      <button key={key} onClick={() => setTab(key)} style={{
                        width: "100%", padding: "11px 14px", marginBottom: 3, borderRadius: 10, border: "none", cursor: "pointer",
                        background: tab === key ? `linear-gradient(135deg,${theme.secondary},${theme.primary})` : "transparent",
                        color: tab === key ? "#fff" : "#334155",
                        display: "flex", alignItems: "center", gap: 10, fontSize: 13, fontWeight: 600, fontFamily: "DM Sans, sans-serif", textAlign: "left", transition: "all .2s",
                      }}
                        onMouseEnter={e => { if (tab !== key) e.currentTarget.style.background = "rgba(168,85,247,.08)"; }}
                        onMouseLeave={e => { if (tab !== key) e.currentTarget.style.background = "transparent"; }}>
                        <Icon size={15} strokeWidth={1.8} /> {label}
                      </button>
                    ))}
                  </nav>
                  <div style={{ padding: "12px 10px", borderTop: "1px solid rgba(168,85,247,.08)" }}>
                    <button onClick={() => setAdminOpen(false)} style={{ width: "100%", padding: "11px 14px", marginBottom: 6, borderRadius: 10, border: "1px solid rgba(168,85,247,.2)", cursor: "pointer", background: "rgba(168,85,247,.06)", color: theme.accent, display: "flex", alignItems: "center", gap: 8, fontSize: 13, fontWeight: 600, fontFamily: "DM Sans, sans-serif" }}>
                      <Home size={14} strokeWidth={1.8} /> Siteye Dön
                    </button>
                    <button onClick={() => { setAuthed(false); setPw(""); setPwErr(false); }} style={{ width: "100%", padding: "11px 14px", borderRadius: 10, border: "1px solid rgba(239,68,68,.2)", cursor: "pointer", background: "rgba(239,68,68,.05)", color: "#f87171", display: "flex", alignItems: "center", gap: 8, fontSize: 13, fontWeight: 600, fontFamily: "DM Sans, sans-serif" }}>
                      <X size={14} strokeWidth={1.8} /> Çıkış Yap
                    </button>
                  </div>
                </aside>

                {/* ═══ SAĞ İÇERİK ALANI ═══ */}
                <main style={{ flex: 1, display: "flex", flexDirection: "column", overflow: "hidden" }}>

                  {/* Sticky üst bar */}
                  <div style={{ position: "sticky", top: 0, zIndex: 10, background: "rgba(9,9,15,.97)", backdropFilter: "blur(12px)", borderBottom: "1px solid rgba(168,85,247,.1)", padding: "14px 32px", display: "flex", alignItems: "center", justifyContent: "space-between", gap: 16, flexShrink: 0 }}>
                    <div>
                      <h2 style={{ fontFamily: "Syne, sans-serif", color: "#f8fafc", fontSize: 18, fontWeight: 800, margin: 0 }}>{TABS.find(t => t.key === tab)?.label || ""}</h2>
                      <p style={{ color: "#1e293b", fontSize: 12, marginTop: 2 }}>Değişiklikleri yapmak için aşağıdaki formu düzenleyin</p>
                    </div>
                    <div style={{ display: "flex", alignItems: "center", gap: 12 }}>
                      {saved && <span style={{ color: "#22c55e", fontSize: 13, fontWeight: 600, display: "flex", alignItems: "center", gap: 4 }}><CheckCircle size={14} /> Kaydedildi!</span>}
                      {saveErr && <span style={{ color: "#f87171", fontSize: 12, fontWeight: 600, maxWidth: 200, lineHeight: 1.4 }}>⚠️ {saveErrMsg || "Kayıt hatası!"}</span>}
                      <button onClick={save} style={{ background: `linear-gradient(135deg,${theme.secondary},${theme.primary})`, border: "none", color: "#fff", padding: "11px 28px", borderRadius: 10, fontWeight: 700, cursor: "pointer", fontSize: 14, fontFamily: "DM Sans, sans-serif", display: "flex", alignItems: "center", gap: 6, boxShadow: `0 0 24px ${theme.primary}55` }}>
                        <Save size={14} /> Kaydet
                      </button>
                    </div>
                  </div>

                  {/* Kaydırılabilir içerik */}
                  <div style={{ flex: 1, overflowY: "auto", padding: "32px 40px" }}>

                    {/* ── Hero ── */}
                    {tab === "hero" && editData && (
                      <div style={{ display: "flex", flexDirection: "column", gap: 20, maxWidth: 680 }}>
                        {[["Başlık 1", "h1"], ["Başlık 2 (Vurgulu)", "h2"], ["Alt Metin", "sub"]].map(([label, k]) => (
                          <div key={k}>
                            <label style={{ display: "block", fontSize: 11, color: theme.primary, fontWeight: 700, marginBottom: 6, textTransform: "uppercase", letterSpacing: ".8px" }}>{label}</label>
                            <input value={editData.hero[k]} onChange={e => setEditData({ ...editData, hero: { ...editData.hero, [k]: e.target.value } })} style={inp} />
                          </div>
                        ))}
                      </div>
                    )}

                    {/* ── Hizmetler CRUD ── */}
                    {tab === "services" && editData && (
                      <div style={{ display: "flex", flexDirection: "column", gap: 16, maxWidth: 680 }}>
                        {editData.services.length === 0 && <div style={{ textAlign: "center", padding: "28px 0", color: "#334155", fontSize: 14 }}>Henüz hizmet yok. Aşağıdan ilk hizmeti ekleyin.</div>}
                        {editData.services.map((svc, i) => {
                          const PreviewIcon = ICON_MAP[svc.iconKey] || Globe;
                          return (
                            <div key={svc.id || i} style={{ background: "rgba(168,85,247,.04)", border: "1px solid rgba(168,85,247,.1)", borderRadius: 12, padding: 20 }}>
                              <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center", marginBottom: 14 }}>
                                <div style={{ color: theme.primary, fontWeight: 700, fontSize: 14, fontFamily: "Syne, sans-serif", display: "flex", alignItems: "center", gap: 8 }}><Zap size={14} /> Hizmet {i + 1}</div>
                                <button onClick={() => delSvc(i)} style={{ background: "rgba(239,68,68,.08)", border: "1px solid rgba(239,68,68,.2)", color: "#f87171", borderRadius: 8, padding: "6px 10px", cursor: "pointer", display: "flex", alignItems: "center", gap: 5, fontSize: 12, fontWeight: 600, fontFamily: "DM Sans, sans-serif" }}
                                  onMouseEnter={e => e.currentTarget.style.background = "rgba(239,68,68,.18)"}
                                  onMouseLeave={e => e.currentTarget.style.background = "rgba(239,68,68,.08)"}>
                                  <Trash2 size={13} /> Sil
                                </button>
                              </div>
                              <div style={{ marginBottom: 14 }}>
                                <label style={{ display: "block", fontSize: 11, color: "#1e293b", fontWeight: 600, marginBottom: 4, textTransform: "uppercase" }}>İkon</label>
                                <div style={{ display: "flex", alignItems: "center", gap: 12 }}>
                                  <div style={{ width: 44, height: 44, borderRadius: 10, background: "rgba(168,85,247,.12)", border: "1px solid rgba(168,85,247,.25)", display: "flex", alignItems: "center", justifyContent: "center", flexShrink: 0 }}>
                                    <PreviewIcon size={22} color={theme.primary} strokeWidth={1.5} />
                                  </div>
                                  <select value={svc.iconKey} onChange={e => updSvc(i, "iconKey", e.target.value)} style={{ ...inp, cursor: "pointer", flex: 1 }}>
                                    {ICON_OPTIONS.map(opt => <option key={opt.value} value={opt.value}>{opt.label}</option>)}
                                  </select>
                                </div>
                              </div>
                              {[["Başlık", "title"], ["Etiket", "tag"], ["Açıklama", "desc"]].map(([label, k]) => (
                                <div key={k} style={{ marginBottom: 10 }}>
                                  <label style={{ display: "block", fontSize: 11, color: "#1e293b", fontWeight: 600, marginBottom: 4, textTransform: "uppercase" }}>{label}</label>
                                  <input value={svc[k] || ""} onChange={e => updSvc(i, k, e.target.value)} style={{ ...inp, fontSize: 13 }} />
                                </div>
                              ))}
                            </div>
                          );
                        })}
                        <button onClick={addSvc} style={{ width: "100%", padding: "13px 0", border: "1px dashed rgba(168,85,247,.35)", background: "rgba(168,85,247,.04)", color: theme.primary, borderRadius: 12, cursor: "pointer", fontSize: 14, fontWeight: 700, fontFamily: "DM Sans, sans-serif", display: "flex", alignItems: "center", justifyContent: "center", gap: 7 }}
                          onMouseEnter={e => e.currentTarget.style.background = "rgba(168,85,247,.1)"}
                          onMouseLeave={e => e.currentTarget.style.background = "rgba(168,85,247,.04)"}>
                          <Plus size={16} strokeWidth={2.2} /> Yeni Hizmet Ekle
                        </button>
                      </div>
                    )}

                    {/* ── Referanslar CRUD ── */}
                    {tab === "testimonials" && editData && (
                      <div style={{ display: "flex", flexDirection: "column", gap: 16, maxWidth: 680 }}>
                        {editData.testimonials.length === 0 && <div style={{ textAlign: "center", padding: "28px 0", color: "#334155", fontSize: 14 }}>Henüz referans yok. Aşağıdan ilk referansı ekleyin.</div>}
                        {editData.testimonials.map((t, i) => (
                          <div key={t.id || i} style={{ background: "rgba(168,85,247,.04)", border: "1px solid rgba(168,85,247,.1)", borderRadius: 12, padding: 20 }}>
                            <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center", marginBottom: 14 }}>
                              <div style={{ color: theme.primary, fontWeight: 700, fontSize: 14, fontFamily: "Syne, sans-serif", display: "flex", alignItems: "center", gap: 8 }}><User size={14} /> Referans {i + 1}</div>
                              <button onClick={() => setEditData({ ...editData, testimonials: editData.testimonials.filter((_, idx) => idx !== i) })}
                                style={{ background: "rgba(239,68,68,.08)", border: "1px solid rgba(239,68,68,.2)", color: "#f87171", borderRadius: 8, padding: "6px 10px", cursor: "pointer", display: "flex", alignItems: "center", gap: 5, fontSize: 12, fontWeight: 600, fontFamily: "DM Sans, sans-serif" }}>
                                <Trash2 size={13} /> Sil
                              </button>
                            </div>
                            {[["İsim", "name"], ["Ünvan", "role"], ["Kısaltma (2 harf)", "initials"]].map(([label, k]) => (
                              <div key={k} style={{ marginBottom: 10 }}>
                                <label style={{ display: "block", fontSize: 11, color: "#1e293b", fontWeight: 600, marginBottom: 4, textTransform: "uppercase" }}>{label}</label>
                                <input value={t[k] || ""} onChange={e => updTest(i, k, e.target.value)} style={{ ...inp, fontSize: 13 }} />
                              </div>
                            ))}
                            <div>
                              <label style={{ display: "block", fontSize: 11, color: "#1e293b", fontWeight: 600, marginBottom: 4, textTransform: "uppercase" }}>Yorum</label>
                              <textarea value={t.text || ""} onChange={e => updTest(i, "text", e.target.value)} rows={3} style={{ ...inp, fontSize: 13, resize: "vertical", lineHeight: 1.6 }} />
                            </div>
                          </div>
                        ))}
                        <button onClick={() => setEditData({ ...editData, testimonials: [...editData.testimonials, { id: Date.now(), name: "", role: "", initials: "", text: "" }] })}
                          style={{ width: "100%", padding: "13px 0", border: "1px dashed rgba(168,85,247,.35)", background: "rgba(168,85,247,.04)", color: theme.primary, borderRadius: 12, cursor: "pointer", fontSize: 14, fontWeight: 700, fontFamily: "DM Sans, sans-serif", display: "flex", alignItems: "center", justifyContent: "center", gap: 7 }}>
                          <Plus size={16} strokeWidth={2.2} /> Yeni Referans Ekle
                        </button>
                      </div>
                    )}

                    {/* ── Renk & Tema ── */}
                    {tab === "theme" && editTheme && (
                      <div style={{ maxWidth: 560 }}>
                        <div style={{ background: "rgba(168,85,247,.04)", border: "1px solid rgba(168,85,247,.12)", borderRadius: 14, padding: 24, marginBottom: 20 }}>
                          <div style={{ display: "flex", alignItems: "center", gap: 8, marginBottom: 20 }}>
                            <Palette size={16} color={theme.primary} strokeWidth={1.5} />
                            <h4 style={{ fontFamily: "Syne, sans-serif", color: "#f8fafc", fontWeight: 700, fontSize: 15, margin: 0 }}>Site Renkleri</h4>
                          </div>
                          <p style={{ color: "#334155", fontSize: 13, marginBottom: 22, lineHeight: 1.6 }}>Değişiklikler "Kaydet"e bastıktan sonra siteye yansır.</p>
                          <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: 16 }}>
                            {[["primary", "Ana Renk (buton, vurgu)"], ["secondary", "İkincil Renk (gradient)"], ["accent", "Aksan (etiket, badge)"], ["bg", "Sayfa Arkaplanı"], ["textMain", "Ana Metin"], ["textMuted", "Soluk Metin"]].map(([k, label]) => (
                              <div key={k}>
                                <label style={{ display: "block", fontSize: 11, color: "#475569", fontWeight: 600, marginBottom: 6, textTransform: "uppercase" }}>{label}</label>
                                <div style={{ display: "flex", alignItems: "center", gap: 10 }}>
                                  <input type="color" value={editTheme[k]} onChange={e => setEditTheme({ ...editTheme, [k]: e.target.value })} style={{ width: 44, height: 36, border: "1px solid rgba(168,85,247,.2)", borderRadius: 8, cursor: "pointer", padding: 3, background: "rgba(255,255,255,.04)" }} />
                                  <input value={editTheme[k]} onChange={e => setEditTheme({ ...editTheme, [k]: e.target.value })} style={{ ...inp, flex: 1, fontSize: 12, fontFamily: "monospace" }} />
                                </div>
                              </div>
                            ))}
                          </div>
                        </div>
                        <div style={{ background: "rgba(168,85,247,.04)", border: "1px solid rgba(168,85,247,.12)", borderRadius: 14, padding: 20 }}>
                          <p style={{ color: "#475569", fontSize: 11, fontWeight: 700, textTransform: "uppercase", marginBottom: 14, letterSpacing: ".8px" }}>Canlı Önizleme</p>
                          <div style={{ display: "flex", gap: 10, flexWrap: "wrap", alignItems: "center" }}>
                            <button style={{ padding: "10px 22px", background: `linear-gradient(135deg,${editTheme.secondary},${editTheme.primary})`, border: "none", color: "#fff", borderRadius: 10, cursor: "default", fontWeight: 700, fontSize: 13 }}>Ana Buton</button>
                            <span style={{ padding: "8px 16px", background: `${editTheme.primary}15`, border: `1px solid ${editTheme.primary}40`, borderRadius: 100, color: editTheme.accent, fontSize: 12, fontWeight: 600 }}>Etiket</span>
                            <span style={{ color: editTheme.textMain, fontSize: 15, fontWeight: 700, fontFamily: "Syne, sans-serif" }}>Ana Metin</span>
                            <span style={{ color: editTheme.textMuted, fontSize: 13 }}>Soluk Metin</span>
                          </div>
                        </div>
                      </div>
                    )}

                    {/* ── Boşluk & Düzen ── */}
                    {tab === "spacing" && editSpacing && (
                      <div style={{ maxWidth: 480 }}>
                        <div style={{ background: "rgba(168,85,247,.04)", border: "1px solid rgba(168,85,247,.12)", borderRadius: 14, padding: 24 }}>
                          <div style={{ display: "flex", alignItems: "center", gap: 8, marginBottom: 20 }}>
                            <Layout size={16} color={theme.primary} strokeWidth={1.5} />
                            <h4 style={{ fontFamily: "Syne, sans-serif", color: "#f8fafc", fontWeight: 700, fontSize: 15, margin: 0 }}>Boşluk & Düzen Ayarları</h4>
                          </div>
                          {[["sectionPaddingY", "Bölümler Arası Dikey Boşluk (px)", 40, 200], ["cardRadius", "Kart Köşe Yarıçapı (px)", 4, 40], ["buttonRadius", "Buton Köşe Yarıçapı (px)", 4, 40]].map(([k, label, min, max]) => (
                            <div key={k} style={{ marginBottom: 22 }}>
                              <label style={{ display: "block", fontSize: 11, color: theme.primary, fontWeight: 700, marginBottom: 8, textTransform: "uppercase", letterSpacing: ".8px" }}>
                                {label}: <strong style={{ color: "#f8fafc" }}>{editSpacing[k]}px</strong>
                              </label>
                              <input type="range" min={min} max={max} value={editSpacing[k]} onChange={e => setEditSpacing({ ...editSpacing, [k]: Number(e.target.value) })} style={{ width: "100%", accentColor: theme.primary, cursor: "pointer" }} />
                              <div style={{ display: "flex", justifyContent: "space-between", color: "#1e293b", fontSize: 11, marginTop: 4 }}><span>{min}px</span><span>{max}px</span></div>
                            </div>
                          ))}
                          <div style={{ marginTop: 10, background: "rgba(168,85,247,.06)", border: "1px solid rgba(168,85,247,.15)", borderRadius: editSpacing.cardRadius, padding: 20, transition: "border-radius .2s" }}>
                            <p style={{ color: "#475569", fontSize: 12, margin: 0, textAlign: "center" }}>Kart önizlemesi — borderRadius: {editSpacing.cardRadius}px</p>
                          </div>
                        </div>
                      </div>
                    )}

                    {/* ── E-posta Şablonları ── */}
                    {tab === "emailTemplates" && editEmailTemplates && (
                      <div style={{ maxWidth: 680 }}>
                        {[["Admin E-postası", "adminSubject", "adminBody", "#a855f7", "Admin'e düşen bildirim e-postası"], ["Kullanıcı Onayı", "userSubject", "userBody", "#60a5fa", "Formu dolduran kişiye giden onay e-postası"]].map(([title, subjectKey, bodyKey, color, desc]) => (
                          <div key={subjectKey} style={{ background: "rgba(255,255,255,.02)", border: `1px solid ${color}25`, borderRadius: 14, padding: 24, marginBottom: 20 }}>
                            <div style={{ display: "flex", alignItems: "center", gap: 8, marginBottom: 6 }}>
                              <Mail size={15} color={color} strokeWidth={1.5} />
                              <h4 style={{ fontFamily: "Syne, sans-serif", color: "#f8fafc", fontWeight: 700, fontSize: 15, margin: 0 }}>{title}</h4>
                            </div>
                            <p style={{ color: "#334155", fontSize: 12, marginBottom: 18, lineHeight: 1.6 }}>{desc}</p>
                            <div style={{ marginBottom: 14 }}>
                              <label style={{ display: "block", fontSize: 11, color, fontWeight: 700, marginBottom: 6, textTransform: "uppercase", letterSpacing: ".8px" }}>Konu (Subject)</label>
                              <input value={editEmailTemplates[subjectKey]} onChange={e => setEditEmailTemplates({ ...editEmailTemplates, [subjectKey]: e.target.value })} style={{ ...inp, border: `1px solid ${color}30` }} />
                            </div>
                            <div>
                              <label style={{ display: "block", fontSize: 11, color, fontWeight: 700, marginBottom: 6, textTransform: "uppercase", letterSpacing: ".8px" }}>İçerik Şablonu (Body)</label>
                              <textarea value={editEmailTemplates[bodyKey]} onChange={e => setEditEmailTemplates({ ...editEmailTemplates, [bodyKey]: e.target.value })} rows={6} style={{ ...inp, border: `1px solid ${color}30`, resize: "vertical", lineHeight: 1.7, fontSize: 13, fontFamily: "monospace" }} />
                            </div>
                            <div style={{ background: `${color}08`, border: `1px solid ${color}18`, borderRadius: 8, padding: "10px 14px", marginTop: 12 }}>
                              <p style={{ color, fontSize: 11, lineHeight: 1.6, margin: 0 }}>
                                Değişkenler: <code style={{ background: `${color}15`, padding: "1px 5px", borderRadius: 3 }}>{"{{" + "from_name" + "}}"}</code>{" "}
                                <code style={{ background: `${color}15`, padding: "1px 5px", borderRadius: 3 }}>{"{{" + "from_email" + "}}"}</code>{" "}
                                <code style={{ background: `${color}15`, padding: "1px 5px", borderRadius: 3 }}>{"{{" + "message" + "}}"}</code>
                              </p>
                            </div>
                          </div>
                        ))}
                      </div>
                    )}

                    {/* ── Genel Ayarlar ── */}
                    {tab === "settings" && editSettings && (
                      <div style={{ display: "flex", flexDirection: "column", gap: 24, maxWidth: 560 }}>
                        <div style={{ background: "rgba(168,85,247,.04)", border: "1px solid rgba(168,85,247,.12)", borderRadius: 14, padding: 24 }}>
                          <div style={{ display: "flex", alignItems: "center", gap: 8, marginBottom: 18 }}>
                            <Shield size={16} color={theme.primary} strokeWidth={1.5} />
                            <h4 style={{ fontFamily: "Syne, sans-serif", color: "#f8fafc", fontWeight: 700, fontSize: 15, margin: 0 }}>Şifre Değiştir</h4>
                          </div>
                          <label style={{ display: "block", fontSize: 11, color: theme.primary, fontWeight: 700, marginBottom: 6, textTransform: "uppercase", letterSpacing: ".8px" }}>Yeni Admin Şifresi</label>
                          <input type="password" placeholder="Yeni şifrenizi girin..." value={editSettings.adminPass} onChange={e => setEditSettings({ ...editSettings, adminPass: e.target.value })} style={inp} />
                          <p style={{ color: "#1e293b", fontSize: 12, marginTop: 8 }}>Kaydet butonuna basınca yeni şifre aktif olur.</p>
                        </div>
                        <div style={{ background: "rgba(59,130,246,.04)", border: "1px solid rgba(59,130,246,.15)", borderRadius: 14, padding: 24 }}>
                          <div style={{ display: "flex", alignItems: "center", gap: 8, marginBottom: 14 }}>
                            <Mail size={16} color="#60a5fa" strokeWidth={1.5} />
                            <h4 style={{ fontFamily: "Syne, sans-serif", color: "#f8fafc", fontWeight: 700, fontSize: 15, margin: 0 }}>EmailJS Yapılandırması</h4>
                          </div>
                          <p style={{ color: "#334155", fontSize: 13, marginBottom: 18, lineHeight: 1.65 }}>
                            <a href="https://emailjs.com" target="_blank" rel="noreferrer" style={{ color: "#60a5fa" }}>emailjs.com</a> üzerinde bir "Email Service" ve "Email Template" tanımlayın.
                          </p>
                          {[["Service ID", "emailjsServiceId", "service_xxxxxxx"], ["Template ID", "emailjsTemplateId", "template_xxxxxxx"], ["Public Key", "emailjsPublicKey", "xxxxxxxxxxxxxxxxx"]].map(([label, key, ph]) => (
                            <div key={key} style={{ marginBottom: 14 }}>
                              <label style={{ display: "block", fontSize: 11, color: "#60a5fa", fontWeight: 700, marginBottom: 6, textTransform: "uppercase", letterSpacing: ".8px" }}><Key size={11} style={{ display: "inline", marginRight: 4 }} />{label}</label>
                              <input placeholder={ph} value={editSettings[key]} onChange={e => setEditSettings({ ...editSettings, [key]: e.target.value })} style={{ ...inp, border: "1px solid rgba(59,130,246,.25)" }} />
                            </div>
                          ))}
                        </div>
                        <div style={{ background: "rgba(34,197,94,.04)", border: "1px solid rgba(34,197,94,.15)", borderRadius: 14, padding: 20, display: "flex", alignItems: "flex-start", gap: 12 }}>
                          <CheckCircle size={18} color={dbReady ? "#22c55e" : "#475569"} strokeWidth={1.5} style={{ flexShrink: 0, marginTop: 2 }} />
                          <div>
                            <p style={{ color: "#22c55e", fontSize: 13, fontWeight: 600, marginBottom: 4 }}>Supabase Durumu</p>
                            <p style={{ color: "#334155", fontSize: 12, lineHeight: 1.65, marginBottom: 10 }}>
                              {dbReady ? "Veritabanı bağlantısı başarılı." : "Yerel mod aktif. SUPABASE_URL ve SUPABASE_ANON_KEY değerlerini girin."}
                            </p>
                            <details style={{ cursor: "pointer" }}>
                              <summary style={{ color: "#22c55e", fontSize: 11, fontWeight: 700, textTransform: "uppercase", letterSpacing: ".5px" }}>SQL Şeması</summary>
                              <pre style={{ marginTop: 10, background: "rgba(0,0,0,.4)", borderRadius: 8, padding: "12px 14px", fontSize: 11, color: "#94a3b8", overflowX: "auto", lineHeight: 1.7, whiteSpace: "pre-wrap" }}>{`CREATE TABLE IF NOT EXISTS decha_content (
  id           integer PRIMARY KEY DEFAULT 1,
  hero         jsonb   NOT NULL DEFAULT '{}',
  services     jsonb   NOT NULL DEFAULT '[]',
  testimonials jsonb   NOT NULL DEFAULT '[]',
  theme        jsonb   NOT NULL DEFAULT '{}',
  spacing      jsonb   NOT NULL DEFAULT '{}',
  "emailTemplates" jsonb NOT NULL DEFAULT '{}'
);
CREATE TABLE IF NOT EXISTS decha_settings (
  id                  integer PRIMARY KEY DEFAULT 1,
  "adminPass"         text,
  "emailjsServiceId"  text,
  "emailjsTemplateId" text,
  "emailjsPublicKey"  text
);
INSERT INTO decha_content  (id) VALUES (1) ON CONFLICT (id) DO NOTHING;
INSERT INTO decha_settings (id) VALUES (1) ON CONFLICT (id) DO NOTHING;`}</pre>
                            </details>
                          </div>
                        </div>
                      </div>
                    )}

                  </div>{/* /kaydırılabilir içerik */}
                </main>
              </div>
            )}
          </div>
        )}{/* /adminOpen */}

      </div>
    </>
  );
}
