import React, { useEffect, useMemo, useState } from "react";
import {
  Activity,
  ArrowDownToLine,
  ArrowLeft,
  ArrowRight,
  Camera,
  Check,
  ChevronDown,
  ClipboardList,
  Clock3,
  CreditCard,
  FilePlus2,
  Filter,
  HardDrive,
  LogOut,
  MapPin,
  Menu,
  MoreHorizontal,
  Pencil,
  Plus,
  Search,
  Settings,
  Stethoscope,
  Trash2,
  Upload,
  UserRound,
  Wrench,
  X,
  Image as ImageIcon,
  Video,
  CircleDollarSign,
} from "lucide-react";
import { auth, db, storage, firebaseConfigured } from "./firebase";
import {
  createUserWithEmailAndPassword,
  onAuthStateChanged,
  signInWithEmailAndPassword,
  signOut,
} from "firebase/auth";
import {
  addDoc,
  collection,
  deleteDoc,
  doc,
  onSnapshot,
  orderBy,
  query,
  serverTimestamp,
  updateDoc,
} from "firebase/firestore";
import { getDownloadURL, ref, uploadBytes } from "firebase/storage";

const STATUSES = [
  "Qabul qilindi",
  "Diagnostika",
  "Ta’mir jarayonida",
  "Ta’mirlandi",
  "Ta’mirsiz qaytarildi",
];
const RETURN_STATUSES = [
  "Ta’mirlandi",
  "Ta’mirsiz qaytarildi",
  "Vaqtincha topshirildi",
  "Boshqa",
];
const PAYMENT = ["Naqd", "Karta", "Shartnoma", "To‘lanmagan"];
const emptyForm = {
  equipmentName: "",
  model: "",
  serialNumber: "",
  organization: "",
  address: "",
  broughtBy: "",
  acceptedBy: "",
  diagnosis: "",
  notes: "",
  status: "Qabul qilindi",
  faultCause: "",
  solution: "",
  estimatedPrice: "",
  repairPrice: "",
  paymentMethod: "To‘lanmagan",
  paymentStatus: "To‘lanmagan",
  receivedAt: "",
  returnedAt: "",
  returnedBy: "",
  takenBy: "",
  returnStatus: "",
};
const fmt = (v) =>
  v
    ? new Date(v.seconds ? v.seconds * 1000 : v).toLocaleString("uz-UZ", {
        dateStyle: "medium",
        timeStyle: "short",
      })
    : "—";
const initials = (s) =>
  (s || "U")
    .trim()
    .split(/\s+/)
    .slice(0, 2)
    .map((x) => x[0])
    .join("")
    .toUpperCase();
const statusClass = (s) =>
  ({
    "Qabul qilindi": "blue",
    Diagnostika: "purple",
    "Ta’mir jarayonida": "orange",
    "Ta’mirlandi": "green",
    "Ta’mirsiz qaytarildi": "red",
    "Vaqtincha topshirildi": "gray",
  }[s] || "gray");

function AuthScreen() {
  const [mode, setMode] = useState("login"),
    [email, setEmail] = useState(""),
    [password, setPassword] = useState(""),
    [busy, setBusy] = useState(false),
    [error, setError] = useState("");
  async function submit(e) {
    e.preventDefault();
    setBusy(true);
    setError("");
    try {
      mode === "login"
        ? await signInWithEmailAndPassword(auth, email, password)
        : await createUserWithEmailAndPassword(auth, email, password);
    } catch (err) {
      setError(err.message);
    } finally {
      setBusy(false);
    }
  }
  return (
    <div className="auth-wrap">
      <div className="auth-card">
        <div className="brand-mark">
          <Stethoscope size={25} />
        </div>
        <h1>UstaMed</h1>
        <p className="muted">Tibbiy uskunalarni ta’mirlash hisobini yuritish</p>
        <form onSubmit={submit}>
          <label>Email</label>
          <input
            type="email"
            required
            value={email}
            onChange={(e) => setEmail(e.target.value)}
            placeholder="name@company.uz"
          />
          <label>Parol</label>
          <input
            type="password"
            required
            minLength="6"
            value={password}
            onChange={(e) => setPassword(e.target.value)}
            placeholder="Kamida 6 ta belgi"
          />
          {error && <div className="error">{error}</div>}
          <button className="primary full" disabled={busy}>
            {busy
              ? "Kuting..."
              : mode === "login"
              ? "Kirish"
              : "Ro‘yxatdan o‘tish"}
          </button>
        </form>
        <button
          className="text-btn"
          onClick={() => setMode(mode === "login" ? "signup" : "login")}
        >
          {mode === "login"
            ? "Hisobingiz yo‘qmi? Ro‘yxatdan o‘ting"
            : "Hisobingiz bormi? Kirish"}
        </button>
        <p className="tiny muted">
          Kirish ma’lumotlarini tashkilot administratori beradi.
        </p>
      </div>
    </div>
  );
}

