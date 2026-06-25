import React from 'react';
import * as XLSX from 'xlsx'; // Importamos la librería de Excel

function Dashboard({ data, loading }) {
    if (loading) {
        return <div className="animate-pulse bg-slate-200 h-32 rounded-3xl w-full"></div>;
    }

    const { today_total, week_total, month_total, last_expenses } = data;

    // Función para procesar y descargar los gastos actuales a Excel
    const exportarAExcel = () => {
        if (!last_expenses || last_expenses.length === 0) {
            alert("No hay gastos registrados en este período para exportar.");
            return;
        }

        try {
            // 1. Formateamos las columnas para que queden prolijas en español
            const datosExcel = last_expenses.map(g => ({
                Fecha: new Date(g.date).toLocaleDateString('es-AR'),
                Categoría: g.category,
                Descripción: g.description || '-',
                Monto: g.amount
            }));

            // 2. Creamos el libro de Excel
            const hoja = XLSX.utils.json_to_sheet(datosExcel);
            const libro = XLSX.utils.book_new();
            XLSX.utils.book_append_sheet(libro, hoja, "Gastos del Período");
            
            // 3. Descarga automática del archivo xlsx
            XLSX.writeFile(libro, `Rendicion_Gastos_${new Date().toISOString().split('T')[0]}.xlsx`);
        } catch (error) {
            console.error("Error al exportar a Excel:", error);
            alert("Hubo un error al generar el archivo Excel.");
        }
    };

    return (
        <div className="space-y-6">
            <div className="grid grid-cols-2 gap-4">
                <div className="bg-expense-50 p-5 rounded-[1.5rem] shadow-sm flex flex-col items-center justify-center border border-expense-100">
                    <span className="text-expense-600/80 text-sm font-semibold tracking-wide uppercase">Hoy</span>
                    <span className="text-3xl font-black text-expense-900 mt-1">${today_total?.toFixed(2) || '0.00'}</span>
                </div>

                <div className="flex flex-col gap-4">
                    <div className="bg-slate-50 p-4 pl-5 rounded-2xl border border-slate-100 flex flex-col justify-center flex-1">
                        <span className="text-slate-500 text-xs font-semibold tracking-wide uppercase">Esta Semana</span>
                        <span className="text-lg font-bold text-slate-800">${week_total?.toFixed(2) || '0.00'}</span>
                    </div>
                    <div className="bg-slate-50 p-4 pl-5 rounded-2xl border border-slate-100 flex flex-col justify-center flex-1">
                        <span className="text-slate-500 text-xs font-semibold tracking-wide uppercase">Este Mes</span>
                        <span className="text-lg font-bold text-slate-800">${month_total?.toFixed(2) || '0.00'}</span>
                    </div>
                </div>
            </div>

            {/* BOTÓN DE EXCEL: Ubicado estratégicamente entre los totales y la lista */}
            <div className="px-1">
                <button 
                    onClick={exportarAExcel}
                    className="w-full py-3.5 bg-emerald-600 hover:bg-emerald-700 text-white font-bold rounded-2xl shadow-sm hover:shadow transition-all flex items-center justify-center gap-2 text-sm border border-emerald-700"
                >
                    📊 Descargar Período en Excel
                </button>
            </div>

            <div>
                <h3 className="text-lg font-semibold text-slate-800 mb-4 px-1">Gastos Recientes</h3>
                {last_expenses?.length === 0 ? (
                    <p className="text-slate-400 text-sm text-center py-4 bg-slate-50 rounded-2xl border border-slate-100 border-dashed">Sin gastos recientes</p>
                ) : (
                    <div className="space-y-3">
                        {last_expenses.map((expense, i) => (
                            <div key={i} className="flex justify-between items-center p-4 bg-white rounded-2xl border border-slate-100 shadow-sm transition-all hover:shadow-md hover:border-expense-200">
                                <div className="flex items-center gap-4">
                                    <div className="w-10 h-10 rounded-full bg-expense-100 text-expense-600 flex items-center justify-center text-sm font-bold shadow-sm">
                                        {expense.category.charAt(0).toUpperCase()}
                                    </div>
                                    <div>
                                        <p className="font-semibold text-slate-800 leading-tight">{expense.category}</p>
                                        <p className="text-xs text-slate-500 mt-0.5 truncate max-w-[120px]">{expense.description || 'No notes'}</p>
                                    </div>
                                </div>
                                <div className="text-right">
                                    <p className="font-bold text-expense-600">${expense.amount.toFixed(2)}</p>
                                    <p className="text-[10px] text-slate-400 mt-1 font-medium">{new Date(expense.date).toLocaleDateString(undefined, { month: 'short', day: 'numeric' })}</p>
                                </div>
                            </div>
                        ))}
                    </div>
                )}
            </div>
        </div>
    );
}

export default Dashboard;
