import React, { useState, useEffect } from "react";
import {
  MapPin, Share2, Globe, ShoppingBag,
  Mail, Send, CheckCircle, Lock, Settings,
  ChevronRight, Zap, MessageSquare, Rocket,
  Save, X, Eye, EyeOff, Home, Star,
  Shield, Key, Bell, User, Trash2, Plus, Sparkles,
  Target, BarChart, Search, Code, Smartphone, Layout,
  Palette, ShoppingCart, MessageCircle, Megaphone,
  Layers, Cpu, Database, Cloud, MousePointer,
  Briefcase, Award, TrendingUp, Monitor, LogOut, PanelLeftClose,
  Image as ImageIcon, Paintbrush, MoveVertical
} from "lucide-react";

// Supabase Connection
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
    upsert: async (payload) => {
      try {
        const res = await fetch(`${SUPABASE_URL}/rest/v1/${table}`, {
          method: "POST",
          headers: {
            apikey: SUPABASE_ANON_KEY,
            Authorization: `Bearer ${SUPABASE_ANON_KEY}`,
            "Content-Type": "application/json",
            Prefer: "return=minimal,resolution=merge-duplicates",
          },
          body: JSON.stringify(payload),
        });

        if (!res.ok) {
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

// Security & Hash
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
    .slice(0, 5000);
};

const sha256 = async (str) => {
  const buf = await crypto.subtle.digest("SHA-256", new TextEncoder().encode(str));
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

// Rate Limiter
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

// Helper: Güvenli Renk Okuyucu
const getSafeColor = (val) => {
  if (!val || typeof val !== 'string') return "#ffffff";
  if (val.length === 7 && val.startsWith("#")) return val;
  if (val.length === 4 && val.startsWith("#")) return `#${val[1]}${val[1]}${val[2]}${val[2]}${val[3]}${val[3]}`;
  return "#ffffff"; // rgba veya hatalı kodlar için HTML color-picker çökmesini önler
};

// Initial Data Structures
const DEFAULT_PASS = "decha2024";

const initData = {
  hero: {
    h1: "Görünür Ol,",
    h2: "Büyü, Kazan.",
    sub: "Google, sosyal medya ve e-ticaret platformlarında işletmenizi bir üst seviyeye taşıyoruz.",
  },
  services: [
    { id: 1, iconKey: "MapPin", tag: "SEO & Yerel Arama", title: "Google İşletme Kurulumu", desc: "SEO uyumlu Google İşletme profili ile müşterileriniz sizi anında bulsun." },
    { id: 2, iconKey: "Share2", tag: "İçerik & Büyüme", title: "Sosyal Medya Yönetimi", desc: "Instagram, TikTok ve Facebook'ta özgün içerik ve büyüme stratejileri." },
    { id: 3, iconKey: "Globe", tag: "Tasarım & Geliştirme", title: "Web Site Kurulumu", desc: "Hızlı, mobil uyumlu ve dönüşüm odaklı web siteleri." },
    { id: 4, iconKey: "ShoppingBag", tag: "E-Ticaret", title: "Platform Mağaza Kurulumu", desc: "Trendyol, Yemeksepeti ve Getir'de profesyonel mağaza kurulumu." },
  ],
  testimonials: [
    { id: 1, name: "Ahmet Yılmaz", role: "Restoran Sahibi", initials: "AY", text: "Decha ile Yemeksepeti mağazamı kurdum. 3 ayda siparişlerim 4 katına çıktı!" },
  ],
  theme: {
    primary: "#a855f7",
    primaryHover: "#9333ea",
    secondary: "#c084fc",
    background: "#07070f",
    cardBg: "rgba(255,255,255,0.025)",
    textMain: "#f8fafc",
    textMuted: "#475569",
    border: "rgba(168,85,247,0.1)",
  },
  spacing: {
    heroPadding: "100px",
    sectionPadding: "110px",
    cardRadius: "20px",
  },
  emailTemplates: {
    subject: "Yeni İletişim Formu: {{name}}",
    body: "Ad: {{name}}\nE-posta: {{email}}\nMesaj: {{message}}",
  },
  workingHours: {
    days: ["Pazartesi", "Salı", "Çarşamba", "Perşembe", "Cuma"],
    startTime: "09:00",
    endTime: "18:00",
  },
  meetingTexts: {
    modalTitle: "Toplantı Planla",
    modalSubtitle: "Ücretsiz 30 dakikalık strateji görüşmesi",
    locationLabel: "Toplantı Nerede Gerçekleşsin?",
    successTitle: "Randevunuz Alındı!",
    successBody: "Ekibimiz en kısa sürede sizinle iletişime geçecek ve randevunuzu onaylayacak.",
    submitButton: "Randevu Oluştur",
  },
  navbar: {
    logoText: "DECHA",
    navLinks: ["Hizmetler", "Referanslar", "İletişim"],
    ctaButton: "Toplantı Planla",
  },
  contact: {
    badge: "İletişim",
    title: "Haydi Başlayalım",
    subtitle: "Projenizi anlatın, size özel bir büyüme planı hazırlayalım.",
    namePlaceholder: "Adınız Soyadınız",
    emailPlaceholder: "E-posta Adresiniz",
    msgPlaceholder: "Projenizi anlatın...",
    sendButton: "Mesaj Gönder",
    successTitle: "Mesajınız İletildi!",
    successBody: "En kısa sürede sizinle iletişime geçeceğiz.",
  },
  footer: {
    description: "Dijital büyümenin her adımında yanınızdayız. SEO'dan e-ticarete, sosyal medyadan web geliştirmeye.",
    phone: "+90 (532) 123 45 67",
    email: "info@decha.digital",
    address: "Levent, İstanbul\nTürkiye 34330",
    servicesTitle: "Hizmetler",
    serviceLinks: ["Google İşletme Yönetimi","Sosyal Medya Yönetimi","Web Site Tasarımı","SEO & İçerik Pazarlama","Google & Meta Reklamları","E-Ticaret Danışmanlığı","Amazon FBA & E-İhracat","Influencer Pazarlaması"],
    partnersTitle: "İş Ortakları",
    partnerLinks: ["Google Partner","Meta Business Partner","Trendyol Çözüm Ortağı","Yemeksepeti Onaylı Ajans","Hepsiburada Partner","Amazon Seller Central","Hubspot Partner","Semrush Agency"],
    socialTitle: "Bizi Takip Edin",
    newsletterTitle: "BÜLTEN",
    newsletterSubtitle: "İpuçları ve güncellemeler için abone ol",
    copyrightText: "© {year} Decha Digital Agency. Tüm hakları saklıdır.",
    legalLinks: ["Gizlilik Politikası", "Kullanım Şartları", "Çerez Politikası"],
    statusText: "Tüm sistemler çalışıyor",
  },
};

const initSettings = {
  adminPass: DEFAULT_PASS,
  emailjsServiceId: "",
  emailjsTemplateId: "",
  emailjsPublicKey: "",
};

// Icons Map
const ICON_MAP = {
  MapPin, Share2, Globe, ShoppingBag, Zap, Rocket, Target, BarChart, Search, Code,
  Smartphone, Layout, Palette, Shield, ShoppingCart, MessageCircle, Mail, Megaphone,
  Layers, Cpu, Database, Cloud, MousePointer, Briefcase, Award, TrendingUp, Monitor, Settings,
};

const ICON_OPTIONS = Object.keys(ICON_MAP).map(key => ({ value: key, label: `${key}` }));

// Core Components
const Logo = ({ size = "md", theme }) => {
  const sizes = { sm: { fontSize: 18, letterSpacing: "-1.5px" }, md: { fontSize: 26, letterSpacing: "-2px" }, lg: { fontSize: 34, letterSpacing: "-3px" } };
  const { fontSize, letterSpacing } = sizes[size] || sizes.md;
  return (
    <span style={{
      fontFamily: "Syne, sans-serif", fontWeight: 900, fontSize, letterSpacing,
      background: `linear-gradient(135deg, ${theme.secondary} 0%, ${theme.primary} 45%, ${theme.primaryHover} 100%)`,
      backgroundSize: "200% auto", WebkitBackgroundClip: "text", WebkitTextFillColor: "transparent", backgroundClip: "text",
      animation: "shimmer 4s linear infinite", display: "inline-block", userSelect: "none",
      filter: `drop-shadow(0 0 18px ${theme.primary}55)`,
    }}>
      DECHA
    </span>
  );
};

const ServiceIcon = ({ iconKey, size = 36, theme }) => {
  const Comp = ICON_MAP[iconKey] || Globe;
  return (
    <div style={{
      width: 64, height: 64, borderRadius: 18, background: `${theme.primary}15`, border: `1px solid ${theme.primary}30`,
      display: "flex", alignItems: "center", justifyContent: "center", marginBottom: 22,
    }}>
      <Comp size={size} color={theme.primary} strokeWidth={1.4} />
    </div>
  );
};

// Main App Component
export default function App() {
  const [data, setData] = useState(initData);
  const [settings, setSettings] = useState(initSettings);
  const [adminOpen, setAdminOpen] = useState(false);
  const [authed, setAuthed] = useState(false);
  const [pw, setPw] = useState("");
  const [pwErr, setPwErr] = useState(false);
  const [showPw, setShowPw] = useState(false);
  const [editData, setEditData] = useState(null);
  const [editSettings, setEditSettings] = useState(null);
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
  const [sidebarOpen, setSidebarOpen] = useState(true);
  const [sliderIndex, setSliderIndex] = useState(0);

  // Meeting modal state
  const [meetingOpen, setMeetingOpen] = useState(false);
  const [meetingForm, setMeetingForm] = useState({
    name: "", phone: "", email: "",
    date: "", time: "",
    location: "online", address: "",
  });
  const [meetingSending, setMeetingSending] = useState(false);
  const [meetingSent, setMeetingSent] = useState(false);
  const [meetingErr, setMeetingErr] = useState("");

  // Scroll listener
  useEffect(() => {
    const onScroll = () => setScrolled(window.scrollY > 50);
    window.addEventListener("scroll", onScroll);
    return () => window.removeEventListener("scroll", onScroll);
  }, []);

  // Fetch from Supabase
  useEffect(() => {
    (async () => {
      const { data: rows } = await supabase.from("decha_content").select();
      if (rows && rows.length > 0) {
        const row = rows[0];

        // KRİTİK DÜZELTME: Veritabanındaki boş nesneleri varsayılan verilerle güvenle birleştirir
        setData({
          hero: { ...initData.hero, ...(row.hero || {}) },
          services: Array.isArray(row.services) ? row.services : initData.services,
          testimonials: Array.isArray(row.testimonials) ? row.testimonials : initData.testimonials,
          theme: { ...initData.theme, ...(row.theme || {}) },
          spacing: { ...initData.spacing, ...(row.spacing || {}) },
          emailTemplates: { ...initData.emailTemplates, ...(row.emailTemplates || {}) },
          workingHours: { ...initData.workingHours, ...(row.workingHours || {}) },
          meetingTexts: { ...initData.meetingTexts, ...(row.meetingTexts || {}) },
          navbar: { ...initData.navbar, ...(row.navbar || {}), navLinks: Array.isArray(row.navbar?.navLinks) ? row.navbar.navLinks : initData.navbar.navLinks },
          contact: { ...initData.contact, ...(row.contact || {}) },
          footer: { ...initData.footer, ...(row.footer || {}), serviceLinks: Array.isArray(row.footer?.serviceLinks) ? row.footer.serviceLinks : initData.footer.serviceLinks, partnerLinks: Array.isArray(row.footer?.partnerLinks) ? row.footer.partnerLinks : initData.footer.partnerLinks, legalLinks: Array.isArray(row.footer?.legalLinks) ? row.footer.legalLinks : initData.footer.legalLinks },
        });
        setDbReady(true);
      }
      const { data: sRows } = await supabase.from("decha_settings").select();
      if (sRows && sRows.length > 0) {
        setSettings({ ...initSettings, ...sRows[0] });
      }
    })();
  }, []);

  const scrollTo = (id) => document.getElementById(id)?.scrollIntoView({ behavior: "smooth" });

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
      // Create deep copies for editing
      setEditData(JSON.parse(JSON.stringify(data)));
      setEditSettings(JSON.parse(JSON.stringify(settings)));
      setPwErr(false);
      setLockTimer(0);
    } else {
      rateLimiter.fail();
      setPwErr(true);
      const { wait: w } = rateLimiter.check();
      if (w > 0) setLockTimer(w);
    }
  };

  const logout = () => {
    setAuthed(false);
    setPw("");
  };

  const closeAdmin = () => {
    setAdminOpen(false);
  };

  const save = async () => {
    const cleanData = {
      hero: { h1: sanitize(editData.hero.h1), h2: sanitize(editData.hero.h2), sub: sanitize(editData.hero.sub) },
      services: editData.services.map(s => ({ ...s, tag: sanitize(s.tag), title: sanitize(s.title), desc: sanitize(s.desc) })),
      testimonials: editData.testimonials.map(t => ({ ...t, name: sanitize(t.name), role: sanitize(t.role), initials: sanitize(t.initials).slice(0, 2), text: sanitize(t.text) })),
      theme: editData.theme,
      spacing: editData.spacing,
      emailTemplates: { subject: sanitize(editData.emailTemplates.subject), body: sanitize(editData.emailTemplates.body) },
      workingHours: {
        days: (editData.workingHours.days || []).map(d => sanitize(d)),
        startTime: sanitize(editData.workingHours.startTime),
        endTime: sanitize(editData.workingHours.endTime),
      },
      meetingTexts: {
        modalTitle: sanitize(editData.meetingTexts.modalTitle),
        modalSubtitle: sanitize(editData.meetingTexts.modalSubtitle),
        locationLabel: sanitize(editData.meetingTexts.locationLabel),
        successTitle: sanitize(editData.meetingTexts.successTitle),
        successBody: sanitize(editData.meetingTexts.successBody),
        submitButton: sanitize(editData.meetingTexts.submitButton),
      },
      navbar: {
        logoText: sanitize(editData.navbar.logoText),
        navLinks: (editData.navbar.navLinks || []).map(l => sanitize(l)),
        ctaButton: sanitize(editData.navbar.ctaButton),
      },
      contact: {
        badge: sanitize(editData.contact.badge),
        title: sanitize(editData.contact.title),
        subtitle: sanitize(editData.contact.subtitle),
        namePlaceholder: sanitize(editData.contact.namePlaceholder),
        emailPlaceholder: sanitize(editData.contact.emailPlaceholder),
        msgPlaceholder: sanitize(editData.contact.msgPlaceholder),
        sendButton: sanitize(editData.contact.sendButton),
        successTitle: sanitize(editData.contact.successTitle),
        successBody: sanitize(editData.contact.successBody),
      },
      footer: {
        description: sanitize(editData.footer.description),
        phone: sanitize(editData.footer.phone),
        email: sanitize(editData.footer.email),
        address: sanitize(editData.footer.address),
        servicesTitle: sanitize(editData.footer.servicesTitle),
        serviceLinks: (editData.footer.serviceLinks || []).map(l => sanitize(l)),
        partnersTitle: sanitize(editData.footer.partnersTitle),
        partnerLinks: (editData.footer.partnerLinks || []).map(l => sanitize(l)),
        socialTitle: sanitize(editData.footer.socialTitle),
        newsletterTitle: sanitize(editData.footer.newsletterTitle),
        newsletterSubtitle: sanitize(editData.footer.newsletterSubtitle),
        copyrightText: sanitize(editData.footer.copyrightText),
        legalLinks: (editData.footer.legalLinks || []).map(l => sanitize(l)),
        statusText: sanitize(editData.footer.statusText),
      },
    };

    let cleanSettings = { ...editSettings };
    if (editSettings.adminPass && !/^[a-f0-9]{64}$/.test(editSettings.adminPass)) {
      cleanSettings = { ...cleanSettings, adminPass: await sha256(editSettings.adminPass) };
    }

    setData(cleanData);
    setSettings(cleanSettings);

    const { error: e1 } = await supabase.from("decha_content").upsert({ id: 1, ...cleanData });
    const { error: e2 } = await supabase.from("decha_settings").upsert({ id: 1, ...cleanSettings });

    if (e1 || e2) {
      const msg = (e1 || e2).message || "Kayıt hatası!";
      setSaveErrMsg(msg);
      setSaveErr(true);
      setTimeout(() => { setSaveErr(false); setSaveErrMsg(""); }, 5000);
    } else {
      setSaved(true);
      setTimeout(() => setSaved(false), 3000);
    }
  };

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
        throw new Error("EmailJS bilgileri yapılandırılmamış.");
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

      // KRİTİK DÜZELTME: E-posta değişkenlerini form verileriyle değiştiriyoruz
      const templateBody = data.emailTemplates?.body || initData.emailTemplates.body;
      const templateSubject = data.emailTemplates?.subject || initData.emailTemplates.subject;

      const finalBody = templateBody
        .replace(/\{\{name\}\}/g, safeName)
        .replace(/\{\{email\}\}/g, safeEmail)
        .replace(/\{\{message\}\}/g, safeMsg);

      const finalSubject = templateSubject
        .replace(/\{\{name\}\}/g, safeName)
        .replace(/\{\{email\}\}/g, safeEmail);

      await window.emailjs.send(emailjsServiceId, emailjsTemplateId, {
        from_name: safeName,
        from_email: safeEmail,
        message: finalBody,
        subject: finalSubject,
      });
      setSent(true);
    } catch (err) {
      setSendErr(err.message || "Gönderim hatası.");
    } finally {
      setSending(false);
    }
  };


  const sendMeeting = async () => {
    const { name, phone, email, date, time, location, address } = meetingForm;
    if (!name || !phone || !email || !date || !time) { setMeetingErr("Lütfen tüm zorunlu alanları doldurun."); return; }
    if (!/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(email)) { setMeetingErr("Geçerli bir e-posta adresi girin."); return; }
    if (location === "youroffice" && !address.trim()) { setMeetingErr("Lütfen adresinizi girin."); return; }
    setMeetingSending(true); setMeetingErr("");
    const locationLabels = { ouroffice: "Bizim Ofisimiz", youroffice: "Sizin Ofisiniz/İş Yeriniz", online: "Online (Zoom/Meet)" };
    const locationText = locationLabels[location] || location;
    const addressLine = location === "youroffice" ? "\nAdres: " + sanitize(address) : "";
    const msgBody = "RANDEVU TALEBİ\n\nAd Soyad: " + sanitize(name) + "\nTelefon: " + sanitize(phone) + "\nE-posta: " + sanitize(email) + "\nTarih: " + date + "\nSaat: " + time + "\nLokasyon: " + locationText + addressLine;
    try {
      const { emailjsServiceId, emailjsTemplateId, emailjsPublicKey } = settings;
      if (!emailjsServiceId || !emailjsTemplateId || !emailjsPublicKey) throw new Error("EmailJS bilgileri yapılandırılmamış.");
      if (!window.emailjs) { await new Promise((res, rej) => { const s = document.createElement("script"); s.src = "https://cdn.jsdelivr.net/npm/@emailjs/browser@4/dist/email.min.js"; s.onload = res; s.onerror = rej; document.head.appendChild(s); }); window.emailjs.init(emailjsPublicKey); }
      await window.emailjs.send(emailjsServiceId, emailjsTemplateId, { from_name: sanitize(name), from_email: sanitize(email), message: msgBody, subject: "Randevu Talebi: " + sanitize(name) + " – " + date + " " + time });
      setMeetingSent(true);
    } catch (err) { setMeetingErr(err.message || "Gönderim hatası."); } finally { setMeetingSending(false); }
  };

  const closeMeeting = () => { setMeetingOpen(false); setTimeout(() => { setMeetingSent(false); setMeetingErr(""); setMeetingForm({ name: "", phone: "", email: "", date: "", time: "", location: "online", address: "" }); }, 400); };

  // --- Dynamic Styles ---
  const theme = data.theme;
  const spacing = data.spacing;

  const inpStyles = {
    width: "100%", padding: "11px 14px", borderRadius: 8,
    background: "rgba(255,255,255,0.04)", border: `1px solid ${theme.border}`,
    color: theme.textMain, fontSize: 14, outline: "none", boxSizing: "border-box",
    fontFamily: "DM Sans, sans-serif", transition: "border-color 0.2s",
  };

  const cardStyle = (id) => ({
    background: theme.cardBg,
    border: `1px solid ${hovered === id ? theme.primary : theme.border}`,
    borderRadius: spacing.cardRadius, backdropFilter: "blur(16px)", padding: 32,
    transition: "all 0.4s cubic-bezier(0.34,1.3,0.64,1)",
    transform: hovered === id ? "translateY(-10px)" : "translateY(0)",
    boxShadow: hovered === id ? `0 32px 80px ${theme.primary}25` : "0 2px 24px rgba(0,0,0,0.4)",
  });

  const TABS = [
    { key: "hero", label: "Hero Alanı", Icon: Home },
    { key: "navbar", label: "Navbar", Icon: Layout },
    { key: "services", label: "Hizmetler", Icon: Zap },
    { key: "testimonials", label: "Referanslar", Icon: MessageSquare },
    { key: "contact", label: "İletişim Bölümü", Icon: Send },
    { key: "footer", label: "Footer", Icon: Layers },
    { key: "menuFooterSettings", label: "Menü & Footer Ayarları", Icon: Globe },
    { key: "contactFormSettings", label: "İletişim Formu Ayarları", Icon: Mail },
    { key: "theme", label: "Renk & Tema", Icon: Paintbrush },
    { key: "spacing", label: "Boşluk & Düzen", Icon: MoveVertical },
    { key: "email", label: "E-posta Şablonları", Icon: Mail },
    { key: "meeting", label: "Toplantı Ayarları", Icon: Rocket },
    { key: "settings", label: "Genel Ayarlar", Icon: Settings },
  ];

  // ==========================================
  // VIEW: ADMIN PANEL (CMS)
  // ==========================================
  if (adminOpen && authed && editData && editSettings) {
    return (
      <div style={{ display: "flex", height: "100vh", width: "100vw", background: "#0c0c1c", color: "#e2e8f0", fontFamily: "DM Sans, sans-serif", overflow: "hidden" }}>

        {/* Sidebar */}
        <div style={{ width: sidebarOpen ? 280 : 80, background: "#07070f", borderRight: "1px solid rgba(168,85,247,0.15)", display: "flex", flexDirection: "column", transition: "width 0.3s", flexShrink: 0 }}>

          <div style={{ padding: "24px 20px", display: "flex", alignItems: "center", justifyContent: sidebarOpen ? "space-between" : "center", borderBottom: "1px solid rgba(255,255,255,0.05)" }}>
            {sidebarOpen && <div style={{ display: "flex", alignItems: "center", gap: 10 }}><Logo size="sm" theme={editData.theme} /></div>}
            <button onClick={() => setSidebarOpen(!sidebarOpen)} style={{ background: "none", border: "none", color: "#64748b", cursor: "pointer" }}>
              <PanelLeftClose size={20} style={{ transform: sidebarOpen ? "none" : "rotate(180deg)", transition: "transform 0.3s" }} />
            </button>
          </div>

          <div style={{ flex: 1, padding: "20px 12px", overflowY: "auto", display: "flex", flexDirection: "column", gap: 8 }}>
            {sidebarOpen && <div style={{ fontSize: 11, color: "#475569", fontWeight: 700, textTransform: "uppercase", letterSpacing: 1, padding: "0 8px", marginBottom: 8 }}>İçerik Yönetimi</div>}
            {TABS.map(({ key, label, Icon }) => (
              <button key={key} onClick={() => setTab(key)} style={{
                display: "flex", alignItems: "center", gap: 12, padding: "12px 14px", borderRadius: 10, border: "none",
                background: tab === key ? "rgba(168,85,247,0.15)" : "transparent",
                color: tab === key ? "#c084fc" : "#94a3b8", cursor: "pointer", fontSize: 14, fontWeight: 600,
                justifyContent: sidebarOpen ? "flex-start" : "center", transition: "all 0.2s"
              }}>
                <Icon size={18} strokeWidth={tab === key ? 2.5 : 1.5} />
                {sidebarOpen && <span>{label}</span>}
              </button>
            ))}
          </div>

          <div style={{ padding: "20px 12px", borderTop: "1px solid rgba(255,255,255,0.05)", display: "flex", flexDirection: "column", gap: 8 }}>
            <button onClick={closeAdmin} style={{
              display: "flex", alignItems: "center", gap: 12, padding: "12px 14px", borderRadius: 10, border: "1px solid rgba(255,255,255,0.1)",
              background: "rgba(255,255,255,0.02)", color: "#e2e8f0", cursor: "pointer", fontSize: 14, fontWeight: 600,
              justifyContent: sidebarOpen ? "flex-start" : "center", transition: "all 0.2s"
            }}>
              <Globe size={18} />
              {sidebarOpen && <span>Siteye Dön</span>}
            </button>
            <button onClick={logout} style={{
              display: "flex", alignItems: "center", gap: 12, padding: "12px 14px", borderRadius: 10, border: "none",
              background: "rgba(239,68,68,0.1)", color: "#f87171", cursor: "pointer", fontSize: 14, fontWeight: 600,
              justifyContent: sidebarOpen ? "flex-start" : "center", transition: "all 0.2s"
            }}>
              <LogOut size={18} />
              {sidebarOpen && <span>Çıkış Yap</span>}
            </button>
          </div>
        </div>

        {/* Main Content Area */}
        <div style={{ flex: 1, display: "flex", flexDirection: "column", overflow: "hidden" }}>

          {/* Topbar (Sticky) */}
          <div style={{ height: 70, borderBottom: "1px solid rgba(168,85,247,0.15)", background: "rgba(12,12,28,0.8)", backdropFilter: "blur(12px)", display: "flex", alignItems: "center", justifyContent: "space-between", padding: "0 32px", zIndex: 10 }}>
            <div>
              <h2 style={{ fontFamily: "Syne, sans-serif", fontSize: 20, margin: 0, color: "#f8fafc" }}>
                {TABS.find(t => t.key === tab)?.label}
              </h2>
            </div>
            <div style={{ display: "flex", alignItems: "center", gap: 16 }}>
              {saved && <span style={{ color: "#22c55e", fontSize: 13, fontWeight: 600, display: "flex", alignItems: "center", gap: 6 }}><CheckCircle size={16} /> Değişiklikler Kaydedildi</span>}
              {saveErr && <span style={{ color: "#f87171", fontSize: 13, fontWeight: 600 }}>⚠️ {saveErrMsg}</span>}
              <button onClick={save} style={{ background: "linear-gradient(135deg,#6d28d9,#a855f7)", border: "none", color: "#fff", padding: "10px 24px", borderRadius: 8, fontWeight: 700, cursor: "pointer", fontSize: 14, display: "flex", alignItems: "center", gap: 8, boxShadow: "0 4px 14px rgba(168,85,247,0.3)" }}>
                <Save size={16} /> Tümünü Kaydet
              </button>
            </div>
          </div>

          {/* Scrollable Content */}
          <div style={{ flex: 1, overflowY: "auto", padding: "40px 32px" }}>
            <div style={{ maxWidth: 800, margin: "0 auto" }}>

              {/* NAVBAR TAB */}
              {tab === "navbar" && (
                <div style={{ display: "flex", flexDirection: "column", gap: 24 }}>
                  <div style={{ background: "rgba(255,255,255,0.02)", padding: 24, borderRadius: 16, border: "1px solid rgba(168,85,247,0.15)" }}>
                    <h4 style={{ margin: "0 0 20px 0", color: "#f8fafc", display: "flex", alignItems: "center", gap: 8 }}><Layout size={18} color={editData.theme.primary} /> Navbar Metinleri</h4>
                    <div style={{ marginBottom: 16 }}>
                      <label style={{ display: "block", fontSize: 11, color: "#94a3b8", fontWeight: 700, marginBottom: 8, textTransform: "uppercase" }}>Logo Metni</label>
                      <input value={editData.navbar.logoText} onChange={e => setEditData({ ...editData, navbar: { ...editData.navbar, logoText: e.target.value } })} style={inpStyles} />
                    </div>
                    <div style={{ marginBottom: 16 }}>
                      <label style={{ display: "block", fontSize: 11, color: "#94a3b8", fontWeight: 700, marginBottom: 8, textTransform: "uppercase" }}>CTA Butonu</label>
                      <input value={editData.navbar.ctaButton} onChange={e => setEditData({ ...editData, navbar: { ...editData.navbar, ctaButton: e.target.value } })} style={inpStyles} />
                    </div>
                    <div>
                      <label style={{ display: "block", fontSize: 11, color: "#94a3b8", fontWeight: 700, marginBottom: 12, textTransform: "uppercase" }}>Navigasyon Linkleri</label>
                      {(editData.navbar.navLinks || []).map((link, i) => (
                        <div key={i} style={{ display: "flex", gap: 10, marginBottom: 10 }}>
                          <input value={link} onChange={e => { const n = [...editData.navbar.navLinks]; n[i] = e.target.value; setEditData({ ...editData, navbar: { ...editData.navbar, navLinks: n } }); }} style={{ ...inpStyles, flex: 1 }} />
                          <button onClick={() => { const n = editData.navbar.navLinks.filter((_, idx) => idx !== i); setEditData({ ...editData, navbar: { ...editData.navbar, navLinks: n } }); }} style={{ background: "rgba(239,68,68,0.1)", border: "none", color: "#f87171", width: 40, borderRadius: 8, cursor: "pointer", flexShrink: 0 }}><X size={14} /></button>
                        </div>
                      ))}
                      <button onClick={() => setEditData({ ...editData, navbar: { ...editData.navbar, navLinks: [...(editData.navbar.navLinks || []), "Yeni Link"] } })} style={{ padding: "10px 16px", border: "1px dashed rgba(168,85,247,0.4)", background: "rgba(168,85,247,0.05)", color: "#c084fc", borderRadius: 8, cursor: "pointer", fontWeight: 600, display: "flex", alignItems: "center", gap: 8, fontSize: 13, marginTop: 4 }}>
                        <Plus size={14} /> Link Ekle
                      </button>
                    </div>
                  </div>
                </div>
              )}

              {/* HERO TAB */}
              {tab === "hero" && (
                <div style={{ display: "flex", flexDirection: "column", gap: 24 }}>
                  {[["Ana Başlık 1", "h1"], ["Ana Başlık 2 (Renkli)", "h2"], ["Alt Açıklama", "sub"]].map(([label, k]) => (
                    <div key={k} style={{ background: "rgba(255,255,255,0.02)", padding: 20, borderRadius: 12, border: "1px solid rgba(255,255,255,0.05)" }}>
                      <label style={{ display: "block", fontSize: 12, color: "#a855f7", fontWeight: 700, marginBottom: 8, textTransform: "uppercase", letterSpacing: 1 }}>{label}</label>
                      {k === "sub" ? (
                        <textarea value={editData.hero[k]} onChange={e => setEditData({ ...editData, hero: { ...editData.hero, [k]: e.target.value } })} style={{ ...inpStyles, resize: "vertical", minHeight: 100 }} />
                      ) : (
                        <input value={editData.hero[k]} onChange={e => setEditData({ ...editData, hero: { ...editData.hero, [k]: e.target.value } })} style={inpStyles} />
                      )}
                    </div>
                  ))}
                </div>
              )}

              {/* SERVICES TAB */}
              {tab === "services" && (
                <div style={{ display: "flex", flexDirection: "column", gap: 24 }}>
                  {editData.services.map((svc, i) => (
                    <div key={svc.id} style={{ background: "rgba(255,255,255,0.02)", border: "1px solid rgba(168,85,247,0.15)", borderRadius: 16, padding: 24 }}>
                      <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center", marginBottom: 20 }}>
                        <h4 style={{ margin: 0, color: "#c084fc", fontFamily: "Syne, sans-serif" }}>Hizmet Kutu #{i + 1}</h4>
                        <button onClick={() => setEditData({ ...editData, services: editData.services.filter((_, idx) => idx !== i) })} style={{ background: "rgba(239,68,68,0.1)", border: "none", color: "#f87171", padding: "6px 12px", borderRadius: 6, cursor: "pointer", display: "flex", alignItems: "center", gap: 6, fontSize: 12, fontWeight: 600 }}>
                          <Trash2 size={14} /> Sil
                        </button>
                      </div>

                      <div style={{ display: "flex", gap: 20, marginBottom: 16 }}>
                        <div style={{ flex: 1 }}>
                          <label style={{ display: "block", fontSize: 11, color: "#94a3b8", marginBottom: 6, textTransform: "uppercase" }}>İkon Seçimi</label>
                          <select value={svc.iconKey} onChange={e => { const newSvc = [...editData.services]; newSvc[i].iconKey = e.target.value; setEditData({ ...editData, services: newSvc }); }} style={inpStyles}>
                            {ICON_OPTIONS.map(opt => <option key={opt.value} value={opt.value}>{opt.label}</option>)}
                          </select>
                        </div>
                        <div style={{ flex: 2 }}>
                          <label style={{ display: "block", fontSize: 11, color: "#94a3b8", marginBottom: 6, textTransform: "uppercase" }}>Kısa Etiket (Tag)</label>
                          <input value={svc.tag} onChange={e => { const newSvc = [...editData.services]; newSvc[i].tag = e.target.value; setEditData({ ...editData, services: newSvc }); }} style={inpStyles} />
                        </div>
                      </div>

                      <div style={{ marginBottom: 16 }}>
                        <label style={{ display: "block", fontSize: 11, color: "#94a3b8", marginBottom: 6, textTransform: "uppercase" }}>Hizmet Başlığı</label>
                        <input value={svc.title} onChange={e => { const newSvc = [...editData.services]; newSvc[i].title = e.target.value; setEditData({ ...editData, services: newSvc }); }} style={inpStyles} />
                      </div>
                      <div>
                        <label style={{ display: "block", fontSize: 11, color: "#94a3b8", marginBottom: 6, textTransform: "uppercase" }}>Açıklama</label>
                        <textarea value={svc.desc} onChange={e => { const newSvc = [...editData.services]; newSvc[i].desc = e.target.value; setEditData({ ...editData, services: newSvc }); }} style={{ ...inpStyles, minHeight: 80, resize: "vertical" }} />
                      </div>
                    </div>
                  ))}
                  <button onClick={() => setEditData({ ...editData, services: [...editData.services, { id: Date.now(), iconKey: "Zap", tag: "YENİ", title: "Yeni Hizmet", desc: "Açıklama giriniz..." }] })} style={{ padding: 16, border: "1px dashed rgba(168,85,247,0.4)", background: "rgba(168,85,247,0.05)", color: "#c084fc", borderRadius: 12, cursor: "pointer", fontWeight: 600, display: "flex", alignItems: "center", justifyContent: "center", gap: 8 }}>
                    <Plus size={18} /> Yeni Hizmet Ekle
                  </button>
                </div>
              )}

              {/* TESTIMONIALS TAB */}
              {tab === "testimonials" && (
                <div style={{ display: "flex", flexDirection: "column", gap: 24 }}>
                  {editData.testimonials.map((t, i) => (
                    <div key={t.id || i} style={{ background: "rgba(255,255,255,0.02)", border: "1px solid rgba(168,85,247,0.15)", borderRadius: 16, padding: 24 }}>
                      <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center", marginBottom: 20 }}>
                        <h4 style={{ margin: 0, color: "#c084fc", fontFamily: "Syne, sans-serif" }}>Yorum #{i + 1}</h4>
                        <button onClick={() => setEditData({ ...editData, testimonials: editData.testimonials.filter((_, idx) => idx !== i) })} style={{ background: "rgba(239,68,68,0.1)", border: "none", color: "#f87171", padding: "6px 12px", borderRadius: 6, cursor: "pointer", display: "flex", alignItems: "center", gap: 6, fontSize: 12, fontWeight: 600 }}>
                          <Trash2 size={14} /> Sil
                        </button>
                      </div>
                      <div style={{ display: "flex", gap: 16, marginBottom: 16 }}>
                        <div style={{ flex: 2 }}>
                          <label style={{ display: "block", fontSize: 11, color: "#94a3b8", marginBottom: 6, textTransform: "uppercase" }}>Müşteri Adı</label>
                          <input value={t.name} onChange={e => { const newT = [...editData.testimonials]; newT[i].name = e.target.value; setEditData({ ...editData, testimonials: newT }); }} style={inpStyles} />
                        </div>
                        <div style={{ flex: 2 }}>
                          <label style={{ display: "block", fontSize: 11, color: "#94a3b8", marginBottom: 6, textTransform: "uppercase" }}>Ünvan / Şirket</label>
                          <input value={t.role} onChange={e => { const newT = [...editData.testimonials]; newT[i].role = e.target.value; setEditData({ ...editData, testimonials: newT }); }} style={inpStyles} />
                        </div>
                        <div style={{ flex: 1 }}>
                          <label style={{ display: "block", fontSize: 11, color: "#94a3b8", marginBottom: 6, textTransform: "uppercase" }}>Kısaltma (2 Harf)</label>
                          <input value={t.initials} maxLength={2} onChange={e => { const newT = [...editData.testimonials]; newT[i].initials = e.target.value; setEditData({ ...editData, testimonials: newT }); }} style={inpStyles} />
                        </div>
                      </div>
                      <div>
                        <label style={{ display: "block", fontSize: 11, color: "#94a3b8", marginBottom: 6, textTransform: "uppercase" }}>Yorum Metni</label>
                        <textarea value={t.text} onChange={e => { const newT = [...editData.testimonials]; newT[i].text = e.target.value; setEditData({ ...editData, testimonials: newT }); }} style={{ ...inpStyles, minHeight: 80, resize: "vertical" }} />
                      </div>
                    </div>
                  ))}
                  <button onClick={() => setEditData({ ...editData, testimonials: [...editData.testimonials, { id: Date.now(), name: "Yeni Müşteri", role: "Müşteri", initials: "YM", text: "Harika bir hizmet aldık!" }] })} style={{ padding: 16, border: "1px dashed rgba(168,85,247,0.4)", background: "rgba(168,85,247,0.05)", color: "#c084fc", borderRadius: 12, cursor: "pointer", fontWeight: 600, display: "flex", alignItems: "center", justifyContent: "center", gap: 8 }}>
                    <Plus size={18} /> Yeni Yorum Ekle
                  </button>
                </div>
              )}

              {/* CONTACT TAB */}
              {tab === "contact" && (
                <div style={{ display: "flex", flexDirection: "column", gap: 24 }}>
                  <div style={{ background: "rgba(255,255,255,0.02)", padding: 24, borderRadius: 16, border: "1px solid rgba(168,85,247,0.15)" }}>
                    <h4 style={{ margin: "0 0 20px 0", color: "#f8fafc", display: "flex", alignItems: "center", gap: 8 }}><Send size={18} color={editData.theme.primary} /> İletişim Bölümü Metinleri</h4>
                    {[
                      ["badge", "Bölüm Etiketi (Badge)"],
                      ["title", "Başlık"],
                      ["subtitle", "Alt Başlık"],
                      ["namePlaceholder", "Ad Soyad Placeholder"],
                      ["emailPlaceholder", "E-posta Placeholder"],
                      ["msgPlaceholder", "Mesaj Placeholder"],
                      ["sendButton", "Gönder Butonu"],
                      ["successTitle", "Başarı Mesajı Başlığı"],
                      ["successBody", "Başarı Mesajı Açıklaması"],
                    ].map(([key, label]) => (
                      <div key={key} style={{ marginBottom: 16 }}>
                        <label style={{ display: "block", fontSize: 11, color: "#94a3b8", fontWeight: 700, marginBottom: 8, textTransform: "uppercase" }}>{label}</label>
                        <input value={editData.contact[key] || ""} onChange={e => setEditData({ ...editData, contact: { ...editData.contact, [key]: e.target.value } })} style={inpStyles} />
                      </div>
                    ))}
                  </div>
                </div>
              )}

              {/* FOOTER TAB */}
              {tab === "footer" && (
                <div style={{ display: "flex", flexDirection: "column", gap: 24 }}>

                  {/* Temel Bilgiler */}
                  <div style={{ background: "rgba(255,255,255,0.02)", padding: 24, borderRadius: 16, border: "1px solid rgba(168,85,247,0.15)" }}>
                    <h4 style={{ margin: "0 0 20px 0", color: "#f8fafc", display: "flex", alignItems: "center", gap: 8 }}><Layers size={18} color={editData.theme.primary} /> Temel Bilgiler</h4>
                    {[
                      ["description", "Kısa Açıklama"],
                      ["phone", "Telefon"],
                      ["email", "E-posta"],
                      ["address", "Adres"],
                      ["copyrightText", "Telif Hakkı Metni ({year} yıl için yer tutucu)"],
                      ["statusText", "Durum Metni"],
                    ].map(([key, label]) => (
                      <div key={key} style={{ marginBottom: 16 }}>
                        <label style={{ display: "block", fontSize: 11, color: "#94a3b8", fontWeight: 700, marginBottom: 8, textTransform: "uppercase" }}>{label}</label>
                        <input value={editData.footer[key] || ""} onChange={e => setEditData({ ...editData, footer: { ...editData.footer, [key]: e.target.value } })} style={inpStyles} />
                      </div>
                    ))}
                  </div>

                  {/* Sütun Başlıkları */}
                  <div style={{ background: "rgba(255,255,255,0.02)", padding: 24, borderRadius: 16, border: "1px solid rgba(168,85,247,0.15)" }}>
                    <h4 style={{ margin: "0 0 20px 0", color: "#f8fafc" }}>Sütun Başlıkları</h4>
                    {[["servicesTitle","Hizmetler Sütunu Başlığı"],["partnersTitle","İş Ortakları Sütunu Başlığı"],["socialTitle","Sosyal Medya Sütunu Başlığı"],["newsletterTitle","Bülten Başlığı"],["newsletterSubtitle","Bülten Alt Yazısı"]].map(([key, label]) => (
                      <div key={key} style={{ marginBottom: 16 }}>
                        <label style={{ display: "block", fontSize: 11, color: "#94a3b8", fontWeight: 700, marginBottom: 8, textTransform: "uppercase" }}>{label}</label>
                        <input value={editData.footer[key] || ""} onChange={e => setEditData({ ...editData, footer: { ...editData.footer, [key]: e.target.value } })} style={inpStyles} />
                      </div>
                    ))}
                  </div>

                  {/* Hizmet Linkleri */}
                  {[
                    ["serviceLinks", "Hizmet Linkleri"],
                    ["partnerLinks", "İş Ortağı Linkleri"],
                    ["legalLinks", "Yasal Linkler (Alt Bar)"],
                  ].map(([field, heading]) => (
                    <div key={field} style={{ background: "rgba(255,255,255,0.02)", padding: 24, borderRadius: 16, border: "1px solid rgba(168,85,247,0.15)" }}>
                      <h4 style={{ margin: "0 0 16px 0", color: "#f8fafc" }}>{heading}</h4>
                      {(editData.footer[field] || []).map((item, i) => (
                        <div key={i} style={{ display: "flex", gap: 10, marginBottom: 10 }}>
                          <input value={item} onChange={e => { const arr = [...editData.footer[field]]; arr[i] = e.target.value; setEditData({ ...editData, footer: { ...editData.footer, [field]: arr } }); }} style={{ ...inpStyles, flex: 1 }} />
                          <button onClick={() => { const arr = editData.footer[field].filter((_, idx) => idx !== i); setEditData({ ...editData, footer: { ...editData.footer, [field]: arr } }); }} style={{ background: "rgba(239,68,68,0.1)", border: "none", color: "#f87171", width: 40, borderRadius: 8, cursor: "pointer", flexShrink: 0 }}><X size={14} /></button>
                        </div>
                      ))}
                      <button onClick={() => setEditData({ ...editData, footer: { ...editData.footer, [field]: [...(editData.footer[field] || []), "Yeni Öğe"] } })} style={{ padding: "10px 16px", border: "1px dashed rgba(168,85,247,0.4)", background: "rgba(168,85,247,0.05)", color: "#c084fc", borderRadius: 8, cursor: "pointer", fontWeight: 600, display: "flex", alignItems: "center", gap: 8, fontSize: 13, marginTop: 4 }}>
                        <Plus size={14} /> Ekle
                      </button>
                    </div>
                  ))}
                </div>
              )}

              {/* MENÜ & FOOTER AYARLARI TAB */}
              {tab === "menuFooterSettings" && (
                <div style={{ display: "flex", flexDirection: "column", gap: 24 }}>

                  {/* Navbar CTA Butonu */}
                  <div style={{ background: "rgba(255,255,255,0.02)", padding: 24, borderRadius: 16, border: "1px solid rgba(168,85,247,0.15)" }}>
                    <h4 style={{ margin: "0 0 20px 0", color: "#f8fafc", display: "flex", alignItems: "center", gap: 8 }}>
                      <Layout size={18} color={editData.theme.primary} /> Navbar Buton Ayarları
                    </h4>
                    <div style={{ marginBottom: 0 }}>
                      <label style={{ display: "block", fontSize: 11, color: "#94a3b8", fontWeight: 700, marginBottom: 8, textTransform: "uppercase", letterSpacing: 1 }}>
                        "Teklif Al" Buton Metni
                      </label>
                      <input
                        value={editData.navbar.ctaButton || ""}
                        onChange={e => setEditData({ ...editData, navbar: { ...editData.navbar, ctaButton: e.target.value } })}
                        style={inpStyles}
                        placeholder="Örn: Teklif Al, Toplantı Planla..."
                      />
                      <p style={{ fontSize: 11, color: "#475569", marginTop: 6 }}>Navbar'ın sağ köşesindeki ana eylem butonunun metni.</p>
                    </div>
                  </div>

                  {/* Footer Şirket Kimliği */}
                  <div style={{ background: "rgba(255,255,255,0.02)", padding: 24, borderRadius: 16, border: "1px solid rgba(168,85,247,0.15)" }}>
                    <h4 style={{ margin: "0 0 20px 0", color: "#f8fafc", display: "flex", alignItems: "center", gap: 8 }}>
                      <Layers size={18} color={editData.theme.primary} /> Footer Şirket Kimliği
                    </h4>
                    <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: 16, marginBottom: 16 }}>
                      <div>
                        <label style={{ display: "block", fontSize: 11, color: "#94a3b8", fontWeight: 700, marginBottom: 8, textTransform: "uppercase", letterSpacing: 1 }}>Telif Hakkı Yılı Metni</label>
                        <input
                          value={editData.footer.copyrightText || ""}
                          onChange={e => setEditData({ ...editData, footer: { ...editData.footer, copyrightText: e.target.value } })}
                          style={inpStyles}
                          placeholder="© {year} Şirket Adı..."
                        />
                        <p style={{ fontSize: 11, color: "#475569", marginTop: 6 }}><code style={{ background: "rgba(0,0,0,0.3)", padding: "1px 5px", borderRadius: 3, fontSize: 10 }}>{"{year}"}</code> otomatik yıl için yer tutucu.</p>
                      </div>
                      <div>
                        <label style={{ display: "block", fontSize: 11, color: "#94a3b8", fontWeight: 700, marginBottom: 8, textTransform: "uppercase", letterSpacing: 1 }}>Durum Metni</label>
                        <input
                          value={editData.footer.statusText || ""}
                          onChange={e => setEditData({ ...editData, footer: { ...editData.footer, statusText: e.target.value } })}
                          style={inpStyles}
                          placeholder="Örn: Tüm sistemler çalışıyor"
                        />
                      </div>
                    </div>
                    <div>
                      <label style={{ display: "block", fontSize: 11, color: "#94a3b8", fontWeight: 700, marginBottom: 8, textTransform: "uppercase", letterSpacing: 1 }}>Footer Kısa Açıklama</label>
                      <input
                        value={editData.footer.description || ""}
                        onChange={e => setEditData({ ...editData, footer: { ...editData.footer, description: e.target.value } })}
                        style={inpStyles}
                        placeholder="Şirket hakkında kısa bir açıklama..."
                      />
                    </div>
                  </div>

                  {/* Footer Alt Linkler */}
                  <div style={{ background: "rgba(255,255,255,0.02)", padding: 24, borderRadius: 16, border: "1px solid rgba(168,85,247,0.15)" }}>
                    <h4 style={{ margin: "0 0 20px 0", color: "#f8fafc", display: "flex", alignItems: "center", gap: 8 }}>
                      <ChevronRight size={18} color={editData.theme.primary} /> Footer Alt Linkler (Yasal)
                    </h4>
                    <p style={{ fontSize: 12, color: "#475569", marginBottom: 16, lineHeight: 1.5 }}>Footer'ın en alt çubuğunda (copyright yanında) görünen linkleri düzenleyin.</p>
                    {(editData.footer.legalLinks || []).map((item, i) => (
                      <div key={i} style={{ display: "flex", gap: 10, marginBottom: 10 }}>
                        <input
                          value={item}
                          onChange={e => { const arr = [...editData.footer.legalLinks]; arr[i] = e.target.value; setEditData({ ...editData, footer: { ...editData.footer, legalLinks: arr } }); }}
                          style={{ ...inpStyles, flex: 1 }}
                          placeholder="Link metni..."
                        />
                        <button
                          onClick={() => { const arr = editData.footer.legalLinks.filter((_, idx) => idx !== i); setEditData({ ...editData, footer: { ...editData.footer, legalLinks: arr } }); }}
                          style={{ background: "rgba(239,68,68,0.1)", border: "none", color: "#f87171", width: 40, borderRadius: 8, cursor: "pointer", flexShrink: 0 }}
                        ><X size={14} /></button>
                      </div>
                    ))}
                    <button
                      onClick={() => setEditData({ ...editData, footer: { ...editData.footer, legalLinks: [...(editData.footer.legalLinks || []), "Yeni Link"] } })}
                      style={{ padding: "10px 16px", border: "1px dashed rgba(168,85,247,0.4)", background: "rgba(168,85,247,0.05)", color: "#c084fc", borderRadius: 8, cursor: "pointer", fontWeight: 600, display: "flex", alignItems: "center", gap: 8, fontSize: 13, marginTop: 4 }}
                    >
                      <Plus size={14} /> Link Ekle
                    </button>
                  </div>

                  {/* Önizleme */}
                  <div style={{ background: "rgba(168,85,247,0.05)", border: "1px dashed rgba(168,85,247,0.3)", padding: 20, borderRadius: 12 }}>
                    <p style={{ fontSize: 11, color: "#94a3b8", fontWeight: 700, textTransform: "uppercase", letterSpacing: 1, marginBottom: 12 }}>Canlı Önizleme</p>
                    <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center", padding: "10px 16px", background: "rgba(0,0,0,0.25)", borderRadius: 8, marginBottom: 10 }}>
                      <span style={{ fontSize: 12, color: "#c084fc", fontWeight: 800, letterSpacing: 1 }}>DECHA</span>
                      <span style={{ fontSize: 12, background: `${editData.theme.primary}30`, color: editData.theme.secondary, padding: "4px 12px", borderRadius: 6, fontWeight: 700 }}>{editData.navbar.ctaButton || "Teklif Al"}</span>
                    </div>
                    <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center", padding: "10px 16px", background: "rgba(0,0,0,0.25)", borderRadius: 8 }}>
                      <span style={{ fontSize: 11, color: "#475569" }}>{(editData.footer.copyrightText || "© {year} Decha").replace("{year}", new Date().getFullYear())}</span>
                      <div style={{ display: "flex", gap: 10 }}>
                        {(editData.footer.legalLinks || []).slice(0, 3).map((l, i) => (
                          <span key={i} style={{ fontSize: 11, color: "#64748b" }}>{l}</span>
                        ))}
                      </div>
                    </div>
                  </div>
                </div>
              )}

              {/* İLETİŞİM FORMU AYARLARI TAB */}
              {tab === "contactFormSettings" && (
                <div style={{ display: "flex", flexDirection: "column", gap: 24 }}>

                  {/* Bölüm Başlıkları */}
                  <div style={{ background: "rgba(255,255,255,0.02)", padding: 24, borderRadius: 16, border: "1px solid rgba(168,85,247,0.15)" }}>
                    <h4 style={{ margin: "0 0 20px 0", color: "#f8fafc", display: "flex", alignItems: "center", gap: 8 }}>
                      <MessageSquare size={18} color={editData.theme.primary} /> İletişim Kutusu Başlıkları
                    </h4>
                    <div style={{ marginBottom: 16 }}>
                      <label style={{ display: "block", fontSize: 11, color: "#94a3b8", fontWeight: 700, marginBottom: 8, textTransform: "uppercase", letterSpacing: 1 }}>Ana Başlık</label>
                      <input
                        value={editData.contact.title || ""}
                        onChange={e => setEditData({ ...editData, contact: { ...editData.contact, title: e.target.value } })}
                        style={inpStyles}
                        placeholder="Örn: Haydi Başlayalım"
                      />
                    </div>
                    <div style={{ marginBottom: 16 }}>
                      <label style={{ display: "block", fontSize: 11, color: "#94a3b8", fontWeight: 700, marginBottom: 8, textTransform: "uppercase", letterSpacing: 1 }}>Alt Açıklama</label>
                      <input
                        value={editData.contact.subtitle || ""}
                        onChange={e => setEditData({ ...editData, contact: { ...editData.contact, subtitle: e.target.value } })}
                        style={inpStyles}
                        placeholder="Örn: Projenizi anlatın, size özel bir büyüme planı hazırlayalım."
                      />
                    </div>
                    <div>
                      <label style={{ display: "block", fontSize: 11, color: "#94a3b8", fontWeight: 700, marginBottom: 8, textTransform: "uppercase", letterSpacing: 1 }}>Bölüm Etiketi (Badge)</label>
                      <input
                        value={editData.contact.badge || ""}
                        onChange={e => setEditData({ ...editData, contact: { ...editData.contact, badge: e.target.value } })}
                        style={inpStyles}
                        placeholder="Örn: İletişim"
                      />
                    </div>
                  </div>

                  {/* Form Alan Etiketleri */}
                  <div style={{ background: "rgba(255,255,255,0.02)", padding: 24, borderRadius: 16, border: "1px solid rgba(168,85,247,0.15)" }}>
                    <h4 style={{ margin: "0 0 20px 0", color: "#f8fafc", display: "flex", alignItems: "center", gap: 8 }}>
                      <User size={18} color={editData.theme.primary} /> Form Alan Etiketleri (Placeholder)
                    </h4>
                    <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: 16, marginBottom: 16 }}>
                      <div>
                        <label style={{ display: "block", fontSize: 11, color: "#94a3b8", fontWeight: 700, marginBottom: 8, textTransform: "uppercase", letterSpacing: 1 }}>Ad Soyad Alanı</label>
                        <input
                          value={editData.contact.namePlaceholder || ""}
                          onChange={e => setEditData({ ...editData, contact: { ...editData.contact, namePlaceholder: e.target.value } })}
                          style={inpStyles}
                          placeholder="Örn: Adınız Soyadınız"
                        />
                      </div>
                      <div>
                        <label style={{ display: "block", fontSize: 11, color: "#94a3b8", fontWeight: 700, marginBottom: 8, textTransform: "uppercase", letterSpacing: 1 }}>E-posta Alanı</label>
                        <input
                          value={editData.contact.emailPlaceholder || ""}
                          onChange={e => setEditData({ ...editData, contact: { ...editData.contact, emailPlaceholder: e.target.value } })}
                          style={inpStyles}
                          placeholder="Örn: E-posta Adresiniz"
                        />
                      </div>
                    </div>
                    <div>
                      <label style={{ display: "block", fontSize: 11, color: "#94a3b8", fontWeight: 700, marginBottom: 8, textTransform: "uppercase", letterSpacing: 1 }}>Mesaj Alanı</label>
                      <input
                        value={editData.contact.msgPlaceholder || ""}
                        onChange={e => setEditData({ ...editData, contact: { ...editData.contact, msgPlaceholder: e.target.value } })}
                        style={inpStyles}
                        placeholder="Örn: Projenizi anlatın..."
                      />
                    </div>
                  </div>

                  {/* Buton & Başarı Mesajları */}
                  <div style={{ background: "rgba(255,255,255,0.02)", padding: 24, borderRadius: 16, border: "1px solid rgba(168,85,247,0.15)" }}>
                    <h4 style={{ margin: "0 0 20px 0", color: "#f8fafc", display: "flex", alignItems: "center", gap: 8 }}>
                      <Send size={18} color={editData.theme.primary} /> Buton & Başarı Mesajları
                    </h4>
                    <div style={{ marginBottom: 16 }}>
                      <label style={{ display: "block", fontSize: 11, color: "#94a3b8", fontWeight: 700, marginBottom: 8, textTransform: "uppercase", letterSpacing: 1 }}>Gönder Butonu Metni</label>
                      <input
                        value={editData.contact.sendButton || ""}
                        onChange={e => setEditData({ ...editData, contact: { ...editData.contact, sendButton: e.target.value } })}
                        style={inpStyles}
                        placeholder="Örn: Teklif Gönder, Mesaj Gönder..."
                      />
                    </div>
                    <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: 16 }}>
                      <div>
                        <label style={{ display: "block", fontSize: 11, color: "#94a3b8", fontWeight: 700, marginBottom: 8, textTransform: "uppercase", letterSpacing: 1 }}>Başarı Mesajı Başlığı</label>
                        <input
                          value={editData.contact.successTitle || ""}
                          onChange={e => setEditData({ ...editData, contact: { ...editData.contact, successTitle: e.target.value } })}
                          style={inpStyles}
                          placeholder="Örn: Mesajınız İletildi!"
                        />
                      </div>
                      <div>
                        <label style={{ display: "block", fontSize: 11, color: "#94a3b8", fontWeight: 700, marginBottom: 8, textTransform: "uppercase", letterSpacing: 1 }}>Başarı Mesajı Açıklaması</label>
                        <input
                          value={editData.contact.successBody || ""}
                          onChange={e => setEditData({ ...editData, contact: { ...editData.contact, successBody: e.target.value } })}
                          style={inpStyles}
                          placeholder="Örn: En kısa sürede sizinle iletişime geçeceğiz."
                        />
                      </div>
                    </div>
                  </div>

                  {/* Önizleme */}
                  <div style={{ background: "rgba(168,85,247,0.05)", border: "1px dashed rgba(168,85,247,0.3)", padding: 20, borderRadius: 12 }}>
                    <p style={{ fontSize: 11, color: "#94a3b8", fontWeight: 700, textTransform: "uppercase", letterSpacing: 1, marginBottom: 14 }}>Canlı Önizleme</p>
                    <div style={{ background: "rgba(0,0,0,0.2)", borderRadius: 10, padding: 18, display: "flex", flexDirection: "column", gap: 10 }}>
                      <div>
                        <span style={{ fontSize: 10, color: editData.theme.secondary, fontWeight: 800, textTransform: "uppercase", letterSpacing: 1 }}>{editData.contact.badge || "İletişim"}</span>
                        <p style={{ fontSize: 18, fontWeight: 900, color: "#f8fafc", margin: "4px 0 2px", fontFamily: "Syne, sans-serif" }}>{editData.contact.title || "Haydi Başlayalım"}</p>
                        <p style={{ fontSize: 12, color: "#64748b" }}>{editData.contact.subtitle || "Alt açıklama..."}</p>
                      </div>
                      <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: 8 }}>
                        <div style={{ background: "rgba(255,255,255,0.04)", border: "1px solid rgba(168,85,247,0.15)", borderRadius: 8, padding: "9px 12px" }}>
                          <span style={{ fontSize: 11, color: "#475569" }}>{editData.contact.namePlaceholder || "Ad Soyad"}</span>
                        </div>
                        <div style={{ background: "rgba(255,255,255,0.04)", border: "1px solid rgba(168,85,247,0.15)", borderRadius: 8, padding: "9px 12px" }}>
                          <span style={{ fontSize: 11, color: "#475569" }}>{editData.contact.emailPlaceholder || "E-posta"}</span>
                        </div>
                      </div>
                      <div style={{ background: "rgba(255,255,255,0.04)", border: "1px solid rgba(168,85,247,0.15)", borderRadius: 8, padding: "9px 12px" }}>
                        <span style={{ fontSize: 11, color: "#475569" }}>{editData.contact.msgPlaceholder || "Mesaj..."}</span>
                      </div>
                      <div style={{ background: `linear-gradient(135deg, ${editData.theme.secondary}, ${editData.theme.primary})`, borderRadius: 8, padding: "10px 20px", textAlign: "center" }}>
                        <span style={{ fontSize: 13, fontWeight: 700, color: "#fff", display: "flex", alignItems: "center", justifyContent: "center", gap: 6 }}>
                          <Send size={13} /> {editData.contact.sendButton || "Mesaj Gönder"}
                        </span>
                      </div>
                    </div>
                  </div>
                </div>
              )}

              {/* THEME (COLORS) TAB */}
              {tab === "theme" && (
                <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: 24 }}>
                  {Object.entries(editData.theme).map(([key, val]) => (
                    <div key={key} style={{ background: "rgba(255,255,255,0.02)", padding: 20, borderRadius: 12, border: "1px solid rgba(255,255,255,0.05)" }}>
                      <label style={{ display: "block", fontSize: 12, color: "#94a3b8", fontWeight: 700, marginBottom: 12, textTransform: "capitalize" }}>{key.replace(/([A-Z])/g, ' $1').trim()}</label>
                      <div style={{ display: "flex", alignItems: "center", gap: 12 }}>
                        {/* Güvenlik filtresi: getSafeColor eklendi */}
                        <input type="color" value={getSafeColor(val)} onChange={e => setEditData({ ...editData, theme: { ...editData.theme, [key]: e.target.value } })} style={{ width: 40, height: 40, padding: 0, border: "none", borderRadius: 8, cursor: "pointer", background: "transparent" }} />
                        <input type="text" value={val} onChange={e => setEditData({ ...editData, theme: { ...editData.theme, [key]: e.target.value } })} style={{ ...inpStyles, flex: 1, fontFamily: "monospace" }} />
                      </div>
                    </div>
                  ))}
                </div>
              )}

              {/* SPACING TAB */}
              {tab === "spacing" && (
                <div style={{ display: "flex", flexDirection: "column", gap: 24 }}>
                  {Object.entries(editData.spacing).map(([key, val]) => (
                    <div key={key} style={{ background: "rgba(255,255,255,0.02)", padding: 20, borderRadius: 12, border: "1px solid rgba(255,255,255,0.05)" }}>
                      <label style={{ display: "block", fontSize: 12, color: "#94a3b8", fontWeight: 700, marginBottom: 8, textTransform: "capitalize" }}>{key.replace(/([A-Z])/g, ' $1').trim()}</label>
                      <input type="text" value={val} onChange={e => setEditData({ ...editData, spacing: { ...editData.spacing, [key]: e.target.value } })} style={inpStyles} placeholder="Örn: 100px veya 5rem" />
                    </div>
                  ))}
                </div>
              )}

              {/* EMAIL TEMPLATES TAB */}
              {tab === "email" && (
                <div style={{ display: "flex", flexDirection: "column", gap: 24 }}>
                  <div style={{ background: "rgba(59,130,246,0.1)", border: "1px solid rgba(59,130,246,0.3)", padding: 16, borderRadius: 12, color: "#93c5fd", fontSize: 13, lineHeight: 1.6 }}>
                    EmailJS şablonunuzda bu verilerin çalışması için değişken isimlerini (örn: <code style={{ background: "rgba(0,0,0,0.3)", padding: "2px 6px", borderRadius: 4 }}>{"{{name}}"}</code>) doğru yerleştirmelisiniz. Bu ayarlar, site üzerinden doldurulan formların taslağını oluşturur.
                  </div>

                  <div style={{ background: "rgba(255,255,255,0.02)", padding: 20, borderRadius: 12, border: "1px solid rgba(255,255,255,0.05)" }}>
                    <label style={{ display: "block", fontSize: 12, color: "#94a3b8", fontWeight: 700, marginBottom: 8 }}>E-posta Konusu (Subject)</label>
                    <input value={editData.emailTemplates.subject} onChange={e => setEditData({ ...editData, emailTemplates: { ...editData.emailTemplates, subject: e.target.value } })} style={inpStyles} />
                  </div>

                  <div style={{ background: "rgba(255,255,255,0.02)", padding: 20, borderRadius: 12, border: "1px solid rgba(255,255,255,0.05)" }}>
                    <label style={{ display: "block", fontSize: 12, color: "#94a3b8", fontWeight: 700, marginBottom: 8 }}>Mesaj İçeriği (Body)</label>
                    <textarea value={editData.emailTemplates.body} onChange={e => setEditData({ ...editData, emailTemplates: { ...editData.emailTemplates, body: e.target.value } })} style={{ ...inpStyles, minHeight: 150, resize: "vertical" }} />
                  </div>
                </div>
              )}

              {/* MEETING SETTINGS TAB */}
              {tab === "meeting" && (
                <div style={{ display: "flex", flexDirection: "column", gap: 24 }}>

                  {/* Çalışma Günleri & Saatleri */}
                  <div style={{ background: "rgba(255,255,255,0.02)", padding: 24, borderRadius: 16, border: "1px solid rgba(168,85,247,0.15)" }}>
                    <h4 style={{ margin: "0 0 20px 0", color: "#f8fafc", display: "flex", alignItems: "center", gap: 8 }}>
                      <Rocket size={18} color={editData.theme.primary} /> Çalışma Saatleri ve Günleri
                    </h4>

                    {/* Uygun Günler */}
                    <div style={{ marginBottom: 20 }}>
                      <label style={{ display: "block", fontSize: 11, color: "#94a3b8", fontWeight: 700, marginBottom: 12, textTransform: "uppercase", letterSpacing: 1 }}>Uygun Günler</label>
                      <div style={{ display: "flex", flexWrap: "wrap", gap: 10 }}>
                        {["Pazartesi","Salı","Çarşamba","Perşembe","Cuma","Cumartesi","Pazar"].map(day => {
                          const active = (editData.workingHours.days || []).includes(day);
                          return (
                            <button key={day} onClick={() => {
                              const current = editData.workingHours.days || [];
                              const updated = active ? current.filter(d => d !== day) : [...current, day];
                              setEditData({ ...editData, workingHours: { ...editData.workingHours, days: updated } });
                            }} style={{
                              padding: "8px 18px", borderRadius: 8, border: `1px solid ${active ? editData.theme.primary : "rgba(168,85,247,0.2)"}`,
                              background: active ? `${editData.theme.primary}20` : "rgba(255,255,255,0.03)",
                              color: active ? "#c084fc" : "#64748b",
                              fontSize: 13, fontWeight: 700, cursor: "pointer", transition: "all 0.15s",
                              fontFamily: "DM Sans, sans-serif",
                            }}>
                              {day}
                            </button>
                          );
                        })}
                      </div>
                    </div>

                    {/* Saat Aralıkları */}
                    <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: 16 }}>
                      <div>
                        <label style={{ display: "block", fontSize: 11, color: "#94a3b8", fontWeight: 700, marginBottom: 8, textTransform: "uppercase" }}>Başlangıç Saati</label>
                        <input type="time" value={editData.workingHours.startTime}
                          onChange={e => setEditData({ ...editData, workingHours: { ...editData.workingHours, startTime: e.target.value } })}
                          style={inpStyles} />
                      </div>
                      <div>
                        <label style={{ display: "block", fontSize: 11, color: "#94a3b8", fontWeight: 700, marginBottom: 8, textTransform: "uppercase" }}>Bitiş Saati</label>
                        <input type="time" value={editData.workingHours.endTime}
                          onChange={e => setEditData({ ...editData, workingHours: { ...editData.workingHours, endTime: e.target.value } })}
                          style={inpStyles} />
                      </div>
                    </div>
                  </div>

                  {/* Modal Metinleri */}
                  <div style={{ background: "rgba(255,255,255,0.02)", padding: 24, borderRadius: 16, border: "1px solid rgba(168,85,247,0.15)" }}>
                    <h4 style={{ margin: "0 0 20px 0", color: "#f8fafc", display: "flex", alignItems: "center", gap: 8 }}>
                      <MessageSquare size={18} color="#60a5fa" /> Modal Metinlerini Düzenle
                    </h4>
                    {[
                      ["modalTitle", "Popup Başlığı (örn: Toplantı Planla)"],
                      ["modalSubtitle", "Popup Alt Başlığı"],
                      ["locationLabel", "Lokasyon Sorusu (örn: Toplantı Nerede Gerçekleşsin?)"],
                      ["successTitle", "Başarı Mesajı Başlığı (örn: Randevunuz Alındı!)"],
                      ["successBody", "Başarı Mesajı Açıklaması"],
                      ["submitButton", "Gönder Butonu Metni (örn: Randevu Oluştur)"],
                    ].map(([key, label]) => (
                      <div key={key} style={{ marginBottom: 16 }}>
                        <label style={{ display: "block", fontSize: 11, color: "#94a3b8", fontWeight: 700, marginBottom: 8, textTransform: "uppercase" }}>{label}</label>
                        {key === "successBody" ? (
                          <textarea value={editData.meetingTexts[key]} onChange={e => setEditData({ ...editData, meetingTexts: { ...editData.meetingTexts, [key]: e.target.value } })} style={{ ...inpStyles, minHeight: 80, resize: "vertical" }} />
                        ) : (
                          <input value={editData.meetingTexts[key]} onChange={e => setEditData({ ...editData, meetingTexts: { ...editData.meetingTexts, [key]: e.target.value } })} style={inpStyles} />
                        )}
                      </div>
                    ))}
                  </div>

                  {/* Canlı Önizleme */}
                  <div style={{ background: "rgba(168,85,247,0.05)", border: "1px dashed rgba(168,85,247,0.3)", padding: 20, borderRadius: 12 }}>
                    <p style={{ fontSize: 12, color: "#94a3b8", marginBottom: 10, fontWeight: 700, textTransform: "uppercase", letterSpacing: 1 }}>Önizleme</p>
                    <p style={{ fontSize: 14, color: "#c084fc", fontWeight: 800, marginBottom: 4 }}>{editData.meetingTexts.modalTitle}</p>
                    <p style={{ fontSize: 12, color: "#64748b", marginBottom: 10 }}>{editData.meetingTexts.modalSubtitle}</p>
                    <p style={{ fontSize: 12, color: "#94a3b8" }}>📍 {editData.meetingTexts.locationLabel}</p>
                    <p style={{ fontSize: 12, color: "#22c55e", marginTop: 8 }}>✅ {editData.meetingTexts.successTitle}</p>
                  </div>
                </div>
              )}

              {/* SETTINGS TAB */}
              {tab === "settings" && (
                <div style={{ display: "flex", flexDirection: "column", gap: 24 }}>
                  <div style={{ background: "rgba(255,255,255,0.02)", padding: 24, borderRadius: 16, border: "1px solid rgba(255,255,255,0.05)" }}>
                    <h4 style={{ margin: "0 0 20px 0", color: "#f8fafc", display: "flex", alignItems: "center", gap: 8 }}><Shield size={18} color={editData.theme.primary} /> Güvenlik Ayarları</h4>
                    <label style={{ display: "block", fontSize: 11, color: "#94a3b8", marginBottom: 8, textTransform: "uppercase" }}>Yeni Admin Şifresi</label>
                    <input type="password" placeholder="Şifreyi değiştirmek için yazın..." value={editSettings.adminPass} onChange={e => setEditSettings({ ...editSettings, adminPass: e.target.value })} style={inpStyles} />
                  </div>

                  <div style={{ background: "rgba(255,255,255,0.02)", padding: 24, borderRadius: 16, border: "1px solid rgba(255,255,255,0.05)" }}>
                    <h4 style={{ margin: "0 0 20px 0", color: "#f8fafc", display: "flex", alignItems: "center", gap: 8 }}><Mail size={18} color="#60a5fa" /> EmailJS API Bağlantısı</h4>
                    {["emailjsServiceId", "emailjsTemplateId", "emailjsPublicKey"].map(key => (
                      <div key={key} style={{ marginBottom: 16 }}>
                        <label style={{ display: "block", fontSize: 11, color: "#94a3b8", marginBottom: 8, textTransform: "uppercase" }}>{key.replace("emailjs", "")}</label>
                        <input value={editSettings[key]} onChange={e => setEditSettings({ ...editSettings, [key]: e.target.value })} style={inpStyles} placeholder="API Key Giriniz..." />
                      </div>
                    ))}
                  </div>
                </div>
              )}

            </div>
          </div>
        </div>
      </div>
    );
  }

  // ==========================================
  // VIEW: ADMIN LOGIN MODAL
  // ==========================================
  if (adminOpen && !authed) {
    return (
      <div style={{ position: "fixed", inset: 0, zIndex: 9999, background: "rgba(0,0,0,0.9)", backdropFilter: "blur(20px)", display: "flex", alignItems: "center", justifyContent: "center" }}>
        <div style={{ background: "#0c0c1c", border: `1px solid ${data.theme.border}`, borderRadius: 24, padding: "56px 48px", width: "100%", maxWidth: 400, textAlign: "center", position: "relative" }}>
          <button onClick={closeAdmin} style={{ position: "absolute", top: 20, right: 20, background: "none", border: "none", color: "#64748b", cursor: "pointer" }}><X size={20} /></button>
          <div style={{ width: 64, height: 64, borderRadius: "50%", background: `linear-gradient(135deg, ${data.theme.secondary}, ${data.theme.primary})`, display: "flex", alignItems: "center", justifyContent: "center", margin: "0 auto 26px" }}>
            <Lock size={26} color="#fff" />
          </div>
          <h3 style={{ fontFamily: "Syne, sans-serif", color: "#f8fafc", marginBottom: 8, fontSize: 24, fontWeight: 800 }}>Decha CMS</h3>
          <p style={{ color: "#64748b", fontSize: 14, marginBottom: 34 }}>İçerik yönetim sistemine giriş yapın.</p>

          <div style={{ position: "relative", marginBottom: pwErr ? 8 : 18 }}>
            <input type={showPw ? "text" : "password"} placeholder="••••••••" value={pw}
              onChange={e => { setPw(e.target.value); setPwErr(false); }}
              onKeyDown={e => e.key === "Enter" && login()}
              style={{ width: "100%", padding: "14px", borderRadius: 12, background: "rgba(255,255,255,0.05)", border: `1px solid ${pwErr ? "#ef4444" : "rgba(255,255,255,0.1)"}`, color: "#fff", textAlign: "center", fontSize: 20, letterSpacing: 6, outline: "none" }} />
            <button onClick={() => setShowPw(v => !v)} style={{ position: "absolute", right: 16, top: "50%", transform: "translateY(-50%)", background: "none", border: "none", cursor: "pointer", color: "#64748b" }}>
              {showPw ? <EyeOff size={18} /> : <Eye size={18} />}
            </button>
          </div>
          {pwErr && !lockTimer && <p style={{ color: "#ef4444", fontSize: 13, marginBottom: 16 }}>Hatalı şifre girdiniz.</p>}
          {lockTimer > 0 && <p style={{ color: "#ef4444", fontSize: 13, marginBottom: 16 }}>Çok fazla deneme. {lockTimer}s bekleyin.</p>}

          <button onClick={login} disabled={lockTimer > 0} style={{ width: "100%", padding: 16, background: lockTimer > 0 ? "#334155" : `linear-gradient(135deg, ${data.theme.secondary}, ${data.theme.primary})`, border: "none", color: "#fff", borderRadius: 12, fontSize: 15, fontWeight: 700, cursor: lockTimer > 0 ? "not-allowed" : "pointer" }}>
            Giriş Yap
          </button>
        </div>
      </div>
    );
  }

  // ==========================================
  // VIEW: MAIN PUBLIC SITE
  // ==========================================
  // VIEW: MAIN PUBLIC SITE
  // ==========================================

  const BRANDS = [
    "Trendyol", "Getir", "Yemeksepeti", "Hepsiburada", "n11",
    "Migros", "A101", "Koçtaş", "MediaMarkt", "Bim",
    "Turkcell", "Vodafone", "Akbank", "Garanti", "İş Bankası",
  ];

  return (
    <>
      <style>{`
        @import url('https://fonts.googleapis.com/css2?family=Syne:wght@700;800;900&family=DM+Sans:wght@300;400;500;600&display=swap');

        *, *::before, *::after { box-sizing: border-box; margin: 0; padding: 0; }

        @keyframes shimmer {
          0% { background-position: 0% 50%; }
          100% { background-position: 200% 50%; }
        }
        @keyframes marquee {
          0% { transform: translateX(0); }
          100% { transform: translateX(-50%); }
        }
        @keyframes fadeUp {
          from { opacity: 0; transform: translateY(32px); }
          to { opacity: 1; transform: translateY(0); }
        }
        @keyframes pulse-glow {
          0%, 100% { box-shadow: 0 0 0 0 ${theme.primary}44; }
          50% { box-shadow: 0 0 0 14px ${theme.primary}00; }
        }
        @keyframes float {
          0%, 100% { transform: translateY(0px); }
          50% { transform: translateY(-10px); }
        }
        @keyframes spin { to { transform: rotate(360deg); } }
        @keyframes gridFade {
          from { opacity: 0; }
          to { opacity: 1; }
        }

        html { scroll-behavior: smooth; }

        body {
          background: ${theme.background};
          color: ${theme.textMain};
          font-family: 'DM Sans', sans-serif;
          overflow-x: hidden;
          -webkit-font-smoothing: antialiased;
        }

        .hero-animate { animation: fadeUp 0.8s cubic-bezier(0.22,1,0.36,1) both; }
        .hero-animate-1 { animation-delay: 0.1s; }
        .hero-animate-2 { animation-delay: 0.25s; }
        .hero-animate-3 { animation-delay: 0.4s; }
        .hero-animate-4 { animation-delay: 0.55s; }

        .cta-primary {
          background: linear-gradient(135deg, ${theme.secondary}, ${theme.primary});
          color: #fff;
          border: none;
          padding: 16px 34px;
          border-radius: 50px;
          font-size: 15px;
          font-weight: 700;
          cursor: pointer;
          font-family: 'DM Sans', sans-serif;
          letter-spacing: 0.3px;
          transition: transform 0.2s, box-shadow 0.2s;
          animation: pulse-glow 2.5s infinite;
        }
        .cta-primary:hover {
          transform: translateY(-3px) scale(1.03);
          box-shadow: 0 12px 40px ${theme.primary}55;
        }

        .cta-secondary {
          background: transparent;
          color: ${theme.textMain};
          border: 1.5px solid ${theme.border};
          padding: 16px 34px;
          border-radius: 50px;
          font-size: 15px;
          font-weight: 600;
          cursor: pointer;
          font-family: 'DM Sans', sans-serif;
          transition: border-color 0.2s, background 0.2s, transform 0.2s;
          backdrop-filter: blur(8px);
        }
        .cta-secondary:hover {
          border-color: ${theme.primary};
          background: ${theme.primary}15;
          transform: translateY(-3px);
        }

        .marquee-track {
          display: flex;
          width: max-content;
          animation: marquee 28s linear infinite;
        }
        .marquee-track:hover { animation-play-state: paused; }

        .brand-pill {
          display: inline-flex;
          align-items: center;
          gap: 8px;
          padding: 10px 24px;
          border: 1px solid ${theme.border};
          border-radius: 100px;
          background: ${theme.cardBg};
          backdrop-filter: blur(12px);
          white-space: nowrap;
          font-size: 14px;
          font-weight: 600;
          color: ${theme.textMuted};
          transition: border-color 0.2s, color 0.2s;
          margin: 0 10px;
          cursor: default;
        }
        .brand-pill:hover {
          border-color: ${theme.primary}60;
          color: ${theme.textMain};
        }

        .service-card {
          background: ${theme.cardBg};
          border: 1px solid ${theme.border};
          border-radius: ${spacing.cardRadius};
          padding: 32px;
          transition: all 0.4s cubic-bezier(0.34,1.3,0.64,1);
          cursor: default;
          backdrop-filter: blur(16px);
        }
        .service-card:hover {
          border-color: ${theme.primary};
          transform: translateY(-10px);
          box-shadow: 0 32px 80px ${theme.primary}25;
        }

        /* Sub-service badges */
        .sub-badge {
          display: inline-flex;
          align-items: center;
          gap: 6px;
          padding: 7px 16px;
          border-radius: 100px;
          border: 1px solid ${theme.border};
          background: ${theme.cardBg};
          color: ${theme.textMuted};
          font-size: 12.5px;
          font-weight: 600;
          transition: all 0.2s;
          backdrop-filter: blur(8px);
        }
        .sub-badge:hover {
          border-color: ${theme.primary}55;
          color: ${theme.textMain};
          background: ${theme.primary}0d;
        }

        /* Main service cards */
        .main-svc-card {
          background: ${theme.cardBg};
          border: 1px solid ${theme.border};
          border-radius: 24px;
          padding: 36px;
          backdrop-filter: blur(16px);
          transition: border-color 0.35s ease, transform 0.35s cubic-bezier(0.34,1.3,0.64,1), box-shadow 0.35s ease;
          display: flex;
          flex-direction: column;
          gap: 0;
          cursor: default;
        }
        .main-svc-card:hover {
          transform: translateY(-8px);
          box-shadow: 0 28px 72px rgba(0,0,0,0.4);
        }

        .main-svc-icon-wrap {
          width: 64px; height: 64px;
          border-radius: 18px;
          border: 1px solid;
          display: flex; align-items: center; justify-content: center;
          margin-bottom: 20px;
          flex-shrink: 0;
        }

        .main-svc-tag {
          display: inline-flex;
          align-items: center;
          padding: 4px 12px;
          border-radius: 100px;
          border: 1px solid;
          font-size: 11px;
          font-weight: 700;
          letter-spacing: 1px;
          text-transform: uppercase;
          margin-bottom: 14px;
          width: fit-content;
        }

        .main-svc-title {
          font-family: 'Syne', sans-serif;
          font-size: 26px;
          font-weight: 900;
          color: ${theme.textMain};
          letter-spacing: -1px;
          line-height: 1.15;
          margin-bottom: 16px;
        }

        .main-svc-desc {
          font-size: 14.5px;
          line-height: 1.75;
          color: ${theme.textMuted};
          margin-bottom: 24px;
          flex: 1;
        }

        .main-svc-tags-row {
          display: flex;
          flex-wrap: wrap;
          gap: 8px;
          margin-bottom: 28px;
        }

        .mini-tag {
          font-size: 11.5px;
          font-weight: 600;
          padding: 4px 12px;
          border-radius: 6px;
          border: 1px solid ${theme.border};
          color: ${theme.textMuted};
          background: rgba(255,255,255,0.02);
        }

        .detail-btn {
          display: inline-flex;
          align-items: center;
          gap: 6px;
          padding: 11px 22px;
          border-radius: 10px;
          border: 1px solid;
          background: transparent;
          font-size: 13.5px;
          font-weight: 700;
          cursor: pointer;
          font-family: 'DM Sans', sans-serif;
          transition: background 0.2s, color 0.2s, transform 0.15s;
          width: fit-content;
        }
        .detail-btn:hover {
          transform: translateX(3px);
        }

        .testimonial-card {
          background: ${theme.cardBg};
          border: 1px solid ${theme.border};
          border-radius: ${spacing.cardRadius};
          padding: 32px;
          backdrop-filter: blur(16px);
        }

        /* Akademi & Mentörlük cards */
        .edu-card {
          border-radius: 24px;
          border: 1px solid;
          padding: 40px;
          backdrop-filter: blur(16px);
        }

        /* Testimonial carousel card */
        .testi-slide-card {
          min-width: 420px;
          max-width: 420px;
          background: ${theme.cardBg};
          border: 1px solid ${theme.border};
          border-radius: 24px;
          padding: 36px;
          backdrop-filter: blur(16px);
          display: flex;
          flex-direction: column;
          transition: border-color 0.3s, transform 0.3s, box-shadow 0.3s;
          flex-shrink: 0;
        }
        .testi-slide-card:hover {
          border-color: ${theme.primary}55;
          transform: translateY(-6px);
          box-shadow: 0 24px 64px ${theme.primary}18;
        }

        /* Carousel navigation buttons */
        .carousel-btn {
          width: 44px; height: 44px;
          border-radius: 50%;
          border: 1px solid ${theme.border};
          background: ${theme.cardBg};
          color: ${theme.textMain};
          cursor: pointer;
          display: flex; align-items: center; justify-content: center;
          transition: border-color 0.2s, background 0.2s, transform 0.15s;
          backdrop-filter: blur(8px);
        }
        .carousel-btn:hover {
          border-color: ${theme.primary};
          background: ${theme.primary}15;
          transform: scale(1.08);
        }

        .nav-link {
          color: ${theme.textMuted};
          background: none;
          border: none;
          font-size: 14px;
          font-weight: 500;
          cursor: pointer;
          font-family: 'DM Sans', sans-serif;
          transition: color 0.2s;
          padding: 4px 0;
        }
        .nav-link:hover { color: ${theme.textMain}; }

        .form-input {
          width: 100%;
          padding: 14px 18px;
          background: ${theme.cardBg};
          border: 1px solid ${theme.border};
          border-radius: 14px;
          color: ${theme.textMain};
          font-size: 15px;
          font-family: 'DM Sans', sans-serif;
          outline: none;
          transition: border-color 0.2s;
        }
        .form-input:focus { border-color: ${theme.primary}; }
        .form-input::placeholder { color: ${theme.textMuted}; }

        .section-badge {
          display: inline-flex;
          align-items: center;
          gap: 8px;
          padding: 6px 16px;
          border-radius: 100px;
          border: 1px solid ${theme.primary}40;
          background: ${theme.primary}10;
          color: ${theme.secondary};
          font-size: 12px;
          font-weight: 700;
          letter-spacing: 1.2px;
          text-transform: uppercase;
          margin-bottom: 20px;
        }

        .who-video-box {
          border-radius: 24px;
          border: 1px solid ${theme.border};
          overflow: hidden;
          background: ${theme.cardBg};
          aspect-ratio: 16/9;
          display: flex;
          align-items: center;
          justify-content: center;
          position: relative;
          animation: float 5s ease-in-out infinite;
        }
        .play-btn {
          width: 72px; height: 72px;
          border-radius: 50%;
          background: linear-gradient(135deg, ${theme.secondary}, ${theme.primary});
          border: none;
          cursor: pointer;
          display: flex; align-items: center; justify-content: center;
          box-shadow: 0 0 0 20px ${theme.primary}20;
          transition: transform 0.2s;
        }
        .play-btn:hover { transform: scale(1.12); }

        .stat-chip {
          text-align: center;
          padding: 24px 20px;
          border-radius: 18px;
          border: 1px solid ${theme.border};
          background: ${theme.cardBg};
          backdrop-filter: blur(12px);
        }

        /* Social Media Grid */
        @keyframes socialPop {
          from { opacity: 0; transform: scale(0.92); }
          to { opacity: 1; transform: scale(1); }
        }
        .social-grid-item {
          border-radius: 16px;
          overflow: hidden;
          position: relative;
          cursor: pointer;
          transition: transform 0.35s cubic-bezier(0.34,1.3,0.64,1), box-shadow 0.3s;
          animation: socialPop 0.5s ease both;
        }
        .social-grid-item:hover {
          transform: scale(1.03);
          box-shadow: 0 20px 60px rgba(0,0,0,0.5);
          z-index: 2;
        }
        .social-grid-item .overlay {
          position: absolute; inset: 0;
          background: linear-gradient(180deg, transparent 40%, rgba(0,0,0,0.75) 100%);
          opacity: 0;
          transition: opacity 0.3s;
          display: flex; align-items: flex-end; padding: 14px;
        }
        .social-grid-item:hover .overlay { opacity: 1; }

        /* Blog Cards */
        .blog-card {
          background: ${theme.cardBg};
          border: 1px solid ${theme.border};
          border-radius: 20px;
          overflow: hidden;
          backdrop-filter: blur(16px);
          transition: border-color 0.3s, transform 0.35s cubic-bezier(0.34,1.3,0.64,1), box-shadow 0.35s;
          display: flex; flex-direction: column;
        }
        .blog-card:hover {
          border-color: ${theme.primary}55;
          transform: translateY(-8px);
          box-shadow: 0 28px 72px ${theme.primary}20;
        }
        .blog-card .read-more-btn {
          display: inline-flex; align-items: center; gap: 6px;
          font-size: 13px; font-weight: 700;
          color: ${theme.secondary};
          background: none; border: none; cursor: pointer;
          font-family: 'DM Sans', sans-serif;
          padding: 0;
          transition: gap 0.2s, color 0.2s;
        }
        .blog-card:hover .read-more-btn { gap: 10px; color: ${theme.primary}; }

        /* Closing CTA */
        .avatar-ring {
          width: 48px; height: 48px; border-radius: 50%;
          border: 2px solid ${theme.background};
          overflow: hidden; flex-shrink: 0;
          background: linear-gradient(135deg, ${theme.secondary}, ${theme.primary});
          display: flex; align-items: center; justify-content: center;
          font-family: 'Syne', sans-serif; font-weight: 900; font-size: 14px; color: #fff;
          margin-left: -12px;
          transition: transform 0.2s;
        }
        .avatar-ring:first-child { margin-left: 0; }
        .avatar-ring:hover { transform: translateY(-4px); z-index: 1; }

        /* Footer */
        .footer-link {
          color: ${theme.textMuted};
          font-size: 13.5px;
          line-height: 2;
          transition: color 0.2s;
          cursor: pointer;
          background: none; border: none;
          font-family: 'DM Sans', sans-serif;
          text-align: left; padding: 0;
          display: block; width: fit-content;
        }
        .footer-link:hover { color: ${theme.textMain}; }
        .footer-social-btn {
          width: 40px; height: 40px; border-radius: 10px;
          background: ${theme.cardBg}; border: 1px solid ${theme.border};
          display: flex; align-items: center; justify-content: center;
          cursor: pointer; transition: border-color 0.2s, background 0.2s, transform 0.2s;
          color: ${theme.textMuted};
        }
        .footer-social-btn:hover {
          border-color: ${theme.primary}60;
          background: ${theme.primary}10;
          color: ${theme.primary};
          transform: translateY(-3px);
        }


        /* Meeting Modal */
        @keyframes modalIn {
          from { opacity: 0; transform: translateY(24px) scale(0.97); }
          to { opacity: 1; transform: translateY(0) scale(1); }
        }
        @keyframes overlayIn {
          from { opacity: 0; }
          to { opacity: 1; }
        }
        .meeting-overlay {
          position: fixed; inset: 0; z-index: 9000;
          background: rgba(0,0,0,0.75);
          backdrop-filter: blur(12px);
          display: flex; align-items: center; justify-content: center;
          padding: 20px;
          animation: overlayIn 0.25s ease;
        }
        .meeting-modal {
          background: #0c0c1c;
          border: 1px solid rgba(168,85,247,0.25);
          border-radius: 28px;
          width: 100%; max-width: 560px;
          max-height: 90vh; overflow-y: auto;
          position: relative;
          animation: modalIn 0.3s cubic-bezier(0.34,1.3,0.64,1);
          box-shadow: 0 40px 120px rgba(0,0,0,0.8), 0 0 0 1px rgba(168,85,247,0.1);
        }
        .meeting-modal::-webkit-scrollbar { width: 6px; }
        .meeting-modal::-webkit-scrollbar-track { background: transparent; }
        .meeting-modal::-webkit-scrollbar-thumb { background: rgba(168,85,247,0.3); border-radius: 3px; }

        .meeting-loc-btn {
          flex: 1;
          padding: 14px 12px;
          border-radius: 14px;
          border: 1.5px solid;
          background: transparent;
          cursor: pointer;
          font-family: 'DM Sans', sans-serif;
          font-size: 13px;
          font-weight: 600;
          transition: all 0.2s;
          display: flex; flex-direction: column; align-items: center; gap: 8px;
          text-align: center;
        }

        .meeting-input {
          width: 100%;
          padding: 13px 16px;
          background: rgba(255,255,255,0.04);
          border: 1px solid rgba(168,85,247,0.18);
          border-radius: 12px;
          color: #f8fafc;
          font-size: 14px;
          font-family: 'DM Sans', sans-serif;
          outline: none;
          transition: border-color 0.2s;
          box-sizing: border-box;
        }
        .meeting-input:focus { border-color: rgba(168,85,247,0.6); }
        .meeting-input::placeholder { color: #475569; }
        .meeting-input[type="date"]::-webkit-calendar-picker-indicator,
        .meeting-input[type="time"]::-webkit-calendar-picker-indicator {
          filter: invert(0.6) sepia(1) saturate(3) hue-rotate(240deg);
          cursor: pointer;
        }

        /* grid bg */
        .grid-bg::before {
          content: '';
          position: absolute;
          inset: 0;
          background-image:
            linear-gradient(${theme.primary}08 1px, transparent 1px),
            linear-gradient(90deg, ${theme.primary}08 1px, transparent 1px);
          background-size: 48px 48px;
          pointer-events: none;
          animation: gridFade 1.2s ease both;
        }
      `}</style>

      {/* ── NAVBAR ── */}
      <nav style={{
        position: "fixed", top: 0, left: 0, right: 0, zIndex: 1000,
        padding: "0 40px", height: 68,
        display: "flex", alignItems: "center", justifyContent: "space-between",
        background: scrolled ? `${theme.background}ee` : "transparent",
        backdropFilter: scrolled ? "blur(20px)" : "none",
        borderBottom: scrolled ? `1px solid ${theme.border}` : "none",
        transition: "all 0.4s",
      }}>
        <Logo size="md" theme={theme} />
        <div style={{ display: "flex", gap: 32 }}>
          {(data.navbar?.navLinks || ["Hizmetler", "Referanslar", "İletişim"]).map((label, idx) => {
            const ids = ["services", "testimonials", "contact"];
            return <button key={idx} className="nav-link" onClick={() => scrollTo(ids[idx] || label.toLowerCase())}>{label}</button>;
          })}
        </div>
        <button className="cta-primary" style={{ padding: "11px 24px", fontSize: 14, animation: "none" }}
          onClick={() => setMeetingOpen(true)}>
          {data.navbar?.ctaButton || "Toplantı Planla"}
        </button>
      </nav>

      {/* ── HERO SECTION ── */}
      <section id="hero" className="grid-bg" style={{
        position: "relative", minHeight: "100vh",
        display: "flex", flexDirection: "column", alignItems: "center", justifyContent: "center",
        textAlign: "center",
        padding: `${spacing.heroPadding} 40px 80px`,
        overflow: "hidden",
      }}>
        {/* Ambient blobs */}
        <div style={{ position: "absolute", top: "10%", left: "15%", width: 480, height: 480, borderRadius: "50%", background: `radial-gradient(circle, ${theme.primary}18 0%, transparent 70%)`, filter: "blur(60px)", pointerEvents: "none" }} />
        <div style={{ position: "absolute", bottom: "10%", right: "10%", width: 360, height: 360, borderRadius: "50%", background: `radial-gradient(circle, ${theme.secondary}14 0%, transparent 70%)`, filter: "blur(80px)", pointerEvents: "none" }} />

        <div style={{ position: "relative", zIndex: 1, maxWidth: 840, margin: "0 auto" }}>
          <div className="hero-animate hero-animate-1">
            <span className="section-badge">
              <Sparkles size={12} /> Dijital Büyüme Ajansı
            </span>
          </div>

          <h1 className="hero-animate hero-animate-2" style={{
            fontFamily: "Syne, sans-serif", fontWeight: 900,
            fontSize: "clamp(48px, 7vw, 86px)", lineHeight: 1.05,
            letterSpacing: "-3px", marginBottom: 16,
            color: theme.textMain,
          }}>
            Dijitalleşmeye<br />
            <span style={{
              background: `linear-gradient(135deg, ${theme.secondary} 0%, ${theme.primary} 50%, ${theme.primaryHover} 100%)`,
              backgroundSize: "200% auto",
              WebkitBackgroundClip: "text", WebkitTextFillColor: "transparent", backgroundClip: "text",
              animation: "shimmer 4s linear infinite",
            }}>
              Hazır Mısınız?
            </span>
          </h1>

          <p className="hero-animate hero-animate-3" style={{
            fontSize: 18, lineHeight: 1.7, color: theme.textMuted,
            maxWidth: 600, margin: "0 auto 44px", fontWeight: 400,
          }}>
            {data.hero.sub}
          </p>

          <div className="hero-animate hero-animate-4" style={{ display: "flex", gap: 16, justifyContent: "center", flexWrap: "wrap" }}>
            <button className="cta-primary" onClick={() => setMeetingOpen(true)}>
              <span style={{ display: "flex", alignItems: "center", gap: 8 }}>
                <Rocket size={16} /> {data.navbar?.ctaButton || "Toplantı Planla"}
              </span>
            </button>
            <button className="cta-secondary" onClick={() => scrollTo("contact")}>
              <span style={{ display: "flex", alignItems: "center", gap: 8 }}>
                <MessageSquare size={16} /> Sizi Arayalım
              </span>
            </button>
          </div>
        </div>
      </section>

      {/* ── MARQUEE / BRAND STRIP ── */}
      <section style={{
        padding: "32px 0",
        borderTop: `1px solid ${theme.border}`,
        borderBottom: `1px solid ${theme.border}`,
        background: `linear-gradient(90deg, ${theme.background} 0%, ${theme.primary}06 50%, ${theme.background} 100%)`,
        overflow: "hidden",
        position: "relative",
      }}>
        {/* Fade edges */}
        <div style={{ position: "absolute", left: 0, top: 0, bottom: 0, width: 120, background: `linear-gradient(90deg, ${theme.background}, transparent)`, zIndex: 2, pointerEvents: "none" }} />
        <div style={{ position: "absolute", right: 0, top: 0, bottom: 0, width: 120, background: `linear-gradient(270deg, ${theme.background}, transparent)`, zIndex: 2, pointerEvents: "none" }} />

        <div style={{ display: "flex", overflow: "hidden" }}>
          <div className="marquee-track">
            {[...BRANDS, ...BRANDS].map((brand, i) => (
              <span key={i} className="brand-pill">
                <span style={{ width: 8, height: 8, borderRadius: "50%", background: `${theme.primary}70`, display: "inline-block" }} />
                {brand}
              </span>
            ))}
          </div>
        </div>

        <p style={{ textAlign: "center", fontSize: 11, color: theme.textMuted, marginTop: 14, letterSpacing: 1.5, textTransform: "uppercase", fontWeight: 600 }}>
          Referanslarımız & Çalıştığımız Markalar
        </p>
      </section>

      {/* ── BİZ KİMİZ SECTION ── */}
      <section style={{ padding: `${spacing.sectionPadding} 40px`, maxWidth: 1200, margin: "0 auto" }}>
        <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: 80, alignItems: "center" }}>

          {/* Left: Text */}
          <div>
            <span className="section-badge"><Users size={12} /> Biz Kimiz?</span>
            <h2 style={{
              fontFamily: "Syne, sans-serif", fontWeight: 900,
              fontSize: "clamp(32px, 4vw, 52px)", lineHeight: 1.1,
              letterSpacing: "-2px", marginBottom: 24, color: theme.textMain,
            }}>
              +80 Kişilik Ekibimiz{" "}
              <span style={{
                background: `linear-gradient(135deg, ${theme.secondary}, ${theme.primary})`,
                WebkitBackgroundClip: "text", WebkitTextFillColor: "transparent", backgroundClip: "text",
              }}>
                Büyümeye Devam Ediyor.
              </span>
            </h2>
            <p style={{ fontSize: 16, lineHeight: 1.8, color: theme.textMuted, marginBottom: 32 }}>
              Decha olarak; SEO uzmanları, sosyal medya stratejistleri, yazılım geliştiriciler ve kreatif tasarımcılardan oluşan dinamik bir ekiple işletmenizi dijital dünyada öne çıkarıyoruz. Her müşterimize özel, veri odaklı büyüme stratejileri geliştiriyor ve ölçülebilir sonuçlar sunuyoruz.
            </p>

            <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr 1fr", gap: 16, marginBottom: 40 }}>
              {[
                { value: "+80", label: "Uzman Ekip" },
                { value: "500+", label: "Proje Teslim" },
                { value: "%94", label: "Müşteri Memnuniyeti" },
              ].map(({ value, label }) => (
                <div key={label} className="stat-chip">
                  <div style={{ fontFamily: "Syne, sans-serif", fontSize: 28, fontWeight: 900, color: theme.primary, letterSpacing: "-1px" }}>{value}</div>
                  <div style={{ fontSize: 12, color: theme.textMuted, marginTop: 4, fontWeight: 600 }}>{label}</div>
                </div>
              ))}
            </div>

            <button className="cta-primary" onClick={() => scrollTo("contact")} style={{ animation: "none" }}>
              <span style={{ display: "flex", alignItems: "center", gap: 8 }}>
                <TrendingUp size={16} /> Birlikte Büyüyelim
              </span>
            </button>
          </div>

          {/* Right: Video/Media box */}
          <div>
            <div className="who-video-box" style={{ background: `linear-gradient(135deg, ${theme.primary}10, ${theme.secondary}08)` }}>
              {/* Decorative inner grid */}
              <div style={{
                position: "absolute", inset: 0,
                backgroundImage: `linear-gradient(${theme.primary}10 1px, transparent 1px), linear-gradient(90deg, ${theme.primary}10 1px, transparent 1px)`,
                backgroundSize: "32px 32px",
              }} />
              {/* Corner accents */}
              {[["0%","0%","right","bottom"],["0%","100%","right","top"],["100%","0%","left","bottom"],["100%","100%","left","top"]].map(([t,l,br,bb], i) => (
                <div key={i} style={{
                  position: "absolute", top: t === "0%" ? 20 : "auto", bottom: t !== "0%" ? 20 : "auto",
                  left: l === "0%" ? 20 : "auto", right: l !== "0%" ? 20 : "auto",
                  width: 24, height: 24,
                  borderTop: t === "0%" ? `2px solid ${theme.primary}` : "none",
                  borderBottom: t !== "0%" ? `2px solid ${theme.primary}` : "none",
                  borderLeft: l === "0%" ? `2px solid ${theme.primary}` : "none",
                  borderRight: l !== "0%" ? `2px solid ${theme.primary}` : "none",
                }} />
              ))}
              <div style={{ position: "relative", textAlign: "center" }}>
                <button className="play-btn">
                  <svg width="22" height="22" viewBox="0 0 24 24" fill="#fff"><path d="M8 5v14l11-7z"/></svg>
                </button>
                <p style={{ marginTop: 16, fontSize: 13, color: theme.textMuted, fontWeight: 600 }}>Tanıtım Filmimizi İzleyin</p>
              </div>
            </div>
          </div>
        </div>
      </section>

      {/* ── SERVICES SECTION ── */}
      <section id="services" style={{ padding: `${spacing.sectionPadding} 40px`, background: `linear-gradient(180deg, transparent, ${theme.primary}06, transparent)`, position: "relative", overflow: "hidden" }}>
        <div style={{ position: "absolute", top: "20%", right: "-10%", width: 500, height: 500, borderRadius: "50%", background: `radial-gradient(circle, ${theme.primary}0a 0%, transparent 70%)`, pointerEvents: "none" }} />

        <div style={{ maxWidth: 1200, margin: "0 auto", position: "relative", zIndex: 1 }}>

          {/* Header */}
          <div style={{ textAlign: "center", marginBottom: 72 }}>
            <span className="section-badge"><Layers size={12} /> Hizmetlerimiz</span>
            <h2 style={{ fontFamily: "Syne, sans-serif", fontWeight: 900, fontSize: "clamp(28px, 4vw, 52px)", letterSpacing: "-2.5px", color: theme.textMain, marginBottom: 16 }}>
              Sadece mecraları değil,{" "}
              <span style={{ background: `linear-gradient(135deg, ${theme.secondary}, ${theme.primary})`, WebkitBackgroundClip: "text", WebkitTextFillColor: "transparent", backgroundClip: "text" }}>
                hedeflerini de
              </span>{" "}yönetiyoruz.
            </h2>
            <p style={{ fontSize: 17, color: theme.textMuted, maxWidth: 560, margin: "0 auto", lineHeight: 1.7 }}>
              Dijital büyümenin her adımında yanınızdayız — strateji, içerik, satış ve ötesi.
            </p>
          </div>

          {/* Sub-service badges row */}
          <div style={{ display: "flex", flexWrap: "wrap", gap: 10, justifyContent: "center", marginBottom: 64 }}>
            {[
              { label: "SEO & SEM", icon: <Search size={13} /> },
              { label: "SMS / Mail Marketing", icon: <Mail size={13} /> },
              { label: "Grafik & Kreatif Destek", icon: <Palette size={13} /> },
              { label: "İçerik Üretimi", icon: <ImageIcon size={13} /> },
              { label: "Reklam Yönetimi", icon: <Megaphone size={13} /> },
              { label: "Marka Stratejisi", icon: <Award size={13} /> },
              { label: "Veri & Analitik", icon: <BarChart size={13} /> },
              { label: "Müşteri Hizmetleri", icon: <MessageCircle size={13} /> },
            ].map(({ label, icon }) => (
              <span key={label} className="sub-badge">
                {icon} {label}
              </span>
            ))}
          </div>

          {/* Main 4 service cards — 2x2 grid */}
          <div style={{ display: "grid", gridTemplateColumns: "repeat(2, 1fr)", gap: 24 }}>

            {/* Card 1 — E-Ticaret */}
            <div className="main-svc-card"
              onMouseEnter={() => setHovered("eticaret")}
              onMouseLeave={() => setHovered(null)}
              style={{ borderColor: hovered === "eticaret" ? theme.primary : theme.border }}>
              <div className="main-svc-icon-wrap" style={{ background: `${theme.primary}15`, borderColor: `${theme.primary}30` }}>
                <ShoppingCart size={30} color={theme.primary} strokeWidth={1.4} />
              </div>
              <span className="main-svc-tag" style={{ color: theme.primary, background: `${theme.primary}10`, borderColor: `${theme.primary}30` }}>E-Ticaret</span>
              <h3 className="main-svc-title">E-Ticaret<br />Çözümleri</h3>
              <p className="main-svc-desc">
                Kendi web siteniz veya pazar yerlerinizde satışlarınızı artıracak uçtan uca e-ticaret altyapısı ve büyüme stratejisi sunuyoruz. Sepet optimizasyonundan lojistik entegrasyonuna kadar her adımda yanınızdayız.
              </p>
              <div className="main-svc-tags-row">
                {["Shopify / WooCommerce", "Ödeme Entegrasyonu", "Lojistik", "CRO"].map(t => (
                  <span key={t} className="mini-tag">{t}</span>
                ))}
              </div>
              <button className="detail-btn" style={{ borderColor: `${theme.primary}50`, color: theme.primary }}
                onMouseEnter={e => { e.currentTarget.style.background = theme.primary; e.currentTarget.style.color = "#fff"; }}
                onMouseLeave={e => { e.currentTarget.style.background = "transparent"; e.currentTarget.style.color = theme.primary; }}>
                Detayları Gör <ChevronRight size={15} />
              </button>
            </div>

            {/* Card 2 — E-İhracat */}
            <div className="main-svc-card"
              onMouseEnter={() => setHovered("eihracat")}
              onMouseLeave={() => setHovered(null)}
              style={{ borderColor: hovered === "eihracat" ? "#38bdf8" : theme.border }}>
              <div className="main-svc-icon-wrap" style={{ background: "rgba(56,189,248,0.1)", borderColor: "rgba(56,189,248,0.25)" }}>
                <Globe size={30} color="#38bdf8" strokeWidth={1.4} />
              </div>
              <span className="main-svc-tag" style={{ color: "#38bdf8", background: "rgba(56,189,248,0.08)", borderColor: "rgba(56,189,248,0.25)" }}>E-İhracat</span>
              <h3 className="main-svc-title">Global Pazarlara<br />Açılın</h3>
              <p className="main-svc-desc">
                Amazon, Etsy, eBay ve diğer global pazar yerlerinde mağaza kurulumu, ürün listeleme optimizasyonu ve uluslararası satış stratejileriyle dünyanın her yerine satış yapın.
              </p>
              <div className="main-svc-tags-row">
                {["Amazon FBA", "Etsy / eBay", "Döviz Yönetimi", "Gümrük Danışmanlığı"].map(t => (
                  <span key={t} className="mini-tag" style={{ borderColor: "rgba(56,189,248,0.25)", color: "#94a3b8" }}>{t}</span>
                ))}
              </div>
              <button className="detail-btn" style={{ borderColor: "rgba(56,189,248,0.4)", color: "#38bdf8" }}
                onMouseEnter={e => { e.currentTarget.style.background = "#38bdf8"; e.currentTarget.style.color = "#07070f"; }}
                onMouseLeave={e => { e.currentTarget.style.background = "transparent"; e.currentTarget.style.color = "#38bdf8"; }}>
                Detayları Gör <ChevronRight size={15} />
              </button>
            </div>

            {/* Card 3 — Pazaryeri Danışmanlığı */}
            <div className="main-svc-card"
              onMouseEnter={() => setHovered("pazaryeri")}
              onMouseLeave={() => setHovered(null)}
              style={{ borderColor: hovered === "pazaryeri" ? "#fb923c" : theme.border }}>
              <div className="main-svc-icon-wrap" style={{ background: "rgba(251,146,60,0.1)", borderColor: "rgba(251,146,60,0.25)" }}>
                <ShoppingBag size={30} color="#fb923c" strokeWidth={1.4} />
              </div>
              <span className="main-svc-tag" style={{ color: "#fb923c", background: "rgba(251,146,60,0.08)", borderColor: "rgba(251,146,60,0.25)" }}>Pazaryeri</span>
              <h3 className="main-svc-title">Pazaryeri<br />Danışmanlığı</h3>
              <p className="main-svc-desc">
                Trendyol, Hepsiburada, n11, Getir ve Yemeksepeti'nde mağazanızı sıfırdan kuruyor, kategori analizleri yapıyor, kampanya yönetimi ve reklam optimizasyonu ile satışlarınızı zirveye taşıyoruz.
              </p>
              <div className="main-svc-tags-row">
                {["Trendyol", "Hepsiburada", "Getir / Yemeksepeti", "Reklam Yönetimi"].map(t => (
                  <span key={t} className="mini-tag" style={{ borderColor: "rgba(251,146,60,0.25)", color: "#94a3b8" }}>{t}</span>
                ))}
              </div>
              <button className="detail-btn" style={{ borderColor: "rgba(251,146,60,0.4)", color: "#fb923c" }}
                onMouseEnter={e => { e.currentTarget.style.background = "#fb923c"; e.currentTarget.style.color = "#07070f"; }}
                onMouseLeave={e => { e.currentTarget.style.background = "transparent"; e.currentTarget.style.color = "#fb923c"; }}>
                Detayları Gör <ChevronRight size={15} />
              </button>
            </div>

            {/* Card 4 — UGC / Influencer Marketing */}
            <div className="main-svc-card"
              onMouseEnter={() => setHovered("ugc")}
              onMouseLeave={() => setHovered(null)}
              style={{ borderColor: hovered === "ugc" ? "#f472b6" : theme.border }}>
              <div className="main-svc-icon-wrap" style={{ background: "rgba(244,114,182,0.1)", borderColor: "rgba(244,114,182,0.25)" }}>
                <Megaphone size={30} color="#f472b6" strokeWidth={1.4} />
              </div>
              <span className="main-svc-tag" style={{ color: "#f472b6", background: "rgba(244,114,182,0.08)", borderColor: "rgba(244,114,182,0.25)" }}>UGC & Influencer</span>
              <h3 className="main-svc-title">UGC / Influencer<br />Marketing</h3>
              <p className="main-svc-desc">
                Markanıza özgün içerik üreticileri (UGC creator) ve doğru influencer iş birlikleriyle bağlantı kuruyoruz. İçerik planlaması, brief hazırlama ve performans ölçümünü biz üstleniyoruz.
              </p>
              <div className="main-svc-tags-row">
                {["UGC Creator", "Instagram / TikTok", "Brief & Yönetim", "ROI Takibi"].map(t => (
                  <span key={t} className="mini-tag" style={{ borderColor: "rgba(244,114,182,0.25)", color: "#94a3b8" }}>{t}</span>
                ))}
              </div>
              <button className="detail-btn" style={{ borderColor: "rgba(244,114,182,0.4)", color: "#f472b6" }}
                onMouseEnter={e => { e.currentTarget.style.background = "#f472b6"; e.currentTarget.style.color = "#07070f"; }}
                onMouseLeave={e => { e.currentTarget.style.background = "transparent"; e.currentTarget.style.color = "#f472b6"; }}>
                Detayları Gör <ChevronRight size={15} />
              </button>
            </div>

          </div>
        </div>
      </section>

      {/* ── AKADEMİ & MENTÖRLÜK SECTION ── */}
      <section style={{ padding: `${spacing.sectionPadding} 40px`, borderTop: `1px solid ${theme.border}` }}>
        <div style={{ maxWidth: 1200, margin: "0 auto" }}>
          <div style={{ textAlign: "center", marginBottom: 64 }}>
            <span className="section-badge"><Cpu size={12} /> Eğitim & Danışmanlık</span>
            <h2 style={{ fontFamily: "Syne, sans-serif", fontWeight: 900, fontSize: "clamp(28px, 4vw, 52px)", letterSpacing: "-2.5px", color: theme.textMain, marginBottom: 16 }}>
              Bil, Uygula,{" "}
              <span style={{ background: `linear-gradient(135deg, ${theme.secondary}, ${theme.primary})`, WebkitBackgroundClip: "text", WebkitTextFillColor: "transparent", backgroundClip: "text" }}>
                Büyü.
              </span>
            </h2>
            <p style={{ fontSize: 17, color: theme.textMuted, maxWidth: 540, margin: "0 auto", lineHeight: 1.7 }}>
              Hem kendiniz öğrenin hem de uzman ekibimizin rehberliğinde kampanyalarınızı yönetin.
            </p>
          </div>

          <div style={{ display: "grid", gridTemplateColumns: "3fr 2fr", gap: 28 }}>

            {/* Akademi Card */}
            <div className="edu-card" style={{ background: `linear-gradient(135deg, ${theme.primary}12, ${theme.secondary}08)`, borderColor: `${theme.primary}30` }}>
              <div style={{ display: "flex", alignItems: "flex-start", justifyContent: "space-between", marginBottom: 28 }}>
                <div>
                  <span className="section-badge" style={{ marginBottom: 12 }}><Sparkles size={12} /> E-adam Akademi</span>
                  <h3 style={{ fontFamily: "Syne, sans-serif", fontSize: 32, fontWeight: 900, color: theme.textMain, letterSpacing: "-1.5px", lineHeight: 1.1 }}>
                    Dijital Pazarlama<br />Eğitimleri
                  </h3>
                </div>
                <div style={{ width: 72, height: 72, borderRadius: 20, background: `linear-gradient(135deg, ${theme.secondary}, ${theme.primary})`, display: "flex", alignItems: "center", justifyContent: "center", flexShrink: 0, boxShadow: `0 12px 32px ${theme.primary}40` }}>
                  <Monitor size={32} color="#fff" strokeWidth={1.4} />
                </div>
              </div>

              <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr 1fr", gap: 14, marginBottom: 32 }}>
                {[
                  { icon: <Search size={18} />, title: "SEO Eğitimi", sub: "12 modül · Başlangıç–İleri", color: "#22c55e" },
                  { icon: <Megaphone size={18} />, title: "Google Ads", sub: "8 modül · Uygulamalı", color: "#38bdf8" },
                  { icon: <Share2 size={18} />, title: "Meta Business", sub: "10 modül · Kampanya odaklı", color: "#f472b6" },
                ].map(({ icon, title, sub, color }) => (
                  <div key={title} style={{ background: "rgba(255,255,255,0.04)", borderRadius: 16, padding: "18px 16px", border: `1px solid rgba(255,255,255,0.06)`, transition: "all 0.25s" }}
                    onMouseEnter={e => { e.currentTarget.style.borderColor = `${color}40`; e.currentTarget.style.transform = "translateY(-4px)"; }}
                    onMouseLeave={e => { e.currentTarget.style.borderColor = "rgba(255,255,255,0.06)"; e.currentTarget.style.transform = "translateY(0)"; }}>
                    <div style={{ width: 40, height: 40, borderRadius: 12, background: `${color}20`, display: "flex", alignItems: "center", justifyContent: "center", marginBottom: 12, color }}>
                      {icon}
                    </div>
                    <div style={{ fontFamily: "Syne, sans-serif", fontSize: 14, fontWeight: 800, color: theme.textMain, marginBottom: 4 }}>{title}</div>
                    <div style={{ fontSize: 11, color: theme.textMuted, lineHeight: 1.5 }}>{sub}</div>
                  </div>
                ))}
              </div>

              <div style={{ display: "flex", alignItems: "center", justifyContent: "space-between", flexWrap: "wrap", gap: 16 }}>
                <div style={{ display: "flex", gap: 16 }}>
                  {[["500+", "Mezun"], ["30+", "Saat İçerik"], ["4.9★", "Puan"]].map(([val, lbl]) => (
                    <div key={lbl}>
                      <div style={{ fontFamily: "Syne, sans-serif", fontSize: 22, fontWeight: 900, color: theme.primary }}>{val}</div>
                      <div style={{ fontSize: 11, color: theme.textMuted, fontWeight: 600 }}>{lbl}</div>
                    </div>
                  ))}
                </div>
                <button className="cta-primary" style={{ animation: "none", fontSize: 14, padding: "13px 26px" }}
                  onClick={() => scrollTo("contact")}>
                  <span style={{ display: "flex", alignItems: "center", gap: 8 }}><Rocket size={15} /> Programa Başvur</span>
                </button>
              </div>
            </div>

            {/* Mentörlük Card */}
            <div className="edu-card" style={{ background: "linear-gradient(135deg, rgba(56,189,248,0.08), rgba(99,102,241,0.06))", borderColor: "rgba(56,189,248,0.25)", display: "flex", flexDirection: "column", justifyContent: "space-between" }}>
              <div>
                <span className="section-badge" style={{ marginBottom: 12, borderColor: "rgba(56,189,248,0.35)", background: "rgba(56,189,248,0.08)", color: "#38bdf8" }}>
                  <Target size={12} /> Mentörlük
                </span>
                <h3 style={{ fontFamily: "Syne, sans-serif", fontSize: 28, fontWeight: 900, color: theme.textMain, letterSpacing: "-1.2px", lineHeight: 1.1, marginBottom: 16 }}>
                  Bire Bir<br />Kampanya Yönetimi
                </h3>
                <p style={{ fontSize: 14.5, color: theme.textMuted, lineHeight: 1.75, marginBottom: 28 }}>
                  Deneyimli danışmanlarımız işletmenizin kampanya süreçlerini bizzat yönetiyor. Haftalık raporlama, A/B testleri ve anlık optimizasyonla hedeflerinize birlikte ulaşıyoruz.
                </p>

                <div style={{ display: "flex", flexDirection: "column", gap: 12, marginBottom: 32 }}>
                  {[
                    "Haftalık 1:1 strateji görüşmesi",
                    "Canlı reklam hesabı yönetimi",
                    "Aylık detaylı performans raporu",
                    "Öncelikli destek & anlık mesajlaşma",
                  ].map(item => (
                    <div key={item} style={{ display: "flex", alignItems: "center", gap: 10, fontSize: 13.5, color: theme.textMuted }}>
                      <div style={{ width: 20, height: 20, borderRadius: "50%", background: "rgba(56,189,248,0.15)", border: "1px solid rgba(56,189,248,0.3)", display: "flex", alignItems: "center", justifyContent: "center", flexShrink: 0 }}>
                        <CheckCircle size={11} color="#38bdf8" />
                      </div>
                      {item}
                    </div>
                  ))}
                </div>
              </div>

              <button className="detail-btn" style={{ borderColor: "rgba(56,189,248,0.4)", color: "#38bdf8", width: "100%", justifyContent: "center", padding: "15px" }}
                onMouseEnter={e => { e.currentTarget.style.background = "#38bdf8"; e.currentTarget.style.color = "#07070f"; }}
                onMouseLeave={e => { e.currentTarget.style.background = "transparent"; e.currentTarget.style.color = "#38bdf8"; }}
                onClick={() => scrollTo("contact")}>
                Mentörlük Programını Keşfet <ChevronRight size={15} />
              </button>
            </div>

          </div>
        </div>
      </section>

      {/* ── TESTIMONIALS CAROUSEL ── */}
      <section id="testimonials" style={{ padding: `${spacing.sectionPadding} 0`, background: `linear-gradient(180deg, transparent, ${theme.primary}05, transparent)`, overflow: "hidden" }}>
        <div style={{ maxWidth: 1200, margin: "0 auto", padding: "0 40px", marginBottom: 48 }}>
          <div style={{ display: "flex", alignItems: "flex-end", justifyContent: "space-between", flexWrap: "wrap", gap: 24 }}>
            <div>
              <span className="section-badge"><Star size={12} /> Başarı Hikayeleri</span>
              <h2 style={{ fontFamily: "Syne, sans-serif", fontWeight: 900, fontSize: "clamp(28px, 4vw, 52px)", letterSpacing: "-2.5px", color: theme.textMain, marginBottom: 12 }}>
                Müşterilerimiz<br />
                <span style={{ background: `linear-gradient(135deg, ${theme.secondary}, ${theme.primary})`, WebkitBackgroundClip: "text", WebkitTextFillColor: "transparent", backgroundClip: "text" }}>
                  Ne Diyor?
                </span>
              </h2>
              <p style={{ fontSize: 16, color: theme.textMuted, maxWidth: 460, lineHeight: 1.7 }}>
                Gerçek müşteriler, gerçek sonuçlar. Büyüme hikayelerini onların ağzından dinleyin.
              </p>
            </div>

            {/* Carousel controls */}
            <div style={{ display: "flex", alignItems: "center", gap: 12 }}>
              <button className="carousel-btn"
                onClick={() => setSliderIndex(i => Math.max(0, i - 1))}
                style={{ opacity: sliderIndex === 0 ? 0.35 : 1 }}>
                <ChevronRight size={20} style={{ transform: "rotate(180deg)" }} />
              </button>
              <div style={{ display: "flex", gap: 6 }}>
                {Array.from({ length: Math.max(1, data.testimonials.length - 1) }).map((_, i) => (
                  <button key={i} onClick={() => setSliderIndex(i)} style={{
                    width: sliderIndex === i ? 24 : 8, height: 8, borderRadius: 4, border: "none", cursor: "pointer",
                    background: sliderIndex === i ? theme.primary : theme.border,
                    transition: "all 0.3s", padding: 0,
                  }} />
                ))}
              </div>
              <button className="carousel-btn"
                onClick={() => setSliderIndex(i => Math.min(data.testimonials.length - 2, i + 1))}
                style={{ opacity: sliderIndex >= data.testimonials.length - 2 ? 0.35 : 1 }}>
                <ChevronRight size={20} />
              </button>
            </div>
          </div>
        </div>

        {/* Slider track */}
        <div style={{ overflow: "hidden", padding: "8px 0 32px" }}>
          <div style={{
            display: "flex", gap: 24,
            transform: `translateX(calc(-${sliderIndex * 440}px + 40px))`,
            transition: "transform 0.5s cubic-bezier(0.4,0,0.2,1)",
            paddingLeft: 40, paddingRight: 40,
          }}>
            {[
              ...data.testimonials,
              { id: "x1", name: "Zeynep Kara", role: "Butik Sahibi · İstanbul", initials: "ZK", text: "Decha ekibiyle çalışmaya başladıktan 2 ay sonra Instagram satışlarımız 3 katına çıktı. Influencer seçimlerindeki hassasiyetleri inanılmaz." },
              { id: "x2", name: "Mert Özkan", role: "E-ticaret Girişimcisi", initials: "MÖ", text: "Amazon FBA konusunda hiçbir fikrim yokken, Decha'nın E-ihracat danışmanlığıyla artık 14 ülkeye satış yapıyorum. Süreç inanılmaz akıcıydı." },
              { id: "x3", name: "Selin Arslan", role: "Kozmetik Markası Kurucusu", initials: "SA", text: "Google Ads harcamamızı %40 düşürürken dönüşümlerimizi ikiye katladılar. Veri odaklı yaklaşımları gerçekten fark yaratıyor." },
              { id: "x4", name: "Burak Yıldız", role: "Trendyol Satıcısı", initials: "BY", text: "Pazaryeri danışmanlığı hizmetleri sayesinde Trendyol'da ilk ayda 800+ sipariş aldım. Mağaza kurulumundan kampanya yönetimine her şey mükemmeldi." },
            ].map((t) => (
              <div key={t.id} className="testi-slide-card">
                {/* Quote mark */}
                <div style={{ fontFamily: "Syne, sans-serif", fontSize: 64, lineHeight: 0.8, color: `${theme.primary}30`, fontWeight: 900, marginBottom: 4, userSelect: "none" }}>"</div>

                {/* Stars */}
                <div style={{ display: "flex", gap: 4, marginBottom: 20 }}>
                  {[1,2,3,4,5].map(s => <Star key={s} size={16} fill={theme.primary} color={theme.primary} />)}
                </div>

                {/* Quote */}
                <p style={{
                  fontSize: 17, lineHeight: 1.7, color: theme.textMain,
                  fontWeight: 600, marginBottom: 32, flex: 1,
                  fontStyle: "italic",
                }}>
                  {t.text}
                </p>

                {/* Author */}
                <div style={{ display: "flex", alignItems: "center", gap: 16, borderTop: `1px solid ${theme.border}`, paddingTop: 24 }}>
                  <div style={{
                    width: 52, height: 52, borderRadius: "50%", flexShrink: 0,
                    background: `linear-gradient(135deg, ${theme.secondary}, ${theme.primary})`,
                    display: "flex", alignItems: "center", justifyContent: "center",
                    fontFamily: "Syne, sans-serif", fontWeight: 900, fontSize: 16, color: "#fff",
                    boxShadow: `0 0 0 3px ${theme.primary}30`,
                  }}>
                    {t.initials}
                  </div>
                  <div>
                    <div style={{ fontFamily: "Syne, sans-serif", fontWeight: 800, fontSize: 16, color: theme.textMain, letterSpacing: "-0.3px" }}>{t.name}</div>
                    <div style={{ fontSize: 13, color: theme.textMuted, marginTop: 2 }}>{t.role}</div>
                  </div>
                </div>
              </div>
            ))}
          </div>
        </div>
      </section>

      {/* ── CONTACT SECTION ── */}
      <section id="contact" style={{ padding: `${spacing.sectionPadding} 40px` }}>
        <div style={{ maxWidth: 680, margin: "0 auto" }}>
          <div style={{ textAlign: "center", marginBottom: 56 }}>
            <span className="section-badge"><Send size={12} /> {data.contact?.badge || "İletişim"}</span>
            <h2 style={{ fontFamily: "Syne, sans-serif", fontWeight: 900, fontSize: "clamp(28px, 4vw, 48px)", letterSpacing: "-2px", color: theme.textMain, marginBottom: 16 }}>
              {data.contact?.title || "Haydi Başlayalım"}
            </h2>
            <p style={{ fontSize: 16, color: theme.textMuted, lineHeight: 1.7 }}>
              {data.contact?.subtitle || "Projenizi anlatın, size özel bir büyüme planı hazırlayalım."}
            </p>
          </div>

          <div style={{ background: theme.cardBg, border: `1px solid ${theme.border}`, borderRadius: 28, padding: 48, backdropFilter: "blur(16px)" }}>
            {sent ? (
              <div style={{ textAlign: "center", padding: "40px 0" }}>
                <CheckCircle size={56} color={theme.primary} style={{ margin: "0 auto 20px", display: "block" }} />
                <h3 style={{ fontFamily: "Syne, sans-serif", fontSize: 24, fontWeight: 800, color: theme.textMain, marginBottom: 12 }}>{data.contact?.successTitle || "Mesajınız İletildi!"}</h3>
                <p style={{ color: theme.textMuted, fontSize: 15, lineHeight: 1.7 }}>{data.contact?.successBody || "En kısa sürede sizinle iletişime geçeceğiz."}</p>
              </div>
            ) : (
              <div style={{ display: "flex", flexDirection: "column", gap: 20 }}>
                <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: 20 }}>
                  <input className="form-input" placeholder={data.contact?.namePlaceholder || "Adınız Soyadınız"} value={form.name} onChange={e => setForm({ ...form, name: e.target.value })} />
                  <input className="form-input" type="email" placeholder={data.contact?.emailPlaceholder || "E-posta Adresiniz"} value={form.email} onChange={e => setForm({ ...form, email: e.target.value })} />
                </div>
                <textarea className="form-input" placeholder={data.contact?.msgPlaceholder || "Projenizi anlatın..."} rows={5} style={{ resize: "vertical" }} value={form.msg} onChange={e => setForm({ ...form, msg: e.target.value })} />
                {sendErr && <p style={{ color: "#f87171", fontSize: 13 }}>{sendErr}</p>}
                <button className="cta-primary" style={{ animation: "none", width: "100%", padding: "18px" }} onClick={sendForm} disabled={sending}>
                  {sending ? "Gönderiliyor..." : (
                    <span style={{ display: "flex", alignItems: "center", justifyContent: "center", gap: 8 }}>
                      <Send size={16} /> {data.contact?.sendButton || "Mesaj Gönder"}
                    </span>
                  )}
                </button>
              </div>
            )}
          </div>
        </div>
      </section>

      {/* ── SOSYAL MEDYA IZGARASI ── */}
      <section style={{ padding: `${spacing.sectionPadding} 40px`, borderTop: `1px solid ${theme.border}` }}>
        <div style={{ maxWidth: 1200, margin: "0 auto" }}>
          <div style={{ textAlign: "center", marginBottom: 56 }}>
            <span className="section-badge"><ImageIcon size={12} /> Ajans Hayatı</span>
            <h2 style={{ fontFamily: "Syne, sans-serif", fontWeight: 900, fontSize: "clamp(28px, 4vw, 52px)", letterSpacing: "-2.5px", color: theme.textMain, marginBottom: 16 }}>
              Sosyal Medya{" "}
              <span style={{ background: `linear-gradient(135deg, ${theme.secondary}, ${theme.primary})`, WebkitBackgroundClip: "text", WebkitTextFillColor: "transparent", backgroundClip: "text" }}>
                İçeriklerimiz
              </span>
            </h2>
            <p style={{ fontSize: 16, color: theme.textMuted, maxWidth: 480, margin: "0 auto", lineHeight: 1.7 }}>
              Kamera arkası, ekip anları ve müşteri başarı hikayeleri — tüm bunlar için bizi takip edin.
            </p>
          </div>

          {/* Asimetrik Grid */}
          <div style={{ display: "grid", gridTemplateColumns: "2fr 1fr 1fr", gridTemplateRows: "280px 220px", gap: 12 }}>
            {/* Büyük sol */}
            <div className="social-grid-item" style={{ gridRow: "1 / 3", background: `linear-gradient(135deg, ${theme.primary}30, ${theme.secondary}20, rgba(56,189,248,0.15))`, animationDelay: "0s" }}>
              <div style={{ position: "absolute", inset: 0, display: "flex", flexDirection: "column", alignItems: "center", justifyContent: "center", gap: 12 }}>
                <div style={{ width: 56, height: 56, borderRadius: 16, background: `linear-gradient(135deg, #e1306c, #833ab4, #fd1d1d)`, display: "flex", alignItems: "center", justifyContent: "center" }}>
                  <svg width="28" height="28" viewBox="0 0 24 24" fill="none" stroke="white" strokeWidth="1.8" strokeLinecap="round" strokeLinejoin="round"><rect x="2" y="2" width="20" height="20" rx="5" ry="5"/><path d="M16 11.37A4 4 0 1 1 12.63 8 4 4 0 0 1 16 11.37z"/><line x1="17.5" y1="6.5" x2="17.51" y2="6.5"/></svg>
                </div>
                <div style={{ textAlign: "center" }}>
                  <div style={{ fontFamily: "Syne, sans-serif", fontWeight: 900, fontSize: 18, color: theme.textMain }}>@decha.digital</div>
                  <div style={{ fontSize: 13, color: theme.textMuted, marginTop: 4 }}>24.6K Takipçi</div>
                </div>
                {/* Fake post grid */}
                <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr 1fr", gap: 4, width: 160, marginTop: 8 }}>
                  {["#a855f720","#c084fc18","#818cf820","#38bdf820","#a855f718","#c084fc22"].map((bg, i) => (
                    <div key={i} style={{ aspectRatio: "1", borderRadius: 6, background: `linear-gradient(135deg, ${bg}, ${theme.primary}12)`, border: `1px solid ${theme.border}` }} />
                  ))}
                </div>
              </div>
              <div className="overlay">
                <span style={{ fontSize: 12, fontWeight: 700, color: "#fff", letterSpacing: 1, textTransform: "uppercase" }}>Instagram</span>
              </div>
            </div>

            {/* Sağ üst 1 */}
            <div className="social-grid-item" style={{ background: `linear-gradient(135deg, rgba(0,0,0,0.6), rgba(24,24,36,0.9))`, border: `1px solid ${theme.border}`, animationDelay: "0.08s" }}>
              <div style={{ position: "absolute", inset: 0, display: "flex", flexDirection: "column", alignItems: "center", justifyContent: "center", gap: 8 }}>
                <div style={{ width: 44, height: 44, borderRadius: 12, background: "linear-gradient(135deg, #010101, #69C9D0)", display: "flex", alignItems: "center", justifyContent: "center" }}>
                  <svg width="22" height="22" viewBox="0 0 24 24" fill="white"><path d="M19.59 6.69a4.83 4.83 0 0 1-3.77-4.25V2h-3.45v13.67a2.89 2.89 0 0 1-2.88 2.5 2.89 2.89 0 0 1-2.89-2.89 2.89 2.89 0 0 1 2.89-2.89c.28 0 .54.04.79.1V9.01a6.33 6.33 0 0 0-.79-.05 6.34 6.34 0 0 0-6.34 6.34 6.34 6.34 0 0 0 6.34 6.34 6.34 6.34 0 0 0 6.33-6.34V8.94a8.18 8.18 0 0 0 4.78 1.52V7.01a4.85 4.85 0 0 1-1.01-.32z"/></svg>
                </div>
                <div style={{ fontFamily: "Syne, sans-serif", fontWeight: 800, fontSize: 14, color: theme.textMain }}>TikTok</div>
                <div style={{ fontSize: 12, color: theme.textMuted }}>1.2M Görüntülenme</div>
              </div>
              <div className="overlay">
                <span style={{ fontSize: 12, fontWeight: 700, color: "#fff", letterSpacing: 1, textTransform: "uppercase" }}>TikTok</span>
              </div>
            </div>

            {/* Sağ üst 2 */}
            <div className="social-grid-item" style={{ background: `linear-gradient(135deg, rgba(0,119,255,0.15), rgba(0,61,168,0.2))`, border: `1px solid rgba(0,119,255,0.2)`, animationDelay: "0.12s" }}>
              <div style={{ position: "absolute", inset: 0, display: "flex", flexDirection: "column", alignItems: "center", justifyContent: "center", gap: 8 }}>
                <div style={{ width: 44, height: 44, borderRadius: 12, background: "#0077b5", display: "flex", alignItems: "center", justifyContent: "center" }}>
                  <svg width="22" height="22" viewBox="0 0 24 24" fill="white"><path d="M16 8a6 6 0 0 1 6 6v7h-4v-7a2 2 0 0 0-2-2 2 2 0 0 0-2 2v7h-4v-7a6 6 0 0 1 6-6z"/><rect x="2" y="9" width="4" height="12"/><circle cx="4" cy="4" r="2"/></svg>
                </div>
                <div style={{ fontFamily: "Syne, sans-serif", fontWeight: 800, fontSize: 14, color: theme.textMain }}>LinkedIn</div>
                <div style={{ fontSize: 12, color: theme.textMuted }}>8.4K Bağlantı</div>
              </div>
              <div className="overlay">
                <span style={{ fontSize: 12, fontWeight: 700, color: "#fff", letterSpacing: 1, textTransform: "uppercase" }}>LinkedIn</span>
              </div>
            </div>

            {/* Alt orta */}
            <div className="social-grid-item" style={{ background: `linear-gradient(135deg, rgba(255,0,0,0.1), rgba(168,85,247,0.12))`, border: `1px solid rgba(255,0,0,0.15)`, animationDelay: "0.16s" }}>
              <div style={{ position: "absolute", inset: 0, display: "flex", flexDirection: "column", alignItems: "center", justifyContent: "center", gap: 8 }}>
                <div style={{ width: 44, height: 44, borderRadius: 12, background: "#ff0000", display: "flex", alignItems: "center", justifyContent: "center" }}>
                  <svg width="22" height="22" viewBox="0 0 24 24" fill="white"><path d="M22.54 6.42a2.78 2.78 0 0 0-1.95-1.96C18.88 4 12 4 12 4s-6.88 0-8.59.46a2.78 2.78 0 0 0-1.95 1.96A29 29 0 0 0 1 12a29 29 0 0 0 .46 5.58A2.78 2.78 0 0 0 3.41 19.6C5.12 20 12 20 12 20s6.88 0 8.59-.46a2.78 2.78 0 0 0 1.95-1.95A29 29 0 0 0 23 12a29 29 0 0 0-.46-5.58z"/><polygon points="9.75 15.02 15.5 12 9.75 8.98 9.75 15.02" fill="black"/></svg>
                </div>
                <div style={{ fontFamily: "Syne, sans-serif", fontWeight: 800, fontSize: 14, color: theme.textMain }}>YouTube</div>
                <div style={{ fontSize: 12, color: theme.textMuted }}>320 Abone</div>
              </div>
              <div className="overlay">
                <span style={{ fontSize: 12, fontWeight: 700, color: "#fff", letterSpacing: 1, textTransform: "uppercase" }}>YouTube</span>
              </div>
            </div>

            {/* Alt sağ */}
            <div className="social-grid-item" style={{ background: `linear-gradient(135deg, ${theme.primary}18, ${theme.secondary}12)`, border: `1px solid ${theme.border}`, animationDelay: "0.2s" }}>
              <div style={{ position: "absolute", inset: 0, display: "flex", flexDirection: "column", alignItems: "center", justifyContent: "center", gap: 6 }}>
                <div style={{ fontFamily: "Syne, sans-serif", fontWeight: 900, fontSize: 28, color: theme.primary, lineHeight: 1 }}>500+</div>
                <div style={{ fontSize: 12, fontWeight: 700, color: theme.textMuted, textAlign: "center", lineHeight: 1.4 }}>Aylık İçerik<br />Üretimi</div>
              </div>
              <div className="overlay">
                <span style={{ fontSize: 12, fontWeight: 700, color: "#fff", letterSpacing: 1 }}>İçerik Üretimi</span>
              </div>
            </div>
          </div>
        </div>
      </section>

      {/* ── BLOG VİTRİNİ ── */}
      <section style={{ padding: `${spacing.sectionPadding} 40px`, background: `linear-gradient(180deg, transparent, ${theme.primary}05, transparent)` }}>
        <div style={{ maxWidth: 1200, margin: "0 auto" }}>
          <div style={{ display: "flex", alignItems: "flex-end", justifyContent: "space-between", flexWrap: "wrap", gap: 20, marginBottom: 56 }}>
            <div>
              <span className="section-badge"><Paintbrush size={12} /> Blog & İçerik</span>
              <h2 style={{ fontFamily: "Syne, sans-serif", fontWeight: 900, fontSize: "clamp(28px, 4vw, 52px)", letterSpacing: "-2.5px", color: theme.textMain, marginBottom: 12 }}>
                Güncel{" "}
                <span style={{ background: `linear-gradient(135deg, ${theme.secondary}, ${theme.primary})`, WebkitBackgroundClip: "text", WebkitTextFillColor: "transparent", backgroundClip: "text" }}>
                  Blog Yazıları
                </span>
              </h2>
              <p style={{ fontSize: 16, color: theme.textMuted, maxWidth: 440, lineHeight: 1.7 }}>
                Dijital pazarlama dünyasından taze içerik ve pratik rehberler.
              </p>
            </div>
            <button className="cta-secondary" style={{ fontSize: 13, padding: "12px 26px" }}>
              <span style={{ display: "flex", alignItems: "center", gap: 8 }}>
                Tüm Yazılar <ChevronRight size={15} />
              </span>
            </button>
          </div>

          <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr 1fr", gap: 24 }}>
            {[
              {
                tag: "SEO", tagColor: "#22c55e",
                readTime: "5 dk okuma",
                title: "2025'te Google Sıralamasını Artıracak 7 SEO Stratejisi",
                excerpt: "Core Web Vitals güncellemeleri ve yapay zeka entegrasyonuyla değişen SEO dünyasında öne çıkmanın yolları.",
                gradient: `linear-gradient(135deg, rgba(34,197,94,0.15), rgba(16,185,129,0.08))`,
                border: "rgba(34,197,94,0.2)",
              },
              {
                tag: "Sosyal Medya", tagColor: "#f472b6",
                readTime: "4 dk okuma",
                title: "TikTok Algoritması: İçeriklerinizi Viral Yapacak Formüller",
                excerpt: "TikTok'un \"For You\" sayfasını fethetmek için içerik stratejisi, hook teknikleri ve yayın saati optimizasyonu.",
                gradient: `linear-gradient(135deg, rgba(244,114,182,0.15), rgba(168,85,247,0.08))`,
                border: "rgba(244,114,182,0.2)",
              },
              {
                tag: "E-Ticaret", tagColor: "#38bdf8",
                readTime: "6 dk okuma",
                title: "Trendyol Mağazanızı Sıfırdan Kurup İlk 30 Günde Satışa Açın",
                excerpt: "Kategori seçiminden ürün fotoğrafçılığına, fiyatlandırmadan kampanya yönetimine kapsamlı başlangıç rehberi.",
                gradient: `linear-gradient(135deg, rgba(56,189,248,0.15), rgba(99,102,241,0.08))`,
                border: "rgba(56,189,248,0.2)",
              },
            ].map((post, i) => (
              <div key={i} className="blog-card">
                {/* Cover image area */}
                <div style={{ height: 180, background: post.gradient, border: `1px solid ${post.border}`, borderRadius: "20px 20px 0 0", position: "relative", display: "flex", alignItems: "center", justifyContent: "center", overflow: "hidden" }}>
                  <div style={{ position: "absolute", inset: 0, backgroundImage: `linear-gradient(${post.border} 1px, transparent 1px), linear-gradient(90deg, ${post.border} 1px, transparent 1px)`, backgroundSize: "28px 28px" }} />
                  <div style={{ position: "relative", width: 56, height: 56, borderRadius: 16, background: `${post.tagColor}22`, border: `1px solid ${post.tagColor}40`, display: "flex", alignItems: "center", justifyContent: "center" }}>
                    <MoveVertical size={24} color={post.tagColor} strokeWidth={1.5} />
                  </div>
                </div>

                {/* Content */}
                <div style={{ padding: "28px 28px 24px", flex: 1, display: "flex", flexDirection: "column", gap: 12 }}>
                  <div style={{ display: "flex", alignItems: "center", justifyContent: "space-between" }}>
                    <span style={{ fontSize: 11, fontWeight: 700, color: post.tagColor, background: `${post.tagColor}15`, border: `1px solid ${post.tagColor}30`, padding: "4px 12px", borderRadius: 100, letterSpacing: 0.5 }}>
                      {post.tag}
                    </span>
                    <span style={{ fontSize: 12, color: theme.textMuted, fontWeight: 500 }}>{post.readTime}</span>
                  </div>
                  <h3 style={{ fontFamily: "Syne, sans-serif", fontWeight: 800, fontSize: 18, color: theme.textMain, letterSpacing: "-0.5px", lineHeight: 1.3 }}>
                    {post.title}
                  </h3>
                  <p style={{ fontSize: 13.5, color: theme.textMuted, lineHeight: 1.7, flex: 1 }}>
                    {post.excerpt}
                  </p>
                  <button className="read-more-btn">
                    Devamını Oku <ChevronRight size={14} />
                  </button>
                </div>
              </div>
            ))}
          </div>
        </div>
      </section>

      {/* ── KAPANIŞ CTA ── */}
      <section style={{ padding: `${spacing.sectionPadding} 40px` }}>
        <div style={{ maxWidth: 1000, margin: "0 auto" }}>
          <div style={{
            background: `linear-gradient(135deg, ${theme.primary}18, ${theme.secondary}10, rgba(56,189,248,0.08))`,
            border: `1px solid ${theme.primary}30`,
            borderRadius: 32, padding: "72px 80px",
            textAlign: "center", position: "relative", overflow: "hidden",
          }}>
            {/* bg decoration */}
            <div style={{ position: "absolute", top: "-60px", right: "-60px", width: 300, height: 300, borderRadius: "50%", background: `radial-gradient(circle, ${theme.primary}15 0%, transparent 70%)`, pointerEvents: "none" }} />
            <div style={{ position: "absolute", bottom: "-40px", left: "-40px", width: 200, height: 200, borderRadius: "50%", background: `radial-gradient(circle, ${theme.secondary}12 0%, transparent 70%)`, pointerEvents: "none" }} />
            <div style={{ position: "absolute", inset: 0, backgroundImage: `linear-gradient(${theme.primary}08 1px, transparent 1px), linear-gradient(90deg, ${theme.primary}08 1px, transparent 1px)`, backgroundSize: "40px 40px", pointerEvents: "none" }} />

            <div style={{ position: "relative", zIndex: 1 }}>
              <span className="section-badge" style={{ margin: "0 auto 24px" }}><Zap size={12} /> Destek Ekibimiz</span>
              <h2 style={{ fontFamily: "Syne, sans-serif", fontWeight: 900, fontSize: "clamp(28px, 4vw, 52px)", letterSpacing: "-2.5px", color: theme.textMain, marginBottom: 20, lineHeight: 1.1 }}>
                Dijital Dünyada Tüm<br />
                <span style={{ background: `linear-gradient(135deg, ${theme.secondary}, ${theme.primary})`, WebkitBackgroundClip: "text", WebkitTextFillColor: "transparent", backgroundClip: "text" }}>
                  Adımlarınızda Yanınızdayız
                </span>
              </h2>
              <p style={{ fontSize: 17, color: theme.textMuted, maxWidth: 520, margin: "0 auto 44px", lineHeight: 1.7 }}>
                Hafta içi 09:00–19:00 saatleri arasında 80 kişilik uzman ekibimiz sorularınızı yanıtlamaya hazır.
              </p>

              {/* Avatarlar */}
              <div style={{ display: "flex", alignItems: "center", justifyContent: "center", marginBottom: 36 }}>
                <div style={{ display: "flex", alignItems: "center" }}>
                  {[
                    { initials: "AK", colors: ["#a855f7","#c084fc"] },
                    { initials: "SY", colors: ["#38bdf8","#6366f1"] },
                    { initials: "MÖ", colors: ["#f472b6","#a855f7"] },
                    { initials: "ZD", colors: ["#22c55e","#16a34a"] },
                    { initials: "BT", colors: ["#fb923c","#f97316"] },
                    { initials: "+75", colors: [theme.secondary, theme.primary] },
                  ].map((av, i) => (
                    <div key={i} className="avatar-ring" style={{ background: `linear-gradient(135deg, ${av.colors[0]}, ${av.colors[1]})` }}>
                      <span style={{ fontSize: av.initials.startsWith("+") ? 10 : 13 }}>{av.initials}</span>
                    </div>
                  ))}
                </div>
                <div style={{ marginLeft: 20, textAlign: "left" }}>
                  <div style={{ fontFamily: "Syne, sans-serif", fontWeight: 800, fontSize: 16, color: theme.textMain }}>80+ Uzman</div>
                  <div style={{ fontSize: 13, color: theme.textMuted }}>Hemen yanıt hazır</div>
                </div>
              </div>

              <div style={{ display: "flex", gap: 16, justifyContent: "center", flexWrap: "wrap" }}>
                <button className="cta-primary" onClick={() => scrollTo("contact")} style={{ animation: "none" }}>
                  <span style={{ display: "flex", alignItems: "center", gap: 8 }}>
                    <MessageSquare size={16} /> Şimdi İletişime Geç
                  </span>
                </button>
                <button className="cta-secondary">
                  <span style={{ display: "flex", alignItems: "center", gap: 8 }}>
                    <Globe size={16} /> Ücretsiz Analiz Talep Et
                  </span>
                </button>
              </div>
            </div>
          </div>
        </div>
      </section>

      {/* ── GELİŞMİŞ FOOTER ── */}
      <footer style={{ borderTop: `1px solid ${theme.border}`, background: `linear-gradient(180deg, transparent, ${theme.primary}04)` }}>
        <div style={{ maxWidth: 1200, margin: "0 auto", padding: "72px 40px 40px" }}>
          {/* 4 sütun grid */}
          <div style={{ display: "grid", gridTemplateColumns: "1.4fr 1fr 1fr 1fr", gap: 48, marginBottom: 64 }}>

            {/* Sütun 1: İletişim */}
            <div>
              <Logo size="md" theme={theme} />
              <p style={{ fontSize: 14, color: theme.textMuted, lineHeight: 1.8, margin: "20px 0 24px", maxWidth: 260 }}>
                {data.footer?.description || "Dijital büyümenin her adımında yanınızdayız."}
              </p>
              <div style={{ display: "flex", flexDirection: "column", gap: 12 }}>
                <div style={{ display: "flex", alignItems: "center", gap: 10 }}>
                  <div style={{ width: 32, height: 32, borderRadius: 8, background: `${theme.primary}15`, border: `1px solid ${theme.primary}25`, display: "flex", alignItems: "center", justifyContent: "center", flexShrink: 0 }}>
                    <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke={theme.primary} strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><path d="M22 16.92v3a2 2 0 0 1-2.18 2 19.79 19.79 0 0 1-8.63-3.07A19.5 19.5 0 0 1 4.69 12a19.79 19.79 0 0 1-3.07-8.67A2 2 0 0 1 3.6 1.27h3a2 2 0 0 1 2 1.72c.127.96.361 1.903.7 2.81a2 2 0 0 1-.45 2.11L8.09 8.91a16 16 0 0 0 6 6l.81-.81a2 2 0 0 1 2.11-.45c.907.339 1.85.573 2.81.7a2 2 0 0 1 1.72 2.01z"/></svg>
                  </div>
                  <span style={{ fontSize: 13.5, color: theme.textMuted }}>{data.footer?.phone || "+90 (532) 123 45 67"}</span>
                </div>
                <div style={{ display: "flex", alignItems: "center", gap: 10 }}>
                  <div style={{ width: 32, height: 32, borderRadius: 8, background: `${theme.primary}15`, border: `1px solid ${theme.primary}25`, display: "flex", alignItems: "center", justifyContent: "center", flexShrink: 0 }}>
                    <Mail size={14} color={theme.primary} />
                  </div>
                  <span style={{ fontSize: 13.5, color: theme.textMuted }}>{data.footer?.email || "info@decha.digital"}</span>
                </div>
                <div style={{ display: "flex", alignItems: "flex-start", gap: 10 }}>
                  <div style={{ width: 32, height: 32, borderRadius: 8, background: `${theme.primary}15`, border: `1px solid ${theme.primary}25`, display: "flex", alignItems: "center", justifyContent: "center", flexShrink: 0, marginTop: 2 }}>
                    <MapPin size={14} color={theme.primary} />
                  </div>
                  <span style={{ fontSize: 13.5, color: theme.textMuted, lineHeight: 1.6, whiteSpace: "pre-line" }}>{data.footer?.address || "Levent, İstanbul\nTürkiye 34330"}</span>
                </div>
              </div>
            </div>

            {/* Sütun 2: Hizmetler */}
            <div>
              <h4 style={{ fontFamily: "Syne, sans-serif", fontWeight: 800, fontSize: 15, color: theme.textMain, marginBottom: 20, letterSpacing: "-0.3px" }}>{data.footer?.servicesTitle || "Hizmetler"}</h4>
              {(data.footer?.serviceLinks || []).map(link => (
                <button key={link} className="footer-link">{link}</button>
              ))}
            </div>

            {/* Sütun 3: İş Ortakları */}
            <div>
              <h4 style={{ fontFamily: "Syne, sans-serif", fontWeight: 800, fontSize: 15, color: theme.textMain, marginBottom: 20, letterSpacing: "-0.3px" }}>{data.footer?.partnersTitle || "İş Ortakları"}</h4>
              {(data.footer?.partnerLinks || []).map(partner => (
                <div key={partner} style={{ display: "flex", alignItems: "center", gap: 8, marginBottom: 10 }}>
                  <div style={{ width: 6, height: 6, borderRadius: "50%", background: `${theme.primary}70`, flexShrink: 0 }} />
                  <span style={{ fontSize: 13.5, color: theme.textMuted }}>{partner}</span>
                </div>
              ))}
            </div>

            {/* Sütun 4: Sosyal Medya */}
            <div>
              <h4 style={{ fontFamily: "Syne, sans-serif", fontWeight: 800, fontSize: 15, color: theme.textMain, marginBottom: 20, letterSpacing: "-0.3px" }}>{data.footer?.socialTitle || "Bizi Takip Edin"}</h4>
              <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: 10, marginBottom: 32 }}>
                {[
                  { label: "Instagram", icon: <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><rect x="2" y="2" width="20" height="20" rx="5" ry="5"/><path d="M16 11.37A4 4 0 1 1 12.63 8 4 4 0 0 1 16 11.37z"/><line x1="17.5" y1="6.5" x2="17.51" y2="6.5"/></svg> },
                  { label: "TikTok", icon: <svg width="16" height="16" viewBox="0 0 24 24" fill="currentColor"><path d="M19.59 6.69a4.83 4.83 0 0 1-3.77-4.25V2h-3.45v13.67a2.89 2.89 0 0 1-2.88 2.5 2.89 2.89 0 0 1-2.89-2.89 2.89 2.89 0 0 1 2.89-2.89c.28 0 .54.04.79.1V9.01a6.33 6.33 0 0 0-.79-.05 6.34 6.34 0 0 0-6.34 6.34 6.34 6.34 0 0 0 6.34 6.34 6.34 6.34 0 0 0 6.33-6.34V8.94a8.18 8.18 0 0 0 4.78 1.52V7.01a4.85 4.85 0 0 1-1.01-.32z"/></svg> },
                  { label: "LinkedIn", icon: <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><path d="M16 8a6 6 0 0 1 6 6v7h-4v-7a2 2 0 0 0-2-2 2 2 0 0 0-2 2v7h-4v-7a6 6 0 0 1 6-6z"/><rect x="2" y="9" width="4" height="12"/><circle cx="4" cy="4" r="2"/></svg> },
                  { label: "YouTube", icon: <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><path d="M22.54 6.42a2.78 2.78 0 0 0-1.95-1.96C18.88 4 12 4 12 4s-6.88 0-8.59.46a2.78 2.78 0 0 0-1.95 1.96A29 29 0 0 0 1 12a29 29 0 0 0 .46 5.58A2.78 2.78 0 0 0 3.41 19.6C5.12 20 12 20 12 20s6.88 0 8.59-.46a2.78 2.78 0 0 0 1.95-1.95A29 29 0 0 0 23 12a29 29 0 0 0-.46-5.58z"/><polygon points="9.75 15.02 15.5 12 9.75 8.98 9.75 15.02" fill="currentColor" stroke="none"/></svg> },
                ].map(social => (
                  <button key={social.label} className="footer-social-btn" title={social.label} style={{ width: "100%", gap: 8, borderRadius: 10, justifyContent: "flex-start", padding: "0 12px", fontSize: 13, fontWeight: 600 }}>
                    {social.icon}
                    <span style={{ color: "inherit", fontSize: 12, fontWeight: 600 }}>{social.label}</span>
                  </button>
                ))}
              </div>
              <div style={{ background: `${theme.primary}10`, border: `1px solid ${theme.primary}20`, borderRadius: 14, padding: "16px 18px" }}>
                <div style={{ fontSize: 12, fontWeight: 700, color: theme.secondary, marginBottom: 4, letterSpacing: 0.5 }}>{data.footer?.newsletterTitle || "BÜLTEN"}</div>
                <div style={{ fontSize: 13, color: theme.textMuted, marginBottom: 12, lineHeight: 1.5 }}>{data.footer?.newsletterSubtitle || "İpuçları ve güncellemeler için abone ol"}</div>
                <div style={{ display: "flex", gap: 8 }}>
                  <input className="form-input" placeholder="E-posta" style={{ padding: "9px 14px", fontSize: 13, flex: 1, borderRadius: 8 }} />
                  <button style={{ padding: "9px 14px", borderRadius: 8, background: `linear-gradient(135deg, ${theme.secondary}, ${theme.primary})`, border: "none", cursor: "pointer", flexShrink: 0 }}>
                    <Send size={14} color="#fff" />
                  </button>
                </div>
              </div>
            </div>
          </div>

          {/* Footer alt bar */}
          <div style={{ borderTop: `1px solid ${theme.border}`, paddingTop: 28, display: "flex", alignItems: "center", justifyContent: "space-between", flexWrap: "wrap", gap: 16 }}>
            <p style={{ color: theme.textMuted, fontSize: 13 }}>
              {(data.footer?.copyrightText || "© {year} Decha Digital Agency. Tüm hakları saklıdır.").replace("{year}", new Date().getFullYear())}
            </p>
            <div style={{ display: "flex", gap: 24 }}>
              {(data.footer?.legalLinks || ["Gizlilik Politikası", "Kullanım Şartları", "Çerez Politikası"]).map(item => (
                <button key={item} className="footer-link" style={{ fontSize: 12 }}>{item}</button>
              ))}
            </div>
            <div style={{ display: "flex", alignItems: "center", gap: 8 }}>
              <div style={{ width: 8, height: 8, borderRadius: "50%", background: "#22c55e", boxShadow: "0 0 8px #22c55e88" }} />
              <span style={{ fontSize: 12, color: theme.textMuted, fontWeight: 600 }}>{data.footer?.statusText || "Tüm sistemler çalışıyor"}</span>
            </div>
          </div>
        </div>
      </footer>


      {/* ── MEETING MODAL ── */}
      {meetingOpen && (
        <div className="meeting-overlay" onClick={e => { if (e.target === e.currentTarget) closeMeeting(); }}>
          <div className="meeting-modal">
            {/* Header */}
            <div style={{ padding: "36px 36px 0", position: "relative" }}>
              <button onClick={closeMeeting} style={{ position: "absolute", top: 20, right: 20, width: 36, height: 36, borderRadius: "50%", background: "rgba(255,255,255,0.06)", border: "1px solid rgba(255,255,255,0.1)", color: "#94a3b8", cursor: "pointer", display: "flex", alignItems: "center", justifyContent: "center", transition: "all 0.2s" }}
                onMouseEnter={e => { e.currentTarget.style.background = "rgba(239,68,68,0.15)"; e.currentTarget.style.color = "#f87171"; }}
                onMouseLeave={e => { e.currentTarget.style.background = "rgba(255,255,255,0.06)"; e.currentTarget.style.color = "#94a3b8"; }}>
                <X size={16} />
              </button>
              <div style={{ display: "flex", alignItems: "center", gap: 14, marginBottom: 6 }}>
                <div style={{ width: 44, height: 44, borderRadius: 12, background: `linear-gradient(135deg, ${theme.secondary}, ${theme.primary})`, display: "flex", alignItems: "center", justifyContent: "center", flexShrink: 0 }}>
                  <Rocket size={20} color="#fff" />
                </div>
                <div>
                  <h2 style={{ fontFamily: "Syne, sans-serif", fontSize: 22, fontWeight: 900, color: theme.textMain, letterSpacing: "-0.8px" }}>{data.meetingTexts?.modalTitle || "Toplantı Planla"}</h2>
                  <p style={{ fontSize: 13, color: theme.textMuted, marginTop: 2 }}>{data.meetingTexts?.modalSubtitle || "Ücretsiz 30 dakikalık strateji görüşmesi"}</p>
                </div>
              </div>
              {/* Divider */}
              <div style={{ height: 1, background: `linear-gradient(90deg, ${theme.primary}30, transparent)`, marginTop: 24 }} />
            </div>

            <div style={{ padding: "28px 36px 36px" }}>
              {meetingSent ? (
                <div style={{ textAlign: "center", padding: "40px 20px" }}>
                  <div style={{ width: 72, height: 72, borderRadius: "50%", background: "rgba(34,197,94,0.12)", border: "2px solid rgba(34,197,94,0.4)", display: "flex", alignItems: "center", justifyContent: "center", margin: "0 auto 20px" }}>
                    <CheckCircle size={32} color="#22c55e" />
                  </div>
                  <h3 style={{ fontFamily: "Syne, sans-serif", fontSize: 22, fontWeight: 900, color: theme.textMain, marginBottom: 10 }}>{data.meetingTexts?.successTitle || "Randevunuz Alındı!"}</h3>
                  <p style={{ color: theme.textMuted, fontSize: 15, lineHeight: 1.7, marginBottom: 28 }}>{data.meetingTexts?.successBody || "Ekibimiz en kısa sürede sizinle iletişime geçecek ve randevunuzu onaylayacak."}</p>
                  <button className="cta-primary" style={{ animation: "none", fontSize: 14, padding: "13px 28px" }} onClick={closeMeeting}>Kapat</button>
                </div>
              ) : (
                <div style={{ display: "flex", flexDirection: "column", gap: 18 }}>

                  {/* Ad & Telefon */}
                  <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: 14 }}>
                    <div>
                      <label style={{ display: "block", fontSize: 11, fontWeight: 700, color: theme.secondary, marginBottom: 7, textTransform: "uppercase", letterSpacing: 0.8 }}>Ad Soyad *</label>
                      <input className="meeting-input" placeholder="Adınız Soyadınız" value={meetingForm.name} onChange={e => setMeetingForm({...meetingForm, name: e.target.value})} />
                    </div>
                    <div>
                      <label style={{ display: "block", fontSize: 11, fontWeight: 700, color: theme.secondary, marginBottom: 7, textTransform: "uppercase", letterSpacing: 0.8 }}>Telefon *</label>
                      <input className="meeting-input" placeholder="+90 5xx xxx xx xx" value={meetingForm.phone} onChange={e => setMeetingForm({...meetingForm, phone: e.target.value})} />
                    </div>
                  </div>

                  {/* E-posta */}
                  <div>
                    <label style={{ display: "block", fontSize: 11, fontWeight: 700, color: theme.secondary, marginBottom: 7, textTransform: "uppercase", letterSpacing: 0.8 }}>E-posta *</label>
                    <input className="meeting-input" type="email" placeholder="ornek@sirket.com" value={meetingForm.email} onChange={e => setMeetingForm({...meetingForm, email: e.target.value})} />
                  </div>

                  {/* Tarih & Saat */}
                  <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: 14 }}>
                    <div>
                      <label style={{ display: "block", fontSize: 11, fontWeight: 700, color: theme.secondary, marginBottom: 7, textTransform: "uppercase", letterSpacing: 0.8 }}>Tarih *</label>
                      <input className="meeting-input" type="date" value={meetingForm.date}
                        min={new Date().toISOString().split("T")[0]}
                        onChange={e => setMeetingForm({...meetingForm, date: e.target.value})} />
                    </div>
                    <div>
                      <label style={{ display: "block", fontSize: 11, fontWeight: 700, color: theme.secondary, marginBottom: 7, textTransform: "uppercase", letterSpacing: 0.8 }}>Saat *</label>
                      <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr 1fr", gap: 6 }}>
                        {(() => {
                          const wh = data.workingHours || {};
                          const start = parseInt((wh.startTime || "09:00").split(":")[0]);
                          const end = parseInt((wh.endTime || "18:00").split(":")[0]);
                          const slots = [];
                          for (let h = start; h <= end; h++) slots.push(`${String(h).padStart(2,"0")}:00`);
                          return slots;
                        })().map(t => (
                          <button key={t} onClick={() => setMeetingForm({...meetingForm, time: t})} style={{
                            padding: "8px 4px", borderRadius: 8, border: `1px solid ${meetingForm.time === t ? theme.primary : "rgba(168,85,247,0.18)"}`,
                            background: meetingForm.time === t ? `${theme.primary}20` : "rgba(255,255,255,0.03)",
                            color: meetingForm.time === t ? theme.secondary : theme.textMuted,
                            fontSize: 12, fontWeight: 700, cursor: "pointer", transition: "all 0.15s",
                            fontFamily: "DM Sans, sans-serif",
                          }}>
                            {t}
                          </button>
                        ))}
                      </div>
                    </div>
                  </div>

                  {/* Lokasyon */}
                  <div>
                    <label style={{ display: "block", fontSize: 11, fontWeight: 700, color: theme.secondary, marginBottom: 10, textTransform: "uppercase", letterSpacing: 0.8 }}>
                      {data.meetingTexts?.locationLabel || "Toplantı Nerede Gerçekleşsin?"} *
                    </label>
                    <div style={{ display: "flex", gap: 10 }}>
                      {[
                        { value: "online", label: "Online", sub: "Zoom/Meet", icon: <Monitor size={18} /> },
                        { value: "ouroffice", label: "Bizim Ofisimiz", sub: "İstanbul, Levent", icon: <MapPin size={18} /> },
                        { value: "youroffice", label: "Sizin Yeriniz", sub: "Adres giriniz", icon: <Briefcase size={18} /> },
                      ].map(opt => {
                        const active = meetingForm.location === opt.value;
                        return (
                          <button key={opt.value} className="meeting-loc-btn"
                            onClick={() => setMeetingForm({...meetingForm, location: opt.value})}
                            style={{
                              borderColor: active ? theme.primary : "rgba(168,85,247,0.18)",
                              background: active ? `${theme.primary}15` : "rgba(255,255,255,0.02)",
                              color: active ? theme.secondary : theme.textMuted,
                            }}>
                            <div style={{ width: 36, height: 36, borderRadius: 10, background: active ? `${theme.primary}25` : "rgba(255,255,255,0.05)", display: "flex", alignItems: "center", justifyContent: "center" }}>
                              {opt.icon}
                            </div>
                            <span style={{ lineHeight: 1.3 }}>{opt.label}</span>
                            <span style={{ fontSize: 11, opacity: 0.6, lineHeight: 1.2 }}>{opt.sub}</span>
                          </button>
                        );
                      })}
                    </div>
                  </div>

                  {/* Adres alanı (koşullu) */}
                  {meetingForm.location === "youroffice" && (
                    <div style={{ animation: "fadeUp 0.25s ease" }}>
                      <label style={{ display: "block", fontSize: 11, fontWeight: 700, color: theme.secondary, marginBottom: 7, textTransform: "uppercase", letterSpacing: 0.8 }}>İş Yeri / Ofis Adresiniz *</label>
                      <input className="meeting-input" placeholder="Mahalle, Cadde, Bina No, Şehir" value={meetingForm.address} onChange={e => setMeetingForm({...meetingForm, address: e.target.value})} />
                    </div>
                  )}

                  {/* Error */}
                  {meetingErr && (
                    <div style={{ background: "rgba(239,68,68,0.08)", border: "1px solid rgba(239,68,68,0.25)", borderRadius: 10, padding: "12px 16px", color: "#f87171", fontSize: 13, display: "flex", alignItems: "center", gap: 8 }}>
                      <X size={14} /> {meetingErr}
                    </div>
                  )}

                  {/* Submit */}
                  <button className="cta-primary" style={{ animation: "none", width: "100%", padding: "17px", fontSize: 15, marginTop: 4 }}
                    onClick={sendMeeting} disabled={meetingSending}>
                    <span style={{ display: "flex", alignItems: "center", justifyContent: "center", gap: 8 }}>
                      {meetingSending ? (
                        <><svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round"><path d="M12 2v4M12 18v4M4.93 4.93l2.83 2.83M16.24 16.24l2.83 2.83M2 12h4M18 12h4M4.93 19.07l2.83-2.83M16.24 7.76l2.83-2.83" style={{ transformOrigin: "center", animation: "spin 1s linear infinite" }} /></svg> Gönderiliyor...</>
                      ) : (
                        <><CheckCircle size={16} /> {data.meetingTexts?.submitButton || "Randevu Oluştur"}</>
                      )}
                    </span>
                  </button>

                  <p style={{ textAlign: "center", fontSize: 12, color: theme.textMuted }}>
                    Randevunuz onaylandıktan sonra ekibimiz sizinle iletişime geçecektir.
                  </p>
                </div>
              )}
            </div>
          </div>
        </div>
      )}

      {/* Admin Trigger */}
      <button
        onClick={() => setAdminOpen(true)}
        title="Admin Panel"
        style={{
          position: "fixed", bottom: 28, right: 28, zIndex: 999,
          width: 48, height: 48, borderRadius: "50%",
          background: `linear-gradient(135deg, ${theme.secondary}, ${theme.primary})`,
          border: "none", cursor: "pointer", display: "flex", alignItems: "center", justifyContent: "center",
          boxShadow: `0 8px 24px ${theme.primary}55`,
          opacity: 0.7, transition: "opacity 0.2s",
        }}
        onMouseEnter={e => e.currentTarget.style.opacity = 1}
        onMouseLeave={e => e.currentTarget.style.opacity = 0.7}
      >
        <Settings size={20} color="#fff" />
      </button>
    </>
  );
}

// Helper component used in who section
function Users({ size = 24, color = "currentColor" }) {
  return (
    <svg width={size} height={size} viewBox="0 0 24 24" fill="none" stroke={color} strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
      <path d="M17 21v-2a4 4 0 0 0-4-4H5a4 4 0 0 0-4 4v2"/>
      <circle cx="9" cy="7" r="4"/>
      <path d="M23 21v-2a4 4 0 0 0-3-3.87"/>
      <path d="M16 3.13a4 4 0 0 1 0 7.75"/>
    </svg>
  );
}