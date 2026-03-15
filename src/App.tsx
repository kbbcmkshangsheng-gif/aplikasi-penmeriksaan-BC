/**
 * @license
 * SPDX-License-Identifier: Apache-2.0
 */

import * as React from 'react';
import { useState, useEffect, useRef, Component } from 'react';
import { 
  auth, 
  db,
  config as firebaseConfig
} from './firebase';
import { 
  signInWithEmailAndPassword, 
  createUserWithEmailAndPassword,
  signInWithPopup,
  GoogleAuthProvider,
  signOut, 
  onAuthStateChanged,
  User
} from 'firebase/auth';
import { 
  collection, 
  addDoc, 
  query, 
  where, 
  orderBy, 
  onSnapshot,
  Timestamp,
  doc,
  deleteDoc,
  serverTimestamp,
  getDoc,
  setDoc,
  updateDoc
} from 'firebase/firestore';
import { 
  useAuthState 
} from 'react-firebase-hooks/auth';
import { 
  LogOut, 
  Plus, 
  ChevronRight, 
  FileText, 
  Camera, 
  Trash2, 
  ArrowLeft,
  CheckCircle2,
  Package,
  AlertCircle,
  Edit2,
  X,
  Download,
  Archive,
  Images
} from 'lucide-react';
import { jsPDF } from 'jspdf';
import autoTable from 'jspdf-autotable';
import JSZip from 'jszip';
import { saveAs } from 'file-saver';
import { motion, AnimatePresence } from 'motion/react';
import { clsx, type ClassValue } from 'clsx';
import { twMerge } from 'tailwind-merge';

function cn(...inputs: ClassValue[]) {
  return twMerge(clsx(inputs));
}

interface Inspection {
  id: string;
  docNumber: string;
  docType: 'BC 2.3' | 'BC 4.0';
  docDate: string;
  createdAt: any;
  createdBy: string;
  status: 'draft' | 'completed';
}

interface InspectionItem {
  id: string;
  serialNumber: string;
  itemType: string;
  quantity: number;
  photoUrls: string[];
  createdAt: any;
}

interface Container {
  id: string;
  containerNumber: string;
  photoUrls: string[];
  createdAt: any;
}

enum OperationType {
  CREATE = 'create',
  UPDATE = 'update',
  DELETE = 'delete',
  LIST = 'list',
  GET = 'get',
  WRITE = 'write',
}

interface FirestoreErrorInfo {
  error: string;
  operationType: OperationType;
  path: string | null;
  authInfo: {
    userId: string | undefined;
    email: string | null | undefined;
    emailVerified: boolean | undefined;
    isAnonymous: boolean | undefined;
    tenantId: string | null | undefined;
    providerInfo: {
      providerId: string;
      displayName: string | null;
      email: string | null;
      photoUrl: string | null;
    }[];
  }
}

function handleFirestoreError(error: unknown, operationType: OperationType, path: string | null) {
  const errInfo: FirestoreErrorInfo = {
    error: error instanceof Error ? error.message : String(error),
    authInfo: {
      userId: auth.currentUser?.uid,
      email: auth.currentUser?.email,
      emailVerified: auth.currentUser?.emailVerified,
      isAnonymous: auth.currentUser?.isAnonymous,
      tenantId: auth.currentUser?.tenantId,
      providerInfo: auth.currentUser?.providerData.map(provider => ({
        providerId: provider.providerId,
        displayName: provider.displayName,
        email: provider.email,
        photoUrl: provider.photoURL
      })) || []
    },
    operationType,
    path
  }
  console.error('Firestore Error: ', JSON.stringify(errInfo));
  throw new Error(JSON.stringify(errInfo));
}

class ErrorBoundary extends Component<any, any> {
  state = { hasError: false, errorInfo: null as string | null };

  static getDerivedStateFromError(error: any) {
    return { hasError: true, errorInfo: error.message };
  }

  componentDidCatch(error: any, errorInfo: any) {
    console.error("ErrorBoundary caught an error", error, errorInfo);
  }

  render() {
    if ((this as any).state.hasError) {
      let displayMessage = "Terjadi kesalahan pada aplikasi.";
      try {
        const parsed = JSON.parse((this as any).state.errorInfo || "");
        if (parsed.error && parsed.error.includes('permission-denied')) {
          displayMessage = "Akses ditolak: Anda tidak memiliki izin untuk melakukan operasi ini.";
        }
      } catch (e) {}

      return (
        <div className="min-h-screen flex items-center justify-center bg-zinc-50 p-6">
          <div className="w-full max-w-md bg-white rounded-2xl shadow-xl border border-zinc-200 p-8 text-center">
            <div className="w-16 h-16 bg-red-100 rounded-full flex items-center justify-center mx-auto mb-4">
              <AlertCircle className="text-red-600 w-8 h-8" />
            </div>
            <h2 className="text-xl font-bold text-zinc-900 mb-2">Oops!</h2>
            <p className="text-zinc-600 mb-6">{displayMessage}</p>
            <button 
              onClick={() => window.location.reload()}
              className="w-full py-3 bg-zinc-900 text-white rounded-xl font-bold hover:bg-zinc-800 transition-all"
            >
              Muat Ulang Aplikasi
            </button>
          </div>
        </div>
      );
    }
    return (this as any).props.children;
  }
}