function Field({ label, children, wide = false, required = false }) {
  return (
    <div className={`field ${wide ? "wide" : ""}`}>
      <label>
        {label}
        {required && <b className="required"> *</b>}
      </label>
      {children}
    </div>
  );
}
function Modal({ title, onClose, children, wide = false }) {
  return (
    <div
      className="overlay"
      onMouseDown={(e) => e.target === e.currentTarget && onClose()}
    >
      <div className={`modal ${wide ? "wide-modal" : ""}`}>
        <div className="modal-head">
          <h2>{title}</h2>
          <button className="icon-btn" onClick={onClose}>
            <X size={19} />
          </button>
        </div>
        {children}
      </div>
    </div>
  );
}

function RecordForm({ initial, onClose, onSave, uploading }) {
  const [form, setForm] = useState({ ...emptyForm, ...initial });
  const [media, setMedia] = useState([]);
  const [saving, setSaving] = useState(false);
  const set = (k, v) => setForm((p) => ({ ...p, [k]: v }));
  const submit = async (e) => {
    e.preventDefault();
    setSaving(true);
    try {
      await onSave(form, media);
      onClose();
    } finally {
      setSaving(false);
    }
  };
  return (
    <Modal
      title={initial?.id ? "Uskunani tahrirlash" : "Yangi uskuna qabul qilish"}
      onClose={onClose}
      wide
    >
      <form onSubmit={submit} className="record-form">
        <div className="form-section">
          <div className="section-title">
            <span>01</span>
            <div>
              <b>Uskuna ma’lumotlari</b>
              <small>Qaysi uskuna ta’mirlashga olib kelindi?</small>
            </div>
          </div>
          <div className="form-grid">
            <Field label="Uskuna nomi" required>
              <input
                required
                value={form.equipmentName}
                onChange={(e) => set("equipmentName", e.target.value)}
                placeholder="Masalan: Rentgen apparati"
              />
            </Field>
            <Field label="Model / rusum">
              <input
                value={form.model}
                onChange={(e) => set("model", e.target.value)}
                placeholder="Modeli"
              />
            </Field>
            <Field label="Zavod / inventar raqami">
              <input
                value={form.serialNumber}
                onChange={(e) => set("serialNumber", e.target.value)}
                placeholder="Seriya raqami"
              />
            </Field>
            <Field label="Tibbiyot muassasasi" required>
              <input
                required
                value={form.organization}
                onChange={(e) => set("organization", e.target.value)}
                placeholder="Shifoxona yoki klinika nomi"
              />
            </Field>
            <Field label="Manzil" wide>
              <input
                value={form.address}
                onChange={(e) => set("address", e.target.value)}
                placeholder="Viloyat, tuman, ko‘cha..."
              />
            </Field>
          </div>
        </div>
        <div className="form-section">
          <div className="section-title">
            <span>02</span>
            <div>
              <b>Qabul qilish</b>
              <small>Topshirish va qabul qilish mas’ullari</small>
            </div>
          </div>
          <div className="form-grid">
            <Field label="Kim olib keldi" required>
              <input
                required
                value={form.broughtBy}
                onChange={(e) => set("broughtBy", e.target.value)}
                placeholder="F.I.Sh."
              />
            </Field>
            <Field label="Kim qabul qilib oldi" required>
              <input
                required
                value={form.acceptedBy}
                onChange={(e) => set("acceptedBy", e.target.value)}
                placeholder="Muhandis F.I.Sh."
              />
            </Field>
            <Field label="Qabul qilingan sana">
              <input
                type="datetime-local"
                value={form.receivedAt}
                onChange={(e) => set("receivedAt", e.target.value)}
              />
            </Field>
            <Field label="Dastlabki holat">
              <select
                value={form.status}
                onChange={(e) => set("status", e.target.value)}
              >
                {STATUSES.slice(0, 3).map((s) => (
                  <option>{s}</option>
                ))}
              </select>
            </Field>
            <Field label="Taxminiy tashxis / nosozlik" wide>
              <textarea
                rows="3"
                value={form.diagnosis}
                onChange={(e) => set("diagnosis", e.target.value)}
                placeholder="Mijoz aytgan nosozlik yoki dastlabki taxmin..."
              />
            </Field>
            <Field label="Taxminiy narx (so‘m)">
              <input
                type="number"
                min="0"
                value={form.estimatedPrice}
                onChange={(e) => set("estimatedPrice", e.target.value)}
                placeholder="Ixtiyoriy"
              />
            </Field>
          </div>
        </div>
        <div className="form-section">
          <div className="section-title">
            <span>03</span>
            <div>
              <b>Foto va video</b>
              <small>
                Uskunaning qabul qilingan paytdagi holatini biriktiring
              </small>
            </div>
          </div>
          <label className="upload-zone">
            <input
              type="file"
              accept="image/*,video/*"
              multiple
              onChange={(e) => setMedia(Array.from(e.target.files || []))}
            />
            <Upload size={21} />
            <b>Fayllarni tanlang</b>
            <small>Rasm yoki video · bir nechta fayl mumkin</small>
            <span>
              {media.length
                ? `${media.length} ta fayl tanlandi`
                : initial?.media?.length
                ? `${initial.media.length} ta avvalgi fayl biriktirilgan`
                : ""}
            </span>
          </label>
        </div>
        <div className="form-actions">
          <button type="button" className="secondary" onClick={onClose}>
            Bekor qilish
          </button>
          <button className="primary" disabled={saving || uploading}>
            {saving || uploading ? (
              "Saqlanmoqda..."
            ) : (
              <>
                <Check size={17} /> Saqlash
              </>
            )}
          </button>
        </div>
      </form>
    </Modal>
  );
}

