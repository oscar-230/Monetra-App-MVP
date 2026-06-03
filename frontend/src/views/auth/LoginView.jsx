// frontend/src/views/auth/LoginView.jsx
import { useState } from 'react';
import { useNavigate } from 'react-router-dom';
import useAuth from '../../hooks/useAuth';

export const LoginView = () => {
  // 🌟 CORREGIDO: Usamos 'loginConCorreo' que es el nombre real en tu AuthContext
  const { loginConCorreo, loginConGoogle, recuperarContrasena } = useAuth();
  const navigate = useNavigate();

  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [showPassword, setShowPassword] = useState(false); // Estado para ver contraseña
  const [error, setError] = useState('');
  const [loading, setLoading] = useState(false);

  const [showModal, setShowModal] = useState(false);
  const [resetEmail, setResetEmail] = useState('');
  const [modalMessage, setModalMessage] = useState('');
  const [modalError, setModalError] = useState('');

  const handleLogin = async (e) => {
    e.preventDefault();
    setError('');
    setLoading(true);
    try {
      // 🌟 CORREGIDO: Invocación correcta de la función
      await loginConCorreo(email, password);
      navigate('/dashboard');
    } catch (err) {
      setError('Credenciales inválidas. Por favor, verifica tu correo y contraseña.');
    } finally {
      setLoading(false);
    }
  };

  const handleGoogleLogin = async () => {
    setError('');
    try {
      await loginConGoogle();
      navigate('/dashboard');
    } catch (err) {
      setError('Error al autenticar con Google. Inténtalo de nuevo.');
    }
  };

  const handleResetPassword = async (e) => {
    e.preventDefault();
    setModalError('');
    setModalMessage('');
    try {
      await recuperarContrasena(resetEmail);
      setModalMessage('Se ha enviado un enlace de recuperación a tu correo electrónico.');
      setTimeout(() => {
        setShowModal(false);
        setResetEmail('');
        setModalMessage('');
      }, 4000);
    } catch (err) {
      setModalError('No se pudo enviar el correo. Verifica si el usuario existe.');
    }
  };

  return (
    <div className="flex min-h-screen items-center justify-center bg-[#0b0f17] px-4 font-sans text-slate-100 selection:bg-emerald-500 selection:text-black">
      <div className="w-full max-w-md rounded-2xl border border-slate-800/80 bg-[#111827]/60 p-8 shadow-2xl backdrop-blur-xl">
        
        <div className="mb-8 text-center">
          <h1 className="text-4xl font-black tracking-tight bg-gradient-to-r from-emerald-400 via-teal-400 to-cyan-400 bg-clip-text text-transparent">
            Monetra
          </h1>
          <p className="mt-2 text-sm text-slate-400">Toma el control inteligente de tus finanzas</p>
        </div>

        {error && (
          <div className="mb-4 rounded-lg bg-rose-500/10 border border-rose-500/20 p-3 text-sm text-rose-400 text-center">
            {error}
          </div>
        )}

        <form onSubmit={handleLogin} className="space-y-5">
          <div>
            <label className="block text-xs font-semibold uppercase tracking-wider text-slate-400 mb-2">Correo Electrónico</label>
            <input 
              type="email" 
              required
              value={email}
              onChange={(e) => setEmail(e.target.value)}
              placeholder="tu@correo.com"
              className="w-full rounded-xl border border-slate-800 bg-[#0d1117] px-4 py-3 text-sm text-slate-200 placeholder-slate-600 focus:border-emerald-500 focus:outline-none focus:ring-1 focus:ring-emerald-500 transition-all"
            />
          </div>

          <div>
            <div className="flex justify-between mb-2">
              <label className="block text-xs font-semibold uppercase tracking-wider text-slate-400">Contraseña</label>
              <button 
                type="button"
                onClick={() => setShowModal(true)}
                className="text-xs font-medium text-cyan-400 hover:text-cyan-300 hover:underline transition-colors"
              >
                ¿Olvidaste tu contraseña?
              </button>
            </div>
            <div className="relative">
              <input 
                type={showPassword ? "text" : "password"} 
                required
                value={password}
                onChange={(e) => setPassword(e.target.value)}
                placeholder="••••••••"
                className="w-full rounded-xl border border-slate-800 bg-[#0d1117] px-4 py-3 pr-12 text-sm text-slate-200 placeholder-slate-600 focus:border-emerald-500 focus:outline-none focus:ring-1 focus:ring-emerald-500 transition-all"
              />
              <button
                type="button"
                onClick={() => setShowPassword(!showPassword)}
                className="absolute right-4 top-1/2 -translate-y-1/2 text-slate-500 hover:text-slate-300 transition-colors text-xs font-medium"
              >
                {showPassword ? "Ocultar" : "Ver"}
              </button>
            </div>
          </div>

          <button 
            type="submit"
            disabled={loading}
            className="w-full cursor-pointer rounded-xl bg-gradient-to-r from-emerald-500 to-teal-500 py-3 text-sm font-bold text-slate-950 hover:from-emerald-400 hover:to-teal-400 shadow-lg shadow-emerald-500/10 active:scale-[0.99] transition-all disabled:opacity-50"
          >
            {loading ? 'Iniciando sesión...' : 'Iniciar Sesión'}
          </button>
        </form>

        <div className="my-6 flex items-center justify-between text-xs text-slate-600 uppercase tracking-widest">
          <span className="w-1/4 h-px bg-slate-800"></span>
          <span>O continúa con</span>
          <span className="w-1/4 h-px bg-slate-800"></span>
        </div>

        <button 
          onClick={handleGoogleLogin}
          className="flex w-full cursor-pointer items-center justify-center gap-3 rounded-xl border border-slate-800 bg-[#0d1117] py-3 text-sm font-medium text-slate-300 hover:bg-slate-800/50 hover:text-white transition-all active:scale-[0.99]"
        >
          <svg className="h-5 w-5" viewBox="0 0 24 24">
            <path fill="#EA4335" d="M12.24 10.285V14.4h6.887c-.275 1.565-1.88 4.604-6.887 4.604-4.33 0-7.859-3.579-7.859-8s3.529-8 7.859-8c2.46 0 4.105 1.025 5.047 1.926l3.258-3.133C18.421 2.146 15.6 1 12.24 1c-6.075 0-11 4.925-11 11s4.925 11 11 11c6.34 0 10.557-4.444 10.557-10.741 0-.726-.077-1.282-.175-1.684H12.24 postseason"/>
          </svg>
          Google
        </button>

        <p className="mt-8 text-center text-sm text-slate-400">
          ¿No tienes una cuenta?{' '}
          <button 
            onClick={() => navigate('/register')}
            className="font-semibold text-emerald-400 hover:text-emerald-300 hover:underline transition-colors"
          >
            Regístrate aquí
          </button>
        </p>
      </div>

      {showModal && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/70 p-4 backdrop-blur-sm">
          <div className="w-full max-w-sm rounded-xl border border-slate-800 bg-[#111827] p-6 shadow-2xl">
            <h3 className="text-lg font-bold text-slate-100">Restablecer contraseña</h3>
            <p className="mt-2 text-xs text-slate-400">
              Ingresa tu correo electrónico y te enviaremos un enlace seguro para restaurar tu acceso.
            </p>
            
            {modalError && <p className="mt-3 text-xs text-rose-400 bg-rose-500/10 p-2 rounded border border-rose-500/20">{modalError}</p>}
            {modalMessage && <p className="mt-3 text-xs text-emerald-400 bg-emerald-500/10 p-2 rounded border border-emerald-500/20">{modalMessage}</p>}

            <form onSubmit={handleResetPassword} className="mt-4 space-y-4">
              <input 
                type="email" 
                required
                value={resetEmail}
                onChange={(e) => setResetEmail(e.target.value)}
                placeholder="tu@correo.com"
                className="w-full rounded-lg border border-slate-800 bg-[#0d1117] px-3 py-2 text-sm text-slate-200 focus:border-cyan-500 focus:outline-none"
              />
              <div className="flex justify-end gap-2 text-xs">
                <button 
                  type="button" 
                  onClick={() => { setShowModal(false); setModalError(''); setModalMessage(''); }}
                  className="rounded-lg bg-slate-800 px-4 py-2 font-medium text-slate-300 hover:bg-slate-700 transition-colors"
                >
                  Cancelar
                </button>
                <button 
                  type="submit"
                  className="rounded-lg bg-gradient-to-r from-cyan-500 to-blue-500 px-4 py-2 font-bold text-slate-950 hover:from-cyan-400 hover:to-blue-400 transition-colors"
                >
                  Enviar enlace
                </button>
              </div>
            </form>
          </div>
        </div>
      )}
    </div>
  );
};