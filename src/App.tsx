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
  const [loading, setLoading] = useState(true);
  const [isAddDebtOpen, setIsAddDebtOpen] = useState(false);
  const [viewMode, setViewMode] = useState<'dashboard' | 'aggregated'>('dashboard');
  const [searchTerm, setSearchTerm] = useState('');
  const [filterStatus, setFilterStatus] = useState<'all' | 'pending' | 'paid'>('all');
  
  // Login form state
  const [username, setUsername] = useState('');
  const [password, setPassword] = useState('');
  const [showPassword, setShowPassword] = useState(false);
  const [loginError, setLoginError] = useState('');

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
      }
      
      const [debtorsData, debtsData, areasData, statsData] = await Promise.all(promises);
      setDebtors(debtorsData);
      setDebts(debtsData || []);
      setAreas(areasData || []);
      if (statsData) setAdminStats(statsData);
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
    } catch (error) {
      alert('Không thể thêm khoản nợ');
    }
  };

  const toggleStatus = async (debt: Debt) => {
    const newStatus = debt.status === 'pending' ? 'paid' : 'pending';
    try {
      await api.updateDebtStatus(debt.id, newStatus);
      await fetchData();
    } catch (error) {
      alert('Không thể cập nhật trạng thái');
    }
  };

  const handlePayAll = async (debtorId: number) => {
    if (!window.confirm('Bạn có chắc chắn muốn đánh dấu tất cả các khoản nợ của người này là đã thanh toán?')) return;
    try {
      await api.payAllDebts(debtorId);
      await fetchData();
    } catch (error) {
      alert('Không thể cập nhật trạng thái');
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
              <div className="w-12 h-12 bg-blue-600 rounded-xl flex items-center justify-center text-white font-bold text-2xl shadow-lg shadow-blue-200/50 mb-4">D</div>
              <h1 className="text-xl font-bold text-slate-900">Quản lý Công nợ</h1>
              <p className="text-sm text-slate-500 mt-1">Đăng nhập để tiếp tục</p>
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
      <nav className="h-16 bg-white border-b border-slate-200/60 flex items-center justify-between px-4 md:px-8 flex-shrink-0 z-20 sticky top-0">
        <div className="flex items-center gap-3">
          <div className="w-8 h-8 bg-blue-600 rounded-lg flex items-center justify-center text-white font-bold shrink-0 shadow-sm">D</div>
          <span className="text-lg font-bold tracking-tight text-slate-900 hidden sm:block">Quản lý Công nợ</span>
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
                          <th className="px-4 py-4 font-bold tracking-widest text-right">Dư nợ</th>
                          <th className="px-4 py-4 font-bold tracking-widest hidden sm:table-cell text-right">Khu vực</th>
                        </tr>
                      </thead>
                      <tbody className="text-sm divide-y divide-slate-50">
                        {aggregatedDebts.filter(d => d.total_pending > 0).map((item) => (
                          <tr key={item.debtor_id} className="hover:bg-slate-50/40 transition-colors group">
                            <td className="px-4 py-5">
                              <div className="font-bold text-slate-900 group-hover:text-blue-600 transition-colors">{item.name}</div>
                            </td>
                            <td className="px-4 py-5 font-bold text-right text-rose-600 tabular-nums">
                              {item.total_pending.toLocaleString('en-US', { maximumFractionDigits: 0 })}đ
                            </td>
                            <td className="px-4 py-5 text-slate-400 text-[11px] hidden sm:table-cell text-right font-medium italic">
                              {item.area || '—'}
                            </td>
                          </tr>
                        ))}
                      </tbody>
                    </table>
                  )}
                </div>
              </div>
            )}
          </div>
        ) : (
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
                      <th className="px-6 py-4 tracking-widest hidden sm:table-cell text-center">Ghi nhận / Trả</th>
                      <th className="px-6 py-4 tracking-widest text-center">Trạng thái</th>
                    </tr>
                  </thead>
                  <tbody className="text-sm divide-y divide-slate-50">
                    {filteredDebts.length === 0 ? (
                      <tr>
                        <td colSpan={4} className="px-6 py-20 text-center text-slate-400">
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
                          <td className="px-6 py-5 text-center text-[10px] text-slate-500 hidden sm:table-cell">
                            <div className="flex flex-col gap-1 items-center">
                              <span className="px-2 py-0.5 bg-slate-100 rounded text-slate-600 font-medium whitespace-nowrap">N: {new Date(debt.debt_date).toLocaleDateString('vi-VN')}</span>
                              {debt.status === 'paid' && debt.paid_at && (
                                <span className="px-2 py-0.5 bg-emerald-50 rounded text-emerald-600 font-medium whitespace-nowrap">T: {new Date(debt.paid_at).toLocaleDateString('vi-VN')}</span>
                              )}
                            </div>
                          </td>
                          <td className="px-6 py-5 text-center">
                            <button 
                              onClick={() => toggleStatus(debt)}
                              className={`
                                px-4 py-1.5 rounded-full text-[10px] font-bold uppercase transition-all shadow-sm
                                ${debt.status === 'paid' 
                                  ? 'bg-emerald-50 text-emerald-700 border border-emerald-100 hover:bg-emerald-100' 
                                  : 'bg-amber-50 text-amber-700 border border-amber-100 hover:bg-amber-100'}
                              `}
                            >
                              {debt.status === 'paid' ? 'Đã thanh toán' : 'Chưa thu hồi'}
                            </button>
                          </td>
                        </tr>
                      ))
                    )}
                  </tbody>
                </table>
              </div>
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
    </div>
  );
}