function Detail({ item, onClose, onEdit, onUpdate, onDelete }) {
  const [tab, setTab] = useState("overview"),
    [busy, setBusy] = useState(false);
  const [repair, setRepair] = useState({
    faultCause: item.faultCause || "",
    solution: item.solution || "",
    notes: item.notes || "",
    status: item.status || "Qabul qilindi",
    repairPrice: item.repairPrice || "",
    paymentMethod: item.paymentMethod || "To‘lanmagan",
    paymentStatus: item.paymentStatus || "To‘lanmagan",
  });
  const [handover, setHandover] = useState({
    returnStatus: item.returnStatus || "Ta’mirlandi",
    returnedBy: item.returnedBy || "",
    takenBy: item.takenBy || "",
    returnedAt: item.returnedAt || "",
    repairPrice: item.repairPrice || "",
    paymentMethod: item.paymentMethod || "To‘lanmagan",
    paymentStatus: item.paymentStatus || "To‘lanmagan",
  });
  const upd = async (data) => {
    setBusy(true);
    try {
      await onUpdate(item.id, data);
    } finally {
      setBusy(false);
    }
  };
  const setR = (k, v) => setRepair((p) => ({ ...p, [k]: v })),
    setH = (k, v) => setHandover((p) => ({ ...p, [k]: v }));
  return (
    <Modal title="Uskuna kartasi" onClose={onClose} wide>
      <div className="detail-top">
        <div className="device-icon">
          <HardDrive size={25} />
        </div>
        <div className="detail-heading">
          <h3>{item.equipmentName}</h3>
          <p>
            {item.organization} · {item.model || "Model ko‘rsatilmagan"}
          </p>
          <span className={`status ${statusClass(item.status)}`}>
            {item.status}
          </span>
        </div>
        <button className="secondary small-btn" onClick={() => onEdit(item)}>
          <Pencil size={15} /> Tahrirlash
        </button>
      </div>
      <div className="tabs">
        <button
          className={tab === "overview" ? "active" : ""}
          onClick={() => setTab("overview")}
        >
          Ma’lumotlar
        </button>
        <button
          className={tab === "repair" ? "active" : ""}
          onClick={() => setTab("repair")}
        >
          Ta’mirlash jurnali
        </button>
        <button
          className={tab === "handover" ? "active" : ""}
          onClick={() => setTab("handover")}
        >
          Qaytarib berish
        </button>
      </div>
      {tab === "overview" && (
        <div className="detail-content">
          <div className="info-grid">
            {[
              ["Manzil", item.address],
              ["Zavod raqami", item.serialNumber],
              ["Kim olib keldi", item.broughtBy],
              ["Qabul qilgan", item.acceptedBy],
              ["Qabul sanasi", fmt(item.receivedAt || item.createdAt)],
              ["Taxminiy tashxis", item.diagnosis],
              [
                "Taxminiy narx",
                item.estimatedPrice
                  ? Number(item.estimatedPrice).toLocaleString("uz-UZ") +
                    " so‘m"
                  : "—",
              ],
            ].map(([k, v]) => (
              <div className="info-item">
                <small>{k}</small>
                <b>{v || "—"}</b>
              </div>
            ))}
          </div>
          <h4 className="subhead">Biriktirilgan media</h4>
          {item.media?.length ? (
            <div className="media-grid">
              {item.media.map((m, i) => (
                <a
                  href={m.url}
                  target="_blank"
                  rel="noreferrer"
                  className="media-card"
                >
                  {m.type?.startsWith("video") ? <Video /> : <ImageIcon />}
                  <span>{m.name || `Fayl ${i + 1}`}</span>
                </a>
              ))}
            </div>
          ) : (
            <p className="muted">Hozircha fayl biriktirilmagan.</p>
          )}
        </div>
      )}
      {tab === "repair" && (
        <form
          className="detail-content"
          onSubmit={(e) => {
            e.preventDefault();
            upd(repair);
          }}
        >
          <div className="form-grid">
            <Field label="Jarayon holati">
              <select
                value={repair.status}
                onChange={(e) => setR("status", e.target.value)}
              >
                {STATUSES.map((s) => (
                  <option>{s}</option>
                ))}
              </select>
            </Field>
            <Field label="Ta’mirlash narxi (so‘m)">
              <input
                type="number"
                min="0"
                value={repair.repairPrice}
                onChange={(e) => setR("repairPrice", e.target.value)}
              />
            </Field>
            <Field label="Aniqlangan nosozlik sababi" wide>
              <textarea
                rows="3"
                value={repair.faultCause}
                onChange={(e) => setR("faultCause", e.target.value)}
                placeholder="Masalan: quvvat bloki kondensatori ishdan chiqqan..."
              />
            </Field>
            <Field label="Bajarilgan yechim / almashtirilgan detal" wide>
              <textarea
                rows="3"
                value={repair.solution}
                onChange={(e) => setR("solution", e.target.value)}
                placeholder="Qanday ta’mir qilindi? Qaysi detal almashtirildi?"
              />
            </Field>
            <Field label="Muhandis izohi" wide>
              <textarea
                rows="2"
                value={repair.notes}
                onChange={(e) => setR("notes", e.target.value)}
                placeholder="Kelgusida kerak bo‘ladigan qo‘shimcha qaydlar..."
              />
            </Field>
          </div>
          <div className="form-actions">
            <button className="primary" disabled={busy}>
              {busy ? (
                "Saqlanmoqda..."
              ) : (
                <>
                  <Check size={16} /> Ta’mirlash ma’lumotlarini saqlash
                </>
              )}
            </button>
          </div>
        </form>
      )}
      {tab === "handover" && (
        <form
          className="detail-content"
          onSubmit={(e) => {
            e.preventDefault();
            upd({
              ...handover,
              status: handover.returnStatus,
              returnedAt: handover.returnedAt || new Date().toISOString(),
            });
          }}
        >
          <div className="form-grid">
            <Field label="Uskuna qaytarilayotgandagi holati">
              <select
                value={handover.returnStatus}
                onChange={(e) => setH("returnStatus", e.target.value)}
              >
                {RETURN_STATUSES.map((s) => (
                  <option>{s}</option>
                ))}
              </select>
            </Field>
            <Field label="Qaytarilgan sana">
              <input
                type="datetime-local"
                value={handover.returnedAt}
                onChange={(e) => setH("returnedAt", e.target.value)}
              />
            </Field>
            <Field label="Kim topshiryapti">
              <input
                value={handover.returnedBy}
                onChange={(e) => setH("returnedBy", e.target.value)}
                placeholder="Muhandis F.I.Sh."
              />
            </Field>
            <Field label="Kim olib ketmoqda">
              <input
                value={handover.takenBy}
                onChange={(e) => setH("takenBy", e.target.value)}
                placeholder="F.I.Sh."
              />
            </Field>
            <Field label="Yakuniy ta’mirlash narxi (so‘m)">
              <input
                type="number"
                min="0"
                value={handover.repairPrice}
                onChange={(e) => setH("repairPrice", e.target.value)}
              />
            </Field>
            <Field label="To‘lov usuli">
              <select
                value={handover.paymentMethod}
                onChange={(e) => setH("paymentMethod", e.target.value)}
              >
                {PAYMENT.map((s) => (
                  <option>{s}</option>
                ))}
              </select>
            </Field>
            <Field label="To‘lov holati">
              <select
                value={handover.paymentStatus}
                onChange={(e) => setH("paymentStatus", e.target.value)}
              >
                <option>To‘lanmagan</option>
                <option>To‘langan</option>
                <option>Qisman to‘langan</option>
              </select>
            </Field>
          </div>
          <div className="form-actions">
            <button className="primary" disabled={busy}>
              {busy ? (
                "Saqlanmoqda..."
              ) : (
                <>
                  <ArrowDownToLine size={16} /> Qaytarib berishni qayd etish
                </>
              )}
            </button>
          </div>
        </form>
      )}
      <div className="modal-foot">
        <button
          className="danger-ghost"
          onClick={() => {
            if (confirm("Ushbu uskuna yozuvini butunlay o‘chirmoqchimisiz?"))
              onDelete(item.id);
          }}
        >
          <Trash2 size={15} /> Yozuvni o‘chirish
        </button>
        <span className="tiny muted">ID: {item.id.slice(0, 10)}</span>
      </div>
    </Modal>
  );
}

