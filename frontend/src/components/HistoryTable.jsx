import React from 'react';
import * as XLSX from 'xlsx';
import jsPDF from 'jspdf';
import 'jspdf-autotable';

// ELIMINAMOS LOS FETCH DE AQUÍ ARRIBA. 
// La tabla solo debe "dibujar" lo que le pasan.

function HistoryTable({ data, loading }) {
    if (loading) {
        return (
            <div className="animate-pulse bg-slate-200 h-64 rounded-3xl w-full"></div>
        );
    }

    // Funciones de exportación corregidas con los nombres de n8n
    const handleExportExcel = () => {
        const worksheet = XLSX.utils.json_to_sheet(data.map(item => ({
            'Fecha': item.date || item.Fecha, // Soporta ambos nombres
            'Total Diario': item.daily_total || item.Monto,
            'Total Semanal': item.weekly_total || item["Total Semanal"],
            'Total Mes': item.monthly_total || item["Total Mensual"]
        })));
        const workbook = XLSX.utils.book_new();
        XLSX.utils.book_append_sheet(workbook, worksheet, 'Historial');
        XLSX.writeFile(workbook, 'Historial_Gastos.xlsx');
    };

    const handleExportPDF = () => {
        const doc = new jsPDF();
        doc.text("Historial de Gastos", 14, 15);
        const tableColumn = ["Fecha", "Total Diario", "Total Semanal", "Total Mes"];
        const tableRows = data.map(item => [
            item.date || item.Fecha,
            `$${(item.daily_total || item.Monto || 0).toFixed(2)}`,
            `$${(item.weekly_total || item["Total Semanal"] || 0).toFixed(2)}`,
            `$${(item.monthly_total || item["Total Mensual"] || 0).toFixed(2)}`
        ]);

        doc.autoTable({ head: [tableColumn], body: tableRows, startY: 20 });
        doc.save('Historial_Gastos.pdf');
    };

    return (
        <div className="space-y-4">
            <div className="flex justify-between items-center px-1">
                <h3 className="text-lg font-semibold text-slate-800">Historial</h3>
                <div className="flex gap-2">
                    <button onClick={handleExportExcel} className="text-xs bg-green-50 hover:bg-green-100 text-green-700 py-1.5 px-3 rounded-lg font-medium border border-green-200">Excel</button>
                    <button onClick={handleExportPDF} className="text-xs bg-red-50 hover:bg-red-100 text-red-700 py-1.5 px-3 rounded-lg font-medium border border-red-200">PDF</button>
                </div>
            </div>

            {!data || data.length === 0 ? (
                <p className="text-slate-400 text-sm text-center py-8 bg-slate-50 rounded-2xl border border-slate-100 border-dashed">No hay datos históricos</p>
            ) : (
                <div className="bg-white rounded-2xl border border-slate-100 shadow-sm overflow-hidden">
                    <div className="overflow-x-auto">
                        <table className="w-full text-left border-collapse">
                            <thead>
                                <tr className="bg-slate-50 border-b border-slate-100 text-xs uppercase text-slate-500">
                                    <th className="p-4">Fecha</th>
                                    <th className="p-4 text-left">Usuario</th>
                                    <th className="p-4 text-right">Diario</th>
                                    <th className="p-4 text-right">Semanal</th>
                                    <th className="p-4 text-right">Mes</th>
                                </tr>
                            </thead>
                            <tbody className="divide-y divide-slate-100 text-sm">
                                {data.map((row, index) => (
                                    <tr key={index} className="hover:bg-slate-50 transition-colors">
                                        <td className="p-4 font-medium text-slate-700">{row.date || row.Fecha}</td>
                                        <td className="p-4 text-left text-slate-500 font-normal">{row.email || 'Sin email'}</td>
                                        <td className="p-4 text-right font-semibold text-red-600">${(row.daily_total || row.Monto || 0).toFixed(2)}</td>
                                        <td className="p-4 text-right font-semibold text-slate-700">${(row.weekly_total || row["Total Semanal"] || 0).toFixed(2)}</td>
                                        <td className="p-4 text-right font-semibold text-slate-700">${(row.monthly_total || row["Total Mensual"] || 0).toFixed(2)}</td>
                                    </tr>
                                ))}
                            </tbody>
                        </table>
                    </div>
                </div>
            )}
        </div>
    );
}

export default HistoryTable;