const Login = () => {
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [error, setError] = useState('');
  const [loading, setLoading] = useState(false);
  const [isRegistering, setIsRegistering] = useState(false);

  const handleAuth = async (e: React.FormEvent) => {
    e.preventDefault();
    if (password.length < 6) {
      setError('Password harus minimal 6 karakter.');
      return;
    }
    setLoading(true);
    setError('');
    try {
      if (isRegistering) {
        await createUserWithEmailAndPassword(auth, email, password);
      } else {
        await signInWithEmailAndPassword(auth, email, password);
      }
    } catch (err: any) {
      if (err.code === 'auth/operation-not-allowed') {
        setError(`Metode login Email/Password belum diaktifkan di Firebase Console untuk proyek ${firebaseConfig.projectId}.`);
      } else if (err.code === 'auth/invalid-credential') {
        setError('Kredensial tidak valid.');
      } else if (err.code === 'auth/weak-password') {
        setError('Password terlalu lemah. Gunakan minimal 6 karakter.');
      } else if (err.code === 'auth/user-not-found' || err.code === 'auth/wrong-password') {
        setError('Email atau password salah.');
      } else {
        setError(isRegistering ? 'Gagal mendaftar.' : 'Login gagal.');
      }
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="min-h-screen flex items-center justify-center bg-zinc-50 p-6">
      <motion.div 
        initial={{ opacity: 0, y: 20 }}
        animate={{ opacity: 1, y: 0 }}
        className="w-full max-w-md bg-white rounded-2xl shadow-xl border border-zinc-200 p-8"
      >
        <div className="flex flex-col items-center mb-8">
          <div className="w-16 h-16 bg-emerald-100 rounded-2xl flex items-center justify-center mb-4">
            <FileText className="text-emerald-600 w-8 h-8" />
          </div>
          <h1 className="text-2xl font-bold text-zinc-900">Sistem BC</h1>
          <p className="text-zinc-500 text-sm">Pemeriksaan Dokumen Pabean</p>
        </div>
        <form onSubmit={handleAuth} className="space-y-4">
          <div>
            <label className="block text-sm font-medium text-zinc-700 mb-1">Email</label>
            <input type="email" required className="w-full px-4 py-3 rounded-xl border border-zinc-200 focus:ring-2 focus:ring-emerald-500 focus:border-emerald-500 outline-none transition-all" placeholder="admin@example.com" value={email} onChange={(e) => setEmail(e.target.value)} />
          </div>
          <div>
            <label className="block text-sm font-medium text-zinc-700 mb-1">Password</label>
            <input type="password" required className="w-full px-4 py-3 rounded-xl border border-zinc-200 focus:ring-2 focus:ring-emerald-500 focus:border-emerald-500 outline-none transition-all" placeholder="••••••••" value={password} onChange={(e) => setPassword(e.target.value)} />
          </div>
          {error && (
            <div className="p-4 rounded-xl bg-red-50 border border-red-100 text-red-700 text-sm">
              <div className="flex items-center gap-2 font-bold"><AlertCircle size={18} />Terjadi Kesalahan</div>
              <p>{error}</p>
            </div>
          )}
          <button type="submit" disabled={loading} className="w-full py-3 bg-zinc-900 text-white rounded-xl font-semibold hover:bg-zinc-800 transition-colors disabled:opacity-50">
            {loading ? 'Memproses...' : (isRegistering ? 'Daftar' : 'Masuk')}
          </button>
          <div className="relative my-6">
            <div className="absolute inset-0 flex items-center"><div className="w-full border-t border-zinc-200"></div></div>
            <div className="relative flex justify-center text-sm"><span className="px-2 bg-white text-zinc-500">Atau</span></div>
          </div>
          <button type="button" onClick={async () => {
            setLoading(true); setError('');
            try { await signInWithPopup(auth, new GoogleAuthProvider()); }
            catch (err: any) { setError('Gagal masuk dengan Google.'); }
            finally { setLoading(false); }
          }} disabled={loading} className="w-full py-3 bg-white border border-zinc-200 text-zinc-700 rounded-xl font-semibold hover:bg-zinc-50 transition-colors flex items-center justify-center gap-2">
            <img src="https://www.gstatic.com/firebasejs/ui/2.0.0/images/auth/google.svg" className="w-5 h-5" alt="Google" referrerPolicy="no-referrer" />
            Masuk dengan Google
          </button>
          <button type="button" onClick={() => setIsRegistering(!isRegistering)} className="w-full text-sm text-zinc-500 hover:text-emerald-600 transition-colors mt-4">
            {isRegistering ? 'Sudah punya akun? Masuk' : 'Belum punya akun? Daftar'}
          </button>
        </form>
      </motion.div>
    </div>
  );
};

const ConfirmModal = ({ isOpen, onClose, onConfirm, title, message, confirmText = "Hapus", confirmColor = "bg-red-600" }: { isOpen: boolean, onClose: () => void, onConfirm: () => void, title: string, message: string, confirmText?: string, confirmColor?: string }) => (
  <AnimatePresence>
    {isOpen && (
      <div className="fixed inset-0 z-[100] flex items-center justify-center p-4">
        <motion.div initial={{ opacity: 0 }} animate={{ opacity: 1 }} exit={{ opacity: 0 }} onClick={onClose} className="absolute inset-0 bg-black/40 backdrop-blur-sm" />
        <motion.div initial={{ scale: 0.9, opacity: 0 }} animate={{ scale: 1, opacity: 1 }} exit={{ scale: 0.9, opacity: 0 }} className="relative w-full max-w-xs bg-white rounded-2xl p-6 shadow-2xl text-center">
          <div className="w-12 h-12 bg-red-50 text-red-600 rounded-full flex items-center justify-center mx-auto mb-4"><AlertCircle size={24} /></div>
          <h3 className="text-lg font-bold text-zinc-900 mb-2">{title}</h3>
          <p className="text-sm text-zinc-500 mb-6">{message}</p>
          <div className="flex gap-3">
            <button onClick={onClose} className="flex-1 py-3 bg-zinc-100 text-zinc-600 rounded-xl font-bold hover:bg-zinc-200 transition-colors">Batal</button>
            <button onClick={() => { onConfirm(); onClose(); }} className={`flex-1 py-3 ${confirmColor} text-white rounded-xl font-bold hover:opacity-90 transition-colors`}>{confirmText}</button>
          </div>
        </motion.div>
      </div>
    )}
  </AnimatePresence>
);

const Dashboard = ({ onSelect }: { onSelect: (id: string | null) => void }) => {
  const [inspections, setInspections] = useState<Inspection[]>([]);
  const [showNewModal, setShowNewModal] = useState(false);
  const [newDocNumber, setNewDocNumber] = useState('');
  const [newDocType, setNewDocType] = useState<'BC 2.3' | 'BC 4.0'>('BC 2.3');
  const [newDocDate, setNewDocDate] = useState(new Date().toISOString().split('T')[0]);
  const [isSaving, setIsSaving] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [user] = useAuthState(auth);
  const [isAdmin, setIsAdmin] = useState(false);

  useEffect(() => {
    if (!user) return;
    const userRef = doc(db, 'users', user.uid);
    const unsubscribe = onSnapshot(userRef, (doc) => {
      setIsAdmin(doc.exists() && doc.data().role === 'admin');
    });
    return () => unsubscribe();
  }, [user]);

  useEffect(() => {
    if (!user) return;
    const q = isAdmin
      ? query(collection(db, 'inspections'), orderBy('createdAt', 'desc'))
      : query(collection(db, 'inspections'), where('createdBy', '==', user.uid), orderBy('createdAt', 'desc'));
    const unsubscribe = onSnapshot(q, (snapshot) => {
      setInspections(snapshot.docs.map(doc => ({ id: doc.id, ...doc.data() } as Inspection)));
    }, (error) => handleFirestoreError(error, OperationType.LIST, 'inspections'));
    return () => unsubscribe();
  }, [user, isAdmin]);

  const handleCreate = async () => {
    if (!newDocNumber || !user || isSaving) return;
    setIsSaving(true); setError(null);
    try {
      const docRef = await addDoc(collection(db, 'inspections'), {
        docNumber: newDocNumber, docType: newDocType, docDate: newDocDate,
        createdAt: serverTimestamp(), createdBy: user.uid, status: 'draft'
      });
      setShowNewModal(false); setNewDocNumber('');
      setNewDocDate(new Date().toISOString().split('T')[0]);
      onSelect(docRef.id);
    } catch (err: any) {
      setError(err.message || 'Gagal membuat dokumen');
    } finally { setIsSaving(false); }
  };

  return (
    <div className="max-w-2xl mx-auto p-4 pb-24">
      <div className="flex items-center justify-between mb-8 mt-4">
        <div>
          <h2 className="text-2xl font-bold text-zinc-900">Daftar Pemeriksaan</h2>
          <div className="flex items-center gap-2">
            <p className="text-zinc-500 text-sm">Kelola dokumen BC anda</p>
            {isAdmin && <span className="px-2 py-0.5 bg-amber-100 text-amber-700 text-[10px] font-bold uppercase rounded-full border border-amber-200">Admin Mode</span>}
          </div>
        </div>
        <button onClick={() => signOut(auth)} className="p-2 text-zinc-400 hover:text-red-500 transition-colors"><LogOut size={20} /></button>
      </div>
      <div className="space-y-4">
        {inspections.length === 0 ? (
          <div className="text-center py-12 bg-zinc-50 rounded-2xl border-2 border-dashed border-zinc-200">
            <FileText className="mx-auto text-zinc-300 mb-2" size={40} />
            <p className="text-zinc-500">Belum ada pemeriksaan</p>
          </div>
        ) : inspections.map((insp) => (
          <motion.div key={insp.id} layoutId={insp.id} onClick={() => onSelect(insp.id)} className="bg-white p-4 rounded-2xl border border-zinc-200 shadow-sm hover:shadow-md transition-all cursor-pointer flex items-center justify-between group">
            <div className="flex items-center gap-4">
              <div className={cn("w-12 h-12 rounded-xl flex items-center justify-center", insp.docType === 'BC 2.3' ? "bg-blue-50 text-blue-600" : "bg-purple-50 text-purple-600")}><FileText size={24} /></div>
              <div>
                <h3 className="font-bold text-zinc-900">{insp.docNumber}</h3>
                <div className="flex items-center gap-2 text-xs text-zinc-500">
                  <span className="font-medium px-1.5 py-0.5 bg-zinc-100 rounded text-zinc-600">{insp.docType}</span>
                  <span>•</span>
                  <span>Tgl: {insp.docDate || '-'}</span>
                </div>
              </div>
            </div>
            <ChevronRight className="text-zinc-300 group-hover:text-zinc-500 transition-colors" size={20} />
          </motion.div>
        ))}
      </div>
      <button onClick={() => setShowNewModal(true)} className="fixed bottom-8 right-8 w-14 h-14 bg-emerald-600 text-white rounded-full shadow-lg shadow-emerald-200 flex items-center justify-center hover:bg-emerald-700 transition-all active:scale-95"><Plus size={28} /></button>
      <AnimatePresence>
        {showNewModal && (
          <div className="fixed inset-0 z-50 flex items-end sm:items-center justify-center p-4">
            <motion.div initial={{ opacity: 0 }} animate={{ opacity: 1 }} exit={{ opacity: 0 }} onClick={() => setShowNewModal(false)} className="absolute inset-0 bg-black/40 backdrop-blur-sm" />
            <motion.div initial={{ y: "100%" }} animate={{ y: 0 }} exit={{ y: "100%" }} className="relative w-full max-w-md bg-white rounded-t-3xl sm:rounded-3xl p-6 shadow-2xl">
              <h3 className="text-xl font-bold mb-4">Pemeriksaan Baru</h3>
              <div className="space-y-4">
                <div>
                  <label className="block text-sm font-medium text-zinc-700 mb-1">Tipe Dokumen</label>
                  <div className="grid grid-cols-2 gap-2">
                    {['BC 2.3', 'BC 4.0'].map((type) => (
                      <button key={type} onClick={() => setNewDocType(type as any)} className={cn("py-3 rounded-xl border-2 transition-all font-semibold", newDocType === type ? "border-emerald-600 bg-emerald-50 text-emerald-700" : "border-zinc-100 bg-zinc-50 text-zinc-500 hover:border-zinc-200")}>{type}</button>
                    ))}
                  </div>
                </div>
                <div>
                  <label className="block text-sm font-medium text-zinc-700 mb-1">Nomor Dokumen</label>
                  <input type="text" className="w-full px-4 py-3 rounded-xl border border-zinc-200 outline-none focus:ring-2 focus:ring-emerald-500" placeholder="Contoh: 000123/BC/2024" value={newDocNumber} onChange={(e) => setNewDocNumber(e.target.value)} />
                </div>
                <div>
                  <label className="block text-sm font-medium text-zinc-700 mb-1">Tanggal Dokumen</label>
                  <input type="date" className="w-full px-4 py-3 rounded-xl border border-zinc-200 outline-none focus:ring-2 focus:ring-emerald-500" value={newDocDate} onChange={(e) => setNewDocDate(e.target.value)} />
                </div>
                {error && <div className="p-3 bg-red-50 text-red-600 rounded-xl text-sm flex items-center gap-2"><AlertCircle size={16} />{error}</div>}
                <button onClick={handleCreate} disabled={!newDocNumber || isSaving} className="w-full py-4 bg-emerald-600 text-white rounded-xl font-bold hover:bg-emerald-700 transition-colors disabled:opacity-50 flex items-center justify-center gap-2">
                  {isSaving ? <><div className="w-5 h-5 border-2 border-white border-t-transparent rounded-full animate-spin" />Memproses...</> : 'Buat Dokumen'}
                </button>
              </div>
            </motion.div>
          </div>
        )}
      </AnimatePresence>
    </div>
  );
};

const InspectionDetail = ({ id, onBack }: { id: string, onBack: () => void }) => {
  const [inspection, setInspection] = useState<Inspection | null>(null);
  const [items, setItems] = useState<InspectionItem[]>([]);
  const [containers, setContainers] = useState<Container[]>([]);
  const [activeTab, setActiveTab] = useState<'items' | 'containers'>('items');
  const [showAddModal, setShowAddModal] = useState(false);
  const [editingItemId, setEditingItemId] = useState<string | null>(null);
  const [newItem, setNewItem] = useState({ serialNumber: '', itemType: '', quantity: 1, photoUrls: [] as string[] });
  const [showContainerModal, setShowContainerModal] = useState(false);
  const [editingContainerId, setEditingContainerId] = useState<string | null>(null);
  const [newContainer, setNewContainer] = useState({ containerNumber: '', photoUrls: [] as string[] });
  const [isSaving, setIsSaving] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [confirmConfig, setConfirmConfig] = useState({ isOpen: false, title: '', message: '', onConfirm: () => {} });
  const fileInputRef = useRef<HTMLInputElement>(null);
  const containerFileInputRef = useRef<HTMLInputElement>(null);

  useEffect(() => {
    const unsubscribeInsp = onSnapshot(doc(db, 'inspections', id), (snapshot) => {
      if (snapshot.exists()) setInspection({ id: snapshot.id, ...snapshot.data() } as Inspection);
    }, (error) => handleFirestoreError(error, OperationType.GET, `inspections/${id}`));

    const unsubscribeItems = onSnapshot(query(collection(db, 'inspections', id, 'items'), orderBy('createdAt', 'desc')), (snapshot) => {
      setItems(snapshot.docs.map(doc => { const d = doc.data(); return { id: doc.id, ...d, photoUrls: d.photoUrls || (d.photoUrl ? [d.photoUrl] : []) } as InspectionItem; }));
    }, (error) => handleFirestoreError(error, OperationType.LIST, `inspections/${id}/items`));

    const unsubscribeContainers = onSnapshot(query(collection(db, 'inspections', id, 'containers'), orderBy('createdAt', 'desc')), (snapshot) => {
      setContainers(snapshot.docs.map(doc => ({ id: doc.id, ...doc.data() } as Container)));
    }, (error) => handleFirestoreError(error, OperationType.LIST, `inspections/${id}/containers`));

    return () => { unsubscribeInsp(); unsubscribeItems(); unsubscribeContainers(); };
  }, [id]);

  const handleFileChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const files = e.target.files;
    if (files) Array.from(files).forEach((file: File) => {
      const reader = new FileReader();
      reader.onloadend = () => setNewItem(prev => ({ ...prev, photoUrls: [...prev.photoUrls, reader.result as string] }));
      reader.readAsDataURL(file);
    });
  };

  const handleContainerFileChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const files = e.target.files;
    if (files) Array.from(files).forEach((file: File) => {
      const reader = new FileReader();
      reader.onloadend = () => setNewContainer(prev => ({ ...prev, photoUrls: [...prev.photoUrls, reader.result as string] }));
      reader.readAsDataURL(file);
    });
  };

  const handleAddItem = async () => {
    if (!newItem.serialNumber || !newItem.itemType || isSaving) return;
    setIsSaving(true); setError(null);
    try {
      if (editingItemId) {
        await updateDoc(doc(db, 'inspections', id, 'items', editingItemId), { ...newItem, updatedAt: serverTimestamp() });
      } else {
        await addDoc(collection(db, 'inspections', id, 'items'), { ...newItem, createdAt: serverTimestamp() });
      }
      setShowAddModal(false); setEditingItemId(null);
      setNewItem({ serialNumber: '', itemType: '', quantity: 1, photoUrls: [] });
    } catch (err: any) { setError(err.message || 'Gagal menyimpan barang'); }
    finally { setIsSaving(false); }
  };

  const handleSaveContainer = async () => {
    if (!newContainer.containerNumber || isSaving) return;
    setIsSaving(true); setError(null);
    try {
      if (editingContainerId) {
        await updateDoc(doc(db, 'inspections', id, 'containers', editingContainerId), { ...newContainer, updatedAt: serverTimestamp() });
      } else {
        await addDoc(collection(db, 'inspections', id, 'containers'), { ...newContainer, createdAt: serverTimestamp() });
      }
      setShowContainerModal(false); setEditingContainerId(null);
      setNewContainer({ containerNumber: '', photoUrls: [] });
    } catch (err: any) { setError(err.message || 'Gagal menyimpan kontainer'); }
    finally { setIsSaving(false); }
  };

  const handleDeleteItem = (itemId: string) => setConfirmConfig({ isOpen: true, title: 'Hapus Barang', message: 'Apakah Anda yakin ingin menghapus barang ini?', onConfirm: async () => { try { await deleteDoc(doc(db, 'inspections', id, 'items', itemId)); } catch (err: any) { console.error(err); } } });
  const handleDeleteContainer = (containerId: string) => setConfirmConfig({ isOpen: true, title: 'Hapus Kontainer', message: 'Apakah Anda yakin ingin menghapus kontainer ini?', onConfirm: async () => { try { await deleteDoc(doc(db, 'inspections', id, 'containers', containerId)); } catch (err: any) { console.error(err); } } });
  const handleDeleteInspection = () => setConfirmConfig({ isOpen: true, title: 'Hapus Dokumen', message: 'Apakah Anda yakin ingin menghapus seluruh dokumen pemeriksaan ini?', onConfirm: async () => { try { await deleteDoc(doc(db, 'inspections', id)); onBack(); } catch (err: any) { console.error(err); } } });

  const handleDownloadItem = (item: InspectionItem | Container) => {
    if (!item.photoUrls || item.photoUrls.length === 0) { alert('Tidak ada foto untuk diunduh'); return; }
    const name = 'serialNumber' in item ? `${item.itemType}_${item.serialNumber}` : `Kontainer_${item.containerNumber}`;
    item.photoUrls.forEach((url, index) => { const link = document.createElement('a'); link.href = url; link.download = `${name}_${index + 1}.png`; document.body.appendChild(link); link.click(); document.body.removeChild(link); });
  };

  const handleDownloadPDF = () => {
    if (!inspection) return;
    const pdfDoc = new jsPDF();
    pdfDoc.setFontSize(18);
    pdfDoc.text('LAPORAN PEMERIKSAAN BARANG', 105, 15, { align: 'center' });
    pdfDoc.setFontSize(10);
    pdfDoc.text(`Nomor Dokumen: ${inspection.docNumber}`, 14, 25);
    pdfDoc.text(`Tipe Dokumen: ${inspection.docType}`, 14, 30);
    pdfDoc.text(`Tanggal Dokumen: ${inspection.docDate || '-'}`, 14, 35);
    pdfDoc.text(`Dicetak pada: ${new Date().toLocaleString()}`, 14, 40);
    autoTable(pdfDoc, { startY: 50, head: [['Ringkasan', 'Total']], body: [['Total Barang', `${items.length} Item`], ['Total Kontainer', `${containers.length} Unit`]], theme: 'striped', headStyles: { fillColor: [16, 185, 129] } });
    let finalY = (pdfDoc as any).lastAutoTable.finalY + 10;
    autoTable(pdfDoc, { startY: finalY, head: [['No', 'Jenis Barang', 'Nomor Seri', 'Jumlah']], body: items.map((item, i) => [i + 1, item.itemType, item.serialNumber, `${item.quantity} Unit`]), theme: 'grid', headStyles: { fillColor: [39, 39, 42] } });
    pdfDoc.save(`Laporan_${inspection.docNumber.replace(/\//g, '_')}.pdf`);
  };

  const summary = items.reduce((acc, item) => { acc[item.itemType] = (acc[item.itemType] || 0) + item.quantity; return acc; }, {} as Record<string, number>);

  if (!inspection) return <div className="p-8 text-center text-zinc-500">Memuat...</div>;

  return (
    <div className="max-w-2xl mx-auto min-h-screen bg-zinc-50 pb-32">
      <div className="bg-white border-b border-zinc-200 sticky top-0 z-10">
        <div className="p-4 flex items-center justify-between">
          <div className="flex items-center gap-3">
            <button onClick={onBack} className="p-2 hover:bg-zinc-100 rounded-lg transition-colors"><ArrowLeft size={20} /></button>
            <div>
              <h2 className="font-bold text-zinc-900 leading-tight">{inspection.docNumber}</h2>
              <div className="flex items-center gap-2 text-[10px] text-zinc-500 font-bold uppercase tracking-wider">
                <span>{inspection.docType}</span><span>•</span><span>{inspection.docDate || '-'}</span>
              </div>
            </div>
          </div>
          <div className="flex items-center gap-1">
            <button onClick={handleDownloadPDF} className="p-2 text-zinc-400 hover:text-emerald-600 transition-colors" title="Unduh Laporan PDF"><Download size={20} /></button>
            <button onClick={handleDeleteInspection} className="p-2 text-zinc-400 hover:text-red-500 transition-colors" title="Hapus Dokumen"><Trash2 size={20} /></button>
          </div>
        </div>
      </div>
      <div className="p-4">
        <div className="bg-white rounded-2xl border border-zinc-200 p-5 shadow-sm">
          <div className="flex items-center gap-2 mb-4 text-zinc-900 font-bold"><Package size={18} className="text-emerald-600" />Ringkasan Pemeriksaan</div>
          <div className="grid grid-cols-2 gap-4">
            <div className="p-3 bg-zinc-50 rounded-xl"><div className="text-[10px] font-bold text-zinc-400 uppercase tracking-wider mb-1">Total Barang</div><div className="text-xl font-bold text-zinc-900">{items.length} <span className="text-xs font-medium text-zinc-500">Item</span></div></div>
            <div className="p-3 bg-zinc-50 rounded-xl"><div className="text-[10px] font-bold text-zinc-400 uppercase tracking-wider mb-1">Total Kontainer</div><div className="text-xl font-bold text-zinc-900">{containers.length} <span className="text-xs font-medium text-zinc-500">Unit</span></div></div>
          </div>
        </div>
      </div>
      <div className="px-4 mb-4">
        <div className="flex bg-zinc-100 p-1 rounded-xl">
          <button onClick={() => setActiveTab('items')} className={cn("flex-1 py-2.5 rounded-lg text-sm font-bold transition-all", activeTab === 'items' ? "bg-white text-emerald-600 shadow-sm" : "text-zinc-500 hover:text-zinc-700")}>Daftar Barang</button>
          <button onClick={() => setActiveTab('containers')} className={cn("flex-1 py-2.5 rounded-lg text-sm font-bold transition-all", activeTab === 'containers' ? "bg-white text-blue-600 shadow-sm" : "text-zinc-500 hover:text-zinc-700")}>Kontainer</button>
        </div>
      </div>
      <div className="px-4 space-y-4">
        {activeTab === 'items' ? (
          <>
            <h3 className="font-bold text-zinc-900 px-1">Detail Barang ({items.length})</h3>
            {items.length === 0 ? (
              <div className="py-12 text-center"><div className="w-16 h-16 bg-zinc-100 rounded-full flex items-center justify-center mx-auto mb-4 text-zinc-400"><Package size={32} /></div><p className="text-zinc-500 font-medium">Belum ada barang diinput</p></div>
            ) : items.map((item) => (
              <div key={item.id} className="bg-white rounded-2xl border border-zinc-200 overflow-hidden shadow-sm">
                <div className="flex p-3">
                  <div className="flex-1">
                    <div className="flex justify-between items-start">
                      <h4 className="font-bold text-zinc-900 text-sm">{item.itemType}</h4>
                      <div className="flex items-center gap-1">
                        <button onClick={() => handleDownloadItem(item)} className="flex items-center gap-1 px-2 py-1 rounded-md bg-emerald-50 text-emerald-700 hover:bg-emerald-100 transition-colors text-[10px] font-bold"><Download size={12} />FOTO</button>
                        <button onClick={() => { setEditingItemId(item.id); setNewItem({ serialNumber: item.serialNumber, itemType: item.itemType, quantity: item.quantity, photoUrls: item.photoUrls || [] }); setShowAddModal(true); }} className="text-zinc-400 hover:text-blue-500 p-1"><Edit2 size={16} /></button>
                        <button onClick={() => handleDeleteItem(item.id)} className="text-zinc-300 hover:text-red-500 p-1"><Trash2 size={16} /></button>
                      </div>
                    </div>
                    <p className="text-xs text-zinc-500">SN: {item.serialNumber}</p>
                    <span className="text-[10px] font-bold text-emerald-600 bg-emerald-50 px-2 py-0.5 rounded uppercase tracking-wider mt-2 inline-block">{item.quantity} Unit</span>
                  </div>
                </div>
                {item.photoUrls && item.photoUrls.length > 0 && (
                  <div className="flex gap-2 p-3 pt-0 overflow-x-auto">
                    {item.photoUrls.map((url, idx) => <img key={idx} src={url} alt={`Item ${idx}`} className="w-20 h-20 object-cover rounded-lg border border-zinc-100 flex-shrink-0" referrerPolicy="no-referrer" />)}
                  </div>
                )}
              </div>
            ))}
          </>
        ) : (
          <>
            <h3 className="font-bold text-zinc-900 px-1">Daftar Kontainer ({containers.length})</h3>
            {containers.length === 0 ? (
              <div className="py-12 text-center"><div className="w-16 h-16 bg-zinc-100 rounded-full flex items-center justify-center mx-auto mb-4 text-zinc-400"><Archive size={32} /></div><p className="text-zinc-500 font-medium">Belum ada kontainer diinput</p></div>
            ) : containers.map((container) => (
              <div key={container.id} className="bg-white rounded-2xl border border-zinc-200 overflow-hidden shadow-sm">
                <div className="flex p-3">
                  <div className="flex-1">
                    <div className="flex justify-between items-start">
                      <h4 className="font-bold text-zinc-900 text-sm">Kontainer</h4>
                      <div className="flex items-center gap-1">
                        <button onClick={() => handleDownloadItem(container)} className="flex items-center gap-1 px-2 py-1 rounded-md bg-blue-50 text-blue-700 hover:bg-blue-100 transition-colors text-[10px] font-bold"><Download size={12} />FOTO</button>
                        <button onClick={() => { setEditingContainerId(container.id); setNewContainer({ containerNumber: container.containerNumber, photoUrls: container.photoUrls || [] }); setShowContainerModal(true); }} className="text-zinc-400 hover:text-blue-500 p-1"><Edit2 size={16} /></button>
                        <button onClick={() => handleDeleteContainer(container.id)} className="text-zinc-300 hover:text-red-500 p-1"><Trash2 size={16} /></button>
                      </div>
                    </div>
                    <p className="text-xs text-zinc-500">No: {container.containerNumber}</p>
                  </div>
                </div>
                {container.photoUrls && container.photoUrls.length > 0 && (
                  <div className="flex gap-2 p-3 pt-0 overflow-x-auto">
                    {container.photoUrls.map((url, idx) => <img key={idx} src={url} alt={`Container ${idx}`} className="w-20 h-20 object-cover rounded-lg border border-zinc-100 flex-shrink-0" referrerPolicy="no-referrer" />)}
                  </div>
                )}
              </div>
            ))}
          </>
        )}
      </div>
      <button onClick={() => activeTab === 'items' ? setShowAddModal(true) : setShowContainerModal(true)} className="fixed bottom-8 right-8 px-6 py-3 bg-zinc-900 text-white rounded-full shadow-lg flex items-center gap-2 font-bold hover:bg-zinc-800 transition-all active:scale-95 z-20">
        <Plus size={20} />{activeTab === 'items' ? 'Input Barang' : 'Input Kontainer'}
      </button>
      <AnimatePresence>
        {showAddModal && (
          <div className="fixed inset-0 z-50 flex items-end sm:items-center justify-center p-4">
            <motion.div initial={{ opacity: 0 }} animate={{ opacity: 1 }} exit={{ opacity: 0 }} onClick={() => { setShowAddModal(false); setEditingItemId(null); setNewItem({ serialNumber: '', itemType: '', quantity: 1, photoUrls: [] }); }} className="absolute inset-0 bg-black/40 backdrop-blur-sm" />
            <motion.div initial={{ y: "100%" }} animate={{ y: 0 }} exit={{ y: "100%" }} className="relative w-full max-w-md bg-white rounded-t-3xl sm:rounded-3xl p-6 shadow-2xl overflow-y-auto max-h-[90vh]">
              <h3 className="text-xl font-bold mb-6">{editingItemId ? 'Edit Barang' : 'Input Barang'}</h3>
              <div className="space-y-4">
                <div>
                  <label className="block text-xs font-bold text-zinc-500 uppercase mb-1">Foto Barang</label>
                  <div className="grid grid-cols-3 gap-2">
                    {newItem.photoUrls.map((url, idx) => (
                      <div key={idx} className="relative aspect-square rounded-xl overflow-hidden border border-zinc-200 group">
                        <img src={url} className="w-full h-full object-cover" referrerPolicy="no-referrer" />
                        <button onClick={() => setNewItem(prev => ({ ...prev, photoUrls: prev.photoUrls.filter((_, i) => i !== idx) }))} className="absolute top-1 right-1 bg-black/50 text-white p-1 rounded-full opacity-0 group-hover:opacity-100 transition-opacity"><X size={12} /></button>
                      </div>
                    ))}
                    <button onClick={() => fileInputRef.current?.click()} className="aspect-square bg-zinc-50 rounded-xl border-2 border-dashed border-zinc-200 flex flex-col items-center justify-center hover:bg-zinc-100 transition-colors"><Camera className="text-zinc-300" size={24} /><span className="text-[10px] text-zinc-500 mt-1 font-bold">Tambah</span></button>
                  </div>
                  <input ref={fileInputRef} type="file" accept="image/*" capture="environment" multiple className="hidden" onChange={handleFileChange} />
                </div>
                <div className="grid grid-cols-2 gap-4">
                  <div><label className="block text-xs font-bold text-zinc-500 uppercase mb-1">Nomor Seri</label><input type="text" className="w-full px-4 py-3 rounded-xl border border-zinc-200 outline-none focus:ring-2 focus:ring-emerald-500" placeholder="SN-123..." value={newItem.serialNumber} onChange={(e) => setNewItem(prev => ({ ...prev, serialNumber: e.target.value }))} /></div>
                  <div><label className="block text-xs font-bold text-zinc-500 uppercase mb-1">Jumlah</label><input type="number" className="w-full px-4 py-3 rounded-xl border border-zinc-200 outline-none focus:ring-2 focus:ring-emerald-500" value={newItem.quantity} onChange={(e) => setNewItem(prev => ({ ...prev, quantity: parseInt(e.target.value) || 0 }))} /></div>
                </div>
                <div><label className="block text-xs font-bold text-zinc-500 uppercase mb-1">Jenis Barang</label><input type="text" className="w-full px-4 py-3 rounded-xl border border-zinc-200 outline-none focus:ring-2 focus:ring-emerald-500" placeholder="Contoh: Laptop, Mesin, dll" value={newItem.itemType} onChange={(e) => setNewItem(prev => ({ ...prev, itemType: e.target.value }))} /></div>
                {error && <div className="p-3 bg-red-50 text-red-600 rounded-xl text-sm flex items-center gap-2"><AlertCircle size={16} />{error}</div>}
                <button onClick={handleAddItem} disabled={!newItem.serialNumber || !newItem.itemType || isSaving} className="w-full py-4 bg-emerald-600 text-white rounded-xl font-bold hover:bg-emerald-700 transition-colors disabled:opacity-50 mt-4 flex items-center justify-center gap-2">
                  {isSaving ? <><div className="w-5 h-5 border-2 border-white border-t-transparent rounded-full animate-spin" />Menyimpan...</> : 'Simpan Barang'}
                </button>
              </div>
            </motion.div>
          </div>
        )}
      </AnimatePresence>
      <AnimatePresence>
        {showContainerModal && (
          <div className="fixed inset-0 z-50 flex items-end sm:items-center justify-center p-4">
            <motion.div initial={{ opacity: 0 }} animate={{ opacity: 1 }} exit={{ opacity: 0 }} onClick={() => { setShowContainerModal(false); setEditingContainerId(null); setNewContainer({ containerNumber: '', photoUrls: [] }); }} className="absolute inset-0 bg-black/40 backdrop-blur-sm" />
            <motion.div initial={{ y: "100%" }} animate={{ y: 0 }} exit={{ y: "100%" }} className="relative w-full max-w-md bg-white rounded-t-3xl sm:rounded-3xl p-6 shadow-2xl overflow-y-auto max-h-[90vh]">
              <h3 className="text-xl font-bold mb-6">{editingContainerId ? 'Edit Kontainer' : 'Input Kontainer'}</h3>
              <div className="space-y-4">
                <div>
                  <label className="block text-xs font-bold text-zinc-500 uppercase mb-1">Foto Kontainer</label>
                  <div className="grid grid-cols-3 gap-2">
                    {newContainer.photoUrls.map((url, idx) => (
                      <div key={idx} className="relative aspect-square rounded-xl overflow-hidden border border-zinc-200 group">
                        <img src={url} className="w-full h-full object-cover" referrerPolicy="no-referrer" />
                        <button onClick={() => setNewContainer(prev => ({ ...prev, photoUrls: prev.photoUrls.filter((_, i) => i !== idx) }))} className="absolute top-1 right-1 bg-black/50 text-white p-1 rounded-full opacity-0 group-hover:opacity-100 transition-opacity"><X size={12} /></button>
                      </div>
                    ))}
                    <button onClick={() => containerFileInputRef.current?.click()} className="aspect-square bg-zinc-50 rounded-xl border-2 border-dashed border-zinc-200 flex flex-col items-center justify-center hover:bg-zinc-100 transition-colors"><Camera className="text-zinc-300" size={24} /><span className="text-[10px] text-zinc-500 mt-1 font-bold">Tambah</span></button>
                  </div>
                  <input ref={containerFileInputRef} type="file" accept="image/*" capture="environment" multiple className="hidden" onChange={handleContainerFileChange} />
                </div>
                <div><label className="block text-xs font-bold text-zinc-500 uppercase mb-1">Nomor Kontainer</label><input type="text" className="w-full px-4 py-3 rounded-xl border border-zinc-200 outline-none focus:ring-2 focus:ring-blue-500" placeholder="Contoh: TGHU 123456-7" value={newContainer.containerNumber} onChange={(e) => setNewContainer(prev => ({ ...prev, containerNumber: e.target.value }))} /></div>
                {error && <div className="p-3 bg-red-50 text-red-600 rounded-xl text-sm flex items-center gap-2"><AlertCircle size={16} />{error}</div>}
                <button onClick={handleSaveContainer} disabled={!newContainer.containerNumber || isSaving} className="w-full py-4 bg-blue-600 text-white rounded-xl font-bold hover:bg-blue-700 transition-colors disabled:opacity-50 mt-4 flex items-center justify-center gap-2">
                  {isSaving ? <><div className="w-5 h-5 border-2 border-white border-t-transparent rounded-full animate-spin" />Menyimpan...</> : 'Simpan Kontainer'}
                </button>
              </div>
            </motion.div>
          </div>
        )}
      </AnimatePresence>
      <ConfirmModal isOpen={confirmConfig.isOpen} onClose={() => setConfirmConfig(prev => ({ ...prev, isOpen: false }))} onConfirm={confirmConfig.onConfirm} title={confirmConfig.title} message={confirmConfig.message} />
    </div>
  );
};

