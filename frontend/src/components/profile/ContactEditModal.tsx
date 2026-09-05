import { useState } from 'react';
import { ArrowLeft, User, Phone, Mail } from 'lucide-react';
import { triggerConfirm } from '../../store/confirmStore';

interface ContactEditModalProps {
  isOpen: boolean;
  onClose: () => void;
  initialName?: string;
  initialPhone?: string;
  initialEmail?: string;
  onSave: (data: { name: string; phone: string; email: string }) => void;
  onDeleteAccount?: () => void;
}

export function ContactEditModal({
  isOpen,
  onClose,
  initialName = 'Shi Hao',
  initialPhone = '+855714174813',
  initialEmail = '',
  onSave,
  onDeleteAccount,
}: ContactEditModalProps) {
  const [name, setName] = useState(initialName);
  const [phone, setPhone] = useState(initialPhone);
  const [email, setEmail] = useState(initialEmail);

  if (!isOpen) return null;

  const handleSave = () => {
    onSave({ name, phone, email });
    onClose();
  };

  const handleDelete = () => {
    triggerConfirm({
      title: 'Delete Account',
      message: 'Are you sure you want to permanently delete your account? This action cannot be undone.',
      confirmText: 'Delete Account',
      variant: 'danger',
      onConfirm: () => {
        if (onDeleteAccount) onDeleteAccount();
        onClose();
      },
    });
  };

  return (
    <div className="fixed inset-0 z-50 bg-[#0A0E17] flex flex-col animate-fade-in text-gray-100">
      {/* ── Top Header ── */}
      <div className="flex items-center justify-between px-4 py-3.5 border-b border-[#1E283C]">
        <button
          onClick={onClose}
          aria-label="Back"
          className="w-9 h-9 rounded-full flex items-center justify-center text-white hover:bg-white/10 transition-colors"
        >
          <ArrowLeft className="w-5 h-5 stroke-[2.5]" />
        </button>

        <h2 className="font-display font-bold text-base text-white tracking-wide">
          Profile Details
        </h2>

        <button
          onClick={handleSave}
          className="text-sm font-bold text-[#E8452C] hover:text-[#ff6f61] px-2 py-1 transition-colors"
        >
          Save
        </button>
      </div>

      {/* ── Main Content ── */}
      <div className="flex-1 max-w-md w-full mx-auto px-4 py-8 flex flex-col justify-between">
        <div className="space-y-6">
          {/* User Avatar Circle + Info Header */}
          <div className="flex items-center gap-4 px-2 pb-2">
            <div className="w-16 h-16 rounded-full bg-gradient-to-tr from-[#E8452C] to-amber-500 flex items-center justify-center text-white font-black text-2xl shadow-xl overflow-hidden shrink-0">
              {name.charAt(0).toUpperCase()}
            </div>
            <div>
              <h3 className="font-display font-black text-lg text-white">
                {name || 'Shi Hao'}
              </h3>
              <p className="text-xs text-gray-400 font-mono mt-0.5">
                {phone || '+855714174813'}
              </p>
            </div>
          </div>

          <div className="border-t border-[#1E283C]/80 pt-4" />

          {/* ── 3 Tappable Pill Inputs (Name, Phone, Email) ── */}
          <div className="space-y-3.5">
            {/* 1. Name */}
            <div className="relative flex items-center bg-[#1E283C] hover:bg-[#243048] focus-within:bg-[#243048] border border-[#2A3750] rounded-xl px-4 py-3.5 transition-colors">
              <User className="w-5 h-5 text-gray-300 mr-3.5 shrink-0" />
              <input
                type="text"
                value={name}
                onChange={(e) => setName(e.target.value)}
                placeholder="Full Name"
                className="w-full bg-transparent text-sm font-medium text-white placeholder-gray-400 focus:outline-none"
              />
            </div>

            {/* 2. Phone */}
            <div className="relative flex items-center bg-[#1E283C] hover:bg-[#243048] focus-within:bg-[#243048] border border-[#2A3750] rounded-xl px-4 py-3.5 transition-colors">
              <Phone className="w-5 h-5 text-gray-300 mr-3.5 shrink-0" />
              <input
                type="tel"
                value={phone}
                onChange={(e) => setPhone(e.target.value)}
                placeholder="Phone Number"
                className="w-full bg-transparent text-sm font-medium text-white placeholder-gray-400 focus:outline-none"
              />
            </div>

            {/* 3. Email */}
            <div className="relative flex items-center bg-[#1E283C] hover:bg-[#243048] focus-within:bg-[#243048] border border-[#2A3750] rounded-xl px-4 py-3.5 transition-colors">
              <Mail className="w-5 h-5 text-gray-300 mr-3.5 shrink-0" />
              <input
                type="email"
                value={email}
                onChange={(e) => setEmail(e.target.value)}
                placeholder="Email Address"
                className="w-full bg-transparent text-sm font-medium text-white placeholder-gray-400 focus:outline-none"
              />
            </div>
          </div>
        </div>

        {/* ── Bottom: Delete Account link ── */}
        <div className="text-center pt-8 pb-4">
          <button
            onClick={handleDelete}
            className="text-xs font-bold text-[#E8452C] hover:text-red-400 transition-colors"
          >
            Delete Account
          </button>
        </div>
      </div>
    </div>
  );
}
