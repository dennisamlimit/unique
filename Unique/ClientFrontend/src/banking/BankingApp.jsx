import React, { useState, useEffect } from 'react';

const BankingApp = () => {
    const [visible, setVisible] = useState(false);
    const [view, setView] = useState('dashboard');
    const [accountData, setAccountData] = useState({
        iban: 'FL-0000-0000-0000',
        ownerName: 'Lade data...',
        balance: 0,
        cash: 0,
        history: [],
        stats: { totalIncome: 0, totalOutcome: 0 },
        analytics: []
    });

    // Form states
    const [transferIban, setTransferIban] = useState('');
    const [transferAmount, setTransferAmount] = useState('');
    const [transferLabel, setTransferLabel] = useState('');

    useEffect(() => {
        // Define global bridge object
        window.bankingApp = {
            setData: (json) => {
                try {
                    const data = JSON.parse(json);
                    setAccountData(data);
                } catch (e) {
                    console.error("Failed to parse banking data", e);
                }
            },
            show: () => setVisible(true),
            hide: () => setVisible(false)
        };

        if (window.mp) {
            window.mp.trigger('cef:banking:ready');
        }

        // Cleanup
        return () => {
            delete window.bankingApp;
        };
    }, []);

    const formatCurrency = (val) => {
        return new Intl.NumberFormat('en-US', { style: 'currency', currency: 'USD' }).format(val);
    };

    const handleAction = (type, amount = null) => {
        if (window.mp) {
            if (type === 'deposit' || type === 'withdraw') {
                const val = amount || prompt("Menge eingeben:");
                if (val && !isNaN(val)) {
                    window.mp.trigger(`server:banking:${type}`, Number(val));
                }
            } else if (type === 'exit') {
                window.mp.trigger('cef:banking:close');
            }
        }
    };

    const handleTransfer = () => {
        if (!transferIban || !transferAmount) return;
        if (window.mp) {
            window.mp.trigger('server:banking:transfer', transferIban, Number(transferAmount), transferLabel);
            setTransferIban('');
            setTransferAmount('');
            setTransferLabel('');
        }
    };

    if (!visible) return null;

    return (
        <div className="bg-[#0d0b21] text-[#e7e2ff] font-body overflow-hidden h-screen flex select-none">
            {/* Sidebar */}
            <aside className="fixed left-0 top-0 h-full flex flex-col py-8 w-64 border-r border-white/5 bg-slate-950/60 backdrop-blur-xl z-50">
                <div className="px-8 mb-12">
                    <div className="text-2xl font-black tracking-tighter text-[#b2a1ff]">FLEECA</div>
                    <div className="text-[10px] uppercase tracking-[0.2em] text-[#aca8c5] font-bold">The Ethereal Vault</div>
                </div>
                <nav className="flex-1 px-4 space-y-2">
                    <button 
                        onClick={() => setView('dashboard')}
                        className={`w-full flex items-center gap-3 rounded-full px-4 py-3 transition-all duration-300 ${view === 'dashboard' ? 'bg-white/10 text-[#00cffc] border-l-4 border-[#00cffc] shadow-[-4px_0_15px_-2px_rgba(0,207,252,0.4)]' : 'text-slate-400 hover:bg-white/5'}`}
                    >
                        <span className="material-symbols-outlined" style={{fontVariationSettings: "'FILL' 1"}}>dashboard</span>
                        <span className="font-bold text-sm">Dashboard</span>
                    </button>
                    <button 
                        onClick={() => setView('transactions')}
                        className={`w-full flex items-center gap-3 rounded-full px-4 py-3 transition-all duration-300 ${view === 'transactions' ? 'bg-white/10 text-[#00cffc] border-l-4 border-[#00cffc] shadow-[-4px_0_15px_-2px_rgba(0,207,252,0.4)]' : 'text-slate-400 hover:bg-white/5'}`}
                    >
                        <span className="material-symbols-outlined">receipt_long</span>
                        <span className="font-bold text-sm">Transactions</span>
                    </button>
                    <button className="w-full flex items-center gap-3 text-slate-400 px-4 py-3 hover:bg-white/5 transition-all duration-300 rounded-full opacity-50 cursor-not-allowed">
                        <span className="material-symbols-outlined">leaderboard</span>
                        <span className="font-bold text-sm">Analytics</span>
                    </button>
                    <button className="w-full flex items-center gap-3 text-slate-400 px-4 py-3 hover:bg-white/5 transition-all duration-300 rounded-full opacity-50 cursor-not-allowed">
                        <span className="material-symbols-outlined">settings</span>
                        <span className="font-bold text-sm">Settings</span>
                    </button>
                </nav>
                <div className="px-4 mt-auto">
                    <button 
                        onClick={() => handleAction('exit')}
                        className="w-full flex items-center gap-3 text-slate-400 px-4 py-3 hover:bg-red-500/20 hover:text-red-400 transition-all duration-300 rounded-full"
                    >
                        <span className="material-symbols-outlined">logout</span>
                        <span className="font-bold text-sm">Exit</span>
                    </button>
                </div>
            </aside>

            {/* Main Content */}
            <main className="ml-64 flex flex-1 overflow-hidden">
                <div className="flex-1 flex flex-col overflow-y-auto pb-12 no-scrollbar">
                    {/* Header */}
                    <header className="flex justify-between items-center w-full px-10 py-8 bg-transparent">
                        <div className="flex flex-col">
                            <h1 className="text-3xl font-extrabold tracking-tight text-[#e7e2ff]">Welcome to Fleeca Bank</h1>
                            <p className="text-[#aca8c5] text-sm font-medium">Monitoring ethereals: {accountData.ownerName}</p>
                        </div>
                        <div className="flex items-center gap-6">
                            <div className="flex items-center gap-4 text-slate-300">
                                <span className="material-symbols-outlined hover:text-[#b2a1ff] cursor-pointer">notifications</span>
                                <span className="material-symbols-outlined hover:text-[#b2a1ff] cursor-pointer">help</span>
                            </div>
                        </div>
                    </header>

                    {view === 'dashboard' ? (
                        <div className="px-10 space-y-8 animate-in fade-in duration-500">
                            {/* Summary Cards */}
                            <div className="grid grid-cols-3 gap-6">
                                <div className="bg-[#252242]/40 backdrop-blur-xl border border-[#48455e]/15 p-6 rounded-lg relative overflow-hidden group">
                                    <div className="flex items-center gap-4 mb-4">
                                        <div className="p-3 bg-cyan-500/10 rounded-full text-cyan-400">
                                            <span className="material-symbols-outlined">trending_up</span>
                                        </div>
                                        <span className="text-sm font-bold text-[#aca8c5] uppercase tracking-widest">Total Income</span>
                                    </div>
                                    <div className="text-3xl font-black text-[#e7e2ff] tracking-tighter">{formatCurrency(accountData.stats.totalIncome)}</div>
                                </div>
                                <div className="bg-[#252242]/40 backdrop-blur-xl border border-[#48455e]/15 p-6 rounded-lg relative overflow-hidden group">
                                    <div className="flex items-center gap-4 mb-4">
                                        <div className="p-3 bg-red-500/10 rounded-full text-red-400">
                                            <span className="material-symbols-outlined">trending_down</span>
                                        </div>
                                        <span className="text-sm font-bold text-[#aca8c5] uppercase tracking-widest">Total Outcome</span>
                                    </div>
                                    <div className="text-3xl font-black text-[#e7e2ff] tracking-tighter">{formatCurrency(accountData.stats.totalOutcome)}</div>
                                </div>
                                <div className="bg-[#252242]/40 backdrop-blur-xl border border-[#48455e]/15 p-6 rounded-lg relative overflow-hidden group">
                                    <div className="flex items-center gap-4 mb-4">
                                        <div className="p-3 bg-purple-500/10 rounded-full text-purple-400">
                                            <span className="material-symbols-outlined">account_balance_wallet</span>
                                        </div>
                                        <span className="text-sm font-bold text-[#aca8c5] uppercase tracking-widest">Cash</span>
                                    </div>
                                    <div className="text-3xl font-black text-[#e7e2ff] tracking-tighter">{formatCurrency(accountData.cash)}</div>
                                </div>
                            </div>

                            {/* Analytics Chart */}
                            <div className="bg-[#252242]/40 backdrop-blur-xl border border-[#48455e]/15 p-8 rounded-lg">
                                <div className="flex justify-between items-end mb-8">
                                    <div>
                                        <h3 className="text-xl font-bold mb-1">Weekly Cashflow</h3>
                                        <p className="text-[#aca8c5] text-sm">Last 7 days performance</p>
                                    </div>
                                    <div className="flex gap-4">
                                        <div className="flex items-center gap-2">
                                            <div className="w-3 h-3 rounded-full bg-cyan-400"></div>
                                            <span className="text-xs font-bold text-[#aca8c5]">Income</span>
                                        </div>
                                        <div className="flex items-center gap-2">
                                            <div className="w-3 h-3 rounded-full bg-purple-400"></div>
                                            <span className="text-xs font-bold text-[#aca8c5]">Outcome</span>
                                        </div>
                                    </div>
                                </div>
                                <div className="flex items-end justify-between h-48 gap-4 px-2">
                                    {(accountData.analytics.length > 0 ? accountData.analytics : [
                                        { day: 'MON', income: 40, outcome: 20 },
                                        { day: 'TUE', income: 80, outcome: 30 },
                                        { day: 'WED', income: 50, outcome: 90 },
                                        { day: 'THU', income: 100, outcome: 40 },
                                        { day: 'FRI', income: 70, outcome: 60 },
                                        { day: 'SAT', income: 30, outcome: 20 },
                                        { day: 'SUN', income: 20, outcome: 10 }
                                    ]).map((d, i) => (
                                        <div key={i} className="flex flex-col items-center flex-1 h-full gap-2">
                                            <div className="w-full flex items-end justify-center h-full gap-1">
                                                <div className="w-full bg-cyan-400/40 rounded-t-lg transition-all duration-1000" style={{height: `${Math.min(100, (d.income / 100000) * 100 + 5)}%`}}></div>
                                                <div className="w-full bg-purple-400/40 rounded-t-lg transition-all duration-1000" style={{height: `${Math.min(100, (d.outcome / 100000) * 100 + 5)}%`}}></div>
                                            </div>
                                            <span className="text-[10px] font-bold text-[#aca8c5]">{d.day}</span>
                                        </div>
                                    ))}
                                </div>
                            </div>

                            {/* Transaction Preview */}
                            <div className="bg-[#252242]/40 backdrop-blur-xl border border-[#48455e]/15 rounded-lg overflow-hidden">
                                <div className="px-8 py-6 flex justify-between items-center border-b border-white/5">
                                    <h3 className="text-xl font-bold">Recent Transactions</h3>
                                    <button onClick={() => setView('transactions')} className="text-[#00cffc] text-sm font-bold hover:underline">View All</button>
                                </div>
                                <div className="w-full overflow-x-auto">
                                    <table className="w-full text-left">
                                        <thead>
                                            <tr className="text-[#aca8c5] text-[10px] uppercase tracking-widest font-bold">
                                                <th className="px-8 py-4">Counterparty</th>
                                                <th className="px-8 py-4">Label</th>
                                                <th className="px-8 py-4">Amount</th>
                                                <th className="px-8 py-4">Status</th>
                                            </tr>
                                        </thead>
                                        <tbody className="divide-y divide-white/5">
                                            {accountData.history.slice(0, 5).map((t, i) => {
                                                const isIncome = t.recipientAccountId === Number(accountData.iban.split('-')[1]); // Simple check
                                                return (
                                                    <tr key={i} className="hover:bg-white/5 transition-colors">
                                                        <td className="px-8 py-5">
                                                            <div className="flex items-center gap-3">
                                                                <div className={`w-10 h-10 rounded-full bg-white/5 flex items-center justify-center ${isIncome ? 'text-cyan-400' : 'text-purple-400'}`}>
                                                                    <span className="material-symbols-outlined">{isIncome ? 'arrow_downward' : 'arrow_upward'}</span>
                                                                </div>
                                                                <span className="text-sm font-bold">{isIncome ? t.senderName : t.recipientName}</span>
                                                            </div>
                                                        </td>
                                                        <td className="px-8 py-5 text-sm text-[#aca8c5]">{t.label || t.type}</td>
                                                        <td className={`px-8 py-5 text-sm font-bold ${isIncome ? 'text-cyan-400' : 'text-red-400'}`}>
                                                            {isIncome ? '+' : '-'}{formatCurrency(t.amount)}
                                                        </td>
                                                        <td className="px-8 py-5">
                                                            <span className={`px-3 py-1 rounded-full text-[10px] font-black uppercase ${isIncome ? 'bg-cyan-500/10 text-cyan-400' : 'bg-red-500/10 text-red-400'}`}>
                                                                {t.type}
                                                            </span>
                                                        </td>
                                                    </tr>
                                                );
                                            })}
                                        </tbody>
                                    </table>
                                </div>
                            </div>
                        </div>
                    ) : (
                        <div className="px-10 space-y-8 animate-in slide-in-from-bottom-5 duration-500">
                             <div className="bg-[#252242]/40 backdrop-blur-xl border border-[#48455e]/15 rounded-lg overflow-hidden">
                                <div className="px-8 py-6 flex justify-between items-center border-b border-white/5">
                                    <h3 className="text-xl font-bold">Full Transaction History</h3>
                                </div>
                                <div className="w-full overflow-x-auto h-[600px] overflow-y-auto no-scrollbar">
                                    <table className="w-full text-left">
                                        <thead className="sticky top-0 bg-[#1e1c39] z-10">
                                            <tr className="text-[#aca8c5] text-[10px] uppercase tracking-widest font-bold">
                                                <th className="px-8 py-4">Details</th>
                                                <th className="px-8 py-4 text-center">Date</th>
                                                <th className="px-8 py-4">Amount</th>
                                                <th className="px-8 py-4">Type</th>
                                            </tr>
                                        </thead>
                                        <tbody className="divide-y divide-white/5">
                                            {accountData.history.map((t, i) => (
                                                <tr key={i} className="hover:bg-white/5 transition-colors">
                                                    <td className="px-8 py-5">
                                                        <div className="flex flex-col">
                                                            <span className="text-sm font-bold">{t.senderName} → {t.recipientName}</span>
                                                            <span className="text-xs text-[#aca8c5]">{t.label}</span>
                                                        </div>
                                                    </td>
                                                    <td className="px-8 py-5 text-xs text-center text-[#aca8c5]">
                                                        {new Date(t.createdAt).toLocaleString()}
                                                    </td>
                                                    <td className={`px-8 py-5 text-sm font-bold ${t.type === 'deposit' || t.recipientAccountId ? 'text-cyan-400' : 'text-red-400'}`}>
                                                        {formatCurrency(t.amount)}
                                                    </td>
                                                    <td className="px-8 py-5 text-xs font-black uppercase">{t.type}</td>
                                                </tr>
                                            ))}
                                        </tbody>
                                    </table>
                                </div>
                            </div>
                        </div>
                    )}
                </div>

                {/* Right Sidebar */}
                <aside className="w-96 border-l border-white/5 bg-[#121029]/50 backdrop-blur-md p-8 flex flex-col gap-8 overflow-y-auto no-scrollbar">
                    <section>
                        <h2 className="text-xs font-black uppercase tracking-widest text-[#aca8c5] mb-6">Fleeca Silver Card</h2>
                        <div className="aspect-[1.58/1] w-full rounded-lg relative overflow-hidden p-6 flex flex-col justify-between shadow-2xl" style={{background: "linear-gradient(135deg, #00cffc 0%, #b2a1ff 100%)"}}>
                            <div className="flex justify-between items-start relative z-10">
                                <div className="flex flex-col">
                                    <span className="text-[10px] font-bold uppercase tracking-widest text-white/70">Balance</span>
                                    <span className="text-2xl font-black text-white">{formatCurrency(accountData.balance)}</span>
                                </div>
                                <div className="w-12 h-8 bg-white/20 backdrop-blur-md rounded-md flex items-center justify-center">
                                    <div className="w-6 h-6 rounded-full bg-red-500/80 -mr-2"></div>
                                    <div className="w-6 h-6 rounded-full bg-yellow-500/80"></div>
                                </div>
                            </div>
                            <div className="relative z-10 flex flex-col">
                                <span className="text-lg font-mono tracking-[0.3em] text-white/90">{accountData.iban}</span>
                                <div className="flex justify-between items-center mt-4">
                                    <span className="text-xs font-bold uppercase tracking-tighter text-white/80">{accountData.ownerName}</span>
                                    <span className="text-xs font-bold text-white/80">12/32</span>
                                </div>
                            </div>
                        </div>

                        <div className="grid grid-cols-2 gap-4 mt-8">
                            <button 
                                onClick={() => handleAction('withdraw')}
                                className="flex flex-col items-center justify-center gap-3 p-4 bg-[#252242]/40 border border-[#48455e]/15 rounded-lg hover:bg-cyan-500/10 hover:text-cyan-400 transition-all group"
                            >
                                <div className="w-10 h-10 rounded-full bg-white/5 flex items-center justify-center group-hover:bg-cyan-500/20">
                                    <span className="material-symbols-outlined">south</span>
                                </div>
                                <span className="text-xs font-black uppercase tracking-widest">Withdraw</span>
                            </button>
                            <button 
                                onClick={() => handleAction('deposit')}
                                className="flex flex-col items-center justify-center gap-3 p-4 bg-[#252242]/40 border border-[#48455e]/15 rounded-lg hover:bg-purple-500/10 hover:text-purple-400 transition-all group"
                            >
                                <div className="w-10 h-10 rounded-full bg-white/5 flex items-center justify-center group-hover:bg-purple-500/20">
                                    <span className="material-symbols-outlined">north</span>
                                </div>
                                <span className="text-xs font-black uppercase tracking-widest">Deposit</span>
                            </button>
                        </div>
                    </section>

                    <section className="flex-1">
                        <h2 className="text-xs font-black uppercase tracking-widest text-[#aca8c5] mb-6">Fast Transfer</h2>
                        <div className="space-y-4">
                            <div className="space-y-2">
                                <label className="text-[10px] font-black uppercase text-[#aca8c5] ml-1 tracking-widest">Recipient IBAN</label>
                                <input 
                                    value={transferIban}
                                    onChange={(e) => setTransferIban(e.target.value)}
                                    className="w-full bg-[#252242] border-none rounded-lg p-4 text-sm font-bold focus:ring-2 focus:ring-cyan-500/50 placeholder:text-[#aca8c5]/30" 
                                    placeholder="FL-0000-0000-0000" 
                                />
                            </div>
                            <div className="space-y-2">
                                <label className="text-[10px] font-black uppercase text-[#aca8c5] ml-1 tracking-widest">Amount ($)</label>
                                <input 
                                    type="number"
                                    value={transferAmount}
                                    onChange={(e) => setTransferAmount(e.target.value)}
                                    className="w-full bg-[#252242] border-none rounded-lg p-4 text-sm font-bold focus:ring-2 focus:ring-cyan-500/50 placeholder:text-[#aca8c5]/30" 
                                    placeholder="0" 
                                />
                            </div>
                            <div className="space-y-2">
                                <label className="text-[10px] font-black uppercase text-[#aca8c5] ml-1 tracking-widest">Reason (Optional)</label>
                                <input 
                                    value={transferLabel}
                                    onChange={(e) => setTransferLabel(e.target.value)}
                                    className="w-full bg-[#252242] border-none rounded-lg p-4 text-sm font-bold focus:ring-2 focus:ring-cyan-500/50 placeholder:text-[#aca8c5]/30" 
                                    placeholder="Gift / Bill" 
                                />
                            </div>
                            <button 
                                onClick={handleTransfer}
                                className="w-full py-4 rounded-full font-black text-xs uppercase tracking-widest text-slate-900 shadow-xl transition-all active:scale-95 flex items-center justify-center gap-2" 
                                style={{background: "linear-gradient(135deg, #b2a1ff 0%, #7854ff 100%)"}}
                            >
                                <span>FAST TRANSFER</span>
                                <span className="material-symbols-outlined text-sm">bolt</span>
                            </button>
                        </div>
                    </section>
                </aside>
            </main>
        </div>
    );
};

export default BankingApp;
