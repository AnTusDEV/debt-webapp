/**
 * @license
 * SPDX-License-Identifier: Apache-2.0
 */

import React, { useState, useEffect, useMemo } from 'react';
import { 
  Plus, 
  Search, 
  LogOut, 
  User as UserIcon, 
  TrendingUp, 
  Clock, 
  CheckCircle2, 
  AlertCircle,
  Database,
  ChevronRight,
  X,
  BarChart3,
  PieChart as PieIcon,
  ShieldCheck,
  Eye,
  EyeOff
} from 'lucide-react';
import { motion, AnimatePresence } from 'motion/react';
import { 
  BarChart, 
  Bar, 
  XAxis, 
  YAxis, 
  CartesianGrid, 
  Tooltip as RechartsTooltip, 
  ResponsiveContainer,
  PieChart,
  Pie,
  Cell,
  Legend,
  LabelList
} from 'recharts';
import { api } from './services/api';
import { User, Debt, Debtor } from './types';

export default function App() {
  const [user, setUser] = useState<User | null>(null);
  const [debts, setDebts] = useState<Debt[]>([]);
  const [debtors, setDebtors] = useState<Debtor[]>([]);
  const [areas, setAreas] = useState<string[]>([]);
  const [adminStats, setAdminStats] = useState<any>(null);
  const [usersList, setUsersList] = useState<User[]>([]);
  const [loading, setLoading] = useState(true);
  const [isAddDebtOpen, setIsAddDebtOpen] = useState(false);
  const [isAddUserOpen, setIsAddUserOpen] = useState(false);
  const [viewMode, setViewMode] = useState<'dashboard' | 'history' | 'debtors' | 'users'>('dashboard');
  const [searchTerm, setSearchTerm] = useState('');
  const [filterStatus, setFilterStatus] = useState<'all' | 'pending' | 'paid'>('all');
  
  // Login form state
  const [username, setUsername] = useState('');
  const [password, setPassword] = useState('');
  const [showPassword, setShowPassword] = useState(false);
  const [loginError, setLoginError] = useState('');
  const [selectedDebtorId, setSelectedDebtorId] = useState<number | null>(null);
  const [notification, setNotification] = useState<{ message: string; type: 'success' | 'error' } | null>(null);

  // Show notification for 3 seconds
  useEffect(() => {
    if (notification) {
      const timer = setTimeout(() => setNotification(null), 3000);
      return () => clearTimeout(timer);
    }
  }, [notification]);
 
  // Add debt form state
  const [newDebt, setNewDebt] = useState({
    debtorName: '',
    amount: '',
    description: '',
    phone: '',
    email: '',
    area: '',
    debt_date: new Date().toISOString().split('T')[0]
  });

  // Add user form state
  const [newUser, setNewUser] = useState({
    username: '',
    password: '',
    fullname: '',
    role: 'user' as 'admin' | 'user'
  });

  useEffect(() => {
    const savedUser = localStorage.getItem('debt_tracker_user');
    if (savedUser) {
      try {
        const parsed = JSON.parse(savedUser);
        setUser(parsed);
      } catch (e) {
        localStorage.removeItem('debt_tracker_user');
      }
    }
    setLoading(false);
    
    const handleAuthExpired = () => {
      setUser(null);
      localStorage.removeItem('debt_tracker_user');
    };

    window.addEventListener('auth-expired', handleAuthExpired);
    return () => window.removeEventListener('auth-expired', handleAuthExpired);
  }, []);

  useEffect(() => {
    if (user) {
      fetchData();
    }
  }, [user]);

  const fetchData = async () => {
    try {
      if (!user) return;
      
      const promises: any[] = [api.getDebtors(), api.getDebts(), api.getAreas()];
      if (user.role === 'admin') {
        promises.push(api.getAdminStats());
        promises.push(api.getAdminUsers());
      }
      
      const [debtorsData, debtsData, areasData, statsData, usersData] = await Promise.all(promises);
      setDebtors(debtorsData);
      setDebts(debtsData || []);
      setAreas(areasData || []);
      if (statsData) setAdminStats(statsData);
      if (usersData) setUsersList(usersData);
    } catch (error) {
      console.error('Lỗi khi tải dữ liệu:', error);
    }
  };

  const handleLogin = async (e: React.FormEvent) => {
    e.preventDefault();
    setLoginError('');
    try {
      const response = await api.login({ username, password });
      api.setToken(response.token);
      localStorage.setItem('debt_tracker_user', JSON.stringify(response.user));
      setUser(response.user);
      setUsername('');
      setPassword('');
      await fetchData();
    } catch (error: any) {
      setLoginError('Tài khoản hoặc mật khẩu không chính xác');
    }
  };

  const handleLogout = () => {
    api.clearToken();
    localStorage.removeItem('debt_tracker_user');
    setUser(null);
  };

  const handleCreateDebt = async (e: React.FormEvent) => {
    e.preventDefault();
    try {
      await api.addDebt({
        ...newDebt,
        amount: parseFloat(newDebt.amount),
        status: 'pending'
      });
      setIsAddDebtOpen(false);
      setNewDebt({
        debtorName: '',
        amount: '',
        description: '',
        phone: '',
        email: '',
        area: '',
        debt_date: new Date().toISOString().split('T')[0]
      });
      await fetchData();
      setNotification({ message: 'Đã thêm khoản nợ thành công', type: 'success' });
    } catch (error) {
      setNotification({ message: 'Không thể thêm khoản nợ', type: 'error' });
    }
  };

  const toggleStatus = async (debt: Debt) => {
    const newStatus = debt.status === 'pending' ? 'paid' : 'pending';
    try {
      await api.updateDebtStatus(debt.id, newStatus);
      await fetchData();
      setNotification({ message: 'Đã cập nhật trạng thái', type: 'success' });
    } catch (error) {
      setNotification({ message: 'Không thể cập nhật trạng thái', type: 'error' });
    }
  };

  const handlePayAll = async (debtorId: number) => {
    try {
      await api.payAllDebts(debtorId);
      await fetchData();
      setNotification({ message: 'Đã thanh toán toàn bộ cho người này', type: 'success' });
    } catch (error) {
      setNotification({ message: 'Không thể cập nhật trạng thái', type: 'error' });
    }
  };

  const handleCreateUser = async (e: React.FormEvent) => {
    e.preventDefault();
    try {
      await api.addAdminUser(newUser);
      setIsAddUserOpen(false);
      setNewUser({
        username: '',
        password: '',
        fullname: '',
        role: 'user'
      });
      await fetchData();
      setNotification({ message: 'Đã tạo người dùng mới thành công', type: 'success' });
    } catch (error: any) {
      setNotification({ message: error.response?.data?.message || 'Không thể tạo người dùng', type: 'error' });
    }
  };

  const filteredDebts = useMemo(() => {
    return debts.filter(debt => {
      const matchesSearch = debt.debtor_name.toLowerCase().includes(searchTerm.toLowerCase());
      const matchesFilter = filterStatus === 'all' || debt.status === filterStatus;
      return matchesSearch && matchesFilter;
    });
  }, [debts, searchTerm, filterStatus]);

  const aggregatedDebts = useMemo(() => {
    const map = new Map<number, { debtor_id: number; name: string; area: string; total_pending: number; total_paid: number }>();
    
    debts.forEach(debt => {
      if (!map.has(debt.debtor_id)) {
        map.set(debt.debtor_id, { 
          debtor_id: debt.debtor_id, 
          name: debt.debtor_name, 
          area: debt.debtor_area || '', 
          total_pending: 0, 
          total_paid: 0 
        });
      }
      const entry = map.get(debt.debtor_id)!;
      if (debt.status === 'pending') {
        entry.total_pending += Number(debt.amount);
      } else {
        entry.total_paid += Number(debt.amount);
      }
    });

    return Array.from(map.values()).filter(item => 
      item.name.toLowerCase().includes(searchTerm.toLowerCase()) || 
      item.area.toLowerCase().includes(searchTerm.toLowerCase())
    ).sort((a, b) => b.total_pending - a.total_pending);
  }, [debts, searchTerm]);

  const totalAmount = debts.reduce((sum, d) => d.status === 'pending' ? sum + Number(d.amount) : sum, 0);
  const paidAmount = debts.reduce((sum, d) => d.status === 'paid' ? sum + Number(d.amount) : sum, 0);

  if (loading) {
    return <div className="min-h-screen bg-slate-50 flex items-center justify-center font-sans tracking-tight">Đang tải...</div>;
  }

  if (!user) {
    return (
      <div className="min-h-screen bg-slate-50 flex items-center justify-center p-6 font-sans antialiased">
        <motion.div 
          initial={{ opacity: 0, y: 10 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ duration: 0.4, ease: "easeOut" }}
          className="w-full max-w-[400px]"
        >
          <div className="bg-white rounded-2xl shadow-sm border border-slate-200/60 p-8">
            <div className="flex flex-col items-center mb-8">
              <div className="w-16 h-16 bg-gradient-to-br from-blue-500 to-indigo-600 rounded-2xl flex items-center justify-center text-white shadow-xl shadow-blue-200/50 mb-4 transition-transform hover:scale-105 duration-300">
                <BarChart3 className="w-8 h-8" />
              </div>
              <h1 className="text-2xl font-black text-slate-900 tracking-tight uppercase">Sổ Nợ Thông Minh</h1>
              <p className="text-sm text-slate-500 mt-1 font-medium italic">Hệ thống quản lý tài chính chuyên nghiệp</p>
            </div>
            
            <form onSubmit={handleLogin} className="space-y-4">
              <div className="space-y-1.5">
                <label className="text-xs font-semibold text-slate-700 uppercase tracking-wider ml-1">Tên người dùng</label>
                <input 
                  type="text" 
                  value={username}
                  onChange={(e) => setUsername(e.target.value)}
                  className="w-full px-4 py-2.5 rounded-xl border border-slate-200 bg-slate-50/50 focus:bg-white focus:ring-2 focus:ring-blue-500/20 focus:border-blue-500 outline-none transition-all placeholder:text-slate-400"
                  required
                />
              </div>
              <div className="space-y-1.5 ring-0">
                <label className="text-xs font-semibold text-slate-700 uppercase tracking-wider ml-1">Mật khẩu</label>
                <div className="relative group">
                  <input 
                    type={showPassword ? "text" : "password"} 
                    value={password}
                    onChange={(e) => setPassword(e.target.value)}
                    className="w-full px-4 py-2.5 rounded-xl border border-slate-200 bg-slate-50/50 focus:bg-white focus:ring-2 focus:ring-blue-500/20 focus:border-blue-500 outline-none transition-all placeholder:text-slate-400"
                    required
                  />
                  <button
                    type="button"
                    onClick={() => setShowPassword(!showPassword)}
                    className="absolute right-3 top-1/2 -translate-y-1/2 p-1.5 text-slate-400 hover:text-slate-600 transition-colors"
                  >
                    {showPassword ? (
                      <EyeOff className="w-4 h-4" />
                    ) : (
                      <Eye className="w-4 h-4" />
                    )}
                  </button>
                </div>
              </div>
              {loginError && (
                <div className="flex items-center gap-2 text-rose-500 bg-rose-50 px-3 py-2 rounded-lg text-sm mt-2 border border-rose-100">
                  <AlertCircle className="w-4 h-4 shrink-0" />
                  <p>{loginError}</p>
                </div>
              )}
              <button 
                type="submit"
                className="w-full bg-slate-900 text-white py-3 rounded-xl font-semibold shadow-sm hover:bg-slate-800 active:scale-[0.98] transition-all mt-2"
              >
                Đăng nhập
              </button>
            </form>
          </div>
        </motion.div>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-slate-50/50 text-slate-900 font-sans selection:bg-blue-100 flex flex-col md:h-screen">
      {/* Navigation */}
      <nav className="h-16 bg-white border-b border-slate-200/60 flex items-center justify-between px-4 md:px-8 flex-shrink-0 z-20">
        <div className="flex items-center gap-3">
          <div className="w-9 h-9 bg-gradient-to-br from-blue-500 to-indigo-600 rounded-xl flex items-center justify-center text-white shadow-lg shadow-blue-200/50">
            <BarChart3 className="w-5 h-5" />
          </div>
          <span className="text-lg font-bold tracking-tight text-slate-900 hidden sm:block">
            {user.fullname || 'Quản lý Công nợ'}
          </span>
        </div>
        
        <div className="hidden md:flex items-center bg-slate-50 rounded-xl px-3 py-1.5 border border-slate-200/60 w-80 group focus-within:ring-2 focus-within:ring-blue-500/10 focus-within:border-blue-500/50 transition-all">
          <Search className="w-4 h-4 text-slate-400 group-focus-within:text-blue-500" />
          <input 
            type="text" 
            placeholder="Tìm kiếm..."
            className="ml-2 bg-transparent border-none outline-none text-sm w-full placeholder:text-slate-400"
            value={searchTerm}
            onChange={(e) => setSearchTerm(e.target.value)}
          />
        </div>

        <div className="flex items-center gap-3">
          <div className="h-8 w-px bg-slate-200 mx-1 hidden sm:block"></div>
          <button 
            onClick={handleLogout}
            className="p-2 text-slate-400 hover:text-rose-500 hover:bg-rose-50 rounded-lg transition-all"
            title="Đăng xuất"
          >
            <LogOut className="w-4 h-4" />
          </button>
        </div>
      </nav>

      {/* Main Content */}
      <main className="flex-1 overflow-y-auto bg-slate-50">
        <div className="p-4 md:p-8 w-full max-w-7xl mx-auto space-y-8 pb-20">
          {user.role !== 'admin' && (
            <div className="flex items-center gap-1 overflow-x-auto scrollbar-none sticky top-0 z-30 bg-slate-50/95 backdrop-blur-sm -mx-4 px-4 py-2 border-b border-slate-100 md:relative md:top-0 md:z-0 md:bg-transparent md:mx-0 md:px-0 md:py-0 md:border-none md:gap-2 md:mb-2">
              <button 
                onClick={() => setViewMode('dashboard')}
                className={`px-3 py-2 md:px-4 md:py-2 rounded-xl text-[10px] md:text-xs font-black md:font-bold transition-all whitespace-nowrap flex items-center gap-2 uppercase tracking-wider md:tracking-normal md:normal-case ${viewMode === 'dashboard' ? 'bg-slate-900 text-white shadow-md' : 'bg-transparent md:bg-white text-slate-500 md:border md:border-slate-200 hover:bg-slate-100'}`}
              >
                <PieIcon className="w-3.5 h-3.5 hidden md:block" />
                Tổng quan
              </button>
              <button 
                onClick={() => setViewMode('history')}
                className={`px-3 py-2 md:px-4 md:py-2 rounded-xl text-[10px] md:text-xs font-black md:font-bold transition-all whitespace-nowrap flex items-center gap-2 uppercase tracking-wider md:tracking-normal md:normal-case ${viewMode === 'history' ? 'bg-slate-900 text-white shadow-md' : 'bg-transparent md:bg-white text-slate-500 md:border md:border-slate-200 hover:bg-slate-100'}`}
              >
                <Clock className="w-3.5 h-3.5 hidden md:block" />
                Dòng tiền nợ
              </button>
              <button 
                onClick={() => setViewMode('debtors')}
                className={`px-3 py-2 md:px-4 md:py-2 rounded-xl text-[10px] md:text-xs font-black md:font-bold transition-all whitespace-nowrap flex items-center gap-2 uppercase tracking-wider md:tracking-normal md:normal-case ${viewMode === 'debtors' ? 'bg-slate-900 text-white shadow-md' : 'bg-transparent md:bg-white text-slate-500 md:border md:border-slate-200 hover:bg-slate-100'}`}
              >
                <UserIcon className="w-3.5 h-3.5 hidden md:block" />
                Người sổ nợ
              </button>
            </div>
          )}

          {user.role === 'admin' && (
             <div className="flex items-center gap-1 overflow-x-auto scrollbar-none sticky top-0 z-30 bg-slate-50/95 backdrop-blur-sm -mx-4 px-4 py-2 border-b border-slate-100 md:relative md:top-0 md:z-0 md:bg-transparent md:mx-0 md:px-0 md:py-0 md:border-none md:gap-2 md:mb-2">
              <button 
                onClick={() => setViewMode('dashboard')}
                className={`px-3 py-2 md:px-4 md:py-2 rounded-xl text-[10px] md:text-xs font-black md:font-bold transition-all whitespace-nowrap flex items-center gap-2 uppercase tracking-wider md:tracking-normal md:normal-case ${viewMode === 'dashboard' ? 'bg-slate-900 text-white shadow-md' : 'bg-transparent md:bg-white text-slate-500 md:border md:border-slate-200 hover:bg-slate-100'}`}
              >
                <BarChart3 className="w-3.5 h-3.5" />
                Hệ thống
              </button>
              <button 
                onClick={() => setViewMode('users')}
                className={`px-3 py-2 md:px-4 md:py-2 rounded-xl text-[10px] md:text-xs font-black md:font-bold transition-all whitespace-nowrap flex items-center gap-2 uppercase tracking-wider md:tracking-normal md:normal-case ${viewMode === 'users' ? 'bg-slate-900 text-white shadow-md' : 'bg-transparent md:bg-white text-slate-500 md:border md:border-slate-200 hover:bg-slate-100'}`}
              >
                <UserIcon className="w-3.5 h-3.5" />
                Người dùng
              </button>
            </div>
          )}

          {viewMode === 'dashboard' ? (
            <div className="grid grid-cols-1 md:grid-cols-12 gap-6">
              {/* KPI Cards Section */}
              {user.role === 'admin' ? (
                <>
                  <div className="col-span-1 md:col-span-3 bg-white rounded-2xl border border-slate-200/60 p-6 shadow-sm hover:shadow-md transition-all group relative overflow-hidden min-h-[140px] flex flex-col justify-between">
                    <div className="absolute top-0 right-0 p-3 opacity-[0.03] group-hover:opacity-[0.06] transition-opacity">
                      <UserIcon className="w-16 h-16 text-blue-600" />
                    </div>
                    <div>
                      <div className="flex items-center gap-2 mb-4">
                        <div className="p-2 bg-blue-50 rounded-xl shrink-0">
                          <UserIcon className="w-4 h-4 text-blue-600" />
                        </div>
                        <h3 className="text-slate-500 text-[11px] font-bold uppercase tracking-widest truncate">Tổng người dùng</h3>
                      </div>
                      <p className="text-3xl font-bold text-slate-900 tracking-tight">{(adminStats?.totalUsers || 0).toLocaleString('en-US')}</p>
                    </div>
                    <div className="flex items-center gap-1.5 mt-4 text-emerald-500 text-xs font-bold bg-emerald-50/50 w-fit px-2 py-1 rounded-full">
                      <TrendingUp className="w-3 h-3" />
                      <span>+12%</span>
                    </div>
                  </div>

                  <div className="col-span-1 md:col-span-3 bg-white rounded-2xl border border-slate-200/60 p-6 shadow-sm hover:shadow-md transition-all group relative overflow-hidden min-h-[140px] flex flex-col justify-between">
                    <div className="absolute top-0 right-0 p-3 opacity-[0.03] group-hover:opacity-[0.06] transition-opacity">
                      <CheckCircle2 className="w-16 h-16 text-emerald-600" />
                    </div>
                    <div>
                      <div className="flex items-center gap-2 mb-4">
                        <div className="p-2 bg-emerald-50 rounded-xl shrink-0">
                          <CheckCircle2 className="w-4 h-4 text-emerald-600" />
                        </div>
                        <h3 className="text-slate-500 text-[11px] font-bold uppercase tracking-widest truncate">Đang hoạt động</h3>
                      </div>
                      <p className="text-3xl font-bold text-slate-900 tracking-tight">{(adminStats?.activeUsers || 0).toLocaleString('en-US')}</p>
                    </div>
                    <div className="flex items-center gap-1.5 mt-4 text-emerald-500 text-xs font-bold leading-none">
                      <div className="w-2 h-2 rounded-full bg-emerald-500 animate-pulse"></div>
                      <span>Trực tuyến</span>
                    </div>
                  </div>

                  <div className="col-span-1 md:col-span-3 bg-white rounded-2xl border border-slate-200/60 p-6 shadow-sm hover:shadow-md transition-all group relative overflow-hidden min-h-[140px] flex flex-col justify-between">
                    <div className="absolute top-0 right-0 p-3 opacity-[0.03] group-hover:opacity-[0.06] transition-opacity">
                      <Database className="w-16 h-16 text-slate-600" />
                    </div>
                    <div>
                      <div className="flex items-center gap-2 mb-4">
                        <div className="p-2 bg-slate-100 rounded-xl shrink-0">
                          <Database className="w-4 h-4 text-slate-600" />
                        </div>
                        <h3 className="text-slate-500 text-[11px] font-bold uppercase tracking-widest truncate">Tổng khoản nợ</h3>
                      </div>
                      <p className="text-3xl font-bold text-slate-900 tracking-tight">{(adminStats?.totalDebtCount || 0).toLocaleString('en-US')}</p>
                    </div>
                    <div className="flex items-center gap-1.5 mt-4 text-slate-500 text-[11px] font-medium">
                      <span className="bg-slate-100 px-2 py-0.5 rounded text-slate-600 font-bold uppercase text-[9px]">Ổn định</span>
                    </div>
                  </div>

                  <div className="col-span-1 md:col-span-3 bg-white rounded-2xl border border-slate-200/60 p-6 shadow-sm hover:shadow-md transition-all group relative overflow-hidden min-h-[140px] flex flex-col justify-between">
                    <div className="absolute top-0 right-0 p-3 opacity-[0.03] group-hover:opacity-[0.06] transition-opacity">
                      <TrendingUp className="w-16 h-16 text-blue-600" />
                    </div>
                    <div>
                      <div className="flex items-center gap-2 mb-4">
                        <div className="p-2 bg-blue-50 rounded-xl shrink-0">
                          <TrendingUp className="w-4 h-4 text-blue-600" />
                        </div>
                        <h3 className="text-slate-500 text-[11px] font-bold uppercase tracking-widest truncate">Tổng dư nợ</h3>
                      </div>
                      <p className="text-2xl font-bold text-slate-900 tracking-tight">{Number(adminStats?.totalDebtAmount || 0).toLocaleString('en-US', { minimumFractionDigits: 0, maximumFractionDigits: 0 })}đ</p>
                    </div>
                    <div className="flex items-center gap-1.5 mt-4 text-rose-500 text-xs font-bold leading-none">
                      <TrendingUp className="w-3 h-3 rotate-180" />
                      <span>Rủi ro: 5.4%</span>
                    </div>
                  </div>
                </>
              ) : (
                <>
                  <div className="col-span-1 md:col-span-4 bg-white rounded-2xl border border-slate-200/60 p-6 shadow-sm relative overflow-hidden min-h-[160px] flex flex-col justify-between">
                    <div className="absolute top-0 right-0 p-3 opacity-5">
                      <TrendingUp className="w-20 h-20 text-slate-900" />
                    </div>
                    <div>
                      <h3 className="text-slate-400 text-[11px] font-bold uppercase tracking-widest mb-3">Tổng nợ cần thu</h3>
                      <p className="text-3xl font-bold text-slate-900 tracking-tight">{Number(totalAmount).toLocaleString('en-US', { minimumFractionDigits: 0, maximumFractionDigits: 0 })}đ</p>
                    </div>
                    <div className="flex items-center gap-2 text-rose-500 text-xs font-semibold mt-4">
                      <div className="w-1.5 h-1.5 rounded-full bg-rose-500 animate-pulse"></div>
                      <span>Phân bổ rủi ro cao</span>
                    </div>
                  </div>

                <div className="col-span-1 md:col-span-4 bg-blue-50 rounded-2xl border border-blue-100/50 p-6 flex gap-4 items-center shadow-sm min-h-[160px]">
                  <div className="flex-1 text-nowrap overflow-hidden">
                    <h3 className="text-blue-900 font-bold mb-1 flex items-center gap-2 text-sm tracking-tight">
                      <div className="p-1.5 bg-blue-100 rounded-lg shrink-0">
                        <CheckCircle2 className="w-3.5 h-3.5 text-blue-600" />
                      </div>
                      Hiệu suất thu hồi
                    </h3>
                    <div className="mt-4 flex gap-3">
                      <div className="bg-white/60 backdrop-blur-sm rounded-xl px-3.5 py-2.5 flex-1 border border-blue-200/50 min-w-0">
                        <span className="block text-[10px] text-blue-500 font-bold uppercase tracking-wider truncate">Tỷ lệ</span>
                        <span className="text-lg font-bold text-blue-900 block mt-0.5">
                          {debts.length > 0 ? ((paidAmount / (Number(totalAmount) + Number(paidAmount))) * 100).toFixed(1) : 0}%
                        </span>
                      </div>
                      <div className="bg-white/60 backdrop-blur-sm rounded-xl px-3.5 py-2.5 flex-1 border border-blue-200/50 min-w-0">
                        <span className="block text-[10px] text-blue-500 font-bold uppercase tracking-wider truncate">Người nợ</span>
                        <span className="text-lg font-bold text-blue-900 block mt-0.5">{debtors.length}</span>
                      </div>
                    </div>
                  </div>
                </div>

                <div className="col-span-1 md:col-span-4 bg-slate-900 rounded-2xl p-6 flex flex-col justify-between text-white shadow-xl shadow-slate-200 min-h-[160px] relative overflow-hidden group">
                  <div className="absolute -bottom-4 -right-4 p-3 opacity-10 group-hover:opacity-20 transition-opacity">
                    <Plus className="w-24 h-24 text-white" />
                  </div>
                  <div className="relative z-10">
                    <h3 className="text-slate-400 text-[11px] font-bold uppercase tracking-widest mb-2">Hành động</h3>
                    <p className="text-xl font-bold tracking-tight">Ghi nhận nợ</p>
                    <p className="text-xs text-slate-400 mt-1 opacity-80 decoration-none">Thêm khoản nợ mới nhanh chóng</p>
                  </div>
                  <button 
                    onClick={() => setIsAddDebtOpen(true)}
                    className="relative z-10 w-full bg-white text-slate-900 py-2.5 rounded-xl font-bold text-sm shadow-sm transition-all mt-4 hover:bg-slate-50"
                  >
                    Tạo khoản nợ
                  </button>
                </div>
              </>
            )}

            {/* Charts Section */}
            <div className="col-span-1 md:col-span-12 space-y-6">
              {/* Activity Bar Chart - Full Width */}
              <div className="bg-white rounded-2xl border border-slate-200/60 p-6 shadow-sm flex flex-col min-h-[400px]">
                <div className="flex items-center justify-between mb-6">
                  <div className="flex items-center gap-2">
                    <BarChart3 className="w-4 h-4 text-blue-600" />
                    <h3 className="font-bold text-slate-900 tracking-tight text-sm">
                      {user.role === 'admin' ? 'Thống kê Hoạt động Hệ thống (30 ngày qua)' : 'Thống kê nợ theo khu vực'}
                    </h3>
                  </div>
                </div>
                <div className="h-[350px]">
                  <ResponsiveContainer width="100%" height="100%">
                    {user.role === 'admin' ? (
                      <BarChart data={(() => {
                        const allDates = new Set([
                          ...(adminStats?.analytics?.registrations || []).map((i: any) => i.date),
                          ...(adminStats?.analytics?.creations || []).map((i: any) => i.date),
                          ...(adminStats?.analytics?.payments || []).map((i: any) => i.date)
                        ]);
                        
                        return Array.from(allDates).sort().map(date => {
                          const reg = adminStats.analytics.registrations.find((i: any) => i.date === date);
                          const cre = adminStats.analytics.creations.find((i: any) => i.date === date);
                          const pay = adminStats.analytics.payments.find((i: any) => i.date === date);
                          
                          return {
                            name: new Date(date).toLocaleDateString('vi-VN', { day: '2-digit', month: '2-digit' }),
                            'Đăng ký': reg?.count || 0,
                            'Tạo nợ': cre?.count || 0,
                            'Thanh toán': pay?.count || 0
                          };
                        });
                      })()}>
                        <CartesianGrid strokeDasharray="3 3" vertical={false} stroke="#f1f5f9" />
                        <XAxis dataKey="name" axisLine={false} tickLine={false} tick={{ fontSize: 10, fill: '#94a3b8' }} />
                        <YAxis axisLine={false} tickLine={false} tick={{ fontSize: 10, fill: '#94a3b8' }} />
                        <RechartsTooltip cursor={{ fill: '#f8fafc' }} />
                        <Legend verticalAlign="top" align="right" height={36} iconType="circle" wrapperStyle={{ fontSize: '11px', fontWeight: 'bold' }} />
                        <Bar dataKey="Đăng ký" fill="#3b82f6" radius={[4, 4, 0, 0]}>
                          <LabelList dataKey="Đăng ký" position="top" style={{ fontSize: '10px', fill: '#64748b' }} />
                        </Bar>
                        <Bar dataKey="Tạo nợ" fill="#f59e0b" radius={[4, 4, 0, 0]}>
                          <LabelList dataKey="Tạo nợ" position="top" style={{ fontSize: '10px', fill: '#d97706' }} />
                        </Bar>
                        <Bar dataKey="Thanh toán" fill="#10b981" radius={[4, 4, 0, 0]}>
                          <LabelList dataKey="Thanh toán" position="top" style={{ fontSize: '10px', fill: '#059669' }} />
                        </Bar>
                      </BarChart>
                    ) : (
                      <BarChart data={Object.entries(debts.reduce((acc, d) => {
                        const area = d.debtor_area || 'Hệ thống';
                        acc[area] = (acc[area] || 0) + Number(d.amount);
                        return acc;
                      }, {} as Record<string, number>)).map(([name, value]) => ({ name, value }))}>
                        <CartesianGrid strokeDasharray="3 3" vertical={false} stroke="#f1f5f9" />
                        <XAxis dataKey="name" axisLine={false} tickLine={false} tick={{ fontSize: 10, fill: '#94a3b8' }} />
                        <YAxis axisLine={false} tickLine={false} tick={{ fontSize: 10, fill: '#94a3b8' }} />
                        <RechartsTooltip cursor={{ fill: '#f8fafc' }} formatter={(val) => `${Number(val).toLocaleString('en-US', { maximumFractionDigits: 0 })}đ`} />
                        <Bar dataKey="value" fill="#3b82f6" radius={[4, 4, 0, 0]} barSize={40}>
                           <LabelList dataKey="value" position="top" formatter={(val: any) => `${(Number(val) / 1000000).toFixed(1)}M`} style={{ fontSize: '9px', fill: '#64748b', fontWeight: 'bold' }} />
                        </Bar>
                      </BarChart>
                    )}
                  </ResponsiveContainer>
                </div>
              </div>

              {user.role === 'admin' && (
                <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                  {/* Creation Ratio Pie Chart */}
                  <div className="bg-white rounded-2xl border border-slate-200/60 p-6 shadow-sm flex flex-col min-h-[400px]">
                    <div className="flex items-center gap-2 mb-6">
                      <PieIcon className="w-4 h-4 text-orange-500" />
                      <h3 className="font-bold text-slate-900 tracking-tight text-sm">Tỷ lệ Tạo nợ theo Ngày</h3>
                    </div>
                    <div className="h-[350px]">
                      <ResponsiveContainer width="100%" height="100%">
                        <PieChart>
                          <Pie
                            data={(adminStats?.analytics?.creations || []).map((item: any) => ({
                              name: new Date(item.date).toLocaleDateString('vi-VN', { day: '2-digit', month: '2-digit' }),
                              value: item.count
                            }))}
                            innerRadius={50}
                            outerRadius={80}
                            paddingAngle={2}
                            dataKey="value"
                            label={({ name, value }) => `${name}: ${value}`}
                          >
                            {(adminStats?.analytics?.creations || []).map((_: any, index: number) => (
                              <Cell key={`cell-${index}`} fill={`hsl(${index * 137.5 % 360}, 75%, 55%)`} />
                            ))}
                          </Pie>
                          <RechartsTooltip formatter={(val) => `${val} bản ghi`} />
                        </PieChart>
                      </ResponsiveContainer>
                    </div>
                  </div>

                  {/* System-wide Recovery Pie Chart */}
                  <div className="bg-white rounded-2xl border border-slate-200/60 p-6 shadow-sm flex flex-col min-h-[400px]">
                    <div className="flex items-center gap-2 mb-6">
                      <PieIcon className="w-4 h-4 text-emerald-600" />
                      <h3 className="font-bold text-slate-900 tracking-tight text-sm">Tỷ lệ Thu hồi Toàn hệ thống</h3>
                    </div>
                    <div className="h-[350px]">
                      <ResponsiveContainer width="100%" height="100%">
                        <PieChart>
                          <Pie
                            data={[
                              { name: 'Đã trả', value: Number(adminStats?.totalPaidAmount || 0) },
                              { name: 'Chưa trả', value: Number((adminStats?.totalDebtAmount || 0) - (adminStats?.totalPaidAmount || 0)) }
                            ]}
                            innerRadius={50}
                            outerRadius={80}
                            paddingAngle={5}
                            dataKey="value"
                            label={({ name, percent }) => `${name}: ${(percent * 100).toFixed(1)}%`}
                          >
                            <Cell fill="#10b981" />
                            <Cell fill="#f43f5e" />
                          </Pie>
                          <RechartsTooltip formatter={(val) => `${Number(val).toLocaleString('en-US', { maximumFractionDigits: 0 })}đ`} />
                          <Legend verticalAlign="bottom" height={36} iconType="circle" wrapperStyle={{ fontSize: '11px', fontWeight: 'bold' }} />
                        </PieChart>
                      </ResponsiveContainer>
                    </div>
                  </div>
                </div>
              )}
            </div>

            {/* Status Section - Admin Cards and User Table */}
            {user.role === 'admin' ? (
              <>
                <div className="col-span-1 md:col-span-12 mt-4">
                  <div className="flex items-center gap-2">
                    <div className="w-1.5 h-4 bg-slate-900 rounded-full"></div>
                    <h3 className="font-bold text-slate-900 tracking-tight">Thông số Hạ tầng & Bảo mật</h3>
                  </div>
                </div>
                
                <div className="col-span-1 md:col-span-3 p-5 rounded-2xl border border-slate-100 bg-white shadow-sm hover:shadow-md transition-all">
                  <span className="text-[10px] font-bold text-slate-400 uppercase tracking-widest block mb-3">Database</span>
                  <div className="flex items-center gap-2">
                    <div className={`w-1.5 h-1.5 rounded-full ${adminStats?.dbStatus?.isConnected ? 'bg-emerald-500' : 'bg-rose-500'}`}></div>
                    <span className="text-sm font-bold text-slate-800 tracking-tight">{adminStats?.dbStatus?.isConnected ? 'Connected' : 'Disconnected'}</span>
                  </div>
                  <p className="text-[10px] text-slate-400 mt-2 font-medium">Phiên bản: MySQL 8.0</p>
                </div>

                <div className="col-span-1 md:col-span-3 p-5 rounded-2xl border border-slate-100 bg-white shadow-sm hover:shadow-md transition-all">
                  <span className="text-[10px] font-bold text-slate-400 uppercase tracking-widest block mb-3">Bảng dữ liệu</span>
                  <div className="text-xl font-bold text-slate-800 tracking-tight">{adminStats?.dbStatus?.tableCount || 0} Đối tượng</div>
                  <p className="text-[10px] text-slate-400 mt-2 font-medium">Đã tối ưu hóa chỉ mục</p>
                </div>

                <div className="col-span-1 md:col-span-3 p-5 rounded-2xl border border-slate-100 bg-white shadow-sm hover:shadow-md transition-all">
                  <span className="text-[10px] font-bold text-slate-400 uppercase tracking-widest block mb-3">Lưu trữ</span>
                  <div className="text-xl font-bold text-slate-800 tracking-tight">{adminStats?.dbStatus?.estimatedSizeMB || 0} MB</div>
                  <p className="text-[10px] text-slate-400 mt-2 font-medium">Sử dụng thực tế</p>
                </div>

                <div className="col-span-1 md:col-span-3 p-5 rounded-2xl border border-slate-100 bg-white shadow-sm hover:shadow-md transition-all">
                  <span className="text-[10px] font-bold text-slate-400 uppercase tracking-widest block mb-3">Uptime</span>
                  <div className="flex items-center gap-2">
                    <div className="w-1.5 h-1.5 rounded-full bg-emerald-500"></div>
                    <span className="text-sm font-bold text-slate-800 tracking-tight">99.99%</span>
                  </div>
                  <p className="text-[10px] text-slate-400 mt-2 font-medium">Hoạt động ổn định</p>
                </div>
              </>
            ) : (
              <div className="col-span-1 md:col-span-12 bg-white rounded-2xl border border-slate-200/60 flex flex-col shadow-sm shadow-slate-200/40 overflow-hidden min-h-[350px]">
                <div className="px-6 py-4 border-b border-slate-100/80 flex justify-between items-center bg-slate-50/30">
                  <div className="flex items-center gap-2">
                    <div className="w-1.5 h-4 bg-blue-600 rounded-full"></div>
                    <h3 className="font-bold text-slate-900 tracking-tight">Dư nợ theo người</h3>
                  </div>
                </div>
                
                <div className="flex-1 overflow-auto p-6">
                  {aggregatedDebts.filter(d => d.total_pending > 0).length === 0 ? (
                    <div className="h-full flex flex-col items-center justify-center text-slate-400 py-20">
                      <div className="w-16 h-16 bg-slate-50 rounded-full flex items-center justify-center mb-4">
                        <CheckCircle2 className="w-8 h-8 opacity-20" />
                      </div>
                      <p className="text-sm font-medium">Tuyệt vời! Không còn khoản nợ nào cần thu.</p>
                    </div>
                  ) : (
                    <table className="w-full text-left border-collapse">
                      <thead className="text-[10px] text-slate-400 uppercase bg-white sticky top-0 z-[1] border-b border-slate-100">
                        <tr>
                          <th className="px-4 py-4 font-bold tracking-widest">Người nợ</th>
                          <th className="px-4 py-4 font-bold tracking-widest text-center">Thời gian</th>
                          <th className="px-4 py-4 font-bold tracking-widest text-right">Dư nợ</th>
                          <th className="px-4 py-4 font-bold tracking-widest hidden sm:table-cell text-right">Khu vực</th>
                        </tr>
                      </thead>
                      <tbody className="text-sm divide-y divide-slate-50">
                        {aggregatedDebts.filter(d => d.total_pending > 0).map((item) => {
                          const debtorPendingDebts = debts.filter(d => d.debtor_id === item.debtor_id && d.status === 'pending');
                          let dateDisplay = '—';
                          if (debtorPendingDebts.length > 0) {
                            const dates = debtorPendingDebts.map(d => new Date(d.created_at).getTime());
                            const minDate = new Date(Math.min(...dates));
                            const maxDate = new Date(Math.max(...dates));
                            if (minDate.getTime() === maxDate.getTime()) {
                              dateDisplay = (
                                <div className="flex flex-col items-center">
                                  <span className="font-bold text-slate-700">{minDate.toLocaleTimeString('vi-VN', { hour: '2-digit', minute: '2-digit' })}</span>
                                  <span className="text-slate-400">{minDate.toLocaleDateString('vi-VN')}</span>
                                </div>
                              );
                            } else {
                              const minStr = minDate.toLocaleDateString('vi-VN', { day: '2-digit', month: '2-digit' });
                              const maxStr = maxDate.toLocaleDateString('vi-VN', { day: '2-digit', month: '2-digit' });
                              dateDisplay = (
                                <div className="flex flex-col items-center">
                                  <span className="font-bold text-slate-700">Giai đoạn</span>
                                  <span className="text-slate-400">{minStr} - {maxStr}</span>
                                </div>
                              );
                            }
                          }

                          return (
                            <tr key={item.debtor_id} className="hover:bg-slate-50/40 transition-colors group">
                              <td className="px-4 py-5">
                                <div className="font-bold text-slate-900 group-hover:text-blue-600 transition-colors">{item.name}</div>
                              </td>
                              <td className="px-4 py-5 text-center text-[10px] text-slate-400 font-medium tabular-nums leading-relaxed">
                                {dateDisplay}
                              </td>
                              <td className="px-4 py-5 font-bold text-right text-rose-600 tabular-nums">
                                {item.total_pending.toLocaleString('en-US', { maximumFractionDigits: 0 })}đ
                              </td>
                              <td className="px-4 py-5 text-slate-400 text-[11px] hidden sm:table-cell text-right font-medium italic">
                                {item.area || '—'}
                              </td>
                            </tr>
                          );
                        })}
                      </tbody>
                    </table>
                  )}
                </div>
              </div>
            )}
          </div>
        ) : viewMode === 'users' ? (
          <div className="space-y-6">
            <div className="flex flex-col sm:flex-row justify-between items-start sm:items-center gap-4">
              <div>
                <h2 className="text-2xl font-black text-slate-900 tracking-tight uppercase">Danh sách người dùng</h2>
                <p className="text-sm text-slate-500 font-medium">Quản trị viên và người dùng trong hệ thống</p>
              </div>
              <button 
                onClick={() => setIsAddUserOpen(true)}
                className="bg-blue-600 text-white px-5 py-3 rounded-2xl font-bold flex items-center gap-2 shadow-lg shadow-blue-200 hover:bg-blue-700 transition-all active:scale-95"
              >
                <Plus className="w-5 h-5" />
                THÊM NGƯỜI DÙNG
              </button>
            </div>

            <div className="bg-white rounded-3xl border border-slate-200/60 shadow-sm overflow-hidden">
               <table className="w-full text-left border-collapse">
                  <thead className="text-[10px] text-slate-400 font-bold uppercase bg-slate-50/50 border-b border-slate-100">
                    <tr>
                      <th className="px-6 py-4 tracking-widest">Họ và tên</th>
                      <th className="px-6 py-4 tracking-widest">Tài khoản</th>
                      <th className="px-6 py-4 tracking-widest">Vai trò</th>
                      <th className="px-6 py-4 tracking-widest text-right">Ngày tham gia</th>
                    </tr>
                  </thead>
                  <tbody className="text-sm divide-y divide-slate-50">
                    {usersList.length === 0 ? (
                      <tr>
                        <td colSpan={4} className="px-6 py-20 text-center text-slate-400">
                          <p className="font-medium">Chưa có người dùng nào</p>
                        </td>
                      </tr>
                    ) : (
                      usersList.map((u) => (
                        <tr key={u.id} className="hover:bg-slate-50/30 transition-colors">
                          <td className="px-6 py-5">
                            <div className="flex items-center gap-3">
                              <div className={`w-10 h-10 rounded-xl flex items-center justify-center font-bold text-xs ${u.role === 'admin' ? 'bg-indigo-100 text-indigo-600' : 'bg-slate-100 text-slate-500'}`}>
                                {u.fullname?.charAt(0).toUpperCase() || u.username.charAt(0).toUpperCase()}
                              </div>
                              <div>
                                <div className="font-bold text-slate-900 tracking-tight">{u.fullname || u.username}</div>
                                <div className="text-[10px] text-slate-400 uppercase font-bold">{u.id}</div>
                              </div>
                            </div>
                          </td>
                          <td className="px-6 py-5 font-medium text-slate-600">{u.username}</td>
                          <td className="px-6 py-5">
                            <span className={`px-2.5 py-1 rounded-full text-[10px] font-black uppercase tracking-wider border ${
                              u.role === 'admin' 
                                ? 'bg-indigo-50 text-indigo-700 border-indigo-100' 
                                : 'bg-slate-50 text-slate-700 border-slate-200'
                            }`}>
                              {u.role}
                            </span>
                          </td>
                          <td className="px-6 py-5 text-right text-slate-400 text-xs font-medium tabular-nums">
                            {new Date(u.created_at).toLocaleDateString('vi-VN')}
                          </td>
                        </tr>
                      ))
                    )}
                  </tbody>
               </table>
            </div>
          </div>
        ) : viewMode === 'history' ? (
          <div className="flex-1 flex flex-col gap-5 overflow-hidden">
            <div className="bg-white rounded-2xl border border-slate-200/60 p-5 flex flex-col lg:flex-row justify-between items-center shadow-sm shadow-slate-200/40 gap-4">
              <div className="flex items-center gap-4 w-full lg:w-auto">
                <div className="bg-blue-50 p-3 rounded-xl text-blue-600 shrink-0">
                  <Clock className="w-5 h-5" />
                </div>
                <div className="min-w-0">
                  <h2 className="text-lg font-bold text-slate-900 tracking-tight truncate">Lịch sử công nợ</h2>
                  <p className="text-slate-500 text-xs truncate">Toàn bộ chi tiết các giao dịch nợ của bạn</p>
                </div>
              </div>
              <div className="flex flex-col sm:flex-row gap-3 w-full lg:w-auto">
                <div className="relative flex-1 sm:w-80 group">
                  <Search className="w-3.5 h-3.5 text-slate-400 absolute left-3.5 top-1/2 -translate-y-1/2 group-focus-within:text-blue-500 transition-colors" />
                  <input 
                    type="text" 
                    placeholder="Tìm tên, nội dung hoặc khu vực..."
                    className="pl-10 pr-4 py-2.5 bg-slate-50 border border-slate-200/80 rounded-xl text-sm w-full outline-none focus:bg-white focus:ring-4 focus:ring-blue-500/5 focus:border-blue-500/50 transition-all placeholder:text-slate-400"
                    value={searchTerm}
                    onChange={(e) => setSearchTerm(e.target.value)}
                  />
                </div>
                <div className="relative">
                  <select 
                    value={filterStatus}
                    onChange={(e) => setFilterStatus(e.target.value as any)}
                    className="appearance-none bg-slate-50 border border-slate-200/80 pl-4 pr-10 py-2.5 rounded-xl text-sm font-semibold outline-none w-full hover:bg-slate-100/50 focus:bg-white transition-all cursor-pointer"
                  >
                    <option value="all">Tất cả trạng thái</option>
                    <option value="pending">Chưa thanh toán</option>
                    <option value="paid">Đã thanh toán</option>
                  </select>
                  <ChevronRight className="w-3.5 h-3.5 absolute right-3.5 top-1/2 -translate-y-1/2 rotate-90 text-slate-500 pointer-events-none" />
                </div>
              </div>
            </div>

            <div className="flex-1 bg-white rounded-2xl border border-slate-200/60 shadow-sm shadow-slate-200/40 overflow-hidden flex flex-col">
              <div className="overflow-auto flex-1 scrollbar-thin scrollbar-thumb-slate-200">
                <table className="w-full text-left border-collapse min-w-[600px]">
                  <thead className="text-[10px] text-slate-400 font-bold uppercase bg-slate-50/50 sticky top-0 z-[1] border-b border-slate-100">
                    <tr>
                      <th className="px-6 py-4 tracking-widest">Người nợ / Nội dung</th>
                      <th className="px-6 py-4 tracking-widest text-right">Số tiền</th>
                      <th className="px-6 py-4 tracking-widest hidden sm:table-cell text-center">Ngày ghi nợ</th>
                      <th className="px-6 py-4 tracking-widest hidden sm:table-cell text-center">Ngày thanh toán</th>
                      <th className="px-6 py-4 tracking-widest text-center">Thao tác</th>
                    </tr>
                  </thead>
                  <tbody className="text-sm divide-y divide-slate-50">
                    {filteredDebts.length === 0 ? (
                      <tr>
                        <td colSpan={5} className="px-6 py-20 text-center text-slate-400">
                          <div className="bg-slate-50 w-16 h-16 rounded-full flex items-center justify-center mx-auto mb-4">
                            <AlertCircle className="w-8 h-8 opacity-20" />
                          </div>
                          <p className="font-medium">Không tìm thấy dữ liệu phù hợp</p>
                        </td>
                      </tr>
                    ) : (
                      filteredDebts.map((debt) => (
                        <tr key={debt.id} className="hover:bg-slate-50/30 transition-colors group">
                          <td className="px-6 py-5">
                            <div className="font-bold text-slate-900 group-hover:text-blue-600 transition-colors uppercase text-[13px] tracking-tight">{debt.debtor_name}</div>
                            {debt.debtor_area && (
                              <div className="text-[10px] text-slate-400 font-medium mt-0.5">{debt.debtor_area}</div>
                            )}
                            <div className="text-[11px] text-slate-500 italic mt-1 bg-slate-50 inline-block px-2 py-0.5 rounded border border-slate-100/50">{debt.description || 'Không có mô tả'}</div>
                          </td>
                          <td className="px-6 py-5 text-right font-bold text-slate-900 tabular-nums text-base">
                            {Number(debt.amount).toLocaleString('en-US', { minimumFractionDigits: 0, maximumFractionDigits: 0 })}đ
                          </td>
                          <td className="px-6 py-5 text-center text-[11px] text-slate-500 hidden sm:table-cell tabular-nums">
                            <div className="flex flex-col items-center">
                              <span className="font-bold text-slate-700">{new Date(debt.created_at).toLocaleTimeString('vi-VN', { hour: '2-digit', minute: '2-digit' })}</span>
                              <span className="text-slate-400">{new Date(debt.created_at).toLocaleDateString('vi-VN')}</span>
                            </div>
                          </td>
                          <td className="px-6 py-5 text-center text-[11px] text-slate-500 hidden sm:table-cell tabular-nums">
                            {debt.status === 'paid' && debt.paid_at ? (
                              <div className="flex flex-col items-center">
                                <span className="font-bold text-slate-700">{new Date(debt.paid_at).toLocaleTimeString('vi-VN', { hour: '2-digit', minute: '2-digit' })}</span>
                                <span className="text-slate-400">{new Date(debt.paid_at).toLocaleDateString('vi-VN')}</span>
                              </div>
                            ) : '—'}
                          </td>
                          <td className="px-6 py-5 text-center">
                            <div className="flex items-center justify-center gap-2">
                              {debt.status === 'pending' ? (
                                <button 
                                  onClick={() => toggleStatus(debt)}
                                  className="flex items-center gap-1.5 px-3 py-1.5 bg-blue-600 text-white rounded-lg text-[10px] font-bold uppercase shadow-sm shadow-blue-200 hover:bg-blue-700 transition-all active:scale-95"
                                >
                                  <CheckCircle2 className="w-3 h-3" />
                                  Xác nhận thanh toán
                                </button>
                              ) : (
                                <div className="flex items-center gap-2">
                                  <span className="px-4 py-1.5 bg-emerald-50 text-emerald-700 border border-emerald-100 rounded-full text-[10px] font-bold uppercase flex items-center gap-1.5">
                                    <CheckCircle2 className="w-3 h-3" />
                                    Đã thanh toán
                                  </span>
                                  <button 
                                    onClick={() => toggleStatus(debt)}
                                    className="p-1 text-slate-300 hover:text-slate-500 transition-colors"
                                    title="Chuyển về chưa thanh toán"
                                  >
                                    <X className="w-3.5 h-3.5" />
                                  </button>
                                </div>
                              )}
                            </div>
                          </td>
                        </tr>
                      ))
                    )}
                  </tbody>
                </table>
              </div>
            </div>
          </div>
        ) : (
          <div className="grid grid-cols-1 lg:grid-cols-12 gap-6 items-start">
            <div className="lg:col-span-8 bg-white rounded-3xl border border-slate-200/60 shadow-sm shadow-slate-200/40 overflow-hidden flex flex-col min-h-[500px]">
               <div className="px-6 py-5 border-b border-slate-100/80 flex justify-between items-center bg-slate-50/30">
                  <div className="flex items-center gap-4">
                    <div className="w-1.5 h-5 bg-blue-600 rounded-full"></div>
                    <h3 className="font-bold text-slate-900 tracking-tight text-lg">Người sổ nợ</h3>
                  </div>
                  <p className="text-xs text-slate-500 font-bold bg-white px-3 py-1 rounded-full border border-slate-100 shadow-sm">
                    {debtors.length} NGƯỜI TRONG DANH BẠ
                  </p>
               </div>
               <div className="overflow-auto flex-1">
                  <table className="w-full text-left border-collapse">
                    <thead className="text-[10px] text-slate-400 font-bold uppercase bg-slate-50/50 sticky top-0 z-[1] border-b border-slate-100">
                      <tr>
                        <th className="px-6 py-4 tracking-widest">Họ và tên</th>
                        <th className="px-6 py-4 tracking-widest hidden sm:table-cell">Khu vực</th>
                        <th className="px-6 py-4 tracking-widest text-right">Tổng nợ tồn</th>
                      </tr>
                    </thead>
                    <tbody className="text-sm divide-y divide-slate-50">
                      {debtors.length === 0 ? (
                        <tr>
                          <td colSpan={3} className="px-6 py-20 text-center text-slate-400">
                            <p className="font-medium">Chưa có người nợ nào trong danh sách</p>
                          </td>
                        </tr>
                      ) : (
                        debtors.map((debtor) => {
                          const debtorAgg = aggregatedDebts.find(d => d.debtor_id === debtor.id);
                          const isSelected = selectedDebtorId === debtor.id;
                          
                          return (
                            <tr 
                              key={debtor.id} 
                              onClick={() => setSelectedDebtorId(debtor.id)}
                              className={`cursor-pointer transition-all group ${isSelected ? 'bg-blue-50/50' : 'hover:bg-slate-50/50'}`}
                            >
                              <td className="px-6 py-5">
                                <div className="flex items-center gap-3">
                                  <div className={`w-8 h-8 rounded-lg flex items-center justify-center font-bold text-xs ${isSelected ? 'bg-blue-600 text-white' : 'bg-slate-100 text-slate-500 group-hover:bg-blue-100 group-hover:text-blue-600'}`}>
                                    {debtor.name.charAt(0).toUpperCase()}
                                  </div>
                                  <div>
                                    <div className="font-bold text-slate-900 uppercase text-[13px] tracking-tight">{debtor.name}</div>
                                    {debtor.phone && <div className="text-[10px] text-slate-400 mt-0.5">{debtor.phone}</div>}
                                  </div>
                                </div>
                              </td>
                              <td className="px-6 py-5 text-slate-500 hidden sm:table-cell text-xs italic">
                                {debtor.area || '—'}
                              </td>
                              <td className="px-6 py-5 text-right font-bold text-slate-900 tracking-tight tabular-nums text-base">
                                {debtorAgg ? `${Number(debtorAgg.total_pending).toLocaleString('en-US')}đ` : '0đ'}
                              </td>
                            </tr>
                          );
                        })
                      )}
                    </tbody>
                  </table>
               </div>
            </div>

            <div className="lg:col-span-4 space-y-6 sticky top-24">
              {selectedDebtorId ? (() => {
                const debtor = debtors.find(d => d.id === selectedDebtorId);
                const agg = aggregatedDebts.find(a => a.debtor_id === selectedDebtorId);
                const pendingCount = debts.filter(d => d.debtor_id === selectedDebtorId && d.status === 'pending').length;
                
                return (
                  <motion.div 
                    initial={{ opacity: 0, scale: 0.95 }}
                    animate={{ opacity: 1, scale: 1 }}
                    className="bg-white rounded-3xl border border-blue-200/50 shadow-xl shadow-blue-900/5 p-6 flex flex-col gap-6"
                  >
                    <div className="flex items-center justify-between">
                      <div className="bg-blue-50 text-blue-600 text-[10px] font-bold px-3 py-1 rounded-full uppercase tracking-wider">
                        Chi tiết chọn
                      </div>
                      <button onClick={() => setSelectedDebtorId(null)} className="text-slate-400 hover:text-slate-600">
                        <X className="w-5 h-5" />
                      </button>
                    </div>

                    <div className="space-y-1">
                      <h4 className="text-2xl font-black text-slate-900 uppercase tracking-tight">{debtor?.name}</h4>
                      <p className="text-sm text-slate-500 font-medium">{debtor?.area ? `Khu vực: ${debtor.area}` : 'Không có thông tin khu vực'}</p>
                    </div>

                    <div className="bg-slate-900 rounded-2xl p-6 text-white text-center relative overflow-hidden group">
                      <div className="absolute top-0 right-0 w-32 h-32 bg-blue-600/20 rounded-full -mr-16 -mt-16 blur-2xl transition-all group-hover:bg-blue-600/30"></div>
                      <p className="text-[10px] uppercase font-bold tracking-[0.2em] text-slate-400 mb-2">Số tiền cần thanh toán</p>
                      <div className="text-4xl font-black tracking-tight tabular-nums">
                        {agg ? Number(agg.total_pending).toLocaleString('en-US') : '0'}
                        <span className="text-lg ml-1 text-slate-500">đ</span>
                      </div>
                      <div className="mt-4 flex items-center justify-center gap-2">
                        <div className="w-2 h-2 rounded-full bg-amber-500 animate-pulse"></div>
                        <span className="text-[10px] font-bold text-slate-400 uppercase tracking-wider">Tồn {pendingCount} khoản nợ</span>
                      </div>
                    </div>

                    {pendingCount > 0 && (
                      <button 
                        onClick={() => handlePayAll(selectedDebtorId)}
                        className="w-full bg-blue-600 hover:bg-blue-700 text-white font-black py-4 rounded-2xl shadow-lg shadow-blue-200 transition-all active:scale-95 flex items-center justify-center gap-2"
                      >
                        <CheckCircle2 className="w-5 h-5" />
                        THANH TOÁN TẤT CẢ
                      </button>
                    )}

                    <div className="pt-4 border-t border-slate-100">
                       <p className="text-[10px] text-slate-400 font-medium text-center italic">
                        Chọn một người khác bên trái để xem thông tin
                       </p>
                    </div>
                  </motion.div>
                );
              })() : (
                <div className="bg-slate-100/50 rounded-3xl border-2 border-dashed border-slate-200 p-12 text-center flex flex-col items-center justify-center gap-4 text-slate-400">
                   <div className="w-16 h-16 rounded-full bg-white flex items-center justify-center shadow-sm">
                      <UserIcon className="w-8 h-8 opacity-20" />
                   </div>
                   <p className="text-sm font-bold uppercase tracking-widest opacity-50">Chọn người nợ để thanh toán</p>
                </div>
              )}
            </div>
          </div>
        )}
        </div>
      </main>

      <AnimatePresence>
        {isAddDebtOpen && (
          <div className="fixed inset-0 z-[100] flex items-center justify-center p-4">
            <motion.div 
              initial={{ opacity: 0 }}
              animate={{ opacity: 1 }}
              exit={{ opacity: 0 }}
              onClick={() => setIsAddDebtOpen(false)}
              className="absolute inset-0 bg-slate-900/40 backdrop-blur-[2px]"
            />
            <motion.div 
              initial={{ opacity: 0, scale: 0.98, y: 10 }}
              animate={{ opacity: 1, scale: 1, y: 0 }}
              exit={{ opacity: 0, scale: 0.98, y: 10 }}
              className="relative w-full max-w-lg bg-white rounded-2xl shadow-2xl overflow-hidden border border-slate-200"
            >
              <div className="p-6 border-b border-slate-100 flex justify-between items-center bg-white">
                <div className="flex items-center gap-3">
                  <div className="w-10 h-10 bg-blue-50 rounded-xl flex items-center justify-center">
                    <Plus className="w-5 h-5 text-blue-600" />
                  </div>
                  <div>
                    <h3 className="text-lg font-bold text-slate-900 tracking-tight">Thêm khoản nợ mới</h3>
                    <p className="text-xs text-slate-500 font-medium">Ghi nhận thông tin giao dịch</p>
                  </div>
                </div>
                <button onClick={() => setIsAddDebtOpen(false)} className="p-2 hover:bg-slate-100 rounded-xl transition-colors">
                  <X className="w-5 h-5 text-slate-400" />
                </button>
              </div>
              
              <form onSubmit={handleCreateDebt} className="p-6 space-y-5">
                <div className="grid grid-cols-1 sm:grid-cols-2 gap-5">
                  <div className="col-span-1 sm:col-span-2 space-y-1.5">
                    <label className="text-[11px] font-bold text-slate-500 uppercase tracking-widest ml-1">Họ tên người nợ <span className="text-rose-500">*</span></label>
                    <input 
                      type="text" 
                      required
                      list="debtor-suggestions"
                      placeholder="VD: Nguyễn Văn A"
                      className="w-full px-4 py-2.5 rounded-xl border border-slate-200 bg-slate-50 focus:bg-white focus:ring-4 focus:ring-blue-500/5 focus:border-blue-500 outline-none transition-all placeholder:text-slate-400"
                      value={newDebt.debtorName}
                      onChange={(e) => {
                        const name = e.target.value;
                        const existingDebtor = debtors.find(d => d.name === name);
                        setNewDebt({
                          ...newDebt, 
                          debtorName: name,
                          area: existingDebtor?.area || newDebt.area
                        });
                      }}
                    />
                    <datalist id="debtor-suggestions">
                      {debtors.map(d => (
                        <option key={d.id} value={d.name}>{d.area ? `Địa chỉ: ${d.area}` : ''}</option>
                      ))}
                    </datalist>
                  </div>
                  <div className="space-y-1.5">
                    <label className="text-[11px] font-bold text-slate-500 uppercase tracking-widest ml-1">Khu vực / Địa chỉ</label>
                    <input 
                      type="text" 
                      list="area-suggestions"
                      placeholder="VD: Xóm 1, Xã B..."
                      className="w-full px-4 py-2.5 rounded-xl border border-slate-200 bg-slate-50 focus:bg-white focus:ring-4 focus:ring-blue-500/5 focus:border-blue-500 outline-none transition-all placeholder:text-slate-400"
                      value={newDebt.area}
                      onChange={(e) => setNewDebt({...newDebt, area: e.target.value})}
                    />
                    <datalist id="area-suggestions">
                      {areas.map(area => (
                        <option key={area} value={area} />
                      ))}
                    </datalist>
                  </div>
                  <div className="space-y-1.5">
                    <label className="text-[11px] font-bold text-slate-500 uppercase tracking-widest ml-1">Số tiền <span className="text-rose-500">*</span></label>
                    <div className="relative">
                      <input 
                        type="number" 
                        required
                        placeholder="0"
                        className="w-full pl-4 pr-12 py-2.5 rounded-xl border border-slate-200 bg-slate-50 focus:bg-white focus:ring-4 focus:ring-blue-500/5 focus:border-blue-500 outline-none transition-all placeholder:text-slate-400 tabular-nums"
                        value={newDebt.amount}
                        onChange={(e) => setNewDebt({...newDebt, amount: e.target.value})}
                      />
                      <span className="absolute right-4 top-1/2 -translate-y-1/2 text-slate-400 text-xs font-bold">đ</span>
                    </div>
                  </div>
                  <div className="col-span-1 sm:col-span-2 space-y-1.5">
                    <label className="text-[11px] font-bold text-slate-500 uppercase tracking-widest ml-1">Nội dung chi tiết</label>
                    <textarea 
                      placeholder="Mô tả khoản nợ (VD: Tiền hàng đợt 1...)"
                      className="w-full px-4 py-3 rounded-xl border border-slate-200 bg-slate-50 focus:bg-white focus:ring-4 focus:ring-blue-500/5 focus:border-blue-500 outline-none transition-all h-28 resize-none placeholder:text-slate-400"
                      value={newDebt.description}
                      onChange={(e) => setNewDebt({...newDebt, description: e.target.value})}
                    ></textarea>
                  </div>
                </div>
                
                <div className="pt-4 flex gap-3">
                  <button 
                    type="button"
                    onClick={() => setIsAddDebtOpen(false)}
                    className="flex-1 py-3 px-4 border border-slate-200 text-slate-600 rounded-xl font-bold hover:bg-slate-50 transition-all text-sm"
                  >
                    Đóng
                  </button>
                  <button 
                    type="submit"
                    className="flex-[2] py-3 px-4 bg-slate-900 text-white rounded-xl font-bold shadow-lg shadow-slate-200 hover:bg-slate-800 active:scale-95 transition-all text-sm"
                  >
                    Lưu thông tin
                  </button>
                </div>
              </form>
            </motion.div>
          </div>
        )}
      </AnimatePresence>

      <AnimatePresence>
        {isAddUserOpen && (
          <div className="fixed inset-0 z-[100] flex items-center justify-center p-4">
            <motion.div 
              initial={{ opacity: 0 }}
              animate={{ opacity: 1 }}
              exit={{ opacity: 0 }}
              onClick={() => setIsAddUserOpen(false)}
              className="absolute inset-0 bg-slate-900/40 backdrop-blur-[2px]"
            />
            <motion.div 
              initial={{ opacity: 0, scale: 0.98, y: 10 }}
              animate={{ opacity: 1, scale: 1, y: 0 }}
              exit={{ opacity: 0, scale: 0.98, y: 10 }}
              className="relative w-full max-w-md bg-white rounded-2xl shadow-2xl overflow-hidden border border-slate-200"
            >
              <div className="p-6 border-b border-slate-100 flex justify-between items-center">
                <div className="flex items-center gap-3">
                  <div className="w-10 h-10 bg-indigo-50 rounded-xl flex items-center justify-center">
                    <UserIcon className="w-5 h-5 text-indigo-600" />
                  </div>
                  <div>
                    <h3 className="text-lg font-bold text-slate-900 tracking-tight">Thêm người dùng</h3>
                    <p className="text-xs text-slate-500 font-medium">Tạo tài khoản mới cho hệ thống</p>
                  </div>
                </div>
                <button onClick={() => setIsAddUserOpen(false)} className="p-2 hover:bg-slate-100 rounded-xl transition-colors">
                  <X className="w-5 h-5 text-slate-400" />
                </button>
              </div>
              
              <form onSubmit={handleCreateUser} className="p-6 space-y-4">
                <div className="space-y-1.5">
                  <label className="text-[11px] font-bold text-slate-500 uppercase tracking-widest ml-1">Họ và tên</label>
                  <input 
                    type="text" 
                    required
                    placeholder="VD: Nguyễn Văn A"
                    className="w-full px-4 py-2.5 rounded-xl border border-slate-200 bg-slate-50 focus:bg-white focus:ring-4 focus:ring-blue-500/5 focus:border-blue-500 outline-none transition-all"
                    value={newUser.fullname}
                    onChange={(e) => setNewUser({...newUser, fullname: e.target.value})}
                  />
                </div>
                <div className="space-y-1.5">
                  <label className="text-[11px] font-bold text-slate-500 uppercase tracking-widest ml-1">Tên đăng nhập</label>
                  <input 
                    type="text" 
                    required
                    placeholder="VD: user01"
                    className="w-full px-4 py-2.5 rounded-xl border border-slate-200 bg-slate-50 focus:bg-white focus:ring-4 focus:ring-blue-500/5 focus:border-blue-500 outline-none transition-all"
                    value={newUser.username}
                    onChange={(e) => setNewUser({...newUser, username: e.target.value})}
                  />
                </div>
                <div className="space-y-1.5">
                  <label className="text-[11px] font-bold text-slate-500 uppercase tracking-widest ml-1">Mật khẩu</label>
                  <input 
                    type="password" 
                    required
                    placeholder="••••••••"
                    className="w-full px-4 py-2.5 rounded-xl border border-slate-200 bg-slate-50 focus:bg-white focus:ring-4 focus:ring-blue-500/5 focus:border-blue-500 outline-none transition-all"
                    value={newUser.password}
                    onChange={(e) => setNewUser({...newUser, password: e.target.value})}
                  />
                </div>
                <div className="space-y-1.5">
                  <label className="text-[11px] font-bold text-slate-500 uppercase tracking-widest ml-1">Vai trò</label>
                  <div className="grid grid-cols-2 gap-3 mt-1">
                    <button 
                      type="button"
                      onClick={() => setNewUser({...newUser, role: 'user'})}
                      className={`py-3 rounded-xl border text-xs font-bold transition-all ${newUser.role === 'user' ? 'bg-slate-900 text-white border-slate-900 shadow-lg shadow-slate-200' : 'bg-white text-slate-500 border-slate-200'}`}
                    >
                      USER
                    </button>
                    <button 
                      type="button"
                      onClick={() => setNewUser({...newUser, role: 'admin'})}
                      className={`py-3 rounded-xl border text-xs font-bold transition-all ${newUser.role === 'admin' ? 'bg-indigo-600 text-white border-indigo-600 shadow-lg shadow-indigo-200' : 'bg-white text-slate-500 border-slate-200'}`}
                    >
                      ADMIN
                    </button>
                  </div>
                </div>

                <div className="pt-4 flex gap-3">
                  <button 
                    type="button"
                    onClick={() => setIsAddUserOpen(false)}
                    className="flex-1 py-3 px-4 border border-slate-200 text-slate-600 rounded-xl font-bold hover:bg-slate-50 transition-all text-sm"
                  >
                    Hủy
                  </button>
                  <button 
                    type="submit"
                    className="flex-[2] py-3 px-4 bg-slate-900 text-white rounded-xl font-bold shadow-lg shadow-slate-200 hover:bg-slate-800 active:scale-95 transition-all text-sm"
                  >
                    Tạo tài khoản
                  </button>
                </div>
              </form>
            </motion.div>
          </div>
        )}
      </AnimatePresence>

      {/* Notifications */}
      <AnimatePresence>
        {notification && (
          <motion.div
            initial={{ opacity: 0, y: 50 }}
            animate={{ opacity: 1, y: 0 }}
            exit={{ opacity: 0, scale: 0.95 }}
            className={`fixed bottom-6 left-1/2 -translate-x-1/2 z-[100] px-6 py-3 rounded-2xl shadow-2xl flex items-center gap-3 border ${
              notification.type === 'success' 
                ? 'bg-slate-900 border-slate-800 text-white' 
                : 'bg-rose-600 border-rose-500 text-white'
            }`}
          >
            {notification.type === 'success' ? (
              <CheckCircle2 className="w-5 h-5 text-emerald-400" />
            ) : (
              <AlertCircle className="w-5 h-5 text-white" />
            )}
            <span className="text-sm font-bold tracking-tight">{notification.message}</span>
          </motion.div>
        )}
      </AnimatePresence>
    </div>
  );
}
