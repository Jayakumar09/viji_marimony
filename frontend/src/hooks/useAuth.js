import { useAuth } from '../contexts/AuthContext';

export const useAuthHook = () => {
  const { user, loading, login, register, logout, updateUser } = useAuth();
  
  return {
    user,
    isAuthenticated: !!user,
    loading,
    login,
    register,
    logout,
    updateUser
  };
};

export const useAuth = useAuthHook;