export default function App() {
  const [user, loading] = useAuthState(auth);
  const [selectedInspectionId, setSelectedInspectionId] = useState<string | null>(null);

  useEffect(() => {
    if (!user) return;
    if (user.email === 'kbbcmks.hangsheng@gmail.com') {
      const userRef = doc(db, 'users', user.uid);
      getDoc(userRef).then((docSnap) => {
        if (!docSnap.exists() || docSnap.data()?.role !== 'admin') {
          setDoc(userRef, { uid: user.uid, email: user.email, displayName: user.displayName || 'Admin', role: 'admin', updatedAt: serverTimestamp() }, { merge: true }).catch(console.error);
        }
      }).catch(console.error);
    }
  }, [user]);

  if (loading) return <div className="min-h-screen flex items-center justify-center bg-zinc-50"><div className="w-8 h-8 border-4 border-emerald-500 border-t-transparent rounded-full animate-spin"></div></div>;
  if (!user) return <Login />;

  return (
    <ErrorBoundary>
      <div className="min-h-screen bg-zinc-50 font-sans">
        <AnimatePresence mode="wait">
          {selectedInspectionId ? (
            <motion.div key="detail" initial={{ opacity: 0, x: 20 }} animate={{ opacity: 1, x: 0 }} exit={{ opacity: 0, x: -20 }}>
              <InspectionDetail id={selectedInspectionId} onBack={() => setSelectedInspectionId(null)} />
            </motion.div>
          ) : (
            <motion.div key="dashboard" initial={{ opacity: 0, x: -20 }} animate={{ opacity: 1, x: 0 }} exit={{ opacity: 0, x: 20 }}>
              <Dashboard onSelect={setSelectedInspectionId} />
            </motion.div>
          )}
        </AnimatePresence>
      </div>
    </ErrorBoundary>
  );
}