import React, { useState, useEffect } from 'react';
import { supabase } from '../supabaseClient';

// Categorías adaptadas para ambos flujos
const CATEGORIES_GASTOS = ['Transporte', 'Lavadero', 'Comida', 'Nafta', 'Estacionamiento', 'Otro'];
const CATEGORIES_INGRESOS = ['Venta', 'Inyección Capital', 'Cobro', 'Otro'];

function ExpenseForm({ onSaved, empleado, tipoRegistro }) {
    // Calculamos la fecha local real de Argentina (UTC-3) para evitar desfasajes
    const ahora = new Date();
    const offset = ahora.getTimezoneOffset() * 60000;
    const fechaLocal = new Date(ahora.getTime() - offset).toISOString().split('T')[0];

    const [formData, setFormData] = useState({
        monto: '',
        categoria: '',
        descripcion: '',
        metodo_pago: 'MP',
        fecha: fechaLocal
    });
    const [loading, setLoading] = useState(false);
    const [statusText, setStatusText] = useState('');

    // Reseteamos la categoría al cambiar entre Gasto e Ingreso para evitar inconsistencias
    useEffect(() => {
        setFormData(prev => ({ ...prev, categoria: '' }));
    }, [tipoRegistro]);

    const handleChange = (e) => {
        const { name, value } = e.target;
        setFormData(prev => ({ ...prev, [name]: value }));
    };

    const handleSubmit = async (e) => {
        e.preventDefault();
        if (!formData.monto) return;

        setLoading(true);
        setStatusText('Guardando...');

        try {
            // Estructura base común para ambas tablas
            const registroToInsert = {
                monto: parseFloat(formData.monto), 
                categoria: formData.categoria,
                descripcion: formData.descripcion || '', 
                creado_por: empleado
            };

            // Mapeo dinámico de columnas según la tabla de destino
            if (tipoRegistro === 'gastos') {
                registroToInsert.fecha_gasto = formData.fecha;
                registroToInsert.metodo_pago = formData.metodo_pago;
            } else {
                registroToInsert.fecha = formData.fecha;
                registroToInsert.metodo_pago = formData.metodo_pago;
            }

            console.log(`Enviando a ${tipoRegistro}:`, registroToInsert);

            const { error } = await supabase
                .from(tipoRegistro)
                .insert([registroToInsert]);

            if (error) {
                console.error("Error específico de Supabase:", error.message, error.details);
                throw error;
            }

            setStatusText('¡Guardado!');
            setFormData(prev => ({ ...prev, monto: '', descripcion: '' }));
            
            if (onSaved) onSaved();
            
        } catch (err) {
            console.error("Error capturado en el catch:", err);
            setStatusText('Error: revisá la consola');
        } finally {
            setTimeout(() => setStatusText(''), 3000);
            setLoading(false);
        }
    };

    const categoriasActuales = tipoRegistro === 'gastos' ? CATEGORIES_GASTOS : CATEGORIES_INGRESOS;

    return (
        <form onSubmit={handleSubmit} className="space-y-5">
            <div className="bg-white rounded-[1.5rem] p-5 shadow-sm border border-slate-100 flex flex-col space-y-5 bg-gradient-to-b from-white to-slate-50/50">
                
                {/* Monto */}
                <div className="relative">
                    <label className="text-xs font-bold text-slate-400 uppercase tracking-wider mb-2 block px-1">Monto</label>
                    <div className="relative flex items-center">
                        <span className="absolute left-5 text-2xl font-black text-slate-300">$</span>
                        <input
                            type="number"
                            name="monto"
                            value={formData.monto}
                            onChange={handleChange}
                            step="0.01"
                            min="0"
                            required
                            placeholder="0.00"
                            className="w-full bg-white border-2 border-slate-100 rounded-2xl py-4 pl-12 pr-4 text-3xl font-black text-slate-800 outline-none focus:border-blue-500 focus:ring-4 focus:ring-blue-500/10 transition-all placeholder:text-slate-200"
                        />
                    </div>
                </div>

                <div className="grid grid-cols-2 gap-4">
                    {/* Fecha */}
                    <div>
                        <label className="text-xs font-bold text-slate-400 uppercase tracking-wider mb-2 block px-1">Fecha</label>
                        <input
                            type="date"
                            name="fecha"
                            value={formData.fecha}
                            onChange={handleChange}
                            required
                            className="w-full bg-white border-2 border-slate-100 rounded-xl py-3 px-4 text-sm font-semibold text-slate-700 outline-none focus:border-blue-500 focus:ring-4 focus:ring-blue-500/10 transition-all"
                        />
                    </div>

                    {/* Categoría */}
                    <div>
                        <label className="text-xs font-bold text-slate-400 uppercase tracking-wider mb-2 block px-1">Categoría</label>
                        <div className="relative">
                            <select
                                name="categoria"
                                value={formData.categoria}
                                onChange={handleChange}
                                required
                                className="w-full bg-white border-2 border-slate-100 rounded-xl py-3 px-4 text-sm font-semibold text-slate-700 outline-none appearance-none focus:border-blue-500 focus:ring-4 focus:ring-blue-500/10 transition-all cursor-pointer"
                            >
                                <option value="" disabled>Seleccionar</option>
                                {categoriasActuales.map(cat => (
                                    <option key={cat} value={cat}>{cat}</option>
                                ))}
                            </select>
                        </div>
                    </div>
                </div>

                {/* Descripción */}
                <div>
                    <label className="text-xs font-bold text-slate-400 uppercase tracking-wider mb-2 block px-1">Descripción (Opcional)</label>
                    <input
                        type="text"
                        name="descripcion"
                        value={formData.descripcion}
                        onChange={handleChange}
                        placeholder="¿Por qué motivo?"
                        className="w-full bg-white border-2 border-slate-100 rounded-xl py-3 px-4 text-sm font-medium text-slate-700 outline-none focus:border-blue-500 focus:ring-4 focus:ring-blue-500/10 transition-all placeholder:text-slate-300"
                    />
                </div>
            </div>

            {/* Método de Pago */}
            <div className="relative">
                <select
                    name="metodo_pago"
                    value={formData.metodo_pago}
                    onChange={handleChange}
                    className="w-full bg-white border-2 border-slate-100 rounded-xl py-3 px-4 text-sm font-semibold text-slate-700 outline-none appearance-none focus:border-blue-500 focus:ring-4 focus:ring-blue-500/10 transition-all cursor-pointer"
                >
                    <option value="MP">MP</option>
                    <option value="Efectivo">Efectivo</option>
                    <option value="Tarjeta">Tarjeta</option>
                    <option value="Otro">Otro</option>
                </select>
            </div>                      
            
            <button
                type="submit"
                disabled={loading}
                className={`w-full py-4 text-white rounded-2xl font-bold text-lg shadow-lg transition-all disabled:opacity-70 flex items-center justify-center gap-2 active:scale-[0.98] ${
                    tipoRegistro === 'gastos' 
                        ? 'bg-red-500 hover:bg-red-600 shadow-red-500/20' 
                        : 'bg-green-600 hover:bg-green-700 shadow-green-600/20'
                }`}
            >
                {statusText || (tipoRegistro === 'gastos' ? 'Guardar Gasto' : 'Guardar Ingreso')}
            </button>
        </form>
    );
}

export default ExpenseForm;