export default function App() {
  const [user, setUser] = useState(null),
    [items, setItems] = useState([]),
    [loading, setLoading] = useState(true);
  const [modal, setModal] = useState(false),
    [editing, setEditing] = useState(null),
    [detail, setDetail] = useState(null);
  const [search, setSearch] = useState(""),
    [filter, setFilter] = useState("Barchasi"),
    [view, setView] = useState("table"),
    [toast, setToast] = useState("");
  useEffect(() => onAuthStateChanged(auth, (u) => setUser(u)), []);
  useEffect(() => {
    if (!user) return;
    const q = query(collection(db, "repairs"), orderBy("createdAt", "desc"));
    return onSnapshot(
      q,
      (s) => {
        setItems(s.docs.map((d) => ({ id: d.id, ...d.data() })));
        setLoading(false);
      },
      (e) => {
        console.error(e);
        setToast("Ma’lumotlarni yuklashda xatolik");
        setLoading(false);
      }
    );
  }, [user]);
  useEffect(() => {
    if (!toast) return;
    const t = setTimeout(() => setToast(""), 3500);
    return () => clearTimeout(t);
  }, [toast]);
  const filtered = useMemo(
    () =>
      items.filter(
        (x) =>
          (filter === "Barchasi" || x.status === filter) &&
          [
            x.equipmentName,
            x.organization,
            x.model,
            x.serialNumber,
            x.address,
            x.broughtBy,
          ]
            .join(" ")
            .toLowerCase()
            .includes(search.toLowerCase())
      ),
    [items, filter, search]
  );
  const stats = useMemo(
    () => ({
      all: items.length,
      active: items.filter(
        (x) => !["Ta’mirlandi", "Ta’mirsiz qaytarildi"].includes(x.status)
      ).length,
      done: items.filter((x) => x.status === "Ta’mirlandi").length,
      returned: items.filter(
        (x) => x.returnedAt || x.status === "Ta’mirsiz qaytarildi"
      ).length,
    }),
    [items]
  );
  async function saveRecord(form, media) {
    let uploaded = [];
    for (const file of media) {
      const path = `repairs/${Date.now()}_${file.name.replace(
        /[^a-zA-Z0-9._-]/g,
        "_"
      )}`;
      const snap = await uploadBytes(ref(storage, path), file);
      uploaded.push({
        url: await getDownloadURL(snap.ref),
        name: file.name,
        type: file.type,
        path,
      });
    }
    const payload = {
      ...form,
      media: [...(editing?.media || []), ...uploaded],
      updatedAt: serverTimestamp(),
    };
    if (editing) await updateDoc(doc(db, "repairs", editing.id), payload);
    else
      await addDoc(collection(db, "repairs"), {
        ...payload,
        createdAt: serverTimestamp(),
        createdBy: user.email,
      });
    setToast(editing ? "Ma’lumot yangilandi" : "Uskuna ro‘yxatga olindi");
    setEditing(null);
  }
  async function updateRecord(id, data) {
    await updateDoc(doc(db, "repairs", id), {
      ...data,
      updatedAt: serverTimestamp(),
    });
    setDetail((p) => (p ? { ...p, ...data } : p));
    setItems((p) => p.map((x) => (x.id === id ? { ...x, ...data } : x)));
    setToast("O‘zgarishlar saqlandi");
  }
  async function deleteRecord(id) {
    await deleteDoc(doc(db, "repairs", id));
    setDetail(null);
    setToast("Yozuv o‘chirildi");
  }
  function edit(item) {
    setDetail(null);
    setEditing(item);
    setModal(true);
  }
  if (!firebaseConfigured)
    return (
      <div className="setup">
        <div className="brand-mark">
          <Stethoscope />
        </div>
        <h1>UstaMed sozlash</h1>
        <p>
          Ilovani ishga tushirish uchun Firebase loyihasi ma’lumotlarini
          kiriting.
        </p>
        <ol>
          <li>Firebase Console’da loyiha yarating.</li>
          <li>Authentication → Email/Password usulini yoqing.</li>
          <li>Firestore Database va Storage yarating.</li>
          <li>
            <code>.env.example</code> faylidan <code>.env</code> yarating va
            Firebase config qiymatlarini kiriting.
          </li>
          <li>
            Terminalda <code>npm install</code>, keyin <code>npm run dev</code>{" "}
            bajaring.
          </li>
        </ol>
        <p className="muted">
          Batafsil ko‘rsatma ZIP ichidagi README.md faylida.
        </p>
      </div>
    );
  if (!user) return <AuthScreen />;
  return (
    <div className="app-shell">
      <aside className="sidebar">
        <div className="logo">
          <div className="brand-mark">
            <Stethoscope size={22} />
          </div>
          <div>
            <b>Usta Med</b>
            <small>Service desk</small>
          </div>
        </div>
        <div className="side-label">ISH JARAYONI</div>
        <button className="nav-item active">
          <ClipboardList size={18} /> Ta’mirlash ro‘yxati
        </button>
        <div className="sidebar-bottom">
          <div className="user-mini">
            <div className="avatar">{initials(user.email)}</div>
            <div>
              <b>{user.email}</b>
              <small>Muhandis</small>
            </div>
          </div>
          <button className="nav-item logout" onClick={() => signOut(auth)}>
            <LogOut size={17} /> Chiqish
          </button>
        </div>
      </aside>
      <main className="main">
        <header className="topbar">
          <div className="mobile-brand">
            <div className="brand-mark">
              <Stethoscope size={20} />
            </div>
            <b>UstaMed</b>
          </div>
          <div className="crumb">
            Bosh sahifa <ChevronDown size={14} /> <b>Ta’mirlash ro‘yxati</b>
          </div>
          <div className="top-user">
            <span className="online-dot" />
            <span>{user.email}</span>
            <div className="avatar">{initials(user.email)}</div>
          </div>
        </header>
        <div className="page">
          <div className="page-heading">
            <div>
              <div className="eyebrow">USTAXONA BOSHQARUVI</div>
              <h1>Ta’mirlash ro‘yxati</h1>
              <p>
                Qabul qilingan tibbiy uskunalar va ularning ta’mirlash
                jarayonini kuzating.
              </p>
            </div>
            <button
              className="primary add-btn"
              onClick={() => {
                setEditing(null);
                setModal(true);
              }}
            >
              <Plus size={18} /> Uskuna qabul qilish
            </button>
          </div>
          <div className="stats">
            <div className="stat-card">
              <div className="stat-icon blue-bg">
                <ClipboardList />
              </div>
              <div>
                <small>Jami uskunalar</small>
                <strong>{stats.all}</strong>
              </div>
              <span className="stat-foot">Barcha yozuvlar</span>
            </div>
            <div className="stat-card">
              <div className="stat-icon orange-bg">
                <Wrench />
              </div>
              <div>
                <small>Jarayonda</small>
                <strong>{stats.active}</strong>
              </div>
              <span className="stat-foot">Faol ta’mirlar</span>
            </div>
            <div className="stat-card">
              <div className="stat-icon green-bg">
                <Check />
              </div>
              <div>
                <small>Ta’mirlandi</small>
                <strong>{stats.done}</strong>
              </div>
              <span className="stat-foot">Muvaffaqiyatli</span>
            </div>
            <div className="stat-card">
              <div className="stat-icon purple-bg">
                <ArrowDownToLine />
              </div>
              <div>
                <small>Qaytarilgan</small>
                <strong>{stats.returned}</strong>
              </div>
              <span className="stat-foot">Topshirib berilgan</span>
            </div>
          </div>
          <section className="list-panel">
            <div className="list-head">
              <div>
                <h2>Uskunalar</h2>
                <p>{filtered.length} ta yozuv ko‘rsatilmoqda</p>
              </div>
              <div className="list-tools">
                <div className="search-box">
                  <Search size={17} />
                  <input
                    value={search}
                    onChange={(e) => setSearch(e.target.value)}
                    placeholder="Uskuna, muassasa yoki raqam..."
                  />
                </div>
                <select
                  className="filter-select"
                  value={filter}
                  onChange={(e) => setFilter(e.target.value)}
                >
                  <option>Barchasi</option>
                  {STATUSES.map((s) => (
                    <option>{s}</option>
                  ))}
                </select>
                <div className="view-switch">
                  <button
                    className={view === "table" ? "selected" : ""}
                    onClick={() => setView("table")}
                    title="Jadval"
                  >
                    <ClipboardList size={17} />
                  </button>
                  <button
                    className={view === "cards" ? "selected" : ""}
                    onClick={() => setView("cards")}
                    title="Kartalar"
                  >
                    <Menu size={17} />
                  </button>
                </div>
              </div>
            </div>
            {loading ? (
              <div className="empty">
                <div className="loader" />
                <p>Ma’lumotlar yuklanmoqda...</p>
              </div>
            ) : filtered.length === 0 ? (
              <div className="empty">
                <div className="empty-icon">
                  <HardDrive size={26} />
                </div>
                <b>
                  {search || filter !== "Barchasi"
                    ? "Mos uskuna topilmadi"
                    : "Hozircha uskuna yo‘q"}
                </b>
                <p>Ta’mirlashga kelgan uskunani ro‘yxatga olishdan boshlang.</p>
                {!search && filter === "Barchasi" && (
                  <button className="primary" onClick={() => setModal(true)}>
                    <Plus size={16} /> Birinchi uskunani qo‘shish
                  </button>
                )}
              </div>
            ) : view === "table" ? (
              <div className="table-wrap">
                <table>
                  <thead>
                    <tr>
                      <th>USKUNA</th>
                      <th>MUASSASA</th>
                      <th>QABUL QILGAN</th>
                      <th>SANA</th>
                      <th>HOLATI</th>
                      <th></th>
                    </tr>
                  </thead>
                  <tbody>
                    {filtered.map((item) => (
                      <tr key={item.id} onClick={() => setDetail(item)}>
                        <td>
                          <div className="device-cell">
                            <div className="device-mini">
                              <HardDrive size={17} />
                            </div>
                            <div>
                              <b>{item.equipmentName}</b>
                              <small>
                                {item.model ||
                                  item.serialNumber ||
                                  "Model ko‘rsatilmagan"}
                              </small>
                            </div>
                          </div>
                        </td>
                        <td>
                          <b className="normal">{item.organization}</b>
                          <small className="cell-sub">
                            {item.address || "Manzil kiritilmagan"}
                          </small>
                        </td>
                        <td>{item.acceptedBy || "—"}</td>
                        <td>{fmt(item.receivedAt || item.createdAt)}</td>
                        <td>
                          <span
                            className={`status ${statusClass(item.status)}`}
                          >
                            <i /> {item.status}
                          </span>
                        </td>
                        <td>
                          <button
                            className="icon-btn"
                            onClick={(e) => {
                              e.stopPropagation();
                              setDetail(item);
                            }}
                          >
                            <MoreHorizontal size={19} />
                          </button>
                        </td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
            ) : (
              <div className="card-grid">
                {filtered.map((item) => (
                  <button
                    className="repair-card"
                    key={item.id}
                    onClick={() => setDetail(item)}
                  >
                    <div className="repair-card-top">
                      <div className="device-mini">
                        <HardDrive size={18} />
                      </div>
                      <span className={`status ${statusClass(item.status)}`}>
                        {item.status}
                      </span>
                    </div>
                    <h3>{item.equipmentName}</h3>
                    <p>{item.organization}</p>
                    <div className="card-meta">
                      <span>
                        <UserRound size={14} />
                        {item.acceptedBy || "—"}
                      </span>
                      <span>
                        <Clock3 size={14} />
                        {fmt(item.receivedAt || item.createdAt)}
                      </span>
                    </div>
                    <div className="card-open">
                      Batafsil ko‘rish <ArrowRight size={15} />
                    </div>
                  </button>
                ))}
              </div>
            )}
          </section>
          <footer>
            UstaMed <span>·</span> Tibbiy uskunalarni ta’mirlash hisobini
            yuritish
          </footer>
        </div>
      </main>
      {modal && (
        <RecordForm
          initial={editing}
          onClose={() => {
            setModal(false);
            setEditing(null);
          }}
          onSave={saveRecord}
        />
      )}
      {detail && (
        <Detail
          item={detail}
          onClose={() => setDetail(null)}
          onEdit={edit}
          onUpdate={updateRecord}
          onDelete={deleteRecord}
        />
      )}
      {toast && (
        <div className="toast">
          <Check size={17} />
          {toast}
        </div>
      )}
    </div>
  );
